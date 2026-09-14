const express = require("express");
const {
  upsertSubmission,
  getMySubmission,
  requestUploadUrl,
  attachPitchDeck,
  getPitchDeckUrl,
} = require("./submissions.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

// Mounted at /api/team in app.js, so full paths are:
//   POST /api/team/submission
//   GET  /api/team/submission
//   POST /api/team/submission/upload-url
//   POST /api/team/submission/pitch-deck
//   GET  /api/team/submission/pitch-deck-url
router.post("/submission", requireAuth, requireRole("PARTICIPANT"), upsertSubmission);
router.get("/submission", requireAuth, requireRole("PARTICIPANT"), getMySubmission);
router.post("/submission/upload-url", requireAuth, requireRole("PARTICIPANT"), requestUploadUrl);
router.post("/submission/pitch-deck", requireAuth, requireRole("PARTICIPANT"), attachPitchDeck);
router.get(
  "/submission/pitch-deck-url",
  requireAuth,
  requireRole("PARTICIPANT", "JURY", "ADMIN"),
  getPitchDeckUrl
);

module.exports = router;
