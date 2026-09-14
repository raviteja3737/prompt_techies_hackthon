const rateLimit = require("express-rate-limit");

// In-memory limiter, sufficient for a single backend instance. If this is
// later scaled horizontally, swap in a Redis-backed store compatible with
// the installed express-rate-limit version (the store API changes between
// major versions, so it's deliberately not wired up here to avoid shipping
// an untested/incompatible implementation).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Evaluation writes are security/integrity sensitive (score tampering,
// brute-force probing of teamIds) — keep the ceiling well below general
// traffic without blocking a jury member legitimately working the queue.
const juryLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many evaluation requests. Please slow down." },
});

// Score freeze / jury assignment / settings changes are rare, high-impact
// admin actions — a tight ceiling mainly guards against a misbehaving
// admin client retrying in a loop, not against a legitimate workflow.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests. Please slow down." },
});

module.exports = { authLimiter, generalLimiter, juryLimiter, adminLimiter };
