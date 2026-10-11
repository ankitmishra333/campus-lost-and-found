const jwt = require("jsonwebtoken");
const User = require("../models/User");

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

/** Blocks the request unless a valid token is present; attaches req.user. */
async function protect(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ message: "Please log in to do that" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "This account no longer exists" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Your session has expired — please log in again" });
  }
}

/** Attaches req.user if a valid token is present, but never blocks the request. */
async function optionalAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch (err) {
    // invalid/expired token on an optional route — just proceed unauthenticated
  }
  next();
}

module.exports = { protect, optionalAuth };
