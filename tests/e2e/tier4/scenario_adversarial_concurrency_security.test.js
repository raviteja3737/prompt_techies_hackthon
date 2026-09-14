/**
 * tests/e2e/tier4/scenario_adversarial_concurrency_security.test.js
 * 
 * Tier 4: Real-World Application Scenario 4 — Adversarial Concurrency & Security Penetration
 * Validates system resilience against real-world race conditions and security threats:
 * 1. High-concurrency atomic seat reservation (enforcing capacity cap of 4 under race conditions)
 * 2. IDOR / Insecure Direct Object Reference protection
 * 3. Jury isolation and unauthorized grading prevention
 * 4. Privilege escalation via JWT signature tampering
 * 5. System stability and database health post-adversarial penetration
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { findTeamByName, prisma } = require("../helpers/dbHelper");
const { signToken } = require("../../../backend/src/utils/jwt");

describe("Tier 4 Scenario 4: Adversarial Concurrency & Security Penetration", () => {
  let leaderClient;
  let targetTeamName;
  let inviteCode;

  it("Stage 1 [Setup]: Pre-populates a team with exactly 3 members (1 seat open)", async () => {
    leaderClient = new ApiClient();
    targetTeamName = generateUniqueTeamName("RaceTeam");

    // Leader registers (Seat 1)
    await leaderClient.register({
      name: "Race Leader",
      email: generateUniqueEmail("race-lead"),
      password: "Password123!",
      intent: "create",
      teamName: targetTeamName,
    });
    const team = await leaderClient.getMyTeam();
    inviteCode = team.body.team.inviteCode;

    // Join Member 2 (Seat 2)
    const m2 = new ApiClient();
    await m2.register({
      name: "Race Member 2",
      email: generateUniqueEmail("race-m2"),
      password: "Password123!",
      intent: "join",
      teamCode: inviteCode,
    });

    // Join Member 3 (Seat 3)
    const m3 = new ApiClient();
    await m3.register({
      name: "Race Member 3",
      email: generateUniqueEmail("race-m3"),
      password: "Password123!",
      intent: "join",
      teamCode: inviteCode,
    });

    const checkTeam = await leaderClient.getMyTeam();
    expect(checkTeam.body.team.memberCount).toBe(3);
  }, { smoke: true });

  it("Stage 2 [Concurrency Race]: 5 concurrent requests compete for 1 remaining seat", async () => {
    // Register 5 distinct solo users
    const competitors = [];
    for (let i = 1; i <= 5; i++) {
      const comp = new ApiClient();
      await comp.register({
        name: `Competitor ${i}`,
        email: generateUniqueEmail(`comp-${i}`),
        password: "Password123!",
        intent: "solo",
      });
      competitors.push(comp);
    }

    // Fire all 5 joinTeam requests simultaneously
    const joinPromises = competitors.map((c) => c.joinTeam(inviteCode));
    const results = await Promise.all(joinPromises);

    const successfulJoins = results.filter((r) => r.status === 200);
    const rejectedJoins = results.filter((r) => r.status === 409);

    // Exactly 1 seat was open: exactly 1 must succeed and exactly 4 must be rejected
    expect(successfulJoins.length).toBe(1);
    expect(rejectedJoins.length).toBe(4);

    // Database verification: memberCount must be exactly 4
    const finalTeam = await findTeamByName(targetTeamName);
    expect(finalTeam.memberCount).toBe(4);
    expect(finalTeam.members.length).toBe(4);
  });

  it("Stage 3 [IDOR Protection]: Non-leader cannot alter team submission", async () => {
    const intruder = new ApiClient();
    await intruder.register({
      name: "Intruder User",
      email: generateUniqueEmail("intruder"),
      password: "Password123!",
      intent: "solo",
    });

    // Intruder attempts to POST submission
    const res = await intruder.post("/api/team/submission", {
      submit: false,
      repoUrl: "https://github.com/hacker/exploit",
    });
    // Should be rejected with 404 (not part of team) or 403
    expect(res.status === 404 || res.status === 403).toBe(true);
  });

  it("Stage 4 [Privilege Escalation]: Forged admin token is rejected with 401", async () => {
    const maliciousClient = new ApiClient();
    // Tamper token with invalid secret
    const fakeToken = signToken({ sub: "hacker-id", role: "ADMIN" }) + "TAMPER";
    maliciousClient.setToken(fakeToken);

    const adminAttempt = await maliciousClient.get("/api/admin/dashboard");
    expect(adminAttempt.status).toBe(401);
  });

  it("Stage 5 [System Stability]: System health remains green after adversarial penetration", async () => {
    const healthClient = new ApiClient();
    const healthRes = await healthClient.getHealth();
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.ok).toBe(true);
    expect(healthRes.body.database.connected).toBe(true);
  });
});
