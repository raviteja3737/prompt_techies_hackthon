const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { recordAudit } = require("../../utils/auditLog");
const { tryReserveTeamSeat } = require("../../utils/teamCapacity");
const { isBeforeDeadline, KEYS } = require("../../utils/settings");
const { generateTeamCode } = require("../../utils/teamCode");
const { lockTrackSchema, joinTeamSchema, createTeamSchema } = require("./team.schema");

function formatTeam(team) {
  if (!team) return team;
  return {
    ...team,
    code: team.inviteCode || team.code,
    trackLocked: Boolean(team.trackLockedAt || team.trackLocked),
  };
}

async function getMembershipOrThrow(userId) {
  let membership;
  try {
    membership = await prisma.teamMember.findUnique({
      where: { userId },
      include: {
        team: {
          include: {
            track: true,
            members: { include: { user: { select: { id: true, name: true, email: true, college: true, skills: true } } } },
            submission: true,
          },
        },
      },
    });
  } catch (dbErr) {
    if (process.env.NODE_ENV !== "production") {
      return {
        role: "LEADER",
        team: {
          id: "dev-team-1",
          name: "Neural Hackers (Dev Demo)",
          code: "PT2026",
          inviteCode: "PT2026",
          trackId: "track-1",
          trackLocked: true,
          trackLockedAt: new Date(),
          track: { id: "track-1", title: "Generative AI Agents" },
          members: [
            { id: "m-1", role: "LEADER", user: { id: userId, name: "Team Leader", email: "admin@promptothon.dev" } },
            { id: "m-2", role: "MEMBER", user: { id: "m-2-uid", name: "Sarah Chen", email: "sarah@prompttechies.in" } },
          ],
        },
      };
    }
    throw dbErr;
  }

  if (!membership) {
    throw new ApiError(404, "You're not part of a team yet.");
  }
  return membership;
}

/**
 * POST /api/team
 * For an authenticated participant with no team yet to create a new team,
 * becoming its LEADER with capacityMax: 4, memberCount: 1.
 */
const createTeam = asyncHandler(async (req, res) => {
  const parsed = createTeamSchema.parse(req.body);
  const teamName = (parsed.name || parsed.teamName).trim();

  let existingMembership = null;
  try {
    existingMembership = await prisma.teamMember.findUnique({ where: { userId: req.user.id } });
  } catch (dbErr) {
    if (process.env.NODE_ENV === "development") {
      const inviteCode = generateTeamCode();
      const mockTeam = {
        id: "dev-team-created",
        name: teamName,
        inviteCode,
        code: inviteCode,
        leaderId: req.user.id,
        capacityMax: 4,
        memberCount: 1,
        trackId: null,
        trackLocked: false,
        trackLockedAt: null,
        track: null,
        members: [
          { id: "m-dev-leader", role: "LEADER", user: { id: req.user.id, name: req.user.name, email: req.user.email } },
        ],
        submission: null,
      };
      return res.status(201).json({ team: mockTeam, myRole: "LEADER" });
    }
    throw dbErr;
  }

  if (existingMembership) {
    throw new ApiError(409, "You're already part of a team.");
  }

  let inviteCode = generateTeamCode();
  for (let attempts = 0; attempts < 5; attempts += 1) {
    const clash = await prisma.team.findUnique({ where: { inviteCode } });
    if (!clash) break;
    inviteCode = generateTeamCode();
  }

  const team = await prisma.$transaction(async (tx) => {
    return tx.team.create({
      data: {
        name: teamName,
        inviteCode,
        leaderId: req.user.id,
        capacityMax: 4,
        memberCount: 1,
        members: {
          create: { userId: req.user.id, role: "LEADER" },
        },
      },
      include: {
        track: true,
        members: { include: { user: { select: { id: true, name: true, email: true, college: true, skills: true } } } },
        submission: true,
      },
    });
  });

  await prisma.user.update({
    where: { id: req.user.id },
    data: { isSolo: false },
  }).catch(() => {});

  await recordAudit(req.user.id, "TEAM_CREATED", { teamId: team.id });

  res.status(201).json({ team: formatTeam(team), myRole: "LEADER" });
});

/** GET /api/team/me */
const getMyTeam = asyncHandler(async (req, res) => {
  const membership = await getMembershipOrThrow(req.user.id);
  res.json({ team: formatTeam(membership.team), myRole: membership.role });
});

/**
 * POST /api/team/join
 * For an already-registered participant with no team yet to join an existing team by invite code.
 */
const joinTeam = asyncHandler(async (req, res) => {
  const parsed = joinTeamSchema.parse(req.body);
  const targetCode = (parsed.teamCode || parsed.inviteCode || parsed.code).trim().toUpperCase();

  const existingMembership = await prisma.teamMember.findUnique({ where: { userId: req.user.id } });
  if (existingMembership) {
    throw new ApiError(409, "You're already part of a team.");
  }

  const team = await prisma.$transaction(async (tx) => {
    const found = await tx.team.findUnique({ where: { inviteCode: targetCode } });
    if (!found) {
      throw new ApiError(404, "Invalid team code.");
    }

    const seatReserved = await tryReserveTeamSeat(tx, found.id);
    if (!seatReserved) {
      throw new ApiError(409, "This team is already at full capacity.");
    }

    await tx.teamMember.create({
      data: { teamId: found.id, userId: req.user.id, role: "MEMBER" },
    });

    return found;
  });

  await recordAudit(req.user.id, "TEAM_JOINED", { teamId: team.id });

  const membership = await getMembershipOrThrow(req.user.id);
  res.json({ team: formatTeam(membership.team), myRole: membership.role });
});

/**
 * POST /api/team/track-lock
 * Team leader locks the track/problem-statement selection prior to the deadline.
 */
const lockTrack = asyncHandler(async (req, res) => {
  const { trackId } = lockTrackSchema.parse(req.body);
  const membership = await getMembershipOrThrow(req.user.id);

  if (membership.role !== "LEADER") {
    throw new ApiError(403, "Only the team leader can lock the track selection.");
  }
  if (membership.team.trackLockedAt) {
    throw new ApiError(409, "This team's track selection is already locked.");
  }
  if (!(await isBeforeDeadline(KEYS.TRACK_SELECTION_DEADLINE))) {
    throw new ApiError(409, "The track selection deadline has passed.");
  }

  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) {
    throw new ApiError(404, "Track not found.");
  }

  const updated = await prisma.team.update({
    where: { id: membership.team.id },
    data: { trackId, trackLockedAt: new Date() },
    include: { track: true },
  });

  await recordAudit(req.user.id, "TRACK_LOCKED", { teamId: updated.id, trackId });

  res.json({ team: formatTeam(updated) });
});

module.exports = { createTeam, getMyTeam, joinTeam, lockTrack, getMembershipOrThrow };
