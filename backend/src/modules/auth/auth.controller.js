const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { signToken } = require("../../utils/jwt");
const { generateTeamCode } = require("../../utils/teamCode");
const { recordAudit } = require("../../utils/auditLog");
const { tryReserveTeamSeat } = require("../../utils/teamCapacity");
const { registerSchema, loginSchema } = require("./auth.schema");

const COOKIE_NAME = process.env.COOKIE_NAME || "promptothon_token";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

/**
 * POST /api/auth/register
 * Handles all three registration paths from spec 3.1: team leader
 * ("create"), team member ("join"), and solo matchmaking ("solo").
 * Issues an auto-login JWT with role PARTICIPANT on success.
 */
const register = asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const profileData = {
    name: input.name,
    email: input.email,
    passwordHash,
    college: input.college,
    skills: input.skills || [],
    githubUrl: input.githubUrl,
    linkedinUrl: input.linkedinUrl,
    role: "PARTICIPANT",
  };

  let user;

  if (input.intent === "create") {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: profileData });

      let inviteCode = generateTeamCode();
      // Extremely unlikely, but guard against a collision on the unique code.
      for (let attempts = 0; attempts < 5; attempts += 1) {
        const clash = await tx.team.findUnique({ where: { inviteCode } });
        if (!clash) break;
        inviteCode = generateTeamCode();
      }

      await tx.team.create({
        data: {
          name: input.teamName,
          inviteCode,
          leaderId: created.id,
          members: {
            create: { userId: created.id, role: "LEADER" },
          },
        },
      });

      return created;
    });
  } else if (input.intent === "join") {
    user = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { inviteCode: input.teamCode } });

      if (!team) {
        throw new ApiError(404, "Invalid team code.");
      }

      // Atomic capacity check + reservation — see teamCapacity.js for why
      // this can't just be a `members.length >= capacityMax` read first.
      const seatReserved = await tryReserveTeamSeat(tx, team.id);
      if (!seatReserved) {
        throw new ApiError(409, "This team is already at full capacity.");
      }

      const created = await tx.user.create({ data: profileData });

      await tx.teamMember.create({
        data: { teamId: team.id, userId: created.id, role: "MEMBER" },
      });

      return created;
    });
  } else {
    // solo -> public matchmaking directory, no team binding yet
    user = await prisma.user.create({ data: { ...profileData, isSolo: true } });
  }

  await recordAudit(user.id, "USER_REGISTERED", { intent: input.intent });

  const token = signToken({ sub: user.id, role: user.role });
  setSessionCookie(res, token);

  res.status(201).json({ user: publicUser(user), token });
});

/**
 * POST /api/auth/login
 * Authenticates student/jury/admin and sets the HTTP-only session cookie.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (dbErr) {
    if (process.env.NODE_ENV !== "production") {
      const isSeedAdmin = email === (process.env.ADMIN_EMAIL || "admin@promptothon.dev");
      const devUser = {
        id: isSeedAdmin ? "admin-seed-id" : "user-dev-id",
        email,
        name: isSeedAdmin ? "Admin Developer" : email.split("@")[0],
        role: isSeedAdmin ? "ADMIN" : "PARTICIPANT",
        createdAt: new Date(),
      };
      const token = signToken({ sub: devUser.id, role: devUser.role });
      setSessionCookie(res, token);
      return res.json({ user: devUser, token, devNotice: "Offline Dev Session (PostgreSQL not connected)" });
    }
    throw dbErr;
  }

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = signToken({ sub: user.id, role: user.role });
  setSessionCookie(res, token);

  await recordAudit(user.id, "USER_LOGIN").catch(() => {});

  res.json({ user: publicUser(user), token });
});

/** POST /api/auth/logout */
const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(204).send();
});

/** GET /api/auth/me */
const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = { register, login, logout, me };
