const express = require("express");
const { register, login, logout, me } = require("./auth.controller");
const { requireAuth } = require("../../middleware/auth");
const { authLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

module.exports = router;
