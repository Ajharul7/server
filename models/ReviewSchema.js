const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  pgid: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  pgname: {
    type: String,
    required: true,
  },
  pgloca: {
    type: String,
    required: true,
  },
  star: {
    type: String,
    required: true,
  },
  comment: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const Review = mongoose.model("Review", ReviewSchema);
module.exports = Review;
