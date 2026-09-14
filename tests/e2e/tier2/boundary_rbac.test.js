/**
 * tests/e2e/tier2/boundary_rbac.test.js
 * 
 * Tier 2: Boundary & Corner Cases — Role-Based Access Control (Feature 12)
 * Covers:
 * - Feature 12: Role-Based Routing & Access Boundaries (5 test cases)
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { signToken } = require("../../../backend/src/utils/jwt");

describe("Tier 2 - Feature 12: RBAC Security Boundaries", () => {
  let participantClient;
  let juryClient;

  it("T2-F12-01: PARTICIPANT attempting PATCH /api/admin/settings returns 403 Forbidden", async () => {
    participantClient = new ApiClient();
    await participantClient.register({
      name: "RBAC Boundary Part",
      email: generateUniqueEmail("rbac-bound-part"),
      password: "Password123!",
      intent: "solo",
    });

    const res = await participantClient.patch("/api/admin/settings", { normalizationEnabled: true });
    expect(res.status).toBe(403);
    expect(res.body.error || res.body.message).toBeDefined();
  }, { smoke: true });

  it("T2-F12-02: PARTICIPANT attempting POST /api/jury/evaluate returns 403 Forbidden", async () => {
    const res = await participantClient.post("/api/jury/evaluate", {
      teamId: "team-xyz",
      innovation: 20,
      technical: 20,
      design: 20,
      viability: 20,
    });
    expect(res.status).toBe(403);
  });

  it("T2-F12-03: JURY attempting POST /api/admin/freeze-scores returns 403 Forbidden", async () => {
    juryClient = new ApiClient();
    await juryClient.login("jury1@promptothon.dev", "Password123!");

    const res = await juryClient.freezeScores(true);
    expect(res.status).toBe(403);
  });

  it("T2-F12-04: JWT role claim tampering fails signature verification returning 401", async () => {
    // Generate valid participant token then modify signature
    const validToken = signToken({ sub: "legit-user-id", role: "PARTICIPANT" });
    const parts = validToken.split(".");
    // Tamper payload to claim ADMIN role
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: "legit-user-id", role: "ADMIN" })
    ).toString("base64url");
    const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const client = new ApiClient();
    client.setToken(forgedToken);

    const res = await client.getAdminDashboard();
    expect(res.status).toBe(401);
  });

  it("T2-F12-05: missing authentication on all administrative endpoints returns 401", async () => {
    const anon = new ApiClient();
    const res1 = await anon.get("/api/admin/dashboard");
    const res2 = await anon.get("/api/admin/settings");
    const res3 = await anon.get("/api/admin/audit-logs");
    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
    expect(res3.status).toBe(401);
  });
});
