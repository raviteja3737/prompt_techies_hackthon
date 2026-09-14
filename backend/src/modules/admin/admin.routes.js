const express = require("express");
const {
  getDashboard,
  getSettings,
  updateSettings,
  getScoreStatus,
  freezeScores,
  listJuryAssignments,
  createJuryAssignment,
  deleteJuryAssignment,
  listAuditLogs,
} = require("./admin.controller");
const {
  adminList: listAnnouncements,
  create: createAnnouncement,
  update: updateAnnouncement,
  remove: deleteAnnouncement,
} = require("../announcements/announcements.controller");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { adminLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/dashboard", getDashboard);

router.get("/announcements", listAnnouncements);
router.post("/announcements", adminLimiter, createAnnouncement);
router.patch("/announcements/:id", adminLimiter, updateAnnouncement);
router.delete("/announcements/:id", adminLimiter, deleteAnnouncement);

router.get("/settings", getSettings);
router.patch("/settings", adminLimiter, updateSettings);

router.get("/score-status", getScoreStatus);
router.post("/freeze-scores", adminLimiter, freezeScores);

router.get("/jury-assignments", listJuryAssignments);
router.post("/jury-assignments", adminLimiter, createJuryAssignment);
router.delete("/jury-assignments/:id", adminLimiter, deleteJuryAssignment);

router.get("/audit-logs", listAuditLogs);

module.exports = router;
