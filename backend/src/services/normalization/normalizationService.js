/**
 * Score Normalization Pipeline (spec §17).
 *
 * Problem: different jury members score with different baselines/severity.
 * A jury member who never gives above 18/25 unfairly drags down every team
 * they evaluate relative to a jury member who scores generously. Raw-score
 * leaderboards conflate "team quality" with "which judges happened to
 * review this team".
 *
 * Algorithm: per-jury z-score normalization, re-scaled back onto the
 * original 0-25 rubric range, computed independently per criterion
 * (innovation/technical/design/viability).
 *
 *   1. Group every LOCKED evaluation by juryId.
 *   2. For each jury member, compute mean (μ) and population stddev (σ)
 *      of their scores, per criterion, across every team they evaluated.
 *   3. Each raw score `s` becomes a z-score: z = (s - μ) / σ.
 *   4. z-scores are re-centered on the *global* mean/stddev for that
 *      criterion (across all jury members) so the output stays in a
 *      familiar ~0-25 range instead of a small z-score number:
 *          normalized = globalMean + z * globalStdDev
 *   5. Values are clamped to [0, 25] and rounded to 2 decimals — a
 *      normalized score should never leave the rubric's own range.
 *
 * Edge cases:
 *   - A jury member with only one scored team (σ = 0, or only one data
 *     point) can't be normalized against themselves — their raw scores
 *     pass through unchanged for that criterion rather than dividing by
 *     zero or being dropped.
 *   - Fewer than 2 total evaluations globally -> normalization is a no-op
 *     (nothing to normalize against).
 *
 * This NEVER mutates the Evaluation table — raw scores in the database
 * are the source of truth and are always what jury members/admins see on
 * an individual evaluation. Normalization is applied only in-memory, at
 * leaderboard aggregation time, when SystemSetting("normalizationEnabled")
 * is true.
 */

const CRITERIA = ["innovation", "technical", "design", "viability"];

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values, avg) {
  if (values.length === 0) return 0;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {Array<{ juryId: string, innovation: number, technical: number, design: number, viability: number }>} evaluations
 *        Every LOCKED evaluation the normalization should be computed over
 *        (typically: all locked evaluations event-wide, or scoped to a
 *        single track — caller decides the scope).
 * @returns {Map<string, { innovation: number, technical: number, design: number, viability: number }>}
 *          Keyed by evaluation identity — see normalizeEvaluations() below,
 *          which is the actual entry point callers should use.
 */
function computeNormalizedScores(evaluations) {
  const perCriterionStats = {};

  for (const criterion of CRITERIA) {
    // Global stats for this criterion, across every jury member.
    const allValues = evaluations.map((e) => e[criterion]);
    const globalMean = mean(allValues);
    const globalStdDev = stdDev(allValues, globalMean);

    // Per-jury stats for this criterion.
    const byJury = new Map();
    for (const evaluation of evaluations) {
      if (!byJury.has(evaluation.juryId)) byJury.set(evaluation.juryId, []);
      byJury.get(evaluation.juryId).push(evaluation[criterion]);
    }

    const juryStats = new Map();
    for (const [juryId, values] of byJury.entries()) {
      const juryMean = mean(values);
      const juryStdDev = stdDev(values, juryMean);
      juryStats.set(juryId, { mean: juryMean, stdDev: juryStdDev });
    }

    perCriterionStats[criterion] = { globalMean, globalStdDev, juryStats };
  }

  return { perCriterionStats, insufficientData: evaluations.length < 2 };
}

/**
 * Applies the normalization pipeline to a flat list of LOCKED evaluations
 * and returns a new array (input is never mutated) with each criterion
 * replaced by its normalized value. Non-criterion fields (id, teamId,
 * juryId, feedback, etc.) pass through unchanged.
 *
 * @param {Array<object>} evaluations
 * @returns {Array<object>}
 */
function normalizeEvaluations(evaluations) {
  if (!Array.isArray(evaluations) || evaluations.length === 0) return evaluations;

  const { perCriterionStats, insufficientData } = computeNormalizedScores(evaluations);
  if (insufficientData) return evaluations; // nothing meaningful to normalize against

  return evaluations.map((evaluation) => {
    const normalized = { ...evaluation };

    for (const criterion of CRITERIA) {
      const { globalMean, globalStdDev, juryStats } = perCriterionStats[criterion];
      const stats = juryStats.get(evaluation.juryId);
      const raw = evaluation[criterion];

      // No spread for this jury member on this criterion (single data
      // point, or literally identical scores every time) -> can't
      // z-score meaningfully; keep the raw value rather than force a
      // divide-by-zero to 0.
      if (!stats || stats.stdDev === 0 || globalStdDev === 0) {
        normalized[criterion] = raw;
        continue;
      }

      const z = (raw - stats.mean) / stats.stdDev;
      const rescaled = globalMean + z * globalStdDev;
      normalized[criterion] = Math.round(clamp(rescaled, 0, 25) * 100) / 100;
    }

    return normalized;
  });
}

module.exports = { normalizeEvaluations, CRITERIA };
