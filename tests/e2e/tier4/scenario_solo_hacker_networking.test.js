/**
 * tests/e2e/tier4/scenario_solo_hacker_networking.test.js
 * 
 * Tier 4: Real-World Application Scenario 2 — Solo Hacker Networking & Matchmaking
 * Simulates the end-to-end journey of a solo attendee:
 * 1. Solo participant registers with skills
 * 2. Checks in to networking directory
 * 3. Browses attendees directory with filters
 * 4. Initiates 1-click networking connection
 * 5. Inspects established connections feed
 * 6. Joins an open team via invite code and verifies team details
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { findUserByEmail, prisma } = require("../helpers/dbHelper");

describe("Tier 4 Scenario 2: Solo Hacker Networking & Matchmaking", () => {
  const soloClient = new ApiClient();
  const peerClient = new ApiClient();
  const hostTeamClient = new ApiClient();

  let soloEmail;
  let peerEmail;
  let peerUserId;
  let hostInviteCode;

  it("Stage 1 [Registration]: Solo hacker registers with specialized AI skills", async () => {
    soloEmail = generateUniqueEmail("solo-network");
    const res = await soloClient.register({
      name: "Solo Innovator",
      email: soloEmail,
      password: "Password123!",
      intent: "solo",
      college: "Carnegie Mellon",
      skills: ["PyTorch", "Transformers", "FastAPI"],
    });
    expect(res.status).toBe(201);
    expect(res.body.user.isSolo).toBe(true);

    // Register a peer participant who also checks in
    peerEmail = generateUniqueEmail("peer-network");
    const peerRes = await peerClient.register({
      name: "Peer Engineer",
      email: peerEmail,
      password: "Password123!",
      intent: "solo",
      college: "UC Berkeley",
      skills: ["React", "PostgreSQL", "Tailwind"],
    });
    expect(peerRes.status).toBe(201);
    peerUserId = peerRes.body.user.id;
  }, { smoke: true });

  it("Stage 2 [Check-In]: Participants check in to become discoverable", async () => {
    // Peer checks in
    const peerCheckIn = await peerClient.post("/api/networking/check-in");
    expect(peerCheckIn.status).toBe(200);
    expect(peerCheckIn.body.checkedInAt).toBeDefined();

    // Solo checks in
    const soloCheckIn = await soloClient.post("/api/networking/check-in");
    expect(soloCheckIn.status).toBe(200);
    expect(soloCheckIn.body.checkedInAt).toBeDefined();
  });

  it("Stage 3 [Directory]: Solo hacker browses attendees directory", async () => {
    const attendeesRes = await soloClient.get("/api/networking/attendees");
    expect(attendeesRes.status).toBe(200);
    expect(Array.isArray(attendeesRes.body.attendees)).toBe(true);

    // Peer should be discoverable
    const foundPeer = attendeesRes.body.attendees.find((a) => a.id === peerUserId);
    expect(foundPeer).toBeDefined();
    expect(foundPeer.name).toBe("Peer Engineer");
  });

  it("Stage 4 [1-Click Connect]: Solo hacker connects with peer participant", async () => {
    const connectRes = await soloClient.post("/api/networking/connect", {
      userId: peerUserId,
    });
    expect(connectRes.status).toBe(201);
    expect(connectRes.body.connection).toBeDefined();
  });

  it("Stage 5 [Connections Feed]: Both parties see the mutual connection", async () => {
    // Solo party connections
    const soloConnRes = await soloClient.get("/api/networking/connections");
    expect(soloConnRes.status).toBe(200);
    expect(soloConnRes.body.connections.length).toBeGreaterThanOrEqual(1);

    // Peer party connections
    const peerConnRes = await peerClient.get("/api/networking/connections");
    expect(peerConnRes.status).toBe(200);
    expect(peerConnRes.body.connections.length).toBeGreaterThanOrEqual(1);
  });

  it("Stage 6 [Team Joining]: Solo hacker connects with host team and joins via invite code", async () => {
    // Create an open host team
    const teamName = generateUniqueTeamName("VisionaryHackers");
    await hostTeamClient.register({
      name: "Host Leader",
      email: generateUniqueEmail("host-lead"),
      password: "Password123!",
      intent: "create",
      teamName,
    });
    const hostTeam = await hostTeamClient.getMyTeam();
    hostInviteCode = hostTeam.body.team.inviteCode;

    // Solo hacker joins host team
    const joinRes = await soloClient.joinTeam(hostInviteCode);
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.myRole).toBe("MEMBER");
    expect(joinRes.body.team.name).toBe(teamName);

    // Host leader verifies solo hacker is now on the roster
    const updatedTeam = await hostTeamClient.getMyTeam();
    expect(updatedTeam.body.team.memberCount).toBe(2);
    const memberNames = updatedTeam.body.team.members.map((m) => m.user.name);
    expect(memberNames.includes("Solo Innovator")).toBe(true);
  });
});
