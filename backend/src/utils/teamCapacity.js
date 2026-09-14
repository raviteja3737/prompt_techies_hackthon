/**
 * Atomically reserves one seat on a team by incrementing memberCount only
 * if it's still below capacityMax, in a single UPDATE statement. Running
 * this inside the caller's transaction means the row lock taken by the
 * UPDATE is held until the transaction commits, so two concurrent joins
 * racing for the last open seat can't both read "there's room" before
 * either writes — exactly one of them gets the seat.
 *
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 * @param {string} teamId
 * @returns {Promise<boolean>} true if a seat was reserved, false if the team was full
 */
async function tryReserveTeamSeat(tx, teamId) {
  const rows = await tx.$queryRaw`
    UPDATE "Team"
    SET "memberCount" = "memberCount" + 1, "updatedAt" = now()
    WHERE id = ${teamId} AND "memberCount" < "capacityMax"
    RETURNING id
  `;
  return rows.length > 0;
}

module.exports = { tryReserveTeamSeat };
