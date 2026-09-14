const { app, request, registerParticipant, createTeamLeader, joinTeam, truncateAll, prisma } = require("./helpers");

beforeEach(async () => truncateAll());
afterEach(async () => truncateAll());
afterAll(async () => prisma.$disconnect());

describe("auth", () => {
  test("solo registration creates a PARTICIPANT with no team", async () => {
    const { res } = await registerParticipant({ intent: "solo" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("PARTICIPANT");
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.token).toBeTruthy();
  });

  test("create-team registration returns a team leader with an invite code generated server-side", async () => {
    const { res } = await createTeamLeader({ teamName: "Alpha" });
    expect(res.status).toBe(201);

    const me = await request(app).get("/api/team/me").set("Authorization", `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.myRole).toBe("LEADER");
    expect(me.body.team.inviteCode).toMatch(/^PRMPT-/);
  });

  test("join registration adds a member to the referenced team", async () => {
    const { res: leaderRes } = await createTeamLeader({ teamName: "Beta" });
    const inviteCode = (await request(app).get("/api/team/me").set("Authorization", `Bearer ${leaderRes.body.token}`))
      .body.team.inviteCode;

    const { res: joinRes } = await joinTeam(inviteCode);
    expect(joinRes.status).toBe(201);

    const me = await request(app).get("/api/team/me").set("Authorization", `Bearer ${joinRes.body.token}`);
    expect(me.body.myRole).toBe("MEMBER");
    expect(me.body.team.members).toHaveLength(2);
  });

  test("login rejects an invalid password", async () => {
    const { res } = await registerParticipant({ email: "login-test@test.dev", password: "CorrectHorse1" });
    const bad = await request(app)
      .post("/api/auth/login")
      .send({ email: "login-test@test.dev", password: "WrongPassword1" });
    expect(bad.status).toBe(401);
    expect(res.status).toBe(201);
  });

  test("a protected route rejects requests with no token", async () => {
    const res = await request(app).get("/api/team/me");
    expect(res.status).toBe(401);
  });
});
