const express = require("express");
const { checkIn, listAttendees, connect, listConnections } = require("./networking.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

router.post("/check-in", requireAuth, requireRole("PARTICIPANT"), checkIn);
router.get("/attendees", requireAuth, requireRole("PARTICIPANT"), listAttendees);
router.post("/connect", requireAuth, requireRole("PARTICIPANT"), connect);
router.get("/connections", requireAuth, requireRole("PARTICIPANT"), listConnections);

module.exports = router;
