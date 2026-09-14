const { customAlphabet } = require("nanoid");

// Cryptographically secure 6-char alphanumeric suffix, uppercase-only,
// excluding visually ambiguous characters (0/O, 1/I).
const nanoid = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

function generateTeamCode() {
  return `PRMPT-${nanoid()}`;
}

module.exports = { generateTeamCode };
