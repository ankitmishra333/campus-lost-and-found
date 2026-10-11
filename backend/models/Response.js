const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: [true, "Message can't be empty"],
      trim: true,
      maxlength: 500,
    },
    // true = "I think this is mine" / "this is my found item", not just a question
    isClaim: {
      type: Boolean,
      default: false,
    },
    // set true once the item's poster confirms this person as the rightful owner/finder
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Response", responseSchema);
