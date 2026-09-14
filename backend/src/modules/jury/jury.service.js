const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const { recordAudit } = require("../../utils/auditLog");
const { broadcastLeaderboard } = require("../../sockets");
const { generateRawToken, hashToken, newExpiry } = require("../../utils/magicLink");
const { signToken } = require("../../utils/jwt");
const { aliasForEvaluations } = require("../../utils/anonymizer");
const { notifyUsers } = require("../../utils/notify");
const { sendMail } = require("../../services/email/emailService");

/**
 * A jury member's queue is *only* the teams an admin has explicitly
 * assigned to them (JuryAssignment). There is no path here to list or
 * fetch an arbitrary team — every lookup is scoped by `juryId: juryUserId`.
 */
async function getQueueForJury(juryUserId) {
  const assignments = await prisma.juryAssignment.findMany({
    where: { juryId: juryUserId },
    include: {
      track: { select: { id: true, title: true } },
      team: {
        include: {
          track: { select: { id: true, title: true } },
          submission: true,
          members: { select: { user: { select: { name: true } } } },
          evaluations: { where: { juryId: juryUserId } }, // this jury's own record only
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return assignments.map((assignment) => {
    const myEvaluation = assignment.team.evaluations[0] || null;
    return {
      assignmentId: assignment.id,
      team: {
        id: assignment.team.id,
        name: assignment.team.name,
        members: assignment.team.members.map((m) => m.user.name),
      },
      track: assignment.track || assignment.team.track || null,
      submission: assignment.team.submission || null,
      evaluation: myEvaluation
        ? {
            id: myEvaluation.id,
            innovation: myEvaluation.innovation,
            technical: myEvaluation.technical,
            design: myEvaluation.design,
            viability: myEvaluation.viability,
            feedback: myEvaluation.feedback,
            status: myEvaluation.status,
            lockedAt: myEvaluation.lockedAt,
          }
        : null,
      status: myEvaluation ? myEvaluation.status : "NOT_STARTED",
    };
  });
}

/**
 * GET /api/jury/evaluations/:teamId — everyone who can legitimately see a
 * team's evaluations gets a different shape of the same underlying data,
 * never the raw juryId unless they're an ADMIN (spec \u00a715):
 *
 *   - ADMIN: every evaluation (DRAFT + LOCKED), real jury identity attached.
 *   - JURY (assigned to this team): the same per-team "Jury #N" aliasing
 *     used on the public leaderboard, plus an `isYou` flag on their own
 *     row so they can find their own evaluation \u2014 without that flag ever
 *     revealing a *different* jury member's identity to them.
 *   - Team member (own team only): the public view \u2014 LOCKED evaluations
 *     only, anonymized, mirroring what the leaderboard already shows for
 *     this team.
 *
 * IDOR guard: a jury member not assigned to this team, or a participant
 * asking about a team that isn't their own, gets 403/404 \u2014 never a
 * silently-scoped-down 200.
 */
async function getEvaluationsForTeam(requester, teamId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    throw new ApiError(404, "Team not found.");
  }

  if (requester.role === "ADMIN") {
    const evaluations = await prisma.evaluation.findMany({
      where: { teamId },
      include: { jury: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { teamId, evaluations, view: "admin" };
  }

  if (requester.role === "JURY") {
    const assignment = await prisma.juryAssignment.findUnique({
      where: { juryId_teamId: { juryId: requester.id, teamId } },
    });
    if (!assignment) {
      throw new ApiError(403, "You are not assigned to this team.");
    }

    const evaluations = await prisma.evaluation.findMany({
      where: { teamId, status: "LOCKED" },
      orderBy: { createdAt: "asc" },
    });
    const aliased = aliasForEvaluations(teamId, evaluations);
    // Re-attach an isYou flag by matching against the raw (pre-alias)
    // juryId, which we still have in `evaluations` at the same index.
    const withIsYou = aliased.map((row, i) => ({ ...row, isYou: evaluations[i].juryId === requester.id }));
    return { teamId, evaluations: withIsYou, view: "jury" };
  }

  // PARTICIPANT — only about their own team, and only locked scores.
  const membership = await prisma.teamMember.findUnique({ where: { userId: requester.id } });
  if (!membership || membership.teamId !== teamId) {
    throw new ApiError(403, "You can only view evaluations for your own team.");
  }

  const evaluations = await prisma.evaluation.findMany({
    where: { teamId, status: "LOCKED" },
    orderBy: { createdAt: "asc" },
  });
  return { teamId, evaluations: aliasForEvaluations(teamId, evaluations), view: "team" };
}

/**
 * Validates the assignment, ownership and lock-state rules, then upserts
 * the evaluation. The total is always computed server-side and is never
 * accepted from the client.
 */
async function submitEvaluation(juryUserId, input) {
  const { teamId, innovation, technical, design, viability, feedback, lock } = input;

  const assignment = await prisma.juryAssignment.findUnique({
    where: { juryId_teamId: { juryId: juryUserId, teamId } },
  });
  if (!assignment) {
    throw new ApiError(403, "You are not assigned to evaluate this team.");
  }

  // A jury member can never be a member of the team they're scoring —
  // guards against a jury account that was also (mistakenly or maliciously)
  // added as a team member.
  const selfMembership = await prisma.teamMember.findFirst({
    where: { userId: juryUserId, teamId },
  });
  if (selfMembership) {
    throw new ApiError(403, "You cannot evaluate a team you are a member of.");
  }

  const existing = await prisma.evaluation.findUnique({
    where: { teamId_juryId: { teamId, juryId: juryUserId } },
  });
  if (existing?.status === "LOCKED") {
    throw new ApiError(409, "This evaluation is already locked and cannot be modified.");
  }

  const total = innovation + technical + design + viability; // server-computed, never trusted from client

  const data = {
    innovation,
    technical,
    design,
    viability,
    feedback: feedback ?? null,
    status: lock ? "LOCKED" : "DRAFT",
    lockedAt: lock ? new Date() : null,
  };

  const evaluation = await prisma.evaluation.upsert({
    where: { teamId_juryId: { teamId, juryId: juryUserId } },
    create: { teamId, juryId: juryUserId, ...data },
    update: data,
  });

  await recordAudit(juryUserId, lock ? "JURY_EVALUATION_LOCKED" : "JURY_EVALUATION_DRAFT", {
    teamId,
    evaluationId: evaluation.id,
    total,
  });

  if (lock) {
    // Evaluation lock -> leaderboard recompute + broadcast (spec §15).
    // broadcastLeaderboard already no-ops while scores are frozen.
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { trackId: true, name: true, members: { select: { userId: true } } },
    });
    await broadcastLeaderboard(team?.trackId || undefined);

    // Notify the team (never the identity of *which* jury member locked
    // it — that stays server-side/admin-only per the anonymization rule).
    if (team?.members?.length) {
      await notifyUsers(
        team.members.map((m) => m.userId),
        {
          type: "EVALUATION_LOCKED",
          title: "A jury evaluation for your team was finalized",
          body: `A new evaluation for "${team.name}" has been locked in.`,
          metadata: { teamId },
        }
      );
    }
  }

  return { ...evaluation, total };
}

/**
 * Jury pre-provisioning + magic-link auth (spec §11). Jury accounts are
 * created ahead of time by admin/seed — this never creates a new user,
 * it only issues a one-time login token for an *existing* JURY account.
 *
 * Always returns the same generic shape whether or not the email matches
 * a jury account, so this endpoint can't be used to enumerate jury
 * emails. The raw token is only ever returned directly outside of
 * production (spec: "provide a development-safe mechanism for testing");
 * in production it would be handed to an email provider instead (not
 * wired up here — no email vendor was specified — see README).
 */
async function requestMagicLink(email) {
  const jury = await prisma.user.findFirst({ where: { email, role: "JURY" } });

  if (jury) {
    const rawToken = generateRawToken();
    await prisma.magicLinkToken.create({
      data: { juryId: jury.id, tokenHash: hashToken(rawToken), expiresAt: newExpiry() },
    });
    await recordAudit(jury.id, "JURY_MAGIC_LINK_REQUESTED");

    const loginLink = `${process.env.CLIENT_ORIGIN || "http://localhost:3000"}/jury/verify?token=${rawToken}`;
    await sendMail({
      to: jury.email,
      subject: "Your Promptothon jury login link",
      text: `Hi ${jury.name}, use this link to sign in as a jury member (expires in 15 minutes): ${loginLink}`,
    });

    // The raw token is ONLY ever returned directly outside of production
    // (spec §11: "provide a development-safe mechanism for testing";
    // "do NOT expose raw magic-link tokens ... in production"). In
    // production, delivery happens exclusively through sendMail() above —
    // the API response never carries it, regardless of what the
    // configured email provider does with the message.
    if (process.env.NODE_ENV !== "production") {
      return { sent: true, devToken: rawToken };
    }
  }

  return { sent: true };
}

/**
 * Verifies a one-time token: must exist, be unexpired, and unused. The
 * token is marked used immediately (single-use) regardless of what
 * happens after, so a leaked/replayed token can never authenticate twice.
 */
async function verifyMagicLink(rawToken) {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(401, "This magic link is invalid or has expired.");
  }

  await prisma.magicLinkToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  const jury = await prisma.user.findUnique({ where: { id: record.juryId } });
  if (!jury || jury.role !== "JURY") {
    throw new ApiError(401, "This magic link is no longer valid.");
  }

  await recordAudit(jury.id, "JURY_MAGIC_LINK_VERIFIED");

  const token = signToken({ sub: jury.id, role: jury.role });
  const { passwordHash, ...publicJury } = jury;
  return { user: publicJury, token };
}

module.exports = {
  getQueueForJury,
  submitEvaluation,
  requestMagicLink,
  verifyMagicLink,
  getEvaluationsForTeam,
};
