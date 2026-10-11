const mongoose = require("mongoose");

const CATEGORIES = [
  "Electronics",
  "Books & Stationery",
  "Bags",
  "Clothing",
  "ID Cards & Documents",
  "Keys",
  "Accessories",
  "Other",
];

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 1000,
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORIES,
      default: "Other",
    },
    status: {
      type: String,
      required: true,
      enum: ["lost", "found"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: 150,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    // set when a response to this item is verified by the poster (see routes/responses.js)
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Text index powers the free-text search endpoint (title + description + location)
itemSchema.index({ title: "text", description: "text", location: "text" });

itemSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model("Item", itemSchema);
