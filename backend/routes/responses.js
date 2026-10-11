const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const Response = require("../models/Response");
const { protect } = require("../middleware/auth");

/**
 * GET /api/items/:itemId/responses
 * Public thread of messages/claims on an item.
 */
router.get("/items/:itemId/responses", async (req, res) => {
  try {
    const responses = await Response.find({ item: req.params.itemId })
      .sort({ createdAt: 1 })
      .populate("author", "name");
    res.json(responses);
  } catch (err) {
    res.status(400).json({ message: "Failed to load responses", error: err.message });
  }
});

/**
 * POST /api/items/:itemId/responses
 * Leave a message or a claim ("this is mine") on someone else's item.
 */
router.post("/items/:itemId/responses", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.postedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't respond to your own report" });
    }
    if (!req.body.message || !req.body.message.trim()) {
      return res.status(400).json({ message: "Message can't be empty" });
    }

    const response = await Response.create({
      item: item._id,
      author: req.user._id,
      message: req.body.message.trim(),
      isClaim: !!req.body.isClaim,
    });
    await response.populate("author", "name");
    res.status(201).json(response);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Failed to post response", error: err.message });
  }
});

/**
 * PATCH /api/responses/:id/verify
 * The item's poster confirms this responder as the rightful owner/finder.
 * This is the core "connect people" mechanic: verifying auto-resolves the item.
 */
router.patch("/responses/:id/verify", protect, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ message: "Response not found" });

    const item = await Item.findById(response.item);
    if (!item) return res.status(404).json({ message: "Item not found" });

    const isOwner = item.postedBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the reporter can verify a claim" });
    }

    response.verified = true;
    await response.save();

    item.resolved = true;
    item.resolvedBy = response.author;
    item.resolvedAt = new Date();
    await item.save();

    res.json({ response, item });
  } catch (err) {
    res.status(400).json({ message: "Failed to verify response", error: err.message });
  }
});

/**
 * DELETE /api/responses/:id
 * The response's author, the item's poster, or an admin may remove it.
 */
router.delete("/responses/:id", protect, async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) return res.status(404).json({ message: "Response not found" });

    const item = await Item.findById(response.item);
    const isAuthor = response.author.toString() === req.user._id.toString();
    const isItemOwner = item && item.postedBy.toString() === req.user._id.toString();

    if (!isAuthor && !isItemOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed to delete this response" });
    }

    await response.deleteOne();
    res.json({ message: "Response deleted" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete response", error: err.message });
  }
});

module.exports = router;
