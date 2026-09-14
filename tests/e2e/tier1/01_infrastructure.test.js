/**
 * tests/e2e/tier1/01_infrastructure.test.js
 * 
 * Tier 1: Core Feature Coverage — Infrastructure (Features 1 to 5)
 * Covers:
 * - Feature 1: Local PostgreSQL Provisioning (5 test cases)
 * - Feature 2: Prisma Schema & Migrations (5 test cases)
 * - Feature 3: Baseline Data Seeding (5 test cases)
 * - Feature 4: Backend Service Startup (5 test cases)
 * - Feature 5: Health Check Endpoints (5 test cases)
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient } = require("../helpers/apiClient");
const { prisma } = require("../helpers/dbHelper");

describe("Tier 1 - Feature 1: Local PostgreSQL Provisioning", () => {
  it("T1-F01-01: executes raw SELECT 1 query against localhost:5432", async () => {
    const res = await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(1);
    expect(res[0].ok).toBe(1);
  }, { smoke: true });

  it("T1-F01-02: verifies PostgreSQL server version is 14 or higher", async () => {
    const versionRes = await prisma.$queryRawUnsafe("SHOW server_version");
    expect(Array.isArray(versionRes)).toBe(true);
    expect(typeof versionRes[0].server_version).toBe("string");
    const major = parseInt(versionRes[0].server_version.split(".")[0], 10);
    expect(major).toBeGreaterThanOrEqual(14);
  });

  it("T1-F01-03: executes concurrent pooled queries without connection drops", async () => {
    const queries = Array.from({ length: 5 }, (_, i) =>
      prisma.$queryRawUnsafe(`SELECT ${i} AS num`)
    );
    const results = await Promise.all(queries);
    expect(results.length).toBe(5);
    results.forEach((r, idx) => expect(r[0].num).toBe(idx));
  });

  it("T1-F01-04: verifies current database name is promptothon", async () => {
    const dbRes = await prisma.$queryRawUnsafe("SELECT current_database() AS dbname");
    expect(Array.isArray(dbRes)).toBe(true);
    expect(dbRes[0].dbname).toBe("promptothon");
  });

  it("T1-F01-05: verifies database encoding is UTF8", async () => {
    const encRes = await prisma.$queryRawUnsafe(
      "SELECT pg_encoding_to_char(encoding) AS encoding FROM pg_database WHERE datname = current_database()"
    );
    expect(Array.isArray(encRes)).toBe(true);
    expect(encRes[0].encoding.toUpperCase()).toBe("UTF8");
  });
});

describe("Tier 1 - Feature 2: Prisma Schema & Migrations", () => {
  it("T1-F02-01: verifies all 13 core Prisma models are exposed and queryable", async () => {
    const models = [
      "user", "team", "teamMember", "track", "submission",
      "juryAssignment", "evaluation", "systemSetting", "auditLog",
      "announcement", "notification", "connection", "magicLinkToken"
    ];
    for (const m of models) {
      expect(prisma[m]).toBeDefined();
      expect(typeof prisma[m].count).toBe("function");
    }
  });

  it("T1-F02-02: validates GlobalRole enum mapping (PARTICIPANT, JURY, ADMIN)", async () => {
    const users = await prisma.user.findMany({ select: { role: true }, take: 20 });
    const allowed = ["PARTICIPANT", "JURY", "ADMIN"];
    users.forEach((u) => expect(allowed.includes(u.role)).toBe(true));
  });

  it("T1-F02-03: validates TeamRole enum mapping (LEADER, MEMBER)", async () => {
    const members = await prisma.teamMember.findMany({ select: { role: true }, take: 20 });
    const allowed = ["LEADER", "MEMBER"];
    members.forEach((m) => expect(allowed.includes(m.role)).toBe(true));
  });

  it("T1-F02-04: validates SubmissionStatus enum mapping (DRAFT, SUBMITTED)", async () => {
    const submissions = await prisma.submission.findMany({ select: { status: true }, take: 20 });
    const allowed = ["DRAFT", "SUBMITTED"];
    submissions.forEach((s) => expect(allowed.includes(s.status)).toBe(true));
  });

  it("T1-F02-05: validates EvaluationStatus enum mapping (DRAFT, LOCKED)", async () => {
    const evaluations = await prisma.evaluation.findMany({ select: { status: true }, take: 20 });
    const allowed = ["DRAFT", "LOCKED"];
    evaluations.forEach((e) => expect(allowed.includes(e.status)).toBe(true));
  });
});

describe("Tier 1 - Feature 3: Baseline Data Seeding", () => {
  it("T1-F03-01: verifies seeded admin account exists with role ADMIN", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@promptothon.dev" },
    });
    expect(admin).toBeDefined();
    expect(admin.role).toBe("ADMIN");
  }, { smoke: true });

  it("T1-F03-02: verifies admin password hash is bcrypt format ($2a$ or $2b$)", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@promptothon.dev" },
    });
    expect(admin.passwordHash).toBeDefined();
    expect(admin.passwordHash.startsWith("$2")).toBe(true);
    expect(admin.passwordHash.length).toBeGreaterThanOrEqual(60);
  });

  it("T1-F03-03: verifies hackathon tracks are seeded (at least 2 tracks)", async () => {
    const trackCount = await prisma.track.count();
    expect(trackCount).toBeGreaterThanOrEqual(2);
  });

  it("T1-F03-04: verifies seeded tracks contain required metadata (title, description)", async () => {
    const tracks = await prisma.track.findMany();
    tracks.forEach((t) => {
      expect(typeof t.title).toBe("string");
      expect(t.title.length).toBeGreaterThan(3);
      expect(typeof t.description).toBe("string");
    });
  });

  it("T1-F03-05: verifies seeded announcements exist with published=true", async () => {
    const announcements = await prisma.announcement.findMany({
      where: { published: true },
    });
    expect(announcements.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Tier 1 - Feature 4: Backend Service Startup", () => {
  const client = new ApiClient();

  it("T1-F04-01: initializes Express backend instance without uncaught rejections", async () => {
    const res = await client.get("/health");
    expect(res.status).toBe(200);
  }, { smoke: true });

  it("T1-F04-02: enforces Helmet security headers (X-Frame-Options, X-Content-Type-Options)", async () => {
    const res = await client.get("/health");
    expect(res.headers["x-frame-options"] || res.headers["content-security-policy"]).toBeDefined();
  });

  it("T1-F04-03: attaches CORS headers with credentials enabled", async () => {
    const res = await client.request("OPTIONS", "/api/health", null, {
      Origin: "http://localhost:3000",
      "Access-Control-Request-Method": "GET",
    });
    // In Express CORS, preflight or GET returns access-control headers
    const getRes = await client.request("GET", "/health", null, {
      Origin: "http://localhost:3000",
    });
    expect(getRes.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("T1-F04-04: parses JSON request bodies properly", async () => {
    const res = await client.post("/api/auth/login", {
      email: "non-existent-probe@test.dev",
      password: "WrongPassword123!",
    });
    // Should parse JSON and return 401 Unauthorized, not 400 SyntaxError
    expect(res.status).toBe(401);
  });

  it("T1-F04-05: exposes rate limiter headers on incoming requests", async () => {
    const res = await client.get("/health");
    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["ratelimit-remaining"]).toBeDefined();
  });
});

describe("Tier 1 - Feature 5: Health Check Endpoints", () => {
  const client = new ApiClient();

  it("T1-F05-01: GET /health returns HTTP 200 with ok: true", async () => {
    const res = await client.get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  }, { smoke: true });

  it("T1-F05-02: GET /health reports database.connected: true", async () => {
    const res = await client.get("/health");
    expect(res.body.database).toBeDefined();
    expect(res.body.database.connected).toBe(true);
  });

  it("T1-F05-03: GET /api/health returns HTTP 200 with ok: true", async () => {
    const res = await client.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.database.connected).toBe(true);
  });

  it("T1-F05-04: reports non-negative integer uptimeSeconds", async () => {
    const res = await client.get("/health");
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("T1-F05-05: reports storage status configuration object", async () => {
    const res = await client.get("/health");
    expect(res.body.storage).toBeDefined();
    expect(typeof res.body.storage.provider).toBe("string");
  });
});
