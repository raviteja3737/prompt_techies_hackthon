const prisma = require("../config/prisma");

/**
 * Thin typed wrapper around the generic SystemSetting(key, value Json)
 * table. Centralizing the known keys here means the admin module, team
 * module (deadline enforcement) and sockets module all agree on the same
 * shape instead of each guessing at SystemSetting's JSON contents.
 */
const KEYS = Object.freeze({
  SCORES_FROZEN: "scoresFrozen",
  TRACK_SELECTION_DEADLINE: "trackSelectionDeadline",
  SUBMISSION_DEADLINE: "submissionDeadline",
  NORMALIZATION_ENABLED: "normalizationEnabled",
});

async function getSetting(key) {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row ? row.value : null;
}

async function setSetting(key, value) {
  return prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

async function isScoresFrozen() {
  const value = await getSetting(KEYS.SCORES_FROZEN);
  return value === true;
}

/** Returns a Date or null. Deadlines are stored as ISO strings. */
async function getDeadline(key) {
  const value = await getSetting(key);
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Throws nothing — returns true if `now` is still before the deadline (or no deadline is set). */
async function isBeforeDeadline(key, now = new Date()) {
  const deadline = await getDeadline(key);
  if (!deadline) return true; // no deadline configured -> unrestricted
  return now.getTime() <= deadline.getTime();
}

/** Fetches every known setting at once, for the admin dashboard/settings endpoints. */
async function getAllSettings() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: Object.values(KEYS) } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    scoresFrozen: map[KEYS.SCORES_FROZEN] === true,
    trackSelectionDeadline: map[KEYS.TRACK_SELECTION_DEADLINE] || null,
    submissionDeadline: map[KEYS.SUBMISSION_DEADLINE] || null,
    normalizationEnabled: map[KEYS.NORMALIZATION_ENABLED] === true,
  };
}

module.exports = {
  KEYS,
  getSetting,
  setSetting,
  isScoresFrozen,
  getDeadline,
  isBeforeDeadline,
  getAllSettings,
};
