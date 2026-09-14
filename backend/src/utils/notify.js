const prisma = require("../config/prisma");

/**
 * Thin wrapper around Notification creation, mirroring utils/auditLog.js:
 * notification delivery is a side-effect of the primary action (assign a
 * jury member, lock an evaluation, request a connection, publish an
 * announcement) and must never break that action if it fails.
 */

/** Single-recipient notification (jury assignment, connection request, evaluation locked for one user). */
async function notifyUser(userId, { type, title, body, metadata } = {}) {
  if (!userId || !type || !title) return;
  try {
    await prisma.notification.create({
      data: { userId, type, title, body: body ?? null, metadata: metadata ?? undefined },
    });
  } catch (err) {
    console.error("[notify] failed to create notification:", err.message);
  }
}

/** Fan-out to many recipients at once (announcement, evaluation locked for a whole team) via a single bulk insert. */
async function notifyUsers(userIds, { type, title, body, metadata } = {}) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0 || !type || !title) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, type, title, body: body ?? null, metadata: metadata ?? undefined })),
    });
  } catch (err) {
    console.error("[notify] failed to fan out notifications:", err.message);
  }
}

module.exports = { notifyUser, notifyUsers };
