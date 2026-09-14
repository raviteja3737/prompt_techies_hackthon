const request = require("supertest");
const jwt = require("jsonwebtoken");
const express = require("express");
const cookieParser = require("cookie-parser");

// Mock prisma singleton before importing app or routes
jest.mock("../../src/config/prisma", () => require("../mocks/prisma"));

const prisma = require("../../src/config/prisma");
const app = require("../../src/app");
const { signToken } = require("../../src/utils/jwt");
const { requireAuth, requireRole, optionalAuth } = require("../../src/middleware/auth");
const { errorHandler } = require("../../src/middleware/errorHandler");

describe("Adversarial Stress Testing & Offline Harness Verification", () => {
  const secret = process.env.JWT_SECRET || "test-secret-min-32-chars-for-promptothon-testing";

  beforeEach(() => {
    prisma.resetAll();
  });

  // --------------------------------------------------------------------------
  // 1. Prisma Mock Harness Verification
  // --------------------------------------------------------------------------
  describe("Prisma Mock Harness & Isolation", () => {
    it("should provide mock methods for all 13 schema models", () => {
      const requiredModels = [
        "user",
        "team",
        "teamMember",
        "track",
        "submission",
        "juryAssignment",
        "evaluation",
        "systemSetting",
        "auditLog",
        "announcement",
        "notification",
        "connection",
        "magicLinkToken",
      ];

      for (const model of requiredModels) {
        expect(prisma[model]).toBeDefined();
        expect(typeof prisma[model].findUnique).toBe("function");
        expect(typeof prisma[model].findFirst).toBe("function");
        expect(typeof prisma[model].findMany).toBe("function");
        expect(typeof prisma[model].create).toBe("function");
        expect(typeof prisma[model].update).toBe("function");
        expect(typeof prisma[model].delete).toBe("function");
        expect(typeof prisma[model].count).toBe("function");
      }
    });

    it("should execute $transaction callback with mockPrisma and commit", async () => {
      const result = await prisma.$transaction(async (tx) => {
        tx.user.create.mockResolvedValueOnce({ id: "tx-user-1", name: "Tx User" });
        return tx.user.create({ data: { name: "Tx User" } });
      });

      expect(result).toEqual({ id: "tx-user-1", name: "Tx User" });
    });

    it("should propagate errors inside $transaction to simulate transaction rollback", async () => {
      await expect(
        prisma.$transaction(async () => {
          throw new Error("Transaction aborted: deadlock or constraint violation");
        })
      ).rejects.toThrow("Transaction aborted: deadlock or constraint violation");
    });

    it("should support $transaction with an array of promises", async () => {
      prisma.user.count.mockResolvedValueOnce(5);
      prisma.team.count.mockResolvedValueOnce(2);

      const [userCount, teamCount] = await prisma.$transaction([
        prisma.user.count(),
        prisma.team.count(),
      ]);

      expect(userCount).toBe(5);
      expect(teamCount).toBe(2);
    });

    it("should clean state across resetAll() calls", () => {
      prisma.user.findUnique.mockResolvedValue({ id: "custom-sticky-id" });
      prisma.resetAll();
      return expect(prisma.user.findUnique({ where: { id: "any" } })).resolves.toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Authentication Failure Modes & Token Edge Cases
  // --------------------------------------------------------------------------
  describe("Authentication Adversarial Probes (requireAuth & optionalAuth)", () => {
    let authApp;

    beforeEach(() => {
      authApp = express();
      authApp.use(express.json());
      authApp.use(cookieParser());
      authApp.get("/test/protected", requireAuth, (req, res) => {
        res.json({ ok: true, user: req.user });
      });
      authApp.get("/test/admin", requireAuth, requireRole("ADMIN"), (req, res) => {
        res.json({ ok: true, user: req.user });
      });
      authApp.get("/test/optional", optionalAuth, (req, res) => {
        res.json({ ok: true, user: req.user || null });
      });
      authApp.use(errorHandler);
    });

    it("should reject an expired token with 401 'Invalid or expired session.'", async () => {
      const expiredToken = jwt.sign(
        { sub: "user-exp-1", role: "PARTICIPANT" },
        secret,
        { expiresIn: -10 }
      );

      const res = await request(authApp)
        .get("/test/protected")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid or expired session." });
    });

    it("should reject a forged token signed with an invalid secret with 401", async () => {
      const forgedToken = jwt.sign(
        { sub: "user-forged-1", role: "ADMIN" },
        "attacker-compromised-secret-key"
      );

      const res = await request(authApp)
        .get("/test/admin")
        .set("Authorization", `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid or expired session." });
    });

    it("should reject malformed token strings with 401", async () => {
      const malformedTokens = [
        "not-a-token",
        "ey1234.broken",
        "Bearer.Bearer.Bearer",
        "!!!",
      ];

      for (const badToken of malformedTokens) {
        const res = await request(authApp)
          .get("/test/protected")
          .set("Authorization", `Bearer ${badToken}`);

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Invalid or expired session." });
      }
    });

    it("should reject token missing 'sub' claim when DB lookup returns null", async () => {
      const noSubToken = jwt.sign({ role: "PARTICIPANT" }, secret);
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(authApp)
        .get("/test/protected")
        .set("Authorization", `Bearer ${noSubToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Session is no longer valid." });
    });

    it("should mask database connection failure during requireAuth as 401 invalid session", async () => {
      const validToken = signToken({ sub: "user-valid-1", role: "PARTICIPANT" });
      prisma.user.findUnique.mockRejectedValueOnce(
        new Error("Connection to postgresql pool failed: connection refused")
      );

      const res = await request(authApp)
        .get("/test/protected")
        .set("Authorization", `Bearer ${validToken}`);

      // OBSERVATION: requireAuth catches all non-ApiErrors and wraps them in 401
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid or expired session." });
    });

    it("optionalAuth should survive expired tokens without error", async () => {
      const expiredToken = jwt.sign({ sub: "u1" }, secret, { expiresIn: -60 });

      const res = await request(authApp)
        .get("/test/optional")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, user: null });
    });

    it("optionalAuth should survive database error during user lookup without crashing", async () => {
      const validToken = signToken({ sub: "u1" });
      prisma.user.findUnique.mockRejectedValueOnce(new Error("DB timeout"));

      const res = await request(authApp)
        .get("/test/optional")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, user: null });
    });
  });

  // --------------------------------------------------------------------------
  // 3. Express Error Handlers & Malformed Body Stress Tests
  // --------------------------------------------------------------------------
  describe("Express Error Handler & Body Parser Stress Tests", () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("EMPIRICAL FINDING: corrupt JSON body produces 500 instead of 400 Bad Request", async () => {
      // Body-parser throws SyntaxError with status: 400.
      // Because errorHandler does not check err.status / err.statusCode,
      // it treats it as an unhandled server error and returns 500.
      const res = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send('{"email": "broken-json", "password":');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Something went wrong on our end." });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("EMPIRICAL FINDING: payload exceeding size limit produces 500 instead of 413 Payload Too Large", async () => {
      // Body-parser throws PayloadTooLargeError with status: 413.
      // errorHandler treats this as an unhandled 500.
      const hugeString = "a".repeat(150 * 1024);
      const res = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ email: hugeString }));

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Something went wrong on our end." });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("EMPIRICAL FINDING: malformed URI encoding produces 500 instead of 400 Bad Request", async () => {
      // Express router throws URIError with status: 400.
      // errorHandler treats this as an unhandled 500.
      const res = await request(app).get("/api/tracks/%E0%A4%A");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Something went wrong on our end." });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("should handle empty JSON body object gracefully via Zod validation", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.error).toBe("Validation failed.");
      expect(res.body.details).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 4. GET /health Probe Under Database Failure
  // --------------------------------------------------------------------------
  describe("GET /health Probe Under Database Failure", () => {
    it("should return ok: true with database.connected: true when $queryRaw succeeds", async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);

      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.database.connected).toBe(true);
      expect(res.body.database.error).toBeUndefined();
    });

    it("should cleanly survive DB connection error without throwing or 500", async () => {
      prisma.$queryRaw.mockRejectedValueOnce(
        new Error("Fatal: connection refused on 5432")
      );

      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.database).toEqual({
        connected: false,
        error: "unreachable",
      });
    });

    it("should survive non-Error DB rejections (string/null/undefined)", async () => {
      prisma.$queryRaw.mockRejectedValueOnce("raw network reset string");

      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.database).toEqual({
        connected: false,
        error: "unreachable",
      });
    });

    it("ARCHITECTURAL OBSERVATION: GET /health returns HTTP 200 even when database is unreachable", async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error("Postgres offline"));

      const res = await request(app).get("/health");

      // HTTP Status is 200 OK even though database is disconnected
      expect(res.status).toBe(200);
      expect(res.body.database.connected).toBe(false);
    });
  });
});
