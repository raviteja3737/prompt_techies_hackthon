const { z } = require("zod");

const freezeScoresSchema = z.object({
  frozen: z.boolean(),
});

const isoDateTimeOrNull = z
  .union([z.string().datetime({ offset: true }), z.string().datetime(), z.null()])
  .optional();

const updateSettingsSchema = z.object({
  trackSelectionDeadline: isoDateTimeOrNull,
  submissionDeadline: isoDateTimeOrNull,
  // Score normalization pipeline toggle (spec \u00a717). Disabled by default \u2014
  // raw scores drive the leaderboard until an admin explicitly opts in.
  normalizationEnabled: z.boolean().optional(),
});

const createJuryAssignmentSchema = z.object({
  juryId: z.string().min(1),
  teamId: z.string().min(1),
  trackId: z.string().min(1).optional(),
});

const auditLogQuerySchema = z.object({
  action: z.string().trim().max(60).optional(),
  actorId: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = {
  freezeScoresSchema,
  updateSettingsSchema,
  createJuryAssignmentSchema,
  auditLogQuerySchema,
};
