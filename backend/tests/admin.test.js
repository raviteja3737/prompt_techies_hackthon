const { app, request, createUser, truncateAll, prisma } = require("./helpers");

beforeEach(async () => truncateAll());
afterEach(async () => truncateAll());
afterAll(async () => prisma.$disconnect());

describe("admin", () => {
  test("admin can freeze and then unfreeze scores, each creating an audit log entry", async () => {
    const { token } = await createUser({ role: "ADMIN", email: "audit-admin@test.dev" });

    const freeze = await request(app).post("/api/admin/freeze-scores").set("Authorization", `Bearer ${token}`).send({ frozen: true });
    expect(freeze.status).toBe(200);
    expect(freeze.body.scoresFrozen).toBe(true);

    const unfreeze = await request(app).post("/api/admin/freeze-scores").set("Authorization", `Bearer ${token}`).send({ frozen: false });
    expect(unfreeze.status).toBe(200);
    expect(unfreeze.body.scoresFrozen).toBe(false);

    const logs = await prisma.auditLog.findMany({ where: { action: { in: ["SCORES_FROZEN", "SCORES_UNFROZEN"] } } });
    expect(logs.map((l) => l.action).sort()).toEqual(["SCORES_FROZEN", "SCORES_UNFROZEN"]);
  });

  test("a participant cannot access audit logs", async () => {
    const { token } = await createUser({ role: "PARTICIPANT", email: "not-admin@test.dev" });
    const res = await request(app).get("/api/admin/audit-logs").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
