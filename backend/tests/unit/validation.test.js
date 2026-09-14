const express = require("express");
const request = require("supertest");
const { z, ZodError } = require("zod");

// Mock prisma singleton
jest.mock("../../src/config/prisma", () => require("../mocks/prisma"));

const prisma = require("../../src/config/prisma");
const ApiError = require("../../src/utils/ApiError");
const { notFoundHandler, errorHandler } = require("../../src/middleware/errorHandler");
const app = require("../../src/app");

function createErrorTestApp() {
  const testApp = express();
  testApp.use(express.json());

  // Endpoint throwing ZodError
  const sampleSchema = z.object({
    username: z.string().min(3),
    age: z.number().int().positive(),
  });
  testApp.post("/test/zod", (req, res, next) => {
    try {
      sampleSchema.parse(req.body);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Endpoint throwing ApiError
  testApp.get("/test/api-error", (req, res, next) => {
    next(new ApiError(400, "Bad custom request", { code: "INVALID_PARAM" }));
  });

  // Endpoint throwing Prisma P2002 error
  testApp.get("/test/prisma-p2002", (req, res, next) => {
    const p2002Err = new Error("Unique constraint failed");
    p2002Err.code = "P2002";
    p2002Err.meta = { target: ["email", "teamCode"] };
    next(p2002Err);
  });

  // Endpoint throwing Prisma P2002 without meta.target
  testApp.get("/test/prisma-p2002-fallback", (req, res, next) => {
    const p2002Err = new Error("Unique constraint failed");
    p2002Err.code = "P2002";
    next(p2002Err);
  });

  // Endpoint throwing unhandled Generic Error
  testApp.get("/test/unhandled-500", (req, res, next) => {
    next(new Error("Unexpected crash"));
  });

  testApp.use(notFoundHandler);
  testApp.use(errorHandler);
  return testApp;
}

describe("Validation & Error Handler Unit Tests", () => {
  let errorApp;

  beforeEach(() => {
    prisma.resetAll();
    errorApp = createErrorTestApp();
    // Silence console.error during 500 tests to keep test output clean
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe("404 Route Not Found", () => {
    it("should return 404 for unknown endpoints in test app", async () => {
      const res = await request(errorApp).get("/non-existent-route-path");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Route not found." });
    });

    it("should return 404 for unknown endpoints in main app.js", async () => {
      const res = await request(app).get("/api/v1/completely-unknown-path");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Route not found." });
    });
  });

  describe("422 Zod Validation Failure", () => {
    it("should return 422 with flattened error details on schema violation in custom endpoint", async () => {
      const res = await request(errorApp)
        .post("/test/zod")
        .send({ username: "a", age: -5 });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe("Validation failed.");
      expect(res.body.details).toBeDefined();
      expect(res.body.details.fieldErrors).toBeDefined();
      expect(res.body.details.fieldErrors.username).toBeDefined();
      expect(res.body.details.fieldErrors.age).toBeDefined();
    });

    it("should return 422 when hitting actual /api/auth/register with invalid payload", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "not-an-email",
          password: "short",
          intent: "invalid-intent",
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe("Validation failed.");
      expect(res.body.details).toBeDefined();
      expect(res.body.details.fieldErrors).toBeDefined();
    });
  });

  describe("409 Prisma P2002 Unique Constraint Violation", () => {
    it("should format P2002 error with target columns", async () => {
      const res = await request(errorApp).get("/test/prisma-p2002");

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: "A record with this email, teamCode already exists.",
      });
    });

    it("should format P2002 error with fallback when meta.target is absent", async () => {
      const res = await request(errorApp).get("/test/prisma-p2002-fallback");

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: "A record with this value already exists.",
      });
    });
  });

  describe("Custom ApiError Handling", () => {
    it("should preserve statusCode, message, and details for ApiError", async () => {
      const res = await request(errorApp).get("/test/api-error");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Bad custom request",
        details: { code: "INVALID_PARAM" },
      });
    });
  });

  describe("500 Unhandled Server Error", () => {
    it("should return 500 generic error and log the error", async () => {
      const res = await request(errorApp).get("/test/unhandled-500");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: "Something went wrong on our end.",
      });
      expect(console.error).toHaveBeenCalled();
    });
  });
});
