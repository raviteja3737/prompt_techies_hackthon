const prisma = require("../../config/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const { recordAudit } = require("../../utils/auditLog");
const { updateProfileSchema } = require("./profile.schema");

function publicProfile(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

/** GET /api/profile — the caller's own profile. */
const getProfile = asyncHandler(async (req, res) => {
  res.json({ profile: publicProfile(req.user) });
});

/**
 * PATCH /api/profile
 * Explicit field whitelist (name/college/skills/githubUrl/linkedinUrl) —
 * role, passwordHash, id, email and every other field are structurally
 * unreachable through this endpoint (spec §8: never allow role/password/
 * internal IDs/admin fields to change via mass assignment).
 */
const updateProfile = asyncHandler(async (req, res) => {
  const input = updateProfileSchema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: input,
  });

  await recordAudit(req.user.id, "PROFILE_UPDATED", { fields: Object.keys(input) });

  res.json({ profile: publicProfile(user) });
});

module.exports = { getProfile, updateProfile };
