const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const Response = require("../models/Response");
const { protect } = require("../middleware/auth");

function isOwnerOrAdmin(item, user) {
  return item.postedBy.toString() === user._id.toString() || user.role === "admin";
}

/**
 * GET /api/items/categories
 * Declared before "/:id" so Express doesn't treat "categories" as an id.
 */
router.get("/categories", (req, res) => {
  res.json(Item.CATEGORIES);
});

/**
 * GET /api/items/stats
 * Quick counts for the dashboard header.
 */
router.get("/stats", async (req, res) => {
  try {
    const [totalLost, totalFound, totalResolved, totalItems] = await Promise.all([
      Item.countDocuments({ status: "lost" }),
      Item.countDocuments({ status: "found" }),
      Item.countDocuments({ resolved: true }),
      Item.countDocuments({}),
    ]);
    res.json({ totalLost, totalFound, totalResolved, totalItems });
  } catch (err) {
    res.status(500).json({ message: "Failed to load stats", error: err.message });
  }
});

/**
 * GET /api/items/mine/list
 * Items the logged-in user has posted (for the "My Reports" dashboard).
 */
router.get("/mine/list", protect, async (req, res) => {
  try {
    const items = await Item.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "Failed to load your reports", error: err.message });
  }
});

/**
 * GET /api/items
 * List items with optional search + filtering + pagination.
 *
 * Query params (all optional):
 *   q          - free text search across title/description/location
 *   category   - exact category match
 *   status     - "lost" | "found"
 *   resolved   - "true" | "false"
 *   page       - default 1
 *   limit      - default 12
 *   sort       - "newest" (default) | "oldest"
 */
router.get("/", async (req, res) => {
  try {
    const { q, category, status, resolved, page = 1, limit = 12, sort = "newest" } = req.query;

    const filter = {};

    if (q && q.trim()) {
      filter.$text = { $search: q.trim() };
    }
    if (category && category !== "all") {
      filter.category = category;
    }
    if (status && status !== "all") {
      filter.status = status;
    }
    if (resolved === "true" || resolved === "false") {
      filter.resolved = resolved === "true";
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    const sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const [items, total] = await Promise.all([
      Item.find(filter).sort(sortOption).skip(skip).limit(limitNum).populate("postedBy", "name"),
      Item.countDocuments(filter),
    ]);

    res.json({
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch items", error: err.message });
  }
});

/**
 * GET /api/items/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("postedBy", "name");
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: "Invalid item id", error: err.message });
  }
});

/**
 * POST /api/items
 * Create a new lost/found report. Requires login — the poster's identity
 * comes from the verified token, never from the request body, so contact
 * info on a listing can't be spoofed.
 */
router.post("/", protect, async (req, res) => {
  try {
    const item = await Item.create({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      status: req.body.status,
      location: req.body.location,
      date: req.body.date,
      imageUrl: req.body.imageUrl,
      postedBy: req.user._id,
      contactName: req.user.name,
      contactEmail: req.user.email,
    });
    res.status(201).json(item);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Failed to create item", error: err.message });
  }
});

/**
 * PUT /api/items/:id
 * Update an existing item. Only the original poster or an admin may edit,
 * and only a whitelisted set of fields can be changed (ownership/contact
 * info is never editable via this route).
 */
router.put("/:id", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!isOwnerOrAdmin(item, req.user)) {
      return res.status(403).json({ message: "You can only edit your own reports" });
    }

    const editableFields = ["title", "description", "category", "status", "location", "date", "imageUrl"];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    });

    await item.save();
    res.json(item);
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(400).json({ message: "Failed to update item", error: err.message });
  }
});

/**
 * PATCH /api/items/:id/resolve
 * Manually mark resolved/reopened (separate from the verified-claim flow
 * in routes/responses.js, for when the poster just wants to close it
 * themselves — e.g. they found the owner outside the app).
 */
router.patch("/:id/resolve", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!isOwnerOrAdmin(item, req.user)) {
      return res.status(403).json({ message: "Only the reporter can change resolved status" });
    }

    const nextResolved = req.body.resolved !== undefined ? !!req.body.resolved : !item.resolved;
    item.resolved = nextResolved;
    item.resolvedAt = nextResolved ? new Date() : null;
    if (!nextResolved) item.resolvedBy = null;

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: "Failed to update item status", error: err.message });
  }
});

/**
 * DELETE /api/items/:id
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!isOwnerOrAdmin(item, req.user)) {
      return res.status(403).json({ message: "You can only delete your own reports" });
    }

    await item.deleteOne();
    await Response.deleteMany({ item: item._id });
    res.json({ message: "Item deleted", id: item._id });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete item", error: err.message });
  }
});

module.exports = router;
