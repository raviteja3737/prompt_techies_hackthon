/**
 * tests/e2e/tier4/scenario_full_hackathon_lifecycle.test.js
 * 
 * Tier 4: Real-World Application Scenario 1 — Complete Hackathon Event Lifecycle
 * Simulates the entire event journey from start to finish across multi-user personas:
 * 1. Admin setup & announcement
 * 2. Team formation (Leader & Member)
 * 3. Track selection & locking
 * 4. Submission draft & finalization
 * 5. Jury assignment, evaluation rubric & score lock
 * 6. Public leaderboard updates & final score freeze
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { getTracks, findUserByEmail, prisma } = require("../helpers/dbHelper");

describe("Tier 4 Scenario 1: Complete Hackathon Event Lifecycle", () => {
  const adminClient = new ApiClient();
  const leaderClient = new ApiClient();
  const memberClient = new ApiClient();
  const juryClient = new ApiClient();
  const publicClient = new ApiClient();

  let teamName;
  let inviteCode;
  let teamId;
  let selectedTrack;
  let juryUser;

  it("Stage 1 [Admin]: Admin initializes event and broadcasts kickoff announcement", async () => {
    await adminClient.loginAsAdmin();
    const tracks = await getTracks();
    expect(tracks.length).toBeGreaterThanOrEqual(1);
    selectedTrack = tracks[0];

    const announceRes = await adminClient.createAnnouncement({
      title: "Welcome to Promptothon 2026!",
      message: "Hacking has officially begun. Form your teams and lock tracks!",
      priority: "HIGH",
      published: true,
    });
    expect(announceRes.status).toBe(201);
  }, { smoke: true });

  it("Stage 2 [Leader]: Team Leader registers and creates Team", async () => {
    teamName = generateUniqueTeamName("QuantumHacks");
    const leaderEmail = generateUniqueEmail("q-lead");

    const regRes = await leaderClient.register({
      name: "Quantum Leader",
      email: leaderEmail,
      password: "Password123!",
      intent: "create",
      teamName,
      college: "Stanford University",
      skills: ["AI", "Next.js", "PyTorch"],
    });
    expect(regRes.status).toBe(201);

    const myTeam = await leaderClient.getMyTeam();
    expect(myTeam.status).toBe(200);
    inviteCode = myTeam.body.team.inviteCode;
    teamId = myTeam.body.team.id;
    expect(inviteCode).toBeDefined();
    expect(myTeam.body.myRole).toBe("LEADER");
  });

  it("Stage 3 [Member]: Teammate registers and joins the team via invite code", async () => {
    const memberEmail = generateUniqueEmail("q-member");
    const memberRes = await memberClient.register({
      name: "Quantum Dev",
      email: memberEmail,
      password: "Password123!",
      intent: "join",
      teamCode: inviteCode,
      college: "Stanford University",
      skills: ["Tailwind", "React", "Node.js"],
    });
    expect(memberRes.status).toBe(201);

    // Verify leader sees 2 members
    const updatedTeam = await leaderClient.getMyTeam();
    expect(updatedTeam.body.team.memberCount).toBe(2);
    expect(updatedTeam.body.team.members.length).toBe(2);
  });

  it("Stage 4 [Leader]: Team Leader locks track selection", async () => {
    const lockRes = await leaderClient.lockTrack(selectedTrack.id);
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.team.trackId).toBe(selectedTrack.id);
    expect(lockRes.body.team.trackLockedAt).not.toBeNull();
  });

  it("Stage 5 [Team]: Team saves draft submission and uploads pitch deck metadata", async () => {
    // Draft save
    const draftRes = await leaderClient.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/quantum-ai-agents",
      liveUrl: "https://quantum-ai.vercel.app",
      videoUrl: "https://youtube.com/watch?v=demo-walkthrough",
      techTags: ["Next.js", "Express", "Prisma", "PostgreSQL", "Gemini"],
    });
    expect(draftRes.status).toBe(200);
    expect(draftRes.body.submission.status).toBe("DRAFT");

    // Pitch deck metadata
    const deckRes = await leaderClient.attachPitchDeck(
      "decks/quantum-deck.pdf",
      "https://storage.promptothon.dev/decks/quantum-deck.pdf"
    );
    expect(deckRes.status).toBe(200);
  });

  it("Stage 6 [Leader]: Team Leader finalizes submission", async () => {
    const finalRes = await leaderClient.finalizeSubmission({
      repoUrl: "https://github.com/prompt-techies/quantum-ai-agents",
      liveUrl: "https://quantum-ai.vercel.app",
      videoUrl: "https://youtube.com/watch?v=demo-walkthrough",
      techTags: ["Next.js", "Express", "Prisma", "PostgreSQL", "Gemini"],
    });
    expect(finalRes.status).toBe(200);
    expect(finalRes.body.submission.status).toBe("SUBMITTED");
  });

  it("Stage 7 [Admin & Jury]: Admin assigns Jury, and Jury evaluates submission", async () => {
    juryUser = await findUserByEmail("jury1@promptothon.dev");
    await adminClient.createJuryAssignment(juryUser.id, teamId, selectedTrack.id);

    // Jury logs in
    await juryClient.loginAsJury("jury1@promptothon.dev");
    const queueRes = await juryClient.getJuryQueue();
    expect(queueRes.status).toBe(200);

    // Jury evaluates with rubric (total = 23 + 24 + 22 + 25 = 94/100)
    const evalRes = await juryClient.evaluateSubmission({
      teamId,
      innovation: 23,
      technical: 24,
      design: 22,
      viability: 25,
      feedback: "Outstanding multi-agent architecture and clean implementation.",
      lock: true,
    });
    expect(evalRes.status).toBe(200);
    expect(evalRes.body.evaluation.status).toBe("LOCKED");
  });

  it("Stage 8 [Public]: Public leaderboard reflects team ranking with anonymized score", async () => {
    const boardRes = await publicClient.getLeaderboard();
    expect(boardRes.status).toBe(200);

    const teamRow = boardRes.body.leaderboard.find((r) => r.teamId === teamId);
    expect(teamRow).toBeDefined();
    expect(teamRow.totalScore).toBe(94);
    expect(teamRow.breakdown.length).toBeGreaterThanOrEqual(1);

    // Anonymization check: Jury alias is masked
    expect(teamRow.breakdown[0].juryAlias).toBeDefined();
    expect(teamRow.breakdown[0].juryAlias.startsWith("Jury #")).toBe(true);
  });

  it("Stage 9 [Admin]: Admin freezes scores, locking public results", async () => {
    const freezeRes = await adminClient.freezeScores(true);
    expect(freezeRes.status).toBe(200);
    expect(freezeRes.body.scoresFrozen).toBe(true);

    const publicFrozenBoard = await publicClient.getLeaderboard();
    expect(publicFrozenBoard.body.scoresFrozen).toBe(true);

    // Reset score freeze for other tests
    await adminClient.freezeScores(false);
  });
});
