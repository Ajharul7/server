const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
  couponid: {
    type: String,
    required: false,
  },
  coupon: {
    type: String,
    required: false,
  },
});

const Coupon = mongoose.model("Coupon", CouponSchema);
module.exports = Coupon;
