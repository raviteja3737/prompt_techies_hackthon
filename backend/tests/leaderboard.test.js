const { app, request, createTeamLeader, createUser, truncateAll, prisma } = require("./helpers");

beforeEach(async () => truncateAll());
afterEach(async () => truncateAll());
afterAll(async () => prisma.$disconnect());

async function lockedEval(teamId, juryId, scores) {
  return prisma.evaluation.create({
    data: { teamId, juryId, ...scores, status: "LOCKED", lockedAt: new Date() },
  });
}

describe("leaderboard", () => {
  test("only LOCKED evaluations count toward the score", async () => {
    const { res: leader } = await createTeamLeader({ teamName: "Draft Excluded Team" });
    const me = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leader.body.token}`);
    const teamId = me.body.team.id;
    const { user: jury } = await createUser({ role: "JURY", email: "lb-jury1@test.dev" });

    await prisma.evaluation.create({
      data: { teamId, juryId: jury.id, innovation: 25, technical: 25, design: 25, viability: 25, status: "DRAFT" },
    });

    const res = await request(app).get("/api/leaderboard");
    const row = res.body.leaderboard.find((r) => r.teamId === teamId);
    expect(row.juryCount).toBe(0);
    expect(row.rank).toBeNull();
  });

  test("ranks teams by average score across their locked evaluations", async () => {
    const { res: leaderHigh } = await createTeamLeader({ teamName: "High Score Team" });
    const { res: leaderLow } = await createTeamLeader({ teamName: "Low Score Team" });
    const meHigh = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leaderHigh.body.token}`);
    const meLow = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leaderLow.body.token}`);

    const { user: jury } = await createUser({ role: "JURY", email: "lb-jury2@test.dev" });
    await lockedEval(meHigh.body.team.id, jury.id, { innovation: 25, technical: 25, design: 25, viability: 25 });
    await lockedEval(meLow.body.team.id, jury.id, { innovation: 10, technical: 10, design: 10, viability: 10 });

    const res = await request(app).get("/api/leaderboard");
    const high = res.body.leaderboard.find((r) => r.teamId === meHigh.body.team.id);
    const low = res.body.leaderboard.find((r) => r.teamId === meLow.body.team.id);

    expect(high.rank).toBe(1);
    expect(low.rank).toBe(2);
    expect(high.totalScore).toBe(100);
  });

  test("teams tied on average score both still get a defined rank", async () => {
    const { res: leaderA } = await createTeamLeader({ teamName: "Tie A" });
    const { res: leaderB } = await createTeamLeader({ teamName: "Tie B" });
    const meA = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leaderA.body.token}`);
    const meB = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leaderB.body.token}`);

    const { user: jury } = await createUser({ role: "JURY", email: "lb-jury3@test.dev" });
    await lockedEval(meA.body.team.id, jury.id, { innovation: 20, technical: 20, design: 20, viability: 20 });
    await lockedEval(meB.body.team.id, jury.id, { innovation: 20, technical: 20, design: 20, viability: 20 });

    const res = await request(app).get("/api/leaderboard");
    const a = res.body.leaderboard.find((r) => r.teamId === meA.body.team.id);
    const b = res.body.leaderboard.find((r) => r.teamId === meB.body.team.id);
    expect(a.totalScore).toBe(b.totalScore);
    expect(a.rank).not.toBeNull();
    expect(b.rank).not.toBeNull();
  });

  test("freezing scores keeps GET /api/leaderboard serving data but flags scoresFrozen", async () => {
    const { token: adminToken } = await createUser({ role: "ADMIN", email: "freeze-admin@test.dev" });
    await request(app).post("/api/admin/freeze-scores").set("Authorization", `Bearer ${adminToken}`).send({ frozen: true });

    const res = await request(app).get("/api/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body.scoresFrozen).toBe(true);
  });

  test("a non-admin cannot freeze scores", async () => {
    const { res: leader } = await createTeamLeader({ teamName: "Cannot Freeze" });
    const res = await request(app)
      .post("/api/admin/freeze-scores")
      .set("Authorization", `Bearer ${leader.body.token}`)
      .send({ frozen: true });
    expect(res.status).toBe(403);
  });
});
