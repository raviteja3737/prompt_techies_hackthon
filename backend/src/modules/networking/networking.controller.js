const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { recordAudit } = require("../../utils/auditLog");
const { notifyUser } = require("../../utils/notify");
const { attendeesQuerySchema, connectSchema } = require("./networking.schema");

// Only ever select these columns for another user's directory entry —
// never passwordHash, email, or anything else from the User model.
const PUBLIC_ATTENDEE_SELECT = {
  id: true,
  name: true,
  college: true,
  skills: true,
  githubUrl: true,
  linkedinUrl: true,
  isSolo: true,
  teamMember: {
    select: {
      team: { select: { name: true } },
    },
  },
};

function toPublicAttendee(user) {
  return {
    id: user.id,
    name: user.name,
    college: user.college,
    skills: user.skills,
    githubUrl: user.githubUrl,
    linkedinUrl: user.linkedinUrl,
    hasTeam: Boolean(user.teamMember),
    teamName: user.teamMember?.team?.name || null,
  };
}

/**
 * POST /api/networking/check-in
 * Simplest possible check-in mechanism (spec §9): a participant marks
 * themselves present. Only checked-in participants are discoverable by
 * others. Idempotent — re-checking in just refreshes the timestamp.
 */
const checkIn = asyncHandler(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { checkedInAt: new Date() },
    select: { id: true, checkedInAt: true },
  });

  await recordAudit(req.user.id, "PARTICIPANT_CHECKED_IN");

  res.json({ checkedInAt: user.checkedInAt });
});

/**
 * GET /api/networking/attendees
 * Discover other checked-in participants, with optional skill/college/
 * technology filters, free-text search, and pagination. Never returns
 * passwordHash, email, role, or any other sensitive/internal field.
 */
const listAttendees = asyncHandler(async (req, res) => {
  const { skill, technology, college, search, page, pageSize } = attendeesQuerySchema.parse(req.query);

  const where = {
    role: "PARTICIPANT",
    checkedInAt: { not: null },
    id: { not: req.user.id }, // don't show the caller their own card
    ...(college ? { college: { contains: college, mode: "insensitive" } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { college: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Array-field skill matching needs case-insensitive substring semantics
  // that Prisma's `has`/`hasSome` don't provide directly, so filter that
  // part in application code after a bounded DB fetch.
  const skillNeedles = [skill, technology].filter(Boolean).map((s) => s.toLowerCase());

  const candidates = await prisma.user.findMany({
    where,
    select: PUBLIC_ATTENDEE_SELECT,
    orderBy: { name: "asc" },
  });

  const filtered = skillNeedles.length
    ? candidates.filter((u) =>
        skillNeedles.every((needle) => u.skills.some((s) => s.toLowerCase().includes(needle)))
      )
    : candidates;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize).map(toPublicAttendee);

  res.json({
    attendees: pageRows,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
  });
});

/**
 * POST /api/networking/connect
 * One-click connection (spec §9): the connection exists the moment either
 * side clicks — no pending/accept step. Symmetric by construction: the
 * (userAId, userBId) pair is always stored with the smaller id first, so
 * either party connecting first lands on the same row (idempotent).
 */
const connect = asyncHandler(async (req, res) => {
  const { userId } = connectSchema.parse(req.body);

  if (userId === req.user.id) {
    throw new ApiError(422, "You cannot connect with yourself.");
  }

  const other = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!other || other.role !== "PARTICIPANT") {
    throw new ApiError(404, "Attendee not found.");
  }

  const [userAId, userBId] = [req.user.id, userId].sort();

  const existing = await prisma.connection.findUnique({ where: { userAId_userBId: { userAId, userBId } } });

  const connection = await prisma.connection.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId, requesterId: req.user.id, recipientId: userId },
    update: {},
  });

  await recordAudit(req.user.id, "NETWORKING_CONNECTED", { withUserId: userId });

  // Only notify on the first click that actually creates the connection —
  // the upsert is intentionally idempotent, but re-notifying on every
  // repeat click would spam the recipient.
  if (!existing) {
    await notifyUser(userId, {
      type: "CONNECTION_REQUEST",
      title: "New connection",
      body: `${req.user.name} connected with you.`,
      metadata: { fromUserId: req.user.id },
    });
  }

  res.status(201).json({ connection });
});

/** GET /api/networking/connections — the caller's own connections, safe fields only. */
const listConnections = asyncHandler(async (req, res) => {
  const connections = await prisma.connection.findMany({
    where: { OR: [{ requesterId: req.user.id }, { recipientId: req.user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: PUBLIC_ATTENDEE_SELECT },
      recipient: { select: PUBLIC_ATTENDEE_SELECT },
    },
  });

  const withOtherParty = connections.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    attendee: toPublicAttendee(c.requesterId === req.user.id ? c.recipient : c.requester),
  }));

  res.json({ connections: withOtherParty });
});

module.exports = { checkIn, listAttendees, connect, listConnections };
