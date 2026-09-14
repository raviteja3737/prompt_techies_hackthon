const { app, request, createTeamLeader, joinTeam, registerParticipant, truncateAll, prisma } = require("./helpers");

beforeEach(async () => truncateAll());
afterEach(async () => truncateAll());
afterAll(async () => prisma.$disconnect());

async function getInviteCode(token) {
  const res = await request(app).get("/api/team/me").set("Authorization", `Bearer ${token}`);
  return res.body.team.inviteCode;
}

describe("team", () => {
  test("a team fills up to capacityMax and further joins are rejected", async () => {
    const { res: leader } = await createTeamLeader({ teamName: "Cap Test" });
    const inviteCode = await getInviteCode(leader.body.token);

    // capacityMax defaults to 4; leader is 1, so 3 more should succeed.
    for (let i = 0; i < 3; i += 1) {
      const { res } = await joinTeam(inviteCode);
      expect(res.status).toBe(201);
    }

    const { res: overflow } = await joinTeam(inviteCode);
    expect(overflow.status).toBe(409);
  });

  test("joining with an unknown invite code returns 404", async () => {
    const { res } = await joinTeam("PRMPT-DOESNOTEXIST");
    expect(res.status).toBe(404);
  });

  test("POST /api/team/join rejects a user who already has a team", async () => {
    const { res: leaderA } = await createTeamLeader({ teamName: "Team A" });
    const { res: leaderB } = await createTeamLeader({ teamName: "Team B" });
    const inviteCodeB = await getInviteCode(leaderB.body.token);

    const res = await request(app)
      .post("/api/team/join")
      .set("Authorization", `Bearer ${leaderA.body.token}`)
      .send({ teamCode: inviteCodeB });

    expect(res.status).toBe(409);
  });

  test("solo participant can join a team later via POST /api/team/join", async () => {
    const { res: solo } = await registerParticipant({ intent: "solo" });
    const { res: leader } = await createTeamLeader({ teamName: "Solo Join Target" });
    const inviteCode = await getInviteCode(leader.body.token);

    const res = await request(app)
      .post("/api/team/join")
      .set("Authorization", `Bearer ${solo.body.token}`)
      .send({ teamCode: inviteCode });

    expect(res.status).toBe(200);
    expect(res.body.myRole).toBe("MEMBER");
  });

  test("only the team leader can lock the track selection", async () => {
    const { res: leader } = await createTeamLeader({ teamName: "Lock Test" });
    const inviteCode = await getInviteCode(leader.body.token);
    const { res: member } = await joinTeam(inviteCode);

    const track = await prisma.track.create({
      data: { title: "Test Track", description: "A track for testing." },
    });

    const memberAttempt = await request(app)
      .post("/api/team/track-lock")
      .set("Authorization", `Bearer ${member.body.token}`)
      .send({ trackId: track.id });
    expect(memberAttempt.status).toBe(403);

    const leaderAttempt = await request(app)
      .post("/api/team/track-lock")
      .set("Authorization", `Bearer ${leader.body.token}`)
      .send({ trackId: track.id });
    expect(leaderAttempt.status).toBe(200);
    expect(leaderAttempt.body.team.trackId).toBe(track.id);

    // Locking twice is rejected.
    const relock = await request(app)
      .post("/api/team/track-lock")
      .set("Authorization", `Bearer ${leader.body.token}`)
      .send({ trackId: track.id });
    expect(relock.status).toBe(409);
  });
});
