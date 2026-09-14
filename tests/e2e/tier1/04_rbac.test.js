/**
 * tests/e2e/tier1/04_rbac.test.js
 * 
 * Tier 1: Core Feature Coverage — Role-Based Routing & Access Control (Feature 12)
 * Covers:
 * - Feature 12: Role-Based Routing & Access (5 test cases)
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");

describe("Tier 1 - Feature 12: Role-Based Routing & Access (RBAC)", () => {
  let participantClient;
  let juryClient;
  let adminClient;

  it("T1-F12-01: PARTICIPANT accesses participant endpoints (/api/team/me)", async () => {
    participantClient = new ApiClient();
    await participantClient.register({
      name: "Participant RBAC",
      email: generateUniqueEmail("part-rbac"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("RBACTeam"),
    });

    const res = await participantClient.getMyTeam();
    expect(res.status).toBe(200);
    expect(res.body.team).toBeDefined();
  }, { smoke: true });

  it("T1-F12-02: JURY accesses jury queue endpoint (/api/jury/queue)", async () => {
    juryClient = new ApiClient();
    // Use seeded jury user: jury1@promptothon.dev
    const loginRes = await juryClient.login("jury1@promptothon.dev", "Password123!");
    expect(loginRes.status).toBe(200);

    const queueRes = await juryClient.getJuryQueue();
    expect(queueRes.status).toBe(200);
    expect(Array.isArray(queueRes.body.queue)).toBe(true);
  });

  it("T1-F12-03: ADMIN accesses admin console endpoints (/api/admin/dashboard)", async () => {
    adminClient = new ApiClient();
    const loginRes = await adminClient.login("admin@promptothon.dev", "ChangeMe123!");
    expect(loginRes.status).toBe(200);

    const dashRes = await adminClient.getAdminDashboard();
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.users).toBeDefined();
    expect(typeof dashRes.body.teams).toBe("number");
  });

  it("T1-F12-04: unauthorized role crossing returns 403 Forbidden (Participant -> Admin route)", async () => {
    const res = await participantClient.getAdminDashboard();
    expect(res.status).toBe(403);
    expect(res.body.error || res.body.message).toBeDefined();
  });

  it("T1-F12-05: unauthenticated request to protected route returns 401 Unauthorized", async () => {
    const unauthedClient = new ApiClient();
    const res = await unauthedClient.getAdminDashboard();
    expect(res.status).toBe(401);
  });
});
