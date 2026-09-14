const { app, request, createTeamLeader, createUser, truncateAll, prisma } = require("./helpers");

beforeEach(async () => truncateAll());
afterEach(async () => truncateAll());
afterAll(async () => prisma.$disconnect());

async function setUpTeamAndJury({ assign = true } = {}) {
  const { res: leader } = await createTeamLeader({ teamName: "Jury Test Team" });
  const me = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leader.body.token}`);
  const teamId = me.body.team.id;

  const { user: jury, token: juryToken } = await createUser({ role: "JURY", email: "jury@test.dev" });

  if (assign) {
    await prisma.juryAssignment.create({ data: { juryId: jury.id, teamId } });
  }

  return { teamId, juryToken, juryId: jury.id };
}

describe("jury", () => {
  test("an unassigned jury member cannot evaluate a team", async () => {
    const { teamId, juryToken } = await setUpTeamAndJury({ assign: false });
    const res = await request(app)
      .post("/api/jury/evaluate")
      .set("Authorization", `Bearer ${juryToken}`)
      .send({ teamId, innovation: 20, technical: 20, design: 20, viability: 20 });
    expect(res.status).toBe(403);
  });

  test("an assigned jury member can save a draft evaluation", async () => {
    const { teamId, juryToken } = await setUpTeamAndJury();
    const res = await request(app)
      .post("/api/jury/evaluate")
      .set("Authorization", `Bearer ${juryToken}`)
      .send({ teamId, innovation: 20, technical: 18, design: 15, viability: 22 });

    expect(res.status).toBe(200);
    expect(res.body.evaluation.status).toBe("DRAFT");
    expect(res.body.evaluation.total).toBe(75);
  });

  test("scores outside 0-25 are rejected", async () => {
    const { teamId, juryToken } = await setUpTeamAndJury();
    const res = await request(app)
      .post("/api/jury/evaluate")
      .set("Authorization", `Bearer ${juryToken}`)
      .send({ teamId, innovation: 30, technical: 18, design: 15, viability: 22 });
    expect(res.status).toBe(422);
  });

  test("locking an evaluation prevents further edits", async () => {
    const { teamId, juryToken } = await setUpTeamAndJury();
    const lock = await request(app)
      .post("/api/jury/evaluate")
      .set("Authorization", `Bearer ${juryToken}`)
      .send({ teamId, innovation: 20, technical: 20, design: 20, viability: 20, lock: true });
    expect(lock.status).toBe(200);
    expect(lock.body.evaluation.status).toBe("LOCKED");

    const editAttempt = await request(app)
      .post("/api/jury/evaluate")
      .set("Authorization", `Bearer ${juryToken}`)
      .send({ teamId, innovation: 25, technical: 25, design: 25, viability: 25 });
    expect(editAttempt.status).toBe(409);
  });

  test("the jury queue only ever shows teams assigned to that jury member", async () => {
    const { juryToken } = await setUpTeamAndJury();
    const { res: otherLeader } = await createTeamLeader({ teamName: "Not Assigned Team" });
    void otherLeader;

    const res = await request(app).get("/api/jury/queue").set("Authorization", `Bearer ${juryToken}`);
    expect(res.status).toBe(200);
    expect(res.body.queue).toHaveLength(1);
    expect(res.body.queue[0].team.name).toBe("Jury Test Team");
  });

  test("a jury member cannot evaluate a team they belong to", async () => {
    const { res: leader } = await createTeamLeader({ teamName: "Self Eval Team" });
    const me = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leader.body.token}`);
    const teamId = me.body.team.id;

    // Promote the leader's account to JURY and self-assign, simulating a
    // misconfigured/malicious assignment.
    await prisma.user.update({ where: { id: leader.body.user.id }, data: { role: "JURY" } });
    await prisma.juryAssignment.create({ data: { juryId: leader.body.user.id, teamId } });

    const res = await request(app)
      .post("/api/jury/evaluate")
      .set("Authorization", `Bearer ${leader.body.token}`)
      .send({ teamId, innovation: 20, technical: 20, design: 20, viability: 20 });
    expect(res.status).toBe(403);
  });
});
