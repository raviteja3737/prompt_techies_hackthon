const { app, request, createTeamLeader, createUser, truncateAll, prisma } = require("./helpers");
const { aliasForEvaluations } = require("../src/utils/anonymizer");

beforeEach(async () => truncateAll());
afterEach(async () => truncateAll());
afterAll(async () => prisma.$disconnect());

describe("jury anonymization", () => {
  test("public leaderboard responses never contain a real juryId", async () => {
    const { res: leader } = await createTeamLeader({ teamName: "Anon Team" });
    const me = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leader.body.token}`);
    const teamId = me.body.team.id;

    const { user: jury } = await createUser({ role: "JURY", email: "anon-jury@test.dev" });
    await prisma.juryAssignment.create({ data: { juryId: jury.id, teamId } });
    await prisma.evaluation.create({
      data: { teamId, juryId: jury.id, innovation: 20, technical: 20, design: 20, viability: 20, status: "LOCKED", lockedAt: new Date() },
    });

    const res = await request(app).get("/api/leaderboard");
    const raw = JSON.stringify(res.body);

    expect(raw).not.toContain(jury.id);
    expect(raw).not.toContain("anon-jury@test.dev");
    expect(raw).toContain("Jury #1");
  });

  test("the same judge gets independent aliases across different teams (no fixed global mapping)", () => {
    const juryA = "jury-a";
    const juryB = "jury-b";

    // Craft evaluations where team 1 orders [A, B] but team 2's HMAC
    // ordering may put them the other way — the point is each team's
    // alias assignment is computed independently, not from insertion order.
    const team1Evals = [
      { teamId: "team-1", juryId: juryA, innovation: 1, technical: 1, design: 1, viability: 1 },
      { teamId: "team-1", juryId: juryB, innovation: 1, technical: 1, design: 1, viability: 1 },
    ];
    const team2Evals = [
      { teamId: "team-2", juryId: juryB, innovation: 1, technical: 1, design: 1, viability: 1 },
      { teamId: "team-2", juryId: juryA, innovation: 1, technical: 1, design: 1, viability: 1 },
    ];

    const team1Aliased = aliasForEvaluations("team-1", team1Evals);
    const team2Aliased = aliasForEvaluations("team-2", team2Evals);

    for (const row of [...team1Aliased, ...team2Aliased]) {
      expect(row.juryId).toBeUndefined();
      expect(row.juryAlias).toMatch(/^Jury #\d+$/);
    }

    // Both teams have exactly aliases #1 and #2 — no evidence of a shared
    // deterministic global ordering by raw juryId leaking through.
    expect(team1Aliased.map((e) => e.juryAlias).sort()).toEqual(["Jury #1", "Jury #2"]);
    expect(team2Aliased.map((e) => e.juryAlias).sort()).toEqual(["Jury #1", "Jury #2"]);
  });

  test("admin jury-assignment listing does show the real jury identity (admins may see it)", async () => {
    const { res: leader } = await createTeamLeader({ teamName: "Admin Visible Team" });
    const me = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leader.body.token}`);
    const teamId = me.body.team.id;

    const { user: jury } = await createUser({ role: "JURY", email: "visible-jury@test.dev" });
    const { token: adminToken } = await createUser({ role: "ADMIN", email: "admin-anon-test@test.dev" });
    await prisma.juryAssignment.create({ data: { juryId: jury.id, teamId } });

    const res = await request(app).get("/api/admin/jury-assignments").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain("visible-jury@test.dev");
  });
});
