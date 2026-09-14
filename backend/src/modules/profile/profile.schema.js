const { z } = require("zod");

// Whitelist-only shape — mass assignment (role, passwordHash, id, etc.) is
// impossible here because unknown keys are simply never read, not because
// they're stripped from a superset object.
const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    college: z.string().max(120).nullable().optional(),
    skills: z.array(z.string().max(40)).max(20).optional(),
    githubUrl: z.string().url().max(200).nullable().optional(),
    linkedinUrl: z.string().url().max(200).nullable().optional(),
  })
  .strict();

module.exports = { updateProfileSchema };
