const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { listQuerySchema } = require("./notifications.schema");

/**
 * GET /api/notifications
 * Always scoped to `req.user.id` — there is no path here to another
 * user's notifications, by ID or otherwise (spec: "do not expose
 * notifications belonging to another user").
 */
const list = asyncHandler(async (req, res) => {
  const { page, pageSize, unreadOnly } = listQuerySchema.parse(req.query);

  const where = { userId: req.user.id, ...(unreadOnly ? { read: false } : {}) };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user.id, read: false } }),
  ]);

  res.json({
    notifications,
    unreadCount,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
  });
});

/**
 * PATCH /api/notifications/:id/read
 * The `userId` clause in the where-filter (not just an existence check
 * after fetching by id) is what actually prevents an IDOR here — a
 * request for someone else's notification id matches zero rows and
 * falls through to the 404, it never reads or mutates another user's row.
 */
const markRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { read: true },
  });

  if (result.count === 0) {
    throw new ApiError(404, "Notification not found.");
  }

  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  res.json({ notification });
});

/** PATCH /api/notifications/read-all — marks every unread notification for the caller as read. */
const markAllRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data: { read: true },
  });

  res.json({ updated: result.count });
});

module.exports = { list, markRead, markAllRead };
