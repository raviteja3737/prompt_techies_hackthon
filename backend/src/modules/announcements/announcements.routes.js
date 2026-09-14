const express = require("express");
const { listForParticipant } = require("./announcements.controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// Any authenticated role can read the dashboard feed (participant, jury,
// admin all see event-wide announcements).
router.get("/", requireAuth, listForParticipant);

module.exports = router;
