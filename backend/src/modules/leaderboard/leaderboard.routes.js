const express = require("express");
const { getLeaderboard } = require("./leaderboard.controller");
const { optionalAuth } = require("../../middleware/auth");

const router = express.Router();

// Public per spec ("GET /api/leaderboard — Public / Participant"). Uses
// optionalAuth only so we could later tailor the response to a logged-in
// participant/jury member without requiring a session.
router.get("/", optionalAuth, getLeaderboard);

module.exports = router;
