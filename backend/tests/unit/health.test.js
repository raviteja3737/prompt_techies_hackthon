const request = require("supertest");

// Mock prisma singleton before importing app
jest.mock("../../src/config/prisma", () => require("../mocks/prisma"));

const prisma = require("../../src/config/prisma");
const app = require("../../src/app");

describe("GET /health - Offline Health & Diagnostics Probe", () => {
  beforeEach(() => {
    prisma.resetAll();
  });

  it("should return ok: true with database.connected: true when DB responds", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      database: {
        connected: true,
      },
      storage: {
        provider: "disabled",
        configured: false,
      },
    });
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.redis.configured).toBe("boolean");
  });

  it("should handle database connection failure gracefully without 500 error", async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error("Connection to postgresql failed (offline test)"));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.database).toEqual({
      connected: false,
      error: "unreachable",
    });
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(res.body.storage).toBeDefined();
  });

  it("should reflect storage configuration status correctly", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.storage).toEqual({
      provider: "disabled",
      configured: false,
    });
  });

  it("should support GET /api/health returning identical health payload", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      database: {
        connected: true,
      },
      storage: {
        provider: "disabled",
        configured: false,
      },
    });
  });
});
