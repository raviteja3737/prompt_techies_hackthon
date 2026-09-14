const prisma = require("../../config/prisma");
const { aliasForEvaluations } = require("../../utils/anonymizer");
const { normalizeEvaluations } = require("../../services/normalization/normalizationService");
const { getSetting, KEYS } = require("../../utils/settings");

/**
 * Builds the public leaderboard: every team's aggregate score plus the
 * full per-parameter breakdown from each jury, with jury identity masked
 * behind a per-team "Jury #N" alias. Only LOCKED evaluations count \u2014
 * drafts are a judge's private working copy.
 *
 * Score normalization (spec \u00a717) is applied here, in memory, only when
 * SystemSetting("normalizationEnabled") is true. It NEVER touches the
 * underlying Evaluation rows \u2014 raw scores stay exactly as each jury
 * member submitted them. The normalization pool is every LOCKED
 * evaluation event-wide (not just the current `filters.trackId` teams),
 * so a track filter doesn't shrink the statistical sample a jury
 * member's baseline is computed against.
 *
 * @param {{ trackId?: string }} filters
 */
async function buildLeaderboard(filters = {}) {
  const normalizationEnabled = (await getSetting(KEYS.NORMALIZATION_ENABLED)) === true;

  // Every locked evaluation event-wide is the normalization pool,
  // regardless of the track filter applied to which teams are *shown*.
  const allLockedEvaluations = normalizationEnabled
    ? await prisma.evaluation.findMany({ where: { status: "LOCKED" } })
    : [];
  const normalizedById = new Map();
  if (normalizationEnabled) {
    for (const normalized of normalizeEvaluations(allLockedEvaluations)) {
      normalizedById.set(normalized.id, normalized);
    }
  }

  const teams = await prisma.team.findMany({
    where: filters.trackId ? { trackId: filters.trackId } : undefined,
    include: {
      track: { select: { id: true, title: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      evaluations: {
        where: { status: "LOCKED" },
      },
    },
  });

  const rows = teams.map((team) => {
    // Swap in normalized values (if enabled) before anonymizing/aggregating \u2014
    // the alias step only strips juryId, it doesn't care which score is on
    // the object.
    const scoredEvaluations = normalizationEnabled
      ? team.evaluations.map((e) => normalizedById.get(e.id) || e)
      : team.evaluations;

    const breakdown = aliasForEvaluations(team.id, scoredEvaluations);

    const totals = scoredEvaluations.reduce(
      (acc, e) => {
        acc.innovation += e.innovation;
        acc.technical += e.technical;
        acc.design += e.design;
        acc.viability += e.viability;
        return acc;
      },
      { innovation: 0, technical: 0, design: 0, viability: 0 }
    );

    const juryCount = scoredEvaluations.length;
    const totalScore = totals.innovation + totals.technical + totals.design + totals.viability;
    const averageScore = juryCount > 0 ? totalScore / juryCount : 0;

    return {
      teamId: team.id,
      teamName: team.name,
      track: team.track ? { id: team.track.id, title: team.track.title } : null,
      members: team.members.map((m) => m.user.name),
      juryCount,
      averageScore: Math.round(averageScore * 100) / 100,
      totalScore: Math.round(totalScore * 100) / 100,
      normalized: normalizationEnabled,
      breakdown, // [{ innovation, technical, design, viability, feedback, juryAlias }]
    };
  });

  // Unscored teams (no locked evaluations yet) sort to the bottom rather
  // than tying with a genuine zero score.
  rows.sort((a, b) => {
    if (a.juryCount === 0 && b.juryCount === 0) return 0;
    if (a.juryCount === 0) return 1;
    if (b.juryCount === 0) return -1;
    return b.averageScore - a.averageScore;
  });
  let rank = 0;
  rows.forEach((row) => {
    if (row.juryCount > 0) {
      rank += 1;
      row.rank = rank;
    } else {
      row.rank = null;
    }
  });

  return rows;
}

module.exports = { buildLeaderboard };
