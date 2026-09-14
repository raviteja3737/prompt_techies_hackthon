const express = require("express");
const { getProfile, updateProfile } = require("./profile.controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, getProfile);
router.patch("/", requireAuth, updateProfile);

module.exports = router;
