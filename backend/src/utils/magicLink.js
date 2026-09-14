const crypto = require("crypto");

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Raw token sent to the jury member (email/dev response) — never stored as-is. */
function generateRawToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/** One-way hash actually persisted in MagicLinkToken.tokenHash. */
function hashToken(rawToken) {
  const salt = process.env.JWT_SECRET || "dev-magic-link-salt";
  return crypto.createHmac("sha256", salt).update(rawToken).digest("hex");
}

function newExpiry() {
  return new Date(Date.now() + TOKEN_TTL_MS);
}

module.exports = { generateRawToken, hashToken, newExpiry, TOKEN_TTL_MS };
