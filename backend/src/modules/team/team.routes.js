const express = require("express");
const { createTeam, getMyTeam, joinTeam, lockTrack } = require("./team.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, requireRole("PARTICIPANT"), createTeam);
router.get("/me", requireAuth, requireRole("PARTICIPANT"), getMyTeam);
router.post("/join", requireAuth, requireRole("PARTICIPANT"), joinTeam);
router.post("/track-lock", requireAuth, requireRole("PARTICIPANT"), lockTrack);

module.exports = router;
