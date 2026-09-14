const express = require("express");
const cookieParser = require("cookie-parser");
const request = require("supertest");

// Mock prisma singleton
jest.mock("../../src/config/prisma", () => require("../mocks/prisma"));

const prisma = require("../../src/config/prisma");
const { signToken } = require("../../src/utils/jwt");
const { requireAuth, requireRole, optionalAuth } = require("../../src/middleware/auth");
const { errorHandler } = require("../../src/middleware/errorHandler");

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Protected endpoint with requireAuth
  app.get("/test/protected", requireAuth, (req, res) => {
    res.json({ message: "authenticated", user: req.user });
  });

  // Admin-only endpoint with requireAuth and requireRole("ADMIN")
  app.get("/test/admin-only", requireAuth, requireRole("ADMIN"), (req, res) => {
    res.json({ message: "admin-access-granted", user: req.user });
  });

  // Jury-or-Admin endpoint
  app.get("/test/jury-or-admin", requireAuth, requireRole("JURY", "ADMIN"), (req, res) => {
    res.json({ message: "staff-access-granted", user: req.user });
  });

  // Standalone requireRole without requireAuth (to test missing req.user branch)
  app.get("/test/role-guard-alone", requireRole("ADMIN"), (req, res) => {
    res.json({ message: "ok" });
  });

  // Optional auth endpoint
  app.get("/test/optional", optionalAuth, (req, res) => {
    res.json({ message: "optional-ok", user: req.user || null });
  });

  app.use(errorHandler);
  return app;
}

describe("Middleware Unit Tests - requireAuth, requireRole, optionalAuth", () => {
  let app;

  beforeEach(() => {
    prisma.resetAll();
    app = createTestApp();
  });

  describe("requireAuth", () => {
    it("should return 401 when neither cookie nor Authorization header is provided", async () => {
      const res = await request(app).get("/test/protected");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required." });
    });

    it("should return 401 when token is invalid or malformed", async () => {
      const res = await request(app)
        .get("/test/protected")
        .set("Authorization", "Bearer invalid-garbage-token");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid or expired session." });
    });

    it("should return 401 when valid token belongs to a non-existent user", async () => {
      const token = signToken({ sub: "deleted-user-id", role: "PARTICIPANT" });
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .get("/test/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Session is no longer valid." });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "deleted-user-id" },
      });
    });

    it("should authenticate successfully via Authorization: Bearer <token> and attach req.user", async () => {
      const mockUser = {
        id: "user-uuid-1",
        name: "Test Developer",
        email: "dev@promptothon.dev",
        role: "PARTICIPANT",
      };
      const token = signToken({ sub: mockUser.id, role: mockUser.role });
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .get("/test/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("authenticated");
      expect(res.body.user).toEqual(mockUser);
    });

    it("should authenticate successfully via HTTP-only cookie and attach req.user", async () => {
      const mockUser = {
        id: "user-uuid-2",
        name: "Cookie Participant",
        email: "cookie@promptothon.dev",
        role: "PARTICIPANT",
      };
      const token = signToken({ sub: mockUser.id, role: mockUser.role });
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const cookieName = process.env.COOKIE_NAME || "promptothon_token";
      const res = await request(app)
        .get("/test/protected")
        .set("Cookie", [`${cookieName}=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("authenticated");
      expect(res.body.user).toEqual(mockUser);
    });
  });

  describe("requireRole", () => {
    it("should return 401 if req.user is missing when requireRole is reached", async () => {
      const res = await request(app).get("/test/role-guard-alone");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required." });
    });

    it("should return 403 when user does not have the required role", async () => {
      const participantUser = {
        id: "user-part-1",
        name: "Normal Participant",
        email: "participant@promptothon.dev",
        role: "PARTICIPANT",
      };
      const token = signToken({ sub: participantUser.id, role: participantUser.role });
      prisma.user.findUnique.mockResolvedValueOnce(participantUser);

      const res = await request(app)
        .get("/test/admin-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "You do not have access to this resource." });
    });

    it("should allow access when user has the exact required role", async () => {
      const adminUser = {
        id: "admin-uuid-1",
        name: "Admin User",
        email: "admin@promptothon.dev",
        role: "ADMIN",
      };
      const token = signToken({ sub: adminUser.id, role: adminUser.role });
      prisma.user.findUnique.mockResolvedValueOnce(adminUser);

      const res = await request(app)
        .get("/test/admin-only")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("admin-access-granted");
      expect(res.body.user).toEqual(adminUser);
    });

    it("should allow access when user matches one of multiple authorized roles", async () => {
      const juryUser = {
        id: "jury-uuid-1",
        name: "Jury Evaluator",
        email: "jury@promptothon.dev",
        role: "JURY",
      };
      const token = signToken({ sub: juryUser.id, role: juryUser.role });
      prisma.user.findUnique.mockResolvedValueOnce(juryUser);

      const res = await request(app)
        .get("/test/jury-or-admin")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("staff-access-granted");
      expect(res.body.user).toEqual(juryUser);
    });
  });

  describe("optionalAuth", () => {
    it("should proceed anonymously without error when no token is supplied", async () => {
      const res = await request(app).get("/test/optional");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "optional-ok", user: null });
    });

    it("should proceed anonymously without error when token is invalid", async () => {
      const res = await request(app)
        .get("/test/optional")
        .set("Authorization", "Bearer invalid-garbage");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "optional-ok", user: null });
    });

    it("should attach user when a valid token is provided to optionalAuth", async () => {
      const participant = {
        id: "user-part-2",
        name: "Optional Participant",
        email: "opt@promptothon.dev",
        role: "PARTICIPANT",
      };
      const token = signToken({ sub: participant.id, role: participant.role });
      prisma.user.findUnique.mockResolvedValueOnce(participant);

      const res = await request(app)
        .get("/test/optional")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "optional-ok", user: participant });
    });
  });
});
