const { z } = require("zod");

const baseProfile = {
  name: z.string().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  college: z.string().max(120).optional(),
  skills: z.array(z.string().max(40)).max(20).optional(),
  githubUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
};

// Leader: creates a brand-new team.
const createTeamSchema = z.object({
  ...baseProfile,
  intent: z.literal("create"),
  teamName: z.string().min(2).max(60),
});

// Member: joins an existing team via invite code.
const joinTeamSchema = z.object({
  ...baseProfile,
  intent: z.literal("join"),
  teamCode: z.string().min(4).max(20),
});

// Solo: opts into the public matchmaking directory, no team yet.
const soloSchema = z.object({
  ...baseProfile,
  intent: z.literal("solo"),
});

const registerSchema = z.discriminatedUnion("intent", [
  createTeamSchema,
  joinTeamSchema,
  soloSchema,
]);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

module.exports = { registerSchema, loginSchema };
