const express = require("express");
const { getQueue, evaluate, requestLink, verifyLink, getEvaluations } = require("./jury.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { juryLimiter, authLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

// Public — pre-provisioned jury accounts authenticate via magic link
// instead of a password (spec §11). Rate-limited like /api/auth/*.
router.post("/magic-link/request", authLimiter, requestLink);
router.post("/magic-link/verify", authLimiter, verifyLink);

router.get("/queue", requireAuth, requireRole("JURY"), getQueue);
router.post("/evaluate", requireAuth, requireRole("JURY"), juryLimiter, evaluate);

// Role matrix is enforced inside jury.service.getEvaluationsForTeam() itself
// (ADMIN sees real jury identity; assigned JURY sees anonymized peers +
// isYou; a PARTICIPANT sees only their own team's locked/anonymized
// scores) — so this route only needs requireAuth, not a single requireRole.
router.get("/evaluations/:teamId", requireAuth, getEvaluations);

module.exports = router;
