const prisma = require("../config/prisma");

/**
 * Records an immutable audit trail entry. Used anywhere score-tampering
 * or privilege-sensitive actions occur (evaluation submit/lock, score
 * freeze toggle, normalization runs, role changes).
 */
async function recordAudit(actorId, action, metadata = undefined) {
  try {
    await prisma.auditLog.create({
      data: { actorId: actorId || null, action, metadata },
    });
  } catch (err) {
    // Audit logging must never break the primary request flow.
    // Fire-and-forget by design: warn on FK/connection errors, never rethrow.
    console.warn("[audit] failed to record entry:", err.message);
  }
}

module.exports = { recordAudit };
