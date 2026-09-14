const crypto = require("crypto");

/**
 * Score Anonymization Transformer
 * --------------------------------
 * Public/participant-facing responses must never expose a real jury_id.
 * Every team gets its own independent "Jury #1, Jury #2, ..." aliasing,
 * so the same judge can be "Jury #1" for Team Alpha and "Jury #2" for
 * Team Beta \u2014 there is no fixed judge -> alias mapping to reverse-engineer.
 *
 * Ordering is derived from an HMAC of (teamId + juryId) rather than
 * insertion order or juryId sort order, so alias assignment can't be used
 * to infer submission timing or judge identity either.
 */
function aliasForEvaluations(teamId, evaluations) {
  const salt = process.env.JURY_ALIAS_SALT;
  if (!salt) {
    throw new Error("[env] JURY_ALIAS_SALT is missing. Copy .env.example to .env and set a fresh value (openssl rand -hex 32).");
  }

  const ranked = [...evaluations]
    .map((evaluation) => {
      const digest = crypto
        .createHmac("sha256", salt)
        .update(`${teamId}:${evaluation.juryId}`)
        .digest("hex");
      return { evaluation, digest };
    })
    .sort((a, b) => (a.digest < b.digest ? -1 : a.digest > b.digest ? 1 : 0));

  return ranked.map(({ evaluation }, index) => sanitizeEvaluation(evaluation, index + 1));
}

/** Strips juryId/jury relation and attaches the sequential alias. */
function sanitizeEvaluation(evaluation, aliasNumber) {
  const { juryId, jury, ...rest } = evaluation;
  return {
    ...rest,
    juryAlias: `Jury #${aliasNumber}`,
  };
}

module.exports = { aliasForEvaluations };
