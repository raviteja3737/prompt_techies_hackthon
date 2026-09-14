const { app, request, createTeamLeader, joinTeam, truncateAll, prisma } = require("./helpers");

beforeEach(async () => truncateAll());
afterEach(async () => truncateAll());
afterAll(async () => prisma.$disconnect());

async function setUpLockedTeam() {
  const { res: leader } = await createTeamLeader({ teamName: "Submission Test" });
  const me = await request(app).get("/api/team/me").set("Authorization", `Bearer ${leader.body.token}`);
  const inviteCode = me.body.team.inviteCode;
  const { res: member } = await joinTeam(inviteCode);

  const track = await prisma.track.create({ data: { title: "Sub Track", description: "d" } });
  await request(app)
    .post("/api/team/track-lock")
    .set("Authorization", `Bearer ${leader.body.token}`)
    .send({ trackId: track.id });

  return { leaderToken: leader.body.token, memberToken: member.body.token };
}

describe("submissions", () => {
  test("leader can save a draft submission with a valid GitHub URL", async () => {
    const { leaderToken } = await setUpLockedTeam();
    const res = await request(app)
      .post("/api/team/submission")
      .set("Authorization", `Bearer ${leaderToken}`)
      .send({ repoUrl: "https://github.com/org/repo" });

    expect(res.status).toBe(200);
    expect(res.body.submission.status).toBe("DRAFT");
  });

  test("an invalid GitHub URL is rejected", async () => {
    const { leaderToken } = await setUpLockedTeam();
    const res = await request(app)
      .post("/api/team/submission")
      .set("Authorization", `Bearer ${leaderToken}`)
      .send({ repoUrl: "https://gitlab.com/org/repo" });

    expect(res.status).toBe(422);
  });

  test("a non-leader cannot manage the submission", async () => {
    const { memberToken } = await setUpLockedTeam();
    const res = await request(app)
      .post("/api/team/submission")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ repoUrl: "https://github.com/org/repo" });

    expect(res.status).toBe(403);
  });

  test("submit: true finalizes the submission and further edits are rejected", async () => {
    const { leaderToken } = await setUpLockedTeam();
    const final = await request(app)
      .post("/api/team/submission")
      .set("Authorization", `Bearer ${leaderToken}`)
      .send({ repoUrl: "https://github.com/org/repo", submit: true });

    expect(final.status).toBe(200);
    expect(final.body.submission.status).toBe("SUBMITTED");
    expect(final.body.submission.submittedAt).toBeTruthy();

    const secondEdit = await request(app)
      .post("/api/team/submission")
      .set("Authorization", `Bearer ${leaderToken}`)
      .send({ repoUrl: "https://github.com/org/repo-v2" });
    expect(secondEdit.status).toBe(409);
  });

  test("submitting before a track is locked is rejected", async () => {
    const { res: leader } = await createTeamLeader({ teamName: "No Track Yet" });
    const res = await request(app)
      .post("/api/team/submission")
      .set("Authorization", `Bearer ${leader.body.token}`)
      .send({ repoUrl: "https://github.com/org/repo" });
    expect(res.status).toBe(409);
  });

  test("submissions are rejected once the submission deadline has passed", async () => {
    const { leaderToken } = await setUpLockedTeam();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await prisma.systemSetting.upsert({
      where: { key: "submissionDeadline" },
      create: { key: "submissionDeadline", value: yesterday },
      update: { value: yesterday },
    });

    const res = await request(app)
      .post("/api/team/submission")
      .set("Authorization", `Bearer ${leaderToken}`)
      .send({ repoUrl: "https://github.com/org/repo" });

    expect(res.status).toBe(409);
  });
});
