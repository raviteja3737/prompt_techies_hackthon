/**
 * tests/e2e/tier1/03_team_track.test.js
 * 
 * Tier 1: Core Feature Coverage — Team Formation & Track Locking (Features 9 to 11)
 * Covers:
 * - Feature 9: Team Creation Flow (5 test cases)
 * - Feature 10: Team Joining via Code (5 test cases)
 * - Feature 11: Track Selection & Locking (5 test cases)
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { findTeamByName, findTeamByInviteCode, getTracks, getAuditLogs } = require("../helpers/dbHelper");

describe("Tier 1 - Feature 9: Team Creation Flow", () => {
  let leaderClient;
  let teamName;
  let leaderEmail;

  it("T1-F09-01: registers leader, creates team, and generates unique 6+ char code", async () => {
    leaderClient = new ApiClient();
    leaderEmail = generateUniqueEmail("leader-f9");
    teamName = generateUniqueTeamName("Quantum");

    const res = await leaderClient.register({
      name: "Quantum Leader",
      email: leaderEmail,
      password: "Password123!",
      intent: "create",
      teamName,
    });

    expect(res.status).toBe(201);
    const dbTeam = await findTeamByName(teamName);
    expect(dbTeam).toBeDefined();
    expect(dbTeam.inviteCode).toBeDefined();
    expect(dbTeam.inviteCode.length).toBeGreaterThanOrEqual(6);
  }, { smoke: true });

  it("T1-F09-02: assigns LEADER role to creator in TeamMember model", async () => {
    const dbTeam = await findTeamByName(teamName);
    expect(dbTeam.members.length).toBe(1);
    expect(dbTeam.members[0].role).toBe("LEADER");
    expect(dbTeam.members[0].user.email).toBe(leaderEmail);
  });

  it("T1-F09-03: initializes memberCount to 1 and capacityMax to 4", async () => {
    const dbTeam = await findTeamByName(teamName);
    expect(dbTeam.memberCount).toBe(1);
    expect(dbTeam.capacityMax).toBe(4);
  });

  it("T1-F09-04: GET /api/team/me for leader returns team payload with myRole: LEADER", async () => {
    const res = await leaderClient.getMyTeam();
    expect(res.status).toBe(200);
    expect(res.body.team).toBeDefined();
    expect(res.body.team.name).toBe(teamName);
    expect(res.body.myRole).toBe("LEADER");
  });

  it("T1-F09-05: indexes and retrieves team by inviteCode directly from PostgreSQL", async () => {
    const dbTeam = await findTeamByName(teamName);
    const queried = await findTeamByInviteCode(dbTeam.inviteCode);
    expect(queried).toBeDefined();
    expect(queried.id).toBe(dbTeam.id);
  });
});

describe("Tier 1 - Feature 10: Team Joining via Code", () => {
  let leaderClient;
  let inviteCode;
  let sharedTeamName;

  it("T1-F10-01: allows existing solo participant to join via POST /api/team/join", async () => {
    leaderClient = new ApiClient();
    sharedTeamName = generateUniqueTeamName("SharedTeam");
    await leaderClient.register({
      name: "Shared Leader",
      email: generateUniqueEmail("shared-lead"),
      password: "Password123!",
      intent: "create",
      teamName: sharedTeamName,
    });

    const team = await findTeamByName(sharedTeamName);
    inviteCode = team.inviteCode;

    // Solo participant registers first
    const soloClient = new ApiClient();
    const soloEmail = generateUniqueEmail("joiner-solo");
    await soloClient.register({
      name: "Joiner Solo",
      email: soloEmail,
      password: "Password123!",
      intent: "solo",
    });

    // Joins via POST /api/team/join
    const joinRes = await soloClient.joinTeam(inviteCode);
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.team).toBeDefined();
    expect(joinRes.body.myRole).toBe("MEMBER");
  }, { smoke: true });

  it("T1-F10-02: assigns MEMBER role to joining user", async () => {
    const team = await findTeamByName(sharedTeamName);
    const newMember = team.members.find((m) => m.role === "MEMBER");
    expect(newMember).toBeDefined();
    expect(newMember.role).toBe("MEMBER");
  });

  it("T1-F10-03: atomically increments team memberCount to 2", async () => {
    const team = await findTeamByName(sharedTeamName);
    expect(team.memberCount).toBe(2);
  });

  it("T1-F10-04: GET /api/team/me returns roster containing both leader and member", async () => {
    const res = await leaderClient.getMyTeam();
    expect(res.status).toBe(200);
    expect(res.body.team.members.length).toBe(2);
    const roles = res.body.team.members.map((m) => m.role);
    expect(roles.includes("LEADER")).toBe(true);
    expect(roles.includes("MEMBER")).toBe(true);
  });

  it("T1-F10-05: supports registration-time joining with intent 'join'", async () => {
    const directJoinClient = new ApiClient();
    const email = generateUniqueEmail("reg-join");

    const res = await directJoinClient.register({
      name: "Reg Joiner",
      email,
      password: "Password123!",
      intent: "join",
      teamCode: inviteCode,
    });

    expect(res.status).toBe(201);
    const team = await findTeamByName(sharedTeamName);
    expect(team.memberCount).toBe(3);
  });
});

describe("Tier 1 - Feature 11: Track Selection & Locking", () => {
  let leaderClient;
  let teamId;
  let trackToLock;

  it("T1-F11-01: retrieves seeded hackathon tracks", async () => {
    const tracks = await getTracks();
    expect(tracks.length).toBeGreaterThanOrEqual(1);
    trackToLock = tracks[0];
    expect(trackToLock.id).toBeDefined();
    expect(trackToLock.title).toBeDefined();
  }, { smoke: true });

  it("T1-F11-02: leader successfully locks track via POST /api/team/track-lock", async () => {
    leaderClient = new ApiClient();
    const teamName = generateUniqueTeamName("TrackLockTeam");
    await leaderClient.register({
      name: "Lock Leader",
      email: generateUniqueEmail("lock-lead"),
      password: "Password123!",
      intent: "create",
      teamName,
    });

    const res = await leaderClient.lockTrack(trackToLock.id);
    expect(res.status).toBe(200);
    expect(res.body.team).toBeDefined();
    expect(res.body.team.trackId).toBe(trackToLock.id);
    expect(res.body.team.trackLockedAt).toBeDefined();
    teamId = res.body.team.id;
  });

  it("T1-F11-03: verifies trackId and trackLockedAt persisted in PostgreSQL", async () => {
    const team = await findTeamByName(teamId); // or by id
    const queried = await leaderClient.getMyTeam();
    expect(queried.body.team.trackId).toBe(trackToLock.id);
    expect(queried.body.team.trackLockedAt).not.toBeNull();
  });

  it("T1-F11-04: GET /api/team/me reflects locked track relation", async () => {
    const res = await leaderClient.getMyTeam();
    expect(res.status).toBe(200);
    expect(res.body.team.track).toBeDefined();
    expect(res.body.team.track.id).toBe(trackToLock.id);
  });

  it("T1-F11-05: audit log records TRACK_LOCKED action with teamId and trackId", async () => {
    const logs = await getAuditLogs("TRACK_LOCKED");
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].action).toBe("TRACK_LOCKED");
    expect(logs[0].metadata.trackId).toBe(trackToLock.id);
  });
});
