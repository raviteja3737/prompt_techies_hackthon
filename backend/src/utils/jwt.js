const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("[env] JWT_SECRET is missing. Copy .env.example to .env and set a fresh value (openssl rand -hex 32).");
  }
  return secret;
}

function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = { signToken, verifyToken };
