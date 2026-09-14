/**
 * tests/e2e/tier3/matrix_auth_teams.test.js
 * 
 * Tier 3: Cross-Feature State Matrix — Auth States x Team States
 * Validates the pairwise lifecycle and concurrency between authentication and team formation:
 * - Register leader -> auto-create team -> verify leadership
 * - Solo participant -> matchmaking -> late team joining
 * - Sequential team member fills up to maximum capacity of 4
 * - Boundary enforcement on 5th member joining full team
 * - Cross-team membership exclusivity check
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { findTeamByName, findUserByEmail, prisma } = require("../helpers/dbHelper");

describe("Tier 3 Matrix: Auth States x Team States", () => {
  let leaderClient;
  let sharedTeamName;
  let inviteCode;

  it("Matrix-AT-01: Leader registers with intent 'create', team created, role set to LEADER", async () => {
    leaderClient = new ApiClient();
    sharedTeamName = generateUniqueTeamName("MatrixTeam");
    const leaderEmail = generateUniqueEmail("matrix-lead");

    const res = await leaderClient.register({
      name: "Matrix Leader",
      email: leaderEmail,
      password: "Password123!",
      intent: "create",
      teamName: sharedTeamName,
    });
    expect(res.status).toBe(201);

    const team = await findTeamByName(sharedTeamName);
    expect(team).toBeDefined();
    expect(team.memberCount).toBe(1);
    expect(team.members[0].role).toBe("LEADER");
    inviteCode = team.inviteCode;
  }, { smoke: true });

  it("Matrix-AT-02: Solo participant registers, initially unattached, joins team later", async () => {
    const soloClient = new ApiClient();
    const soloEmail = generateUniqueEmail("matrix-solo");

    // Register as solo
    const regRes = await soloClient.register({
      name: "Matrix Solo",
      email: soloEmail,
      password: "Password123!",
      intent: "solo",
    });
    expect(regRes.status).toBe(201);
    expect(regRes.body.user.isSolo).toBe(true);

    // Initial check: not part of a team
    const initialTeamRes = await soloClient.getMyTeam();
    expect(initialTeamRes.status).toBe(404);

    // Join the existing team
    const joinRes = await soloClient.joinTeam(inviteCode);
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.myRole).toBe("MEMBER");

    // Now has a team
    const teamRes = await soloClient.getMyTeam();
    expect(teamRes.status).toBe(200);
    expect(teamRes.body.team.name).toBe(sharedTeamName);
  });

  it("Matrix-AT-03: Sequentially fills team up to capacity cap of 4", async () => {
    // Member 3 joins
    const m3 = new ApiClient();
    const res3 = await m3.register({
      name: "Matrix Member 3",
      email: generateUniqueEmail("matrix-m3"),
      password: "Password123!",
      intent: "join",
      teamCode: inviteCode,
    });
    expect(res3.status).toBe(201);

    // Member 4 joins
    const m4 = new ApiClient();
    const res4 = await m4.register({
      name: "Matrix Member 4",
      email: generateUniqueEmail("matrix-m4"),
      password: "Password123!",
      intent: "join",
      teamCode: inviteCode,
    });
    expect(res4.status).toBe(201);

    const team = await findTeamByName(sharedTeamName);
    expect(team.memberCount).toBe(4);
    expect(team.members.length).toBe(4);
  });

  it("Matrix-AT-04: 5th member joining full team is rejected with 409 Conflict", async () => {
    const m5 = new ApiClient();
    const res5 = await m5.register({
      name: "Matrix Member 5",
      email: generateUniqueEmail("matrix-m5"),
      password: "Password123!",
      intent: "join",
      teamCode: inviteCode,
    });
    expect(res5.status).toBe(409);
    expect(res5.body.error || res5.body.message).toBeDefined();

    // Verify team member count remains strictly 4
    const team = await findTeamByName(sharedTeamName);
    expect(team.memberCount).toBe(4);
  });

  it("Matrix-AT-05: Member of Team A attempting to join Team B is rejected with 409", async () => {
    // Create Team B
    const leaderB = new ApiClient();
    const teamBName = generateUniqueTeamName("TeamBeta");
    await leaderB.register({
      name: "Leader Beta",
      email: generateUniqueEmail("lead-beta"),
      password: "Password123!",
      intent: "create",
      teamName: teamBName,
    });
    const teamB = await findTeamByName(teamBName);

    // Leader of Team A tries to join Team B
    const crossJoinRes = await leaderClient.joinTeam(teamB.inviteCode);
    expect(crossJoinRes.status).toBe(409);
    expect(crossJoinRes.body.error || crossJoinRes.body.message).toBeDefined();

    // Team B still has only 1 member
    const teamBAfter = await findTeamByName(teamBName);
    expect(teamBAfter.memberCount).toBe(1);
  });
});
