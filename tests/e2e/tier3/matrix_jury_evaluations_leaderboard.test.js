/**
 * tests/e2e/tier3/matrix_jury_evaluations_leaderboard.test.js
 * 
 * Tier 3: Cross-Feature State Matrix — Submissions x Jury x Leaderboard
 * Validates the end-to-end grading and evaluation aggregation pipeline:
 * - Assignment of jury to submitted team
 * - Unassigned jury evaluation blocking
 * - Rubric evaluation score locking (0-25 per dimension)
 * - Public leaderboard aggregation and score anonymization
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { getTracks, findUserByEmail, prisma } = require("../helpers/dbHelper");

describe("Tier 3 Matrix: Submissions x Jury x Leaderboard", () => {
  let leaderClient;
  let adminClient;
  let juryClient;
  let targetTeamId;
  let juryUser;

  it("Matrix-JEL-01: Admin assigns jury to team with finalized submission", async () => {
    // 1. Leader creates team and submits
    leaderClient = new ApiClient();
    const teamName = generateUniqueTeamName("JELMatrix");
    await leaderClient.register({
      name: "JEL Leader",
      email: generateUniqueEmail("jel-lead"),
      password: "Password123!",
      intent: "create",
      teamName,
    });
    const myTeam = await leaderClient.getMyTeam();
    targetTeamId = myTeam.body.team.id;

    const tracks = await getTracks();
    await leaderClient.lockTrack(tracks[0].id);
    await leaderClient.finalizeSubmission({
      repoUrl: "https://github.com/prompt-techies/jel-project",
      liveUrl: "https://jel.demo.vercel.app",
      techTags: ["Next.js", "Express"],
    });

    // 2. Admin assigns jury3 to this team
    adminClient = new ApiClient();
    await adminClient.loginAsAdmin();
    juryUser = await findUserByEmail("jury3@promptothon.dev");
    expect(juryUser).toBeDefined();

    const assignRes = await adminClient.createJuryAssignment(juryUser.id, targetTeamId);
    expect(assignRes.status).toBe(201);
  }, { smoke: true });

  it("Matrix-JEL-02: Assigned team appears in jury member's evaluation queue", async () => {
    juryClient = new ApiClient();
    await juryClient.loginAsJury("jury3@promptothon.dev");

    const queueRes = await juryClient.getJuryQueue();
    expect(queueRes.status).toBe(200);
    const inQueue = queueRes.body.queue.find((q) => (q.team ? q.team.id : q.teamId) === targetTeamId);
    expect(inQueue).toBeDefined();
  });

  it("Matrix-JEL-03: Unassigned jury member is rejected from evaluating this team (403)", async () => {
    const unassignedJury = new ApiClient();
    await unassignedJury.loginAsJury("jury2@promptothon.dev");

    const evalRes = await unassignedJury.evaluateSubmission({
      teamId: targetTeamId,
      innovation: 25,
      technical: 25,
      design: 25,
      viability: 25,
    });
    expect(evalRes.status).toBe(403);
    expect(evalRes.body.error || evalRes.body.message).toBeDefined();
  });

  it("Matrix-JEL-04: Assigned jury evaluates team with rubric and locks score", async () => {
    const evalRes = await juryClient.evaluateSubmission({
      teamId: targetTeamId,
      innovation: 24,
      technical: 23,
      design: 25,
      viability: 22,
      feedback: "Exceptional architecture and clean dual-track test suite.",
      lock: true,
    });
    expect(evalRes.status).toBe(200);
    expect(evalRes.body.evaluation.status).toBe("LOCKED");
    expect(evalRes.body.evaluation.lockedAt).not.toBeNull();
  });

  it("Matrix-JEL-05: Public leaderboard reflects locked evaluation with masked jury identity", async () => {
    const publicClient = new ApiClient();
    const boardRes = await publicClient.getLeaderboard();
    expect(boardRes.status).toBe(200);

    const teamRow = boardRes.body.leaderboard.find((r) => r.teamId === targetTeamId);
    expect(teamRow).toBeDefined();

    // Verify privacy: No real jury email or ID exposed
    const rowStr = JSON.stringify(teamRow);
    expect(rowStr.includes("jury3@promptothon.dev")).toBe(false);
  });
});
