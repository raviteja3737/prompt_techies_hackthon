/**
 * tests/e2e/tier4/scenario_multi_team_leaderboard_freeze.test.js
 * 
 * Tier 4: Real-World Application Scenario 3 — Multi-Team Competition & Leaderboard Freeze
 * Simulates a competitive multi-team hackathon with multiple tracks and judges:
 * 1. 3 teams formed across 2 different tracks
 * 2. Track locking and submission finalization for all 3 teams
 * 3. Independent evaluations by multiple judges with distinctive scores
 * 4. Overall leaderboard rank ordering verification (Apex 96 > Cyber 93 > Beacon 82)
 * 5. Track-filtered leaderboard verification
 * 6. Score freeze toggling and freeze status persistence
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { getTracks, findUserByEmail } = require("../helpers/dbHelper");

describe("Tier 4 Scenario 3: Multi-Team Competition & Real-Time Leaderboard", () => {
  const adminClient = new ApiClient();
  const leaderApex = new ApiClient();
  const leaderBeacon = new ApiClient();
  const leaderCyber = new ApiClient();
  const publicClient = new ApiClient();

  let track1;
  let track2;
  let teamApexId;
  let teamBeaconId;
  let teamCyberId;

  it("Stage 1 [Setup]: Retrieves hackathon tracks and authenticates admin", async () => {
    await adminClient.loginAsAdmin();
    const tracks = await getTracks();
    expect(tracks.length).toBeGreaterThanOrEqual(2);
    track1 = tracks[0];
    track2 = tracks[1];
  }, { smoke: true });

  it("Stage 2 [Formation]: Registers 3 teams across Track 1 and Track 2", async () => {
    // Team Apex (Track 1)
    await leaderApex.register({
      name: "Apex Leader",
      email: generateUniqueEmail("apex-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("Apex"),
    });
    const apexTeam = await leaderApex.getMyTeam();
    teamApexId = apexTeam.body.team.id;
    await leaderApex.lockTrack(track1.id);
    await leaderApex.finalizeSubmission({
      repoUrl: "https://github.com/prompt-techies/team-apex",
      techTags: ["AI", "Next.js"],
    });

    // Team Beacon (Track 1)
    await leaderBeacon.register({
      name: "Beacon Leader",
      email: generateUniqueEmail("beacon-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("Beacon"),
    });
    const beaconTeam = await leaderBeacon.getMyTeam();
    teamBeaconId = beaconTeam.body.team.id;
    await leaderBeacon.lockTrack(track1.id);
    await leaderBeacon.finalizeSubmission({
      repoUrl: "https://github.com/prompt-techies/team-beacon",
      techTags: ["React", "Express"],
    });

    // Team Cyber (Track 2)
    await leaderCyber.register({
      name: "Cyber Leader",
      email: generateUniqueEmail("cyber-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("Cyber"),
    });
    const cyberTeam = await leaderCyber.getMyTeam();
    teamCyberId = cyberTeam.body.team.id;
    await leaderCyber.lockTrack(track2.id);
    await leaderCyber.finalizeSubmission({
      repoUrl: "https://github.com/prompt-techies/team-cyber",
      techTags: ["Python", "FastAPI"],
    });

    expect(teamApexId).toBeDefined();
    expect(teamBeaconId).toBeDefined();
    expect(teamCyberId).toBeDefined();
  });

  it("Stage 3 [Grading]: Judges independently evaluate the three submissions", async () => {
    const judge1 = await findUserByEmail("jury1@promptothon.dev");
    const judge2 = await findUserByEmail("jury2@promptothon.dev");

    // Assign judge1 to Apex and Beacon
    await adminClient.createJuryAssignment(judge1.id, teamApexId, track1.id);
    await adminClient.createJuryAssignment(judge1.id, teamBeaconId, track1.id);
    // Assign judge2 to Cyber
    await adminClient.createJuryAssignment(judge2.id, teamCyberId, track2.id);

    // Judge 1 evaluates Apex (25+24+23+24 = 96)
    const j1Client = new ApiClient();
    await j1Client.loginAsJury("jury1@promptothon.dev");
    await j1Client.evaluateSubmission({
      teamId: teamApexId,
      innovation: 25,
      technical: 24,
      design: 23,
      viability: 24,
      lock: true,
    });

    // Judge 1 evaluates Beacon (20+21+20+21 = 82)
    await j1Client.evaluateSubmission({
      teamId: teamBeaconId,
      innovation: 20,
      technical: 21,
      design: 20,
      viability: 21,
      lock: true,
    });

    // Judge 2 evaluates Cyber (24+23+24+22 = 93)
    const j2Client = new ApiClient();
    await j2Client.loginAsJury("jury2@promptothon.dev");
    await j2Client.evaluateSubmission({
      teamId: teamCyberId,
      innovation: 24,
      technical: 23,
      design: 24,
      viability: 22,
      lock: true,
    });
  });

  it("Stage 4 [Global Ranking]: Overall leaderboard ranks teams correctly by score", async () => {
    const res = await publicClient.getLeaderboard();
    expect(res.status).toBe(200);

    const apexRow = res.body.leaderboard.find((r) => r.teamId === teamApexId);
    const cyberRow = res.body.leaderboard.find((r) => r.teamId === teamCyberId);
    const beaconRow = res.body.leaderboard.find((r) => r.teamId === teamBeaconId);

    expect(apexRow).toBeDefined();
    expect(cyberRow).toBeDefined();
    expect(beaconRow).toBeDefined();

    expect(apexRow.totalScore).toBe(96);
    expect(cyberRow.totalScore).toBe(93);
    expect(beaconRow.totalScore).toBe(82);

    // Verify relative ordering: Apex rank < Cyber rank < Beacon rank
    expect(apexRow.rank).toBeLessThan(cyberRow.rank);
    expect(cyberRow.rank).toBeLessThan(beaconRow.rank);
  });

  it("Stage 5 [Track Scoping]: Track-filtered leaderboards filter teams correctly", async () => {
    // Track 1 leaderboard
    const track1Board = await publicClient.getLeaderboard(track1.id);
    expect(track1Board.status).toBe(200);
    const t1TeamIds = track1Board.body.leaderboard.map((r) => r.teamId);
    expect(t1TeamIds.includes(teamApexId)).toBe(true);
    expect(t1TeamIds.includes(teamBeaconId)).toBe(true);
    expect(t1TeamIds.includes(teamCyberId)).toBe(false);

    // Track 2 leaderboard
    const track2Board = await publicClient.getLeaderboard(track2.id);
    expect(track2Board.status).toBe(200);
    const t2TeamIds = track2Board.body.leaderboard.map((r) => r.teamId);
    expect(t2TeamIds.includes(teamCyberId)).toBe(true);
    expect(t2TeamIds.includes(teamApexId)).toBe(false);
  });

  it("Stage 6 [Freeze]: Admin freezes scores at the end of judging", async () => {
    const freezeRes = await adminClient.freezeScores(true);
    expect(freezeRes.status).toBe(200);
    expect(freezeRes.body.scoresFrozen).toBe(true);

    const frozenBoard = await publicClient.getLeaderboard();
    expect(frozenBoard.body.scoresFrozen).toBe(true);

    // Cleanup
    await adminClient.freezeScores(false);
  });
});
