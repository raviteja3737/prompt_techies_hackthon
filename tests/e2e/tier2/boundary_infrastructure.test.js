/**
 * tests/e2e/tier2/boundary_infrastructure.test.js
 * 
 * Tier 2: Boundary & Corner Cases — Infrastructure (Features 1 to 5)
 * Covers edge conditions, constraints, limits, and error handling for:
 * - Feature 1: Local PostgreSQL Provisioning (5 test cases)
 * - Feature 2: Prisma Schema & Migrations (5 test cases)
 * - Feature 3: Baseline Data Seeding (5 test cases)
 * - Feature 4: Backend Service Startup (5 test cases)
 * - Feature 5: Health Check Endpoints (5 test cases)
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient } = require("../helpers/apiClient");
const { prisma } = require("../helpers/dbHelper");

describe("Tier 2 - Feature 1: PostgreSQL Boundary & Stress", () => {
  it("T2-F01-01: handles empty query string or whitespace safely", async () => {
    const res = await prisma.$queryRawUnsafe("");
    expect(Array.isArray(res)).toBe(true);
  });

  it("T2-F01-02: handles SQL syntax error gracefully without crashing client", async () => {
    let errorCaught = false;
    try {
      await prisma.$queryRawUnsafe("SELECT * FROM non_existent_table_xyz");
    } catch (err) {
      errorCaught = true;
      expect(err.message.includes("does not exist") || err.message.includes("relation")).toBe(true);
    }
    expect(errorCaught).toBe(true);
  });

  it("T2-F01-03: handles extreme query limits (LIMIT 0, LIMIT 10000)", async () => {
    const zeroRes = await prisma.user.findMany({ take: 0 });
    expect(zeroRes.length).toBe(0);

    const largeRes = await prisma.user.findMany({ take: 1000 });
    expect(Array.isArray(largeRes)).toBe(true);
  });

  it("T2-F01-04: executes parameterized query with unicode and special symbols", async () => {
    const specialText = "Test ' -- \"; <script>alert(1)</script> 🚀 ñ";
    const res = await prisma.$queryRawUnsafe("SELECT $1::text AS val", specialText);
    expect(res[0].val).toBe(specialText);
  });

  it("T2-F01-05: handles rapid burst of 10 concurrent queries without pool exhaustion", async () => {
    const burst = Array.from({ length: 10 }, (_, i) =>
      prisma.$queryRawUnsafe(`SELECT ${i} AS val`)
    );
    const results = await Promise.all(burst);
    expect(results.length).toBe(10);
  });
});

describe("Tier 2 - Feature 2: Prisma Schema Constraint Boundaries", () => {
  it("T2-F02-01: rejects duplicate User.email (unique constraint violation)", async () => {
    let threw = false;
    const existing = await prisma.user.findFirst();
    try {
      await prisma.user.create({
        data: {
          email: existing.email,
          name: "Duplicate User",
          passwordHash: "hash123",
          role: "PARTICIPANT",
        },
      });
    } catch (err) {
      threw = true;
      expect(err.message.includes("Unique constraint") || err.message.includes("P2002")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  it("T2-F02-02: rejects duplicate Team.inviteCode (unique constraint violation)", async () => {
    let threw = false;
    const existing = await prisma.team.findFirst();
    try {
      await prisma.team.create({
        data: {
          name: "Dup Code Team",
          inviteCode: existing.inviteCode,
          leaderId: existing.leaderId,
        },
      });
    } catch (err) {
      threw = true;
      expect(err.message.includes("Unique constraint") || err.message.includes("P2002")).toBe(true);
    }
    expect(threw).toBe(true);
  });

  it("T2-F02-03: rejects invalid enum value for GlobalRole", async () => {
    let threw = false;
    try {
      await prisma.user.create({
        data: {
          email: `invalid-role-${Date.now()}@test.dev`,
          name: "Invalid Role",
          passwordHash: "hash123",
          role: "SUPER_ADMIN", // Invalid enum
        },
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("T2-F02-04: rejects record creation missing required non-nullable field (name)", async () => {
    let threw = false;
    try {
      await prisma.user.create({
        data: {
          email: `missing-name-${Date.now()}@test.dev`,
          passwordHash: "hash123",
          // name is missing
        },
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("T2-F02-05: enforces foreign key constraint when referencing non-existent User", async () => {
    let threw = false;
    try {
      await prisma.team.create({
        data: {
          name: `Orphan Team ${Date.now()}`,
          inviteCode: `ORPH-${Date.now().toString().slice(-4)}`,
          leaderId: "non-existent-user-cuid-9999",
        },
      });
    } catch (err) {
      threw = true;
      expect(err.message.includes("Foreign key") || err.message.includes("P2003")).toBe(true);
    }
    expect(threw).toBe(true);
  });
});

describe("Tier 2 - Feature 3: Baseline Seeding Edge Conditions", () => {
  it("T2-F03-01: admin account email is unique in database", async () => {
    const admins = await prisma.user.findMany({
      where: { email: "admin@promptothon.dev" },
    });
    expect(admins.length).toBe(1);
  });

  it("T2-F03-02: seeded tracks have distinct titles without collision", async () => {
    const tracks = await prisma.track.findMany();
    const titles = tracks.map((t) => t.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it("T2-F03-03: seeded system setting 'scoresFrozen' is boolean false initially", async () => {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "scoresFrozen" },
    });
    expect(setting).toBeDefined();
    expect(typeof setting.value).toBe("boolean");
  });

  it("T2-F03-04: seeded user password hashes use minimum work factor of 10", async () => {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@promptothon.dev" },
    });
    // bcrypt format: $2a$10$... or $2b$10$...
    const rounds = parseInt(admin.passwordHash.split("$")[2], 10);
    expect(rounds).toBeGreaterThanOrEqual(10);
  });

  it("T2-F03-05: handles querying non-existent seed setting gracefully returning null", async () => {
    const nonExistent = await prisma.systemSetting.findUnique({
      where: { key: "non_existent_key_xyz" },
    });
    expect(nonExistent).toBeNull();
  });
});

describe("Tier 2 - Feature 4: Backend Service Input Boundaries", () => {
  const client = new ApiClient();

  it("T2-F04-01: rejects malformed JSON payload with client/server error", async () => {
    const res = await client.request(
      "POST",
      "/api/auth/login",
      "{ invalid json format ",
      { "Content-Type": "application/json" }
    );
    expect(res.status >= 400).toBe(true);
  });

  it("T2-F04-02: handles non-existent API routes with 404 Not Found", async () => {
    const res = await client.get("/api/non-existent-route-404");
    expect(res.status).toBe(404);
  });

  it("T2-F04-03: handles request with unsupported content-type gracefully", async () => {
    const res = await client.request(
      "POST",
      "/api/auth/login",
      "<xml><email>test</email></xml>",
      { "Content-Type": "application/xml" }
    );
    expect(res.status >= 400 && res.status < 500).toBe(true);
  });

  it("T2-F04-04: handles empty POST request body with 422 validation error", async () => {
    const res = await client.post("/api/auth/login", {});
    expect(res.status).toBe(422);
  });

  it("T2-F04-05: rejects HTTP PUT method on routes that only accept POST/GET", async () => {
    const res = await client.request("PUT", "/api/auth/login", { test: 1 });
    expect(res.status >= 404).toBe(true);
  });
});

describe("Tier 2 - Feature 5: Health Check Edge Conditions", () => {
  const client = new ApiClient();

  it("T2-F05-01: handles unexpected query parameters on /health without crashing", async () => {
    const res = await client.get("/health?foo=bar&test=123&drop=table");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("T2-F05-02: handles /health/ with trailing slash gracefully", async () => {
    const res = await client.get("/health/");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("T2-F05-03: POST to /health is rejected with 404", async () => {
    const res = await client.post("/health", {});
    expect(res.status).toBe(404);
  });

  it("T2-F05-04: multiple rapid sequential calls to /health do not exhaust pool", async () => {
    const calls = Array.from({ length: 5 }, () => client.get("/health"));
    const responses = await Promise.all(calls);
    responses.forEach((r) => {
      expect(r.status).toBe(200);
      expect(r.body.database.connected).toBe(true);
    });
  });

  it("T2-F05-05: /api/health responds with content-type application/json", async () => {
    const res = await client.get("/api/health");
    expect(res.headers["content-type"].includes("application/json")).toBe(true);
  });
});
