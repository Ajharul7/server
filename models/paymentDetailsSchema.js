const mongoose = require("mongoose");

const paymentDetailsSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phonenumber: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  pgname: {
    type: String,
    required: true,
  },
  pglocation: {
    type: String,
    required: true,
  },
  roomtype: {
    type: String,
    required: true,
  },
  couponused: {
    type: String,
    required: false,
  },
  perpersonamount: {
    type: String,
    required: true,
  },
  totalamount: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const PaymentDetails = mongoose.model("PaymentDetails", paymentDetailsSchema);
module.exports = PaymentDetails;
