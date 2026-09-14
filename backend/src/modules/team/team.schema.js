const { z } = require("zod");

const lockTrackSchema = z.object({
  trackId: z.string().min(1),
});

const createTeamSchema = z
  .object({
    name: z.string().min(2).max(60).optional(),
    teamName: z.string().min(2).max(60).optional(),
  })
  .refine((data) => Boolean(data.name || data.teamName), {
    message: "Team name is required and must be between 2 and 60 characters.",
  });

const joinTeamSchema = z
  .object({
    teamCode: z.string().min(4).max(20).optional(),
    inviteCode: z.string().min(4).max(20).optional(),
    code: z.string().min(4).max(20).optional(),
  })
  .refine((data) => Boolean(data.teamCode || data.inviteCode || data.code), {
    message: "Team invite code is required.",
  });

module.exports = { lockTrackSchema, joinTeamSchema, createTeamSchema };

