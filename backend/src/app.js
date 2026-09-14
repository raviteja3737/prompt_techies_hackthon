const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const { generalLimiter } = require("./middleware/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { getStorageStatus } = require("./utils/storage");
const prisma = require("./config/prisma");

const authRoutes = require("./modules/auth/auth.routes");
const teamRoutes = require("./modules/team/team.routes");
const submissionRoutes = require("./modules/submissions/submissions.routes");
const trackRoutes = require("./modules/tracks/tracks.routes");
const leaderboardRoutes = require("./modules/leaderboard/leaderboard.routes");
const networkingRoutes = require("./modules/networking/networking.routes");
const juryRoutes = require("./modules/jury/jury.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const profileRoutes = require("./modules/profile/profile.routes");
const announcementRoutes = require("./modules/announcements/announcements.routes");
const notificationRoutes = require("./modules/notifications/notifications.routes");

const app = express();

app.set("trust proxy", 1); // needed for correct client IPs behind a proxy (rate limiting, secure cookies)

app.use(helmet());
app.use(
  cors({
    // Never fall back to "*" here: credentials: true + a wildcard origin
    // is rejected by browsers anyway. Production must set CLIENT_ORIGIN
    // explicitly (validateEnv enforces this); localhost is dev-only.
    origin: process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000"),
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(generalLimiter);

const healthHandler = async (req, res) => {
  let database = { connected: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { connected: true };
  } catch (err) {
    database = { connected: false, error: "unreachable" };
  }

  res.json({
    ok: true,
    uptimeSeconds: Math.round(process.uptime()),
    database,
    storage: getStorageStatus(),
    redis: { configured: Boolean(process.env.REDIS_URL) },
  });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

app.use("/api/auth", authRoutes);
app.use("/api/tracks", trackRoutes);
// team.routes and submissions.routes both live under /api/team
// (team.routes: GET /me, POST /track-lock — submissions.routes: /submission)
app.use("/api/team", teamRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/team", submissionRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/networking", networkingRoutes);
app.use("/api/jury", juryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
