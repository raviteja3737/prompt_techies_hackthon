const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt");
const prisma = require("../config/prisma");
const { buildLeaderboard } = require("../modules/leaderboard/leaderboard.service");
const { isScoresFrozen } = require("../utils/settings");

let io = null;

function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: {
      // Same rule as app.js: never "*" alongside credentials.
      // Production must set CLIENT_ORIGIN explicitly (validateEnv enforces this).
      origin: process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000"),
      credentials: true,
    },
  });

  // Optional auth: sockets can connect anonymously to watch the public
  // leaderboard, or authenticate to unlock jury/admin-only channels later.
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split("; ")
          .find((c) => c.startsWith(`${process.env.COOKIE_NAME || "promptothon_token"}=`))
          ?.split("=")[1];

      if (!token) return next(); // anonymous viewer

      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) socket.user = user;
      next();
    } catch {
      next(); // treat as anonymous rather than rejecting the connection
    }
  });

  io.on("connection", (socket) => {
    socket.join("leaderboard:public");

    socket.on("leaderboard:subscribe", async (payload) => {
      try {
        const trackId = typeof payload?.trackId === "string" ? payload.trackId.trim() : null;

        if (trackId) {
          // Only join a room that corresponds to a real track — this is
          // public, non-privileged data, but validating still stops an
          // attacker from spraying arbitrary room names at the server.
          const track = await prisma.track.findUnique({ where: { id: trackId }, select: { id: true } });
          if (!track) {
            socket.emit("leaderboard:error", { error: "Unknown trackId." });
            return;
          }
          socket.join(`leaderboard:track:${track.id}`);
        }

        const snapshot = await buildLeaderboard(trackId ? { trackId } : {});
        const frozen = await isScoresFrozen();
        socket.emit("leaderboard:snapshot", { leaderboard: snapshot, scoresFrozen: frozen });
      } catch (err) {
        socket.emit("leaderboard:error", { error: "Could not load leaderboard." });
      }
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io not initialized — call initSockets(httpServer) first.");
  }
  return io;
}

/**
 * Called after any evaluation lock so every connected client's leaderboard
 * updates without a page refresh. A no-op while scores are frozen so a
 * late-locking jury member can't leak a change to the public board.
 */
async function broadcastLeaderboard(trackId) {
  if (!io) return;

  const frozen = await isScoresFrozen();
  if (frozen) return; // freeze toggle suspends live score updates for podium suspense

  const full = await buildLeaderboard();
  io.to("leaderboard:public").emit("leaderboard:update", { leaderboard: full, scoresFrozen: false });

  if (trackId) {
    const scoped = await buildLeaderboard({ trackId });
    io.to(`leaderboard:track:${trackId}`).emit("leaderboard:update", { leaderboard: scoped, scoresFrozen: false });
  }
}

/**
 * Called when an admin flips scoresFrozen. This intentionally never
 * carries score data — just the boolean — so clients can flip a UI state
 * ("results pending...") without receiving a fresh score snapshot while
 * frozen.
 */
function broadcastFreezeChanged(frozen) {
  if (!io) return;
  io.to("leaderboard:public").emit("leaderboard:freeze-changed", { scoresFrozen: frozen });
}

module.exports = { initSockets, getIo, broadcastLeaderboard, broadcastFreezeChanged };
