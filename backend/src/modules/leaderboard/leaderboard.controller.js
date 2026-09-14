const asyncHandler = require("../../utils/asyncHandler");
const { buildLeaderboard } = require("./leaderboard.service");
const { isScoresFrozen } = require("../../utils/settings");

/**
 * GET /api/leaderboard
 * Public / participant. Returns aggregated ranking with anonymized jury
 * marks (spec 5). Accepts an optional ?trackId= filter for track-scoped
 * views. Exposes whether scores are currently frozen so the client can
 * show "final results pending" instead of a stale board.
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  const { trackId } = req.query;
  const [rows, frozen] = await Promise.all([
    buildLeaderboard(trackId ? { trackId } : {}),
    isScoresFrozen(),
  ]);

  res.json({ leaderboard: rows, scoresFrozen: frozen });
});

module.exports = { getLeaderboard };
