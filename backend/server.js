require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const itemsRouter = require("./routes/items");
const authRouter = require("./routes/auth");
const responsesRouter = require("./routes/responses");

const app = express();

// --- Middleware ---
app.use(express.json());

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : "*",
  })
);

// --- Routes ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/items", itemsRouter);
// handles /api/items/:itemId/responses and /api/responses/:id(/verify) —
// see routes/responses.js for why it's mounted at the bare /api prefix
app.use("/api", responsesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Central error handler (catches anything thrown/passed to next())
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Campus Lost & Found API running on http://localhost:${PORT}`);
  });
});
