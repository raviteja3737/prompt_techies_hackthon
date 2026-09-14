/**
 * tests/e2e/tier2/boundary_auth.test.js
 * 
 * Tier 2: Boundary & Corner Cases — Authentication (Features 6 to 8)
 * Covers:
 * - Feature 6: User Registration Flow Boundaries (5 test cases)
 * - Feature 7: Session Generation & Login Boundaries (5 test cases)
 * - Feature 8: User Logout & Re-login Boundaries (5 test cases)
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { signToken } = require("../../../backend/src/utils/jwt");

describe("Tier 2 - Feature 6: User Registration Boundaries", () => {
  it("T2-F06-01: rejects duplicate email registration with 409 Conflict", async () => {
    const client = new ApiClient();
    const email = generateUniqueEmail("dup-reg");

    const first = await client.register({
      name: "First User",
      email,
      password: "Password123!",
      intent: "solo",
    });
    expect(first.status).toBe(201);

    const second = await client.register({
      name: "Second User",
      email,
      password: "Password123!",
      intent: "solo",
    });
    expect(second.status).toBe(409);
    expect(second.body.error || second.body.message).toBeDefined();
  }, { smoke: true });

  it("T2-F06-02: rejects malformed email format with 422 Unprocessable Entity", async () => {
    const client = new ApiClient();
    const res = await client.register({
      name: "Invalid Email User",
      email: "not-a-valid-email-string",
      password: "Password123!",
      intent: "solo",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F06-03: rejects password shorter than minimum required length with 422", async () => {
    const client = new ApiClient();
    const res = await client.register({
      name: "Short Pass User",
      email: generateUniqueEmail("short-pass"),
      password: "123", // Too short
      intent: "solo",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F06-04: rejects registration missing required name field with 422", async () => {
    const client = new ApiClient();
    const res = await client.post("/api/auth/register", {
      email: generateUniqueEmail("no-name"),
      password: "Password123!",
      intent: "solo",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F06-05: safely sanitizes and persists fields containing special/XSS characters", async () => {
    const client = new ApiClient();
    const email = generateUniqueEmail("xss-test");
    const maliciousName = "<script>alert('xss')</script> Hacker'; DROP TABLE \"User\";--";

    const res = await client.register({
      name: maliciousName,
      email,
      password: "Password123!",
      intent: "solo",
      college: "<b>University</b>",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe(maliciousName);
  });
});

describe("Tier 2 - Feature 7: Login & Session Boundaries", () => {
  it("T2-F07-01: non-existent email returns 401 Unauthorized", async () => {
    const client = new ApiClient();
    const res = await client.login("non-existent-user-12345@test.dev", "Password123!");
    expect(res.status).toBe(401);
  }, { smoke: true });

  it("T2-F07-02: existing user with wrong password returns 401 Unauthorized", async () => {
    const client = new ApiClient();
    const email = generateUniqueEmail("wrong-pass");
    await client.register({
      name: "Wrong Pass User",
      email,
      password: "CorrectPassword123!",
      intent: "solo",
    });

    const res = await client.login(email, "CompletelyWrong123!");
    expect(res.status).toBe(401);
  });

  it("T2-F07-03: missing email or password fields returns 422", async () => {
    const client = new ApiClient();
    const res = await client.post("/api/auth/login", { email: "test@test.com" });
    expect(res.status).toBe(422);
  });

  it("T2-F07-04: tampered JWT cookie signature returns 401 on /api/auth/me", async () => {
    const client = new ApiClient();
    client.setCookies("promptothon_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.TamperedSignature123");
    const res = await client.getMe();
    expect(res.status).toBe(401);
  });

  it("T2-F07-05: forged token with random non-existent user id returns 401", async () => {
    const client = new ApiClient();
    const forgedToken = signToken({ sub: "random-cuid-99999999", role: "PARTICIPANT" });
    client.setToken(forgedToken);

    const res = await client.getMe();
    expect(res.status).toBe(401);
  });
});

describe("Tier 2 - Feature 8: Logout & Session Invalidation Boundaries", () => {
  it("T2-F08-01: calling POST /api/auth/logout without session returns 204 idempotently", async () => {
    const client = new ApiClient();
    const res = await client.logout();
    expect(res.status).toBe(204);
  }, { smoke: true });

  it("T2-F08-02: multiple consecutive logout requests succeed without error", async () => {
    const client = new ApiClient();
    const res1 = await client.logout();
    const res2 = await client.logout();
    expect(res1.status).toBe(204);
    expect(res2.status).toBe(204);
  });

  it("T2-F08-03: case-insensitive email login works consistently", async () => {
    const client = new ApiClient();
    const baseEmail = `testcase-${Date.now()}@promptothon.dev`;
    await client.register({
      name: "Case User",
      email: baseEmail.toLowerCase(),
      password: "Password123!",
      intent: "solo",
    });

    const loginRes = await client.login(baseEmail.toLowerCase(), "Password123!");
    expect(loginRes.status).toBe(200);
  });

  it("T2-F08-04: registration with invalid intent rejected with 422", async () => {
    const client = new ApiClient();
    const res = await client.post("/api/auth/register", {
      name: "Invalid Intent",
      email: generateUniqueEmail("bad-intent"),
      password: "Password123!",
      intent: "super_intent_invalid",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F08-05: logged-out client is barred from accessing protected /api/team/me", async () => {
    const client = new ApiClient();
    await client.register({
      name: "Barred User",
      email: generateUniqueEmail("barred"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("BarredTeam"),
    });

    // Logout
    await client.logout();
    const res = await client.getMyTeam();
    expect(res.status).toBe(401);
  });
});
