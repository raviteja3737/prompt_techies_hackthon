const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { recordAudit } = require("../../utils/auditLog");
const { setSetting, getAllSettings, KEYS } = require("../../utils/settings");
const { notifyUser } = require("../../utils/notify");
const { broadcastFreezeChanged, broadcastLeaderboard } = require("../../sockets");
const {
  freezeScoresSchema,
  updateSettingsSchema,
  createJuryAssignmentSchema,
  auditLogQuerySchema,
} = require("./admin.schema");

/** GET /api/admin/dashboard — headline counts for the organizer view. */
const getDashboard = asyncHandler(async (req, res) => {
  const [
    participantCount,
    juryCount,
    teamCount,
    draftSubmissions,
    finalSubmissions,
    draftEvaluations,
    lockedEvaluations,
    trackCount,
    assignmentCount,
    checkedInCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PARTICIPANT" } }),
    prisma.user.count({ where: { role: "JURY" } }),
    prisma.team.count(),
    prisma.submission.count({ where: { status: "DRAFT" } }),
    prisma.submission.count({ where: { status: "SUBMITTED" } }),
    prisma.evaluation.count({ where: { status: "DRAFT" } }),
    prisma.evaluation.count({ where: { status: "LOCKED" } }),
    prisma.track.count(),
    prisma.juryAssignment.count(),
    prisma.user.count({ where: { role: "PARTICIPANT", checkedInAt: { not: null } } }),
  ]);

  const settings = await getAllSettings();

  res.json({
    users: { participants: participantCount, jury: juryCount, checkedIn: checkedInCount },
    teams: teamCount,
    submissions: { draft: draftSubmissions, submitted: finalSubmissions },
    evaluations: { draft: draftEvaluations, locked: lockedEvaluations },
    tracks: trackCount,
    juryAssignments: assignmentCount,
    settings,
  });
});

/** GET /api/admin/settings — freeze flag + deadlines. */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getAllSettings();
  res.json({ settings });
});

/** PATCH /api/admin/settings — update deadlines (freeze has its own dedicated endpoint below). */
const updateSettings = asyncHandler(async (req, res) => {
  const input = updateSettingsSchema.parse(req.body);

  if (input.trackSelectionDeadline !== undefined) {
    await setSetting(KEYS.TRACK_SELECTION_DEADLINE, input.trackSelectionDeadline);
  }
  if (input.submissionDeadline !== undefined) {
    await setSetting(KEYS.SUBMISSION_DEADLINE, input.submissionDeadline);
  }
  if (input.normalizationEnabled !== undefined) {
    await setSetting(KEYS.NORMALIZATION_ENABLED, input.normalizationEnabled);
    // Normalization changes what every viewer sees on the leaderboard \u2014
    // push a fresh snapshot immediately rather than waiting for the next
    // evaluation lock (mirrors the freeze-scores unfreeze behavior).
    await broadcastLeaderboard();
  }

  await recordAudit(req.user.id, "ADMIN_ACTION", { type: "settings_updated", ...input });

  const settings = await getAllSettings();
  res.json({ settings });
});

/** GET /api/admin/score-status */
const getScoreStatus = asyncHandler(async (req, res) => {
  const settings = await getAllSettings();
  res.json({ scoresFrozen: settings.scoresFrozen });
});

/**
 * POST /api/admin/freeze-scores
 * Toggles the persisted freeze flag, audits it, and notifies connected
 * clients. Unfreezing also pushes a fresh leaderboard snapshot immediately
 * rather than waiting for the next evaluation lock.
 */
const freezeScores = asyncHandler(async (req, res) => {
  const { frozen } = freezeScoresSchema.parse(req.body);

  await setSetting(KEYS.SCORES_FROZEN, frozen);
  await recordAudit(req.user.id, frozen ? "SCORES_FROZEN" : "SCORES_UNFROZEN");

  broadcastFreezeChanged(frozen);
  if (!frozen) {
    await broadcastLeaderboard();
  }

  res.json({ scoresFrozen: frozen });
});

/** GET /api/admin/jury-assignments?juryId=&teamId=&trackId= */
const listJuryAssignments = asyncHandler(async (req, res) => {
  const { juryId, teamId, trackId } = req.query;
  const assignments = await prisma.juryAssignment.findMany({
    where: {
      ...(juryId ? { juryId: String(juryId) } : {}),
      ...(teamId ? { teamId: String(teamId) } : {}),
      ...(trackId ? { trackId: String(trackId) } : {}),
    },
    include: {
      jury: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      track: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ assignments });
});

/** POST /api/admin/jury-assignments — admin assigns a jury member to a team. */
const createJuryAssignment = asyncHandler(async (req, res) => {
  const input = createJuryAssignmentSchema.parse(req.body);

  const [jury, team, track] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.juryId } }),
    prisma.team.findUnique({ where: { id: input.teamId } }),
    input.trackId ? prisma.track.findUnique({ where: { id: input.trackId } }) : Promise.resolve(null),
  ]);

  if (!jury || jury.role !== "JURY") {
    throw new ApiError(422, "juryId must reference a user with the JURY role.");
  }
  if (!team) {
    throw new ApiError(404, "Team not found.");
  }
  if (input.trackId && !track) {
    throw new ApiError(404, "Track not found.");
  }

  const existing = await prisma.juryAssignment.findUnique({
    where: { juryId_teamId: { juryId: input.juryId, teamId: input.teamId } },
  });
  if (existing) {
    throw new ApiError(409, "This jury member is already assigned to this team.");
  }

  const assignment = await prisma.juryAssignment.create({
    data: { juryId: input.juryId, teamId: input.teamId, trackId: input.trackId },
  });

  await recordAudit(req.user.id, "JURY_ASSIGNED", { assignmentId: assignment.id, ...input });

  await notifyUser(input.juryId, {
    type: "JURY_ASSIGNED",
    title: "You've been assigned a new team to evaluate",
    body: `Team "${team.name}" is now in your evaluation queue.`,
    metadata: { teamId: team.id, assignmentId: assignment.id },
  });

  res.status(201).json({ assignment });
});

/** DELETE /api/admin/jury-assignments/:id */
const deleteJuryAssignment = asyncHandler(async (req, res) => {
  const assignment = await prisma.juryAssignment.delete({ where: { id: req.params.id } }).catch(() => null);
  if (!assignment) {
    throw new ApiError(404, "Jury assignment not found.");
  }

  await recordAudit(req.user.id, "ADMIN_ACTION", { type: "jury_assignment_removed", assignmentId: req.params.id });

  res.status(204).send();
});

/** GET /api/admin/audit-logs?action=&actorId=&page=&pageSize= */
const listAuditLogs = asyncHandler(async (req, res) => {
  const { action, actorId, page, pageSize } = auditLogQuerySchema.parse(req.query);

  const where = {
    ...(action ? { action } : {}),
    ...(actorId ? { actorId } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 } });
});

module.exports = {
  getDashboard,
  getSettings,
  updateSettings,
  getScoreStatus,
  freezeScores,
  listJuryAssignments,
  createJuryAssignment,
  deleteJuryAssignment,
  listAuditLogs,
};
