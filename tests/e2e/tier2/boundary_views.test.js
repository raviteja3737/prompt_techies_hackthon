/**
 * tests/e2e/tier2/boundary_views.test.js
 * 
 * Tier 2: Boundary & Corner Cases — Frontend Views & Interactive Workflows (Features 13 to 21)
 * Covers edge conditions, input boundaries, negative paths across all 9 views:
 * - Feature 13: View Audit: Home (/) [5 test cases]
 * - Feature 14: View Audit: Login (/login) [5 test cases]
 * - Feature 15: View Audit: Register (/register) [5 test cases]
 * - Feature 16: View Audit: Team Details (/teamdetails) [5 test cases]
 * - Feature 17: View Audit: Submission (/submission) [5 test cases]
 * - Feature 18: View Audit: Leaderboard (/leaderboard) [5 test cases]
 * - Feature 19: View Audit: Jury Portal (/jury) [5 test cases]
 * - Feature 20: View Audit: Announcements (/announcements) [5 test cases]
 * - Feature 21: View Audit: Admin Console (/admin) [5 test cases]
 */

const fs = require("fs");
const path = require("path");
const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { getTracks, findUserByEmail, prisma } = require("../helpers/dbHelper");

const rootDir = path.resolve(__dirname, "../../..");

describe("Tier 2 - Feature 13: Home View Boundaries", () => {
  const client = new ApiClient();

  it("T2-F13-01: unexpected query parameters on root route are handled gracefully", async () => {
    const res = await client.get("/health?theme=dark&ref=twitter&utm_source=hack");
    expect(res.status).toBe(200);
  }, { smoke: true });

  it("T2-F13-02: deep non-existent route returns 404", async () => {
    const res = await client.get("/api/v1/invalid/deep/nested/path");
    expect(res.status).toBe(404);
  });

  it("T2-F13-03: handles script injection in request path safely", async () => {
    const res = await client.get("/api/<script>alert(1)</script>");
    expect(res.status).toBe(404);
  });

  it("T2-F13-04: root layout.js defines metadata and viewport", () => {
    const layoutPath = path.join(rootDir, "src/app/layout.js");
    expect(fs.existsSync(layoutPath)).toBe(true);
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content.includes("metadata") || content.includes("title") || content.includes("RootLayout")).toBe(true);
  });

  it("T2-F13-05: opengraph image asset exists in src/app", () => {
    const ogPath = path.join(rootDir, "src/app/opengraph-image.png");
    expect(fs.existsSync(ogPath)).toBe(true);
  });
});

describe("Tier 2 - Feature 14: Login View Boundaries", () => {
  const client = new ApiClient();

  it("T2-F14-01: SQL injection in email input rejected with 401 (not 500)", async () => {
    const res = await client.login("' OR '1'='1' --", "password");
    expect(res.status === 401 || res.status === 422).toBe(true);
  }, { smoke: true });

  it("T2-F14-02: extremely long email input (>250 chars) handled safely", async () => {
    const longEmail = `${"a".repeat(240)}@promptothon.dev`;
    const res = await client.login(longEmail, "Password123!");
    expect(res.status === 401 || res.status === 422).toBe(true);
  });

  it("T2-F14-03: empty string password rejected with 422", async () => {
    const res = await client.post("/api/auth/login", {
      email: "test@promptothon.dev",
      password: "",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F14-04: whitespace-only email rejected with 422", async () => {
    const res = await client.post("/api/auth/login", {
      email: "   ",
      password: "Password123!",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F14-05: empty credentials payload rejected with 422", async () => {
    const res = await client.post("/api/auth/login", {});
    expect(res.status).toBe(422);
  });
});

describe("Tier 2 - Feature 15: Register View Boundaries", () => {
  const client = new ApiClient();

  it("T2-F15-01: registration missing required intent parameter returns 422", async () => {
    const res = await client.post("/api/auth/register", {
      name: "No Intent",
      email: generateUniqueEmail("no-intent"),
      password: "Password123!",
    });
    expect(res.status).toBe(422);
  }, { smoke: true });

  it("T2-F15-02: intent 'join' without teamCode returns 422", async () => {
    const res = await client.post("/api/auth/register", {
      name: "Joiner No Code",
      email: generateUniqueEmail("no-code"),
      password: "Password123!",
      intent: "join",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F15-03: intent 'create' without teamName returns 422", async () => {
    const res = await client.post("/api/auth/register", {
      name: "Creator No Team",
      email: generateUniqueEmail("no-team"),
      password: "Password123!",
      intent: "create",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F15-04: invalid URL format for githubUrl returns 422", async () => {
    const res = await client.register({
      name: "Invalid URL User",
      email: generateUniqueEmail("bad-url"),
      password: "Password123!",
      intent: "solo",
      githubUrl: "not-a-valid-url",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F15-05: registration rejects empty name string with 422", async () => {
    const res = await client.register({
      name: "",
      email: generateUniqueEmail("empty-name"),
      password: "Password123!",
      intent: "solo",
    });
    expect(res.status).toBe(422);
  });
});

describe("Tier 2 - Feature 16: Team Details View Boundaries", () => {
  it("T2-F16-01: solo user accessing /api/team/me returns 404 (not in a team)", async () => {
    const solo = new ApiClient();
    await solo.register({
      name: "Solo Me Check",
      email: generateUniqueEmail("solo-me"),
      password: "Password123!",
      intent: "solo",
    });

    const res = await solo.getMyTeam();
    expect(res.status).toBe(404);
  }, { smoke: true });

  it("T2-F16-02: member attempting track lock returns 403 Forbidden", async () => {
    const leader = new ApiClient();
    await leader.register({
      name: "Leader T16",
      email: generateUniqueEmail("lead-t16"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("T16Team"),
    });
    const myTeam = await leader.getMyTeam();

    const member = new ApiClient();
    await member.register({
      name: "Member T16",
      email: generateUniqueEmail("mem-t16"),
      password: "Password123!",
      intent: "join",
      teamCode: myTeam.body.team.inviteCode,
    });

    const tracks = await getTracks();
    const res = await member.lockTrack(tracks[0].id);
    expect(res.status).toBe(403);
  });

  it("T2-F16-03: locking already locked track returns 409 Conflict", async () => {
    const leader = new ApiClient();
    await leader.register({
      name: "Relock Lead",
      email: generateUniqueEmail("relock-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("RelockTeam"),
    });

    const tracks = await getTracks();
    await leader.lockTrack(tracks[0].id);

    const relock = await leader.lockTrack(tracks[0].id);
    expect(relock.status).toBe(409);
  });

  it("T2-F16-04: locking non-existent track returns 404", async () => {
    const leader = new ApiClient();
    await leader.register({
      name: "NonEx Track Lead",
      email: generateUniqueEmail("nonex-track"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("NonExTrackTeam"),
    });

    const res = await leader.lockTrack("non-existent-track-cuid");
    expect(res.status).toBe(404);
  });

  it("T2-F16-05: locking with missing body returns 422", async () => {
    const leader = new ApiClient();
    await leader.register({
      name: "Missing Body Lead",
      email: generateUniqueEmail("miss-body"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("MissBodyTeam"),
    });

    const res = await leader.post("/api/team/track-lock", {});
    expect(res.status).toBe(422);
  });
});

describe("Tier 2 - Feature 17: Submission View Boundaries", () => {
  let leader;
  let tracks;

  it("T2-F17-01: submitting before locking track returns 409 Conflict", async () => {
    leader = new ApiClient();
    await leader.register({
      name: "Unlock Lead",
      email: generateUniqueEmail("unlock-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("UnlockTeam"),
    });

    const res = await leader.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/unlock",
    });
    expect(res.status).toBe(409);
    expect(res.body.error || res.body.message).toBeDefined();
  }, { smoke: true });

  it("T2-F17-02: non-leader attempting to submit project returns 403 Forbidden", async () => {
    const team = await leader.getMyTeam();
    const member = new ApiClient();
    await member.register({
      name: "Sub Member",
      email: generateUniqueEmail("sub-mem"),
      password: "Password123!",
      intent: "join",
      teamCode: team.body.team.inviteCode,
    });

    const res = await member.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/mem-sub",
    });
    expect(res.status).toBe(403);
  });

  it("T2-F17-03: invalid repoUrl string format returns 422", async () => {
    tracks = await getTracks();
    await leader.lockTrack(tracks[0].id);

    const res = await leader.saveSubmissionDraft({
      repoUrl: "not-a-valid-url-format",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F17-04: editing an already finalized SUBMITTED project returns 409", async () => {
    // Finalize submission
    await leader.finalizeSubmission({
      repoUrl: "https://github.com/prompt-techies/immutable",
      techTags: ["React"],
    });

    // Attempt edit
    const editRes = await leader.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/try-edit",
    });
    expect(editRes.status).toBe(409);
    expect(editRes.body.error || editRes.body.message).toBeDefined();
  });

  it("T2-F17-05: pitch deck upload url request missing contentType returns 422", async () => {
    const freshLeader = new ApiClient();
    await freshLeader.register({
      name: "Upload Lead",
      email: generateUniqueEmail("upload-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("UploadTeam"),
    });

    const res = await freshLeader.post("/api/team/submission/upload-url", {});
    expect(res.status).toBe(422);
  });
});

describe("Tier 2 - Feature 18: Leaderboard View Boundaries", () => {
  const client = new ApiClient();

  it("T2-F18-01: non-existent trackId query returns empty list without error", async () => {
    const res = await client.getLeaderboard("non-existent-track-9999");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.leaderboard)).toBe(true);
    expect(res.body.leaderboard.length).toBe(0);
  }, { smoke: true });

  it("T2-F18-02: public leaderboard response never leaks user passwords or hashes", async () => {
    const res = await client.getLeaderboard();
    const str = JSON.stringify(res.body);
    expect(str.includes("passwordHash")).toBe(false);
    expect(str.includes("ChangeMe123!")).toBe(false);
  });

  it("T2-F18-03: unauthenticated call to /api/leaderboard succeeds (public view)", async () => {
    const anon = new ApiClient();
    const res = await anon.getLeaderboard();
    expect(res.status).toBe(200);
  });

  it("T2-F18-04: leaderboard rows contain non-negative total scores", async () => {
    const res = await client.getLeaderboard();
    for (const row of res.body.leaderboard) {
      if (row.totalScore !== undefined) {
        expect(row.totalScore).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("T2-F18-05: handles malformed trackId query gracefully", async () => {
    const res = await client.get("/api/leaderboard?trackId=';--<script>");
    expect(res.status).toBe(200);
  });
});

describe("Tier 2 - Feature 19: Jury Portal View Boundaries", () => {
  it("T2-F19-01: jury evaluating unassigned team returns 403 Forbidden", async () => {
    const jury = new ApiClient();
    await jury.loginAsJury("jury1@promptothon.dev");

    const res = await jury.evaluateSubmission({
      teamId: "unassigned-team-id-9999",
      innovation: 20,
      technical: 20,
      design: 20,
      viability: 20,
    });
    expect(res.status).toBe(403);
  }, { smoke: true });

  it("T2-F19-02: rubric score >25 in any dimension returns 422", async () => {
    const jury = new ApiClient();
    await jury.loginAsJury("jury1@promptothon.dev");

    const res = await jury.evaluateSubmission({
      teamId: "team-id",
      innovation: 30, // Exceeds 25
      technical: 20,
      design: 20,
      viability: 20,
    });
    expect(res.status).toBe(422);
  });

  it("T2-F19-03: rubric score <0 in any dimension returns 422", async () => {
    const jury = new ApiClient();
    await jury.loginAsJury("jury1@promptothon.dev");

    const res = await jury.evaluateSubmission({
      teamId: "team-id",
      innovation: -5, // Negative
      technical: 20,
      design: 20,
      viability: 20,
    });
    expect(res.status).toBe(422);
  });

  it("T2-F19-04: missing required rubric dimension returns 422", async () => {
    const jury = new ApiClient();
    await jury.loginAsJury("jury1@promptothon.dev");

    const res = await jury.post("/api/jury/evaluate", {
      teamId: "team-id",
      innovation: 20,
      // technical missing
      design: 20,
      viability: 20,
    });
    expect(res.status).toBe(422);
  });

  it("T2-F19-05: evaluating with empty string teamId returns 422", async () => {
    const jury = new ApiClient();
    await jury.loginAsJury("jury1@promptothon.dev");

    const res = await jury.evaluateSubmission({
      teamId: "",
      innovation: 20,
      technical: 20,
      design: 20,
      viability: 20,
    });
    expect(res.status).toBe(422);
  });
});

describe("Tier 2 - Feature 20: Announcements View Boundaries", () => {
  it("T2-F20-01: non-admin participant cannot create announcements (returns 403/404)", async () => {
    const part = new ApiClient();
    const { signToken } = require("../../../backend/src/utils/jwt");
    const soloUser = await findUserByEmail("solo1@promptothon.dev");
    part.setToken(signToken({ sub: soloUser ? soloUser.id : "solo-uid", role: "PARTICIPANT" }));

    const res = await part.post("/api/admin/announcements", {
      title: "Hacked",
      message: "Should fail",
    });
    expect(res.status).toBe(403);
  }, { smoke: true });

  it("T2-F20-02: unauthenticated call to /api/announcements returns 401", async () => {
    const anon = new ApiClient();
    const res = await anon.getAnnouncements();
    expect(res.status).toBe(401);
  });

  it("T2-F20-03: creating announcement with empty title returns 422", async () => {
    const admin = new ApiClient();
    await admin.loginAsAdmin();

    const res = await admin.createAnnouncement({
      title: "",
      message: "Valid message content",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F20-04: creating announcement with empty message returns 422", async () => {
    const admin = new ApiClient();
    await admin.loginAsAdmin();

    const res = await admin.createAnnouncement({
      title: "Valid Title",
      message: "",
    });
    expect(res.status).toBe(422);
  });

  it("T2-F20-05: creating announcement with invalid priority returns 422", async () => {
    const admin = new ApiClient();
    await admin.loginAsAdmin();

    const res = await admin.createAnnouncement({
      title: "Valid Title",
      message: "Valid message",
      priority: "SUPER_URGENT_INVALID",
    });
    expect(res.status).toBe(422);
  });
});

describe("Tier 2 - Feature 21: Admin Console View Boundaries", () => {
  let admin;

  it("T2-F21-01: non-admin participant barred from /api/admin/dashboard (403)", async () => {
    const part = new ApiClient();
    // Use token directly with PARTICIPANT role
    const { signToken } = require("../../../backend/src/utils/jwt");
    const soloUser = await findUserByEmail("solo1@promptothon.dev");
    part.setToken(signToken({ sub: soloUser ? soloUser.id : "solo-uid", role: "PARTICIPANT" }));

    const res = await part.getAdminDashboard();
    expect(res.status).toBe(403);
  }, { smoke: true });

  it("T2-F21-02: freeze scores missing boolean parameter returns 422", async () => {
    admin = new ApiClient();
    await admin.loginAsAdmin();

    const res = await admin.post("/api/admin/freeze-scores", {});
    expect(res.status).toBe(422);
  });

  it("T2-F21-03: creating jury assignment with invalid teamId returns 404/422", async () => {
    admin = new ApiClient();
    await admin.loginAsAdmin();
    const res = await admin.createJuryAssignment("user-id", "");
    expect(res.status).toBe(422);
  });

  it("T2-F21-04: audit log query with invalid page number (<1) returns 422", async () => {
    admin = new ApiClient();
    await admin.loginAsAdmin();
    const res = await admin.get("/api/admin/audit-logs?page=0");
    expect(res.status).toBe(422);
  });

  it("T2-F21-05: updating admin settings with invalid deadline format returns 422", async () => {
    admin = new ApiClient();
    await admin.loginAsAdmin();
    const res = await admin.updateAdminSettings({
      trackSelectionDeadline: "not-an-iso-date-string",
    });
    expect(res.status).toBe(422);
  });
});
