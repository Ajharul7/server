const UserSchema = require("../models/UserSchema");
const ReviewSchema = require("../models/ReviewSchema");
const PaytmChecksum = require("../config/checksum.js");
const CouponSchema = require("../models/Coupon");
const PaymentDetailsSchema = require("../models/paymentDetailsSchema.js");
const PaytmConfig = require("../config/config.js");
const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();
const qs = require("querystring");
const http = require("http");
const https = require("https");
const path = require("path");
const fs = require("fs");

router.post("/register", async (req, res) => {
  const { email, password, name, address, phoneno } = req.body;

  if (!email || !password)
    return res.status(400).json({ msg: "Password and email are required" });

  if (password.length < 8) {
    return res
      .status(400)
      .json({ msg: "Password should be at least 8 characters long" });
  }

  const user = await UserSchema.findOne({ email });
  if (user) return res.status(400).json({ msg: "User already exists" });

  const newUser = new UserSchema({ email, password, name, address, phoneno });
  bcrypt.hash(password, 7, async (err, hash) => {
    if (err)
      return res.status(400).json({ msg: "error while saving the password" });

    newUser.password = hash;
    const savedUserRes = await newUser.save();

    if (savedUserRes)
      return res.status(200).json({ msg: "user is successfully saved" });
  });
});

router.post(`/login`, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ msg: "Something missing" });
  }

  const user = await UserSchema.findOne({ email: email }); // finding user in db
  if (!user) {
    return res.status(400).json({ msg: "User not found" });
  }

  const matchPassword = await bcrypt.compare(password, user.password);
  if (matchPassword) {
    const userSession = {
      email: user.email,
      name: user.name,
      phoneno: user.phoneno,
      address: user.address,
    }; // creating user session to keep user loggedin also on refresh
    req.session.user = userSession; // attach user session to session object from express-session

    return res
      .status(200)
      .json({ msg: "You have logged in successfully", userSession }); // attach user session id to the response. It will be transfer in the cookies
  } else {
    return res.status(400).json({ msg: "Invalid credential" });
  }
});

router.post(`/pg/`, async (req, res) => {
  const { star, comment, pgname, username, pgloca, pgid } = req.body;
  const newReview = new ReviewSchema({
    star,
    comment,
    pgname,
    username,
    pgloca,
    pgid,
  });

  const savedReviewRes = await newReview.save();

  if (savedReviewRes)
    return res.status(200).json({ msg: "review is successfully saved" });
});

router.post(`/payment`, async (req, res) => {
  const {
    fullname,
    email,
    phonenumber,
    address,
    question,
    pgname,
    pglocation,
    roomtype,
    couponused,
    perpersonamount,
    totalamount,
  } = req.body;
  const newPayment = new PaymentDetailsSchema({
    fullname,
    email,
    phonenumber,
    address,
    question,
    pgname,
    pglocation,
    roomtype,
    couponused,
    perpersonamount,
    totalamount,
  });

  const savedPaymentDetailsRes = await newPayment.save();

  if (savedPaymentDetailsRes)
    return res
      .status(200)
      .json({ msg: "payment details is successfully saved" });
});

router.delete(`/logout`, async (req, res) => {
  req.session.destroy((error) => {
    if (error) throw error;

    res.clearCookie("session-id"); // cleaning the cookies from the user session
    res.status(200).send("Logout Success");
  });
});

router.get("/isAuth", async (req, res) => {
  if (req.session.user) {
    return res.json(req.session.user);
  } else {
    return res.status(401).json("unauthorize");
  }
});

router.get("/", function (req, res) {
  ReviewSchema.find()
    .sort({ date: -1 })
    .then((data) => {
      res.json(data);
    });
});

router.get("/pg", function (req, res) {
  CouponSchema.find().then((data) => {
    res.json(data);
  });
});
router.delete("/:id", async function (req, res) {
  await CouponSchema.findOneAndDelete({ coupon: `${req.params.id}` });
});

router.post("/paynow", async function (req, res) {
  let body = "";

  const orderId = "TEST_" + new Date().getTime();

  req
    .on("error", (err) => {
      console.error(err.stack);
    })
    .on("data", (chunk) => {
      body += chunk;
    })
    .on("end", () => {
      let data = qs.parse(body);

      const paytmParams = {};

      paytmParams.body = {
        requestType: "Payment",
        mid: PaytmConfig.PaytmConfig.mid,
        websiteName: PaytmConfig.PaytmConfig.website,
        orderId: orderId,
        callbackUrl: "http://localhost:3000/api/callback",
        txnAmount: {
          value: data.amount,
          currency: "INR",
        },
        userInfo: {
          custId: data.email,
        },
      };

      PaytmChecksum.generateSignature(
        JSON.stringify(paytmParams.body),
        PaytmConfig.PaytmConfig.key
      ).then(function (checksum) {
        paytmParams.head = {
          signature: checksum,
        };

        var post_data = JSON.stringify(paytmParams);

        var options = {
          /* for Staging */
          hostname: "securegw-stage.paytm.in",

          /* for Production */
          // hostname: 'securegw.paytm.in',

          port: 443,
          path: `/theia/api/v1/initiateTransaction?mid=${PaytmConfig.PaytmConfig.mid}&orderId=${orderId}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": post_data.length,
          },
        };

        var response = "";
        var post_req = https.request(options, function (post_res) {
          post_res.on("data", function (chunk) {
            response += chunk;
          });

          post_res.on("end", function () {
            response = JSON.parse(response);
            console.log("txnToken:", response);

            res.writeHead(200, { "Content-Type": "text/html" });
            res.write(`<html>
                    <head>
                        <title>Loading Payment Page</title>
                        <link href='https://fonts.googleapis.com/css2?family=Poppins' rel='stylesheet' type='text/css'>
                        <style>
                        center {
                          margin-top: 12%;
                        }
                        h1 {
                          font-family: Poppins;
                          color:#BB84ED;
                        }
                        @media screen and (max-width: 1000px) {
                          center {
                          margin-top: 39vh;
                        }
                        h1 {
                          font-family: Poppins;
                          color:#BB84ED;
                        }
                        }
                        </style>
                    </head>
                    <body>
                        <center >
                            <h1>Please do not refresh this page...</h1>
                        
                        <script src="https://cdn.lordicon.com/xdjxvujz.js"></script>
                        <lord-icon
                            src="https://cdn.lordicon.com/hmmzddsk.json"
                            trigger="loop"
                            colors="primary:#4be1ec,secondary:#cb5eee"
                            state="loop-1"
                            style="width:400px;height:400px">
                        </lord-icon>
                        </center>
                        <form method="post" action="https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid=${PaytmConfig.PaytmConfig.mid}&orderId=${orderId}" name="paytm">
                            <table border="1">
                                <tbody>
                                    <input type="hidden" name="mid" value="${PaytmConfig.PaytmConfig.mid}">
                                        <input type="hidden" name="orderId" value="${orderId}">
                                        <input type="hidden" name="txnToken" value="${response.body.txnToken}">
                             </tbody>
                          </table>
                                        <script type="text/javascript"> document.paytm.submit(); </script>
                       </form>
                    </body>
                 </html>`);
            res.end();
          });
        });

        post_req.write(post_data);
        post_req.end();
      });
    });
});

router.post("/callback", function (req, res) {
  let callbackResponse = "";

  req
    .on("error", (err) => {
      console.error(err.stack);
    })
    .on("data", (chunk) => {
      callbackResponse += chunk;
    })
    .on("end", () => {
      let data = qs.parse(callbackResponse);
      console.log(data);

      data = JSON.parse(JSON.stringify(data));

      const paytmChecksum = data.CHECKSUMHASH;

      var isVerifySignature = PaytmChecksum.verifySignature(
        data,
        PaytmConfig.PaytmConfig.key,
        paytmChecksum
      );
      if (isVerifySignature) {
        console.log("Checksum Matched");

        var paytmParams = {};

        paytmParams.body = {
          mid: PaytmConfig.PaytmConfig.mid,
          orderId: data.ORDERID,
        };

        PaytmChecksum.generateSignature(
          JSON.stringify(paytmParams.body),
          PaytmConfig.PaytmConfig.key
        ).then(function (checksum) {
          paytmParams.head = {
            signature: checksum,
          };

          var post_data = JSON.stringify(paytmParams);

          var options = {
            /* for Staging */
            hostname: "securegw-stage.paytm.in",

            /* for Production */
            // hostname: 'securegw.paytm.in',

            port: 443,
            path: "/v3/order/status",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": post_data.length,
            },
          };

          // Set up the request
          var response = "";
          var post_req = https.request(options, function (post_res) {
            post_res.on("data", function (chunk) {
              response += chunk;
            });

            post_res.on("end", function () {
              const paymentdata = JSON.parse(response);
              const dateofpayment1 = paymentdata.body.txnDate.split(" ");
              const dateofpayment2 = dateofpayment1[0];
              const dateofpayment3 = String(dateofpayment2)
                .split("-")
                .reverse()
                .join("");
              const dateofpayment =
                dateofpayment3.slice(0, 2) +
                "-" +
                dateofpayment3.slice(2, 4) +
                "-" +
                dateofpayment3.slice(4);

              const timeofpayment = dateofpayment1[1].split(".");
              console.log("Response: ", paymentdata);
              res.write(`<head>
              <title>Payment Status</title>
              <link href='https://fonts.googleapis.com/css2?family=Poppins' rel='stylesheet' type='text/css'>
              <style>
              body {
                background: url("https://img.freepik.com/free-vector/ophthalmology-background-with-doctor-ophthalmologist-check-vision-with-eye-test-chart-vector-hand-drawn-illustration-man-optometrist-glasses-drops-machines-eyesight-medical-exam_107791-11406.jpg?w=1380&t=st=1663077463~exp=1663078063~hmac=9384ca1d5a94216adf900feb6667395bc154be4e0c2505322f4f4b2c7e616d09")
              }
              .box {
                font-family: Poppins;
                margin-left: 33%;
                margin-top: 5.5%;
                padding-left: 2%;
                margin-right: 30%;
                padding-bottom: 4%;
                padding-top: 1.9%;
                background-color: white;
                border-radius: 0px;
                border: 15px solid #808080;
                color: #2A4764;
              }
              .leftside {
                float:left; 
                margin-top: 0;
              }
              .rightside {
                margin-left: 38%;
                font-weight: 400;
                margin-right: 1%;
              }
              .backlink {
                text-decoration:none;
                color:white; 
                background-color: #022547;
                padding: 1% 1% 1% 1%;
                border-radius:30px;
              }
              .centera {
                font-family: Poppins;
                margin-top: 1%; 
              }
              @media screen and (max-width: 1000px) {
                  .box {
                    margin-left: 0%;
                    margin-right: 0%;
                    margin-top: 37%;
                    background-color: white;
                    font-size: 28px;
                    padding-left: 5%;
                    height: 53vh;
                    
                }
                .rightside {
                    padding-right: 5%;
                    word-wrap: break-word;
                }
                .backlink {
                text-decoration:none;
                color:white; 
                background-color: #022547;
                padding: 2% 3% 2% 3%;
                border-radius:35px;
                font-size: 30px;
                margin-top: 10px;
                }
                .centera {
                  margin-top: 5%;
                }
              }
              </style>
              </head>
              <body>
              <div class="box">
              <h1 style="margin-left: 25%; margin-bottom: 7%; color: white;
                          background-color:#022547;padding:1% 4% 1% 3.5%; ">
                          Payment Status</h1>
              <h3 class="leftside">TXN ID: </h3>
                          <h3 class="rightside">
                          ${paymentdata.body.txnId}</h3>
              <h3 class="leftside">BANK TXN ID: 
                          <h3 class="rightside">
                          ${paymentdata.body.bankTxnId}</h3></h3>
              <h3 class="leftside">Bank Name: 
                          <h3 class="rightside">
                          ${paymentdata.body.bankName}</h3></h3>
              <h3 class="leftside">Bank Gateway Name: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  
                          <h3 class="rightside">         
                          ${paymentdata.body.gatewayName}</h3></h3>
              <h3 class="leftside">Amount: 
                          <h3 class="rightside">
                          Rs. ${paymentdata.body.txnAmount}</h3></h3>
              <h3 class="leftside">Date: 
                          <h3 class="rightside">
                          ${dateofpayment}</h3></h3>
              <h3 class="leftside">Time: 
                          <h3 class="rightside">
                          ${timeofpayment[0]}</h3></h3>
              <h3 class="leftside">Transaction Status:</h3>
              <h3 class="rightside";>
              ${paymentdata.body.resultInfo.resultMsg}</h3>
              </div><br>
              <center class="centera"><a class="backlink" href="/" >
              <b>Back to Home</b></a></center>
              </body>`);
              res.end();
            });
          });

          // post the data
          post_req.write(post_data);
          post_req.end();
        });
      } else {
        console.log("Checksum Mismatched");
      }
    });
});

module.exports = router;
