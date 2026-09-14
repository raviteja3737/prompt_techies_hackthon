const express = require("express");
const { list, markRead, markAllRead } = require("./notifications.controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

// Every route here is scoped to req.user.id inside the controller — any
// authenticated role (participant/jury/admin) manages only their own feed.
router.get("/", requireAuth, list);
router.patch("/read-all", requireAuth, markAllRead);
router.patch("/:id/read", requireAuth, markRead);

module.exports = router;
