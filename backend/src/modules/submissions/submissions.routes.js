const express = require("express");
const {
  upsertSubmission,
  getMySubmission,
  requestUploadUrl,
  uploadPitchDeck,
  attachPitchDeck,
  getPitchDeckUrl,
  getPitchDeckFile,
} = require("./submissions.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");

const router = express.Router();

// Raw PDF/PPT bytes for the local-disk upload endpoint. Mounted per-route
// (not globally) so every other route keeps express.json() parsing.
// NOTE: the :key segment arrives URL-encoded (slashes become %2F), which
// Express decodes back into req.params.key.
const rawUploadBody = express.raw({
  type: [
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  limit: "50mb",
});

// Mounted at /api/team in app.js, so full paths are:
//   POST /api/team/submission
//   GET  /api/team/submission
//   POST /api/team/submission/upload-url
//   PUT  /api/team/submission/upload/:key   (STORAGE_PROVIDER=local only)
//   POST /api/team/submission/pitch-deck
//   GET  /api/team/submission/pitch-deck-url
//   GET  /api/team/submission/pitch-deck-file[?teamId=] (local only)
router.post("/submission", requireAuth, requireRole("PARTICIPANT"), upsertSubmission);
router.get("/submission", requireAuth, requireRole("PARTICIPANT"), getMySubmission);
router.post("/submission/upload-url", requireAuth, requireRole("PARTICIPANT"), requestUploadUrl);
router.put("/submission/upload/:key", requireAuth, requireRole("PARTICIPANT"), rawUploadBody, uploadPitchDeck);
router.post("/submission/pitch-deck", requireAuth, requireRole("PARTICIPANT"), attachPitchDeck);
router.get(
  "/submission/pitch-deck-file",
  requireAuth,
  requireRole("PARTICIPANT", "JURY", "ADMIN"),
  getPitchDeckFile
);
router.get(
  "/submission/pitch-deck-url",
  requireAuth,
  requireRole("PARTICIPANT", "JURY", "ADMIN"),
  getPitchDeckUrl
);

module.exports = router;
