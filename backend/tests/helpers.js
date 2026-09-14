const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const prisma = require("../src/config/prisma");

/** Registers a user through the real API and returns { user, token, agent }. */
async function registerParticipant(overrides = {}) {
  const email = overrides.email || `user-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`;
  const payload = {
    intent: "solo",
    name: "Test User",
    email,
    password: "SuperSecret123",
    ...overrides,
  };
  const res = await request(app).post("/api/auth/register").send(payload);
  return { res, token: res.body.token, user: res.body.user };
}

async function createTeamLeader(overrides = {}) {
  return registerParticipant({
    intent: "create",
    teamName: overrides.teamName || `Team ${Date.now()}`,
    ...overrides,
  });
}

async function joinTeam(teamCode, overrides = {}) {
  return registerParticipant({ intent: "join", teamCode, ...overrides });
}

/** Directly creates a user with a known role, bypassing registration (for jury/admin fixtures). */
async function createUser({ role = "PARTICIPANT", email, name = "Fixture User", password = "SuperSecret123" }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, role, passwordHash },
  });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password });
  return { user, token: loginRes.body.token };
}

function authed(token) {
  return { Authorization: `Bearer ${token}` };
}

/** Wipes every table between tests so each test starts from a clean slate.
 * Hardened: retries Postgres 40P01 deadlocks (TRUNCATE AccessExclusiveLock
 * vs background recordAudit INSERT RowExclusiveLock) with backoff; rethrows
 * on final failure (never swallowed). */
async function truncateAll(attempts = 3) {
  const delaysMs = [100, 250];
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE
          "AuditLog", "Evaluation", "JuryAssignment", "Submission",
          "TeamMember", "Team", "Track", "SystemSetting", "User",
          "Announcement", "Notification", "Connection", "MagicLinkToken"
        RESTART IDENTITY CASCADE;
      `);
      return;
    } catch (err) {
      lastErr = err;
      const code = err && (err.code || err.meta?.code);
      const isDeadlock = code === "40P01" || /deadlock detected/i.test(err.message || "");
      if (!isDeadlock || attempt === attempts) throw err;
      const delay = delaysMs[attempt - 1] ?? delaysMs[delaysMs.length - 1];
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

/** Reusable self-healing DB reset (truncateAll with deadlock retry). */
async function resetTestDb() {
  await truncateAll(3);
}

module.exports = { app, prisma, request, registerParticipant, createTeamLeader, joinTeam, createUser, authed, truncateAll, resetTestDb };
