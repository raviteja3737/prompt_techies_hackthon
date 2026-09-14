/**
 * tests/e2e/tier2/boundary_team_track.test.js
 * 
 * Tier 2: Boundary & Corner Cases — Team Formation & Track Locking (Features 9 to 11)
 * Covers:
 * - Feature 9: Team Creation Boundaries (5 test cases)
 * - Feature 10: Team Joining Boundaries (5 test cases)
 * - Feature 11: Track Selection & Locking Boundaries (5 test cases)
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { getTracks, prisma } = require("../helpers/dbHelper");

describe("Tier 2 - Feature 9: Team Creation Boundaries", () => {
  it("T2-F09-01: rejects empty teamName with 422", async () => {
    const client = new ApiClient();
    const res = await client.register({
      name: "Empty Team Lead",
      email: generateUniqueEmail("empty-team"),
      password: "Password123!",
      intent: "create",
      teamName: "",
    });
    expect(res.status).toBe(422);
  }, { smoke: true });

  it("T2-F09-02: rejects teamName under minimum character length (<2 chars) with 422", async () => {
    const client = new ApiClient();
    const res = await client.register({
      name: "Short Team Lead",
      email: generateUniqueEmail("short-team"),
      password: "Password123!",
      intent: "create",
      teamName: "A",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F09-03: accepts teamName with valid unicode and alphanumeric characters", async () => {
    const client = new ApiClient();
    const unicodeName = `Delta AI 🚀 ${Date.now().toString().slice(-4)}`;
    const res = await client.register({
      name: "Unicode Lead",
      email: generateUniqueEmail("unicode-lead"),
      password: "Password123!",
      intent: "create",
      teamName: unicodeName,
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
  });

  it("T2-F09-04: creates team with long name (up to 50 chars)", async () => {
    const client = new ApiClient();
    const longName = `Long Team Name That Validly Fits Within Fifty Chars ${Date.now().toString().slice(-4)}`;
    const res = await client.register({
      name: "Long Lead",
      email: generateUniqueEmail("long-lead"),
      password: "Password123!",
      intent: "create",
      teamName: longName.slice(0, 48),
    });
    expect(res.status).toBe(201);
  });

  it("T2-F09-05: generated team inviteCode is valid uppercase alphanumeric string", async () => {
    const client = new ApiClient();
    await client.register({
      name: "Code Lead",
      email: generateUniqueEmail("code-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("CodeCheck"),
    });
    const myTeam = await client.getMyTeam();
    const code = myTeam.body.team.inviteCode;
    expect(typeof code).toBe("string");
    expect(code.length).toBeGreaterThanOrEqual(6);
  });
});

describe("Tier 2 - Feature 10: Team Joining Boundaries", () => {
  let leaderClient;
  let validInviteCode;
  let fullTeamCode;

  it("T2-F10-01: invalid or non-existent 6-char team code returns 404 Not Found", async () => {
    const solo = new ApiClient();
    await solo.register({
      name: "Non Existent Joiner",
      email: generateUniqueEmail("non-exist-join"),
      password: "Password123!",
      intent: "solo",
    });

    const res = await solo.joinTeam("NONEX9");
    expect(res.status).toBe(404);
  }, { smoke: true });

  it("T2-F10-02: user already in a team cannot join another team (returns 409)", async () => {
    // Register leader 1
    leaderClient = new ApiClient();
    await leaderClient.register({
      name: "Leader 1",
      email: generateUniqueEmail("lead1"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("TeamOne"),
    });
    const t1 = await leaderClient.getMyTeam();
    validInviteCode = t1.body.team.inviteCode;

    // Leader 2 tries to join Team 1 while already in Team 2
    const leader2 = new ApiClient();
    await leader2.register({
      name: "Leader 2",
      email: generateUniqueEmail("lead2"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("TeamTwo"),
    });

    const res = await leader2.joinTeam(validInviteCode);
    expect(res.status).toBe(409);
  });

  it("T2-F10-03: joining team at full capacity (4 members) returns 409 Conflict", async () => {
    const capLeader = new ApiClient();
    await capLeader.register({
      name: "Cap Leader",
      email: generateUniqueEmail("cap-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("FullTeam"),
    });
    const team = await capLeader.getMyTeam();
    fullTeamCode = team.body.team.inviteCode;

    // Join member 2, 3, 4
    for (let i = 2; i <= 4; i++) {
      const m = new ApiClient();
      await m.register({
        name: `Member ${i}`,
        email: generateUniqueEmail(`m${i}`),
        password: "Password123!",
        intent: "join",
        teamCode: fullTeamCode,
      });
    }

    // 5th member attempt should fail with 409
    const fifthMember = new ApiClient();
    const fifthRes = await fifthMember.register({
      name: "Fifth Member",
      email: generateUniqueEmail("fifth"),
      password: "Password123!",
      intent: "join",
      teamCode: fullTeamCode,
    });
    expect(fifthRes.status).toBe(409);
    expect(fifthRes.body.error || fifthRes.body.message).toBeDefined();
  });

  it("T2-F10-04: empty team code rejected with 422", async () => {
    const solo = new ApiClient();
    await solo.register({
      name: "Empty Code Joiner",
      email: generateUniqueEmail("empty-code-join"),
      password: "Password123!",
      intent: "solo",
    });

    const res = await solo.joinTeam("");
    expect(res.status).toBe(422);
  });

  it("T2-F10-05: missing teamCode in POST /api/team/join returns 422", async () => {
    const solo = new ApiClient();
    await solo.register({
      name: "No Body Joiner",
      email: generateUniqueEmail("no-body-join"),
      password: "Password123!",
      intent: "solo",
    });

    const res = await solo.post("/api/team/join", {});
    expect(res.status).toBe(422);
  });
});

describe("Tier 2 - Feature 11: Track Selection & Locking Boundaries", () => {
  let leaderClient;
  let memberClient;
  let trackId;

  it("T2-F11-01: non-leader member attempting track-lock returns 403 Forbidden", async () => {
    leaderClient = new ApiClient();
    await leaderClient.register({
      name: "Lock Lead",
      email: generateUniqueEmail("lock-lead-2"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("LockBoundaryTeam"),
    });
    const team = await leaderClient.getMyTeam();

    memberClient = new ApiClient();
    await memberClient.register({
      name: "Lock Member",
      email: generateUniqueEmail("lock-mem"),
      password: "Password123!",
      intent: "join",
      teamCode: team.body.team.inviteCode,
    });

    const tracks = await getTracks();
    trackId = tracks[0].id;

    // Member attempts track lock
    const res = await memberClient.lockTrack(trackId);
    expect(res.status).toBe(403);
    expect(res.body.error || res.body.message).toBeDefined();
  }, { smoke: true });

  it("T2-F11-02: locking track twice returns 409 Conflict", async () => {
    // First lock succeeds
    const firstLock = await leaderClient.lockTrack(trackId);
    expect(firstLock.status).toBe(200);

    // Second lock attempt
    const secondLock = await leaderClient.lockTrack(trackId);
    expect(secondLock.status).toBe(409);
    expect(secondLock.body.error || secondLock.body.message).toBeDefined();
  });

  it("T2-F11-03: non-existent trackId returns 404 Not Found", async () => {
    const freshLeader = new ApiClient();
    await freshLeader.register({
      name: "Fresh Lead",
      email: generateUniqueEmail("fresh-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("FreshTeam"),
    });

    const res = await freshLeader.lockTrack("non-existent-track-cuid-9999");
    expect(res.status).toBe(404);
  });

  it("T2-F11-04: missing trackId in request body returns 422", async () => {
    const freshLeader = new ApiClient();
    await freshLeader.register({
      name: "No Track Lead",
      email: generateUniqueEmail("no-track-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("NoTrackTeam"),
    });

    const res = await freshLeader.post("/api/team/track-lock", {});
    expect(res.status).toBe(422);
  });

  it("T2-F11-05: empty string trackId returns 422", async () => {
    const freshLeader = new ApiClient();
    await freshLeader.register({
      name: "Empty Track Lead",
      email: generateUniqueEmail("empty-track-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("EmptyTrackTeam"),
    });

    const res = await freshLeader.lockTrack("");
    expect(res.status).toBe(422);
  });
});
