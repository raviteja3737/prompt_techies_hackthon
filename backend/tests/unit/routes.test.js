const request = require("supertest");
const bcrypt = require("bcryptjs");

// Mock prisma singleton
jest.mock("../../src/config/prisma", () => require("../mocks/prisma"));

const prisma = require("../../src/config/prisma");
const { signToken } = require("../../src/utils/jwt");
const app = require("../../src/app");

describe("Core Routes Unit Tests (Offline Supertest)", () => {
  const testPassword = "ValidPassword123!";
  const passwordHash = bcrypt.hashSync(testPassword, 10);

  const mockUser = {
    id: "user-test-1",
    name: "Alex River",
    email: "alex@promptothon.dev",
    passwordHash,
    role: "PARTICIPANT",
    college: "Tech University",
    skills: ["JavaScript", "Python"],
    githubUrl: "https://github.com/alexriver",
    isSolo: false,
    checkedInAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeam = {
    id: "team-test-1",
    name: "Prompt Pioneers",
    inviteCode: "PROMPT99",
    leaderId: mockUser.id,
    capacityMax: 4,
    memberCount: 1,
    trackId: null,
    trackLockedAt: null,
    track: null,
    members: [
      {
        id: "member-1",
        userId: mockUser.id,
        role: "LEADER",
        user: {
          id: mockUser.id,
          name: mockUser.name,
          college: mockUser.college,
          skills: mockUser.skills,
        },
      },
    ],
    submission: null,
  };

  beforeEach(() => {
    prisma.resetAll();
  });

  describe("POST /api/auth/register", () => {
    it("should register a solo participant and return 201 with auth token and cookie", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null); // email not taken
      prisma.user.create.mockResolvedValueOnce({
        ...mockUser,
        isSolo: true,
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Solo Hacker",
          email: "solo@promptothon.dev",
          password: testPassword,
          intent: "solo",
          skills: ["React", "Express"],
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("alex@promptothon.dev");
      expect(res.body.user.passwordHash).toBeUndefined(); // passwordHash must never be exposed
      expect(res.body.token).toBeDefined();

      const cookieHeader = res.headers["set-cookie"];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader[0]).toContain("promptothon_token=");
    });

    it("should register a team leader and create team in transaction", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.team.findUnique.mockResolvedValueOnce(null); // inviteCode uniqueness

      const createdLeader = { ...mockUser, id: "leader-1" };
      const createdTeam = { ...mockTeam, id: "team-created-1", leaderId: createdLeader.id };

      prisma.user.create.mockResolvedValueOnce(createdLeader);
      prisma.team.create.mockResolvedValueOnce(createdTeam);

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Team Leader",
          email: "leader@promptothon.dev",
          password: testPassword,
          intent: "create",
          teamName: "Neural Ninjas",
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
    });

    it("should reject registration if email is already taken with 409 Conflict", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Duplicate User",
          email: mockUser.email,
          password: testPassword,
          intent: "solo",
        });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: "An account with this email already exists.",
      });
    });
  });

  describe("POST /api/auth/login", () => {
    it("should log in successfully with valid credentials and return 200", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: mockUser.email,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(mockUser.email);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.token).toBeDefined();

      const cookieHeader = res.headers["set-cookie"];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader[0]).toContain("promptothon_token=");
    });

    it("should return 401 when email does not exist", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@promptothon.dev",
          password: testPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: "Invalid email or password.",
      });
    });

    it("should return 401 when password does not match", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: mockUser.email,
          password: "WrongPassword999!",
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: "Invalid email or password.",
      });
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear the session cookie and return 204", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 401 when not authenticated", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required." });
    });

    it("should return current user profile without passwordHash when authenticated", async () => {
      const token = signToken({ sub: mockUser.id, role: mockUser.role });
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(mockUser.id);
      expect(res.body.user.email).toBe(mockUser.email);
      expect(res.body.user.passwordHash).toBeUndefined();
    });
  });

  describe("GET /api/team/me", () => {
    it("should return 401 if user is unauthenticated", async () => {
      const res = await request(app).get("/api/team/me");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required." });
    });

    it("should return 404 when authenticated user has no team membership", async () => {
      const token = signToken({ sub: mockUser.id, role: mockUser.role });
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      prisma.teamMember.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .get("/api/team/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "You're not part of a team yet." });
    });

    it("should return team details and user role when authenticated and team exists", async () => {
      const token = signToken({ sub: mockUser.id, role: mockUser.role });
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      prisma.teamMember.findUnique.mockResolvedValueOnce({
        id: "tm-1",
        userId: mockUser.id,
        role: "LEADER",
        team: mockTeam,
      });

      const res = await request(app)
        .get("/api/team/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.myRole).toBe("LEADER");
      expect(res.body.team).toBeDefined();
      expect(res.body.team.name).toBe("Prompt Pioneers");
      expect(res.body.team.inviteCode).toBe("PROMPT99");
    });
  });
});
