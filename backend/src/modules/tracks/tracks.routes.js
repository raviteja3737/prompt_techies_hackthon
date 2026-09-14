const express = require("express");
const { listTracks, getTrack, createTrack, updateTrack, deleteTrack } = require("./tracks.controller");
const { requireAuth, requireRole, optionalAuth } = require("../../middleware/auth");
const { adminLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

router.get("/", optionalAuth, listTracks);
router.get("/:id", requireAuth, getTrack);
router.post("/", requireAuth, requireRole("ADMIN"), adminLimiter, createTrack);
router.patch("/:id", requireAuth, requireRole("ADMIN"), adminLimiter, updateTrack);
router.delete("/:id", requireAuth, requireRole("ADMIN"), adminLimiter, deleteTrack);

module.exports = router;
