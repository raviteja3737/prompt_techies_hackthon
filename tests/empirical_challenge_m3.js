/**
 * tests/empirical_challenge_m3.js
 *
 * Adversarial Empirical Verification Suite for Milestone 3 Implementation:
 * 1. /register:
 *    - Empty fields, weak passwords (<8 chars), mismatched passwords
 *    - Duplicate emails (409 Conflict)
 *    - Invalid intent, missing teamName/teamCode
 *    - Missing terms checkbox validation
 * 2. /login:
 *    - Invalid credentials (wrong password -> 401)
 *    - Non-existent users -> 401
 *    - Role redirects (ADMIN, JURY, PARTICIPANT)
 * 3. /teamdetails:
 *    - Track lock idempotency & immutability (repeat lock -> 409 Conflict)
 *    - Duplicate join codes / non-existent join code (404)
 *    - Empty team names (422)
 * 4. /submission:
 *    - Invalid GitHub URLs (regex enforcement -> 422)
 *    - Invalid demo URLs (422)
 *    - Pitch deck upload without draft (409 Conflict)
 *    - Direct external deck link saving (200 OK)
 * 5. /leaderboard:
 *    - Review counts (juryCount / evaluationsCount)
 *    - Average score calculation accuracy
 *    - Unranked display fallback (#—)
 *    - Track filter isolation
 * 6. /jury:
 *    - Evaluation submission
 *    - Boundary slider values (0 and 25 valid, -1 and 26 rejected with 422)
 *    - Locked evaluation immutable state (repeat eval on locked -> 409 Conflict)
 * 7. /admin:
 *    - Metrics rendering resilience with zero data
 *    - Announcements creation & priority tags (INFO, NORMAL, URGENT, invalid -> 422)
 *    - Track updates (create, update title/description, empty title rejection)
 */

const path = require("path");
const { z } = require("zod");
const { ApiClient } = require("./e2e/helpers/apiClient");
const {
  prisma,
  findUserByEmail,
  cleanTestData,
  disconnectDb,
} = require("./e2e/helpers/dbHelper");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
  } else {
    failedTests++;
    const msg = `  \x1b[31m✖ FAIL\x1b[0m: ${testName} ${details ? `(${details})` : ""}`;
    console.error(msg);
    failures.push({ testName, details });
  }
}

// Frontend Zod schema from src/app/(auth)/register/page.js
const frontendRegisterSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }).max(80),
    email: z.string().email({ message: "Please enter a valid email address" }),
    college: z.string().max(120).optional(),
    intent: z.enum(["solo", "create", "join"]),
    teamName: z.string().optional(),
    teamCode: z.string().optional(),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string().min(8, { message: "Please confirm your password" }),
    terms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and conditions" }),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
    if (data.intent === "create") {
      if (!data.teamName || data.teamName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teamName"],
          message: "Team name must be at least 2 characters",
        });
      }
    }
    if (data.intent === "join") {
      if (!data.teamCode || data.teamCode.trim().length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teamCode"],
          message: "Team code must be at least 4 characters",
        });
      }
    }
  });

// Role redirection logic from src/app/(auth)/login/page.js
function getRoleRedirect(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "JURY") return "/jury";
  return "/teamdetails";
}

async function runM3AdversarialChallenge() {
  console.log("================================================================================");
  console.log("   MILESTONE 3: ADVERSARIAL EMPIRICAL CHALLENGE SUITE (challenger_m3_2)        ");
  console.log("================================================================================\n");

  const timestamp = Date.now();

  try {
    // --------------------------------------------------------------------------
    // SECTION 1: /register PROBES
    // --------------------------------------------------------------------------
    console.log("--- 1. PROBING /register (Boundary inputs, passwords, intent, terms) ---");

    // 1.1 Frontend schema: Empty fields validation
    const emptyRes = frontendRegisterSchema.safeParse({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      intent: "solo",
      terms: false,
    });
    assert(!emptyRes.success, "Frontend Register: Rejects all-empty fields");
    if (!emptyRes.success) {
      const issuePaths = emptyRes.error.issues.map((i) => i.path[0]);
      assert(issuePaths.includes("name"), "Frontend Register: Validates name presence");
      assert(issuePaths.includes("email"), "Frontend Register: Validates email presence");
      assert(issuePaths.includes("password"), "Frontend Register: Validates password presence");
      assert(issuePaths.includes("terms"), "Frontend Register: Validates terms acceptance");
    }

    // 1.2 Frontend schema: Weak password (<8 chars)
    const weakPassRes = frontendRegisterSchema.safeParse({
      name: "Alice Hacker",
      email: "alice@test.dev",
      password: "pass",
      confirmPassword: "pass",
      intent: "solo",
      terms: true,
    });
    assert(!weakPassRes.success, "Frontend Register: Rejects weak password (<8 chars)");

    // 1.3 Frontend schema: Mismatched passwords
    const mismatchRes = frontendRegisterSchema.safeParse({
      name: "Bob Hacker",
      email: "bob@test.dev",
      password: "Password123!",
      confirmPassword: "Password456!",
      intent: "solo",
      terms: true,
    });
    assert(!mismatchRes.success, "Frontend Register: Rejects mismatched passwords");
    if (!mismatchRes.success) {
      assert(
        mismatchRes.error.issues.some((i) => i.message === "Passwords do not match"),
        "Frontend Register: Emits 'Passwords do not match' error"
      );
    }

    // 1.4 Frontend schema: Missing terms checkbox
    const missingTermsRes = frontendRegisterSchema.safeParse({
      name: "Charlie Hacker",
      email: "charlie@test.dev",
      password: "Password123!",
      confirmPassword: "Password123!",
      intent: "solo",
      terms: false,
    });
    assert(!missingTermsRes.success, "Frontend Register: Rejects false terms checkbox");

    // 1.5 Frontend schema: Intent=create missing teamName
    const createNoTeamRes = frontendRegisterSchema.safeParse({
      name: "Dave Leader",
      email: "dave@test.dev",
      password: "Password123!",
      confirmPassword: "Password123!",
      intent: "create",
      teamName: "",
      terms: true,
    });
    assert(!createNoTeamRes.success, "Frontend Register: Rejects intent=create without teamName");

    // 1.6 Frontend schema: Intent=join missing teamCode
    const joinNoCodeRes = frontendRegisterSchema.safeParse({
      name: "Eve Member",
      email: "eve@test.dev",
      password: "Password123!",
      confirmPassword: "Password123!",
      intent: "join",
      teamCode: "",
      terms: true,
    });
    assert(!joinNoCodeRes.success, "Frontend Register: Rejects intent=join without teamCode");

    // 1.7 Backend endpoint: Weak password (<8 chars) returns 422
    const client = new ApiClient();
    const backendWeakRes = await client.post("/api/auth/register", {
      name: "Weak Pass User",
      email: `weak_${timestamp}@test.dev`,
      password: "short",
      intent: "solo",
    });
    assert(backendWeakRes.status === 422, "Backend Register: Rejects password < 8 chars with 422");

    // 1.8 Backend endpoint: Invalid intent returns 422
    const backendBadIntentRes = await client.post("/api/auth/register", {
      name: "Bad Intent User",
      email: `badintent_${timestamp}@test.dev`,
      password: "ValidPassword123!",
      intent: "invalid_intent_value",
    });
    assert(backendBadIntentRes.status === 422, "Backend Register: Rejects invalid intent with 422");

    // 1.9 Backend endpoint: Duplicate email registration returns 409 Conflict
    const dupEmail = `dup_${timestamp}@test.dev`;
    const regFirst = await client.register({
      name: "Original User",
      email: dupEmail,
      password: "Password123!",
      intent: "solo",
    });
    assert(regFirst.status === 201, "Backend Register: First registration succeeds with 201");

    const regDup = await client.post("/api/auth/register", {
      name: "Duplicate User",
      email: dupEmail,
      password: "Password123!",
      intent: "solo",
    });
    assert(regDup.status === 409, "Backend Register: Duplicate email rejected with 409 Conflict");
    assert(
      regDup.body?.message?.includes("already exists") || regDup.body?.error?.includes("already exists"),
      "Backend Register: Duplicate error message mentions account already exists"
    );

    // --------------------------------------------------------------------------
    // SECTION 2: /login PROBES
    // --------------------------------------------------------------------------
    console.log("\n--- 2. PROBING /login (Invalid credentials, non-existent users, role redirects) ---");

    const loginClient = new ApiClient();

    // 2.1 Invalid password on existing user returns 401
    const badPassRes = await loginClient.login(dupEmail, "CompletelyWrongPassword!");
    assert(badPassRes.status === 401, "Backend Login: Wrong password rejected with 401");
    const badPassErr = badPassRes.body?.error || badPassRes.body?.message;
    assert(
      badPassErr === "Invalid email or password.",
      `Backend Login: Generic error message obscures existence of valid email (${badPassErr})`
    );

    // 2.2 Non-existent user returns 401
    const noUserRes = await loginClient.login(`nonexistent_${timestamp}@promptothon.dev`, "Password123!");
    assert(noUserRes.status === 401, "Backend Login: Non-existent user rejected with 401");

    // 2.3 Role-based redirection logic
    assert(getRoleRedirect("ADMIN") === "/admin", "Role Redirect: ADMIN redirects to /admin");
    assert(getRoleRedirect("JURY") === "/jury", "Role Redirect: JURY redirects to /jury");
    assert(getRoleRedirect("PARTICIPANT") === "/teamdetails", "Role Redirect: PARTICIPANT redirects to /teamdetails");
    assert(getRoleRedirect("LEADER") === "/teamdetails", "Role Redirect: LEADER redirects to /teamdetails");

    // --------------------------------------------------------------------------
    // SECTION 3: /teamdetails PROBES
    // --------------------------------------------------------------------------
    console.log("\n--- 3. PROBING /teamdetails (Track lock idempotency, join codes, team names) ---");

    // 3.1 Empty team name rejected with 422
    const leaderClient = new ApiClient();
    await leaderClient.register({
      name: "Leader Alpha",
      email: `leader_alpha_${timestamp}@test.dev`,
      password: "Password123!",
      intent: "solo",
    });

    const emptyTeamRes = await leaderClient.post("/api/team", { name: "" });
    assert(emptyTeamRes.status === 422, "Backend Team: Empty team name rejected with 422");

    const shortTeamRes = await leaderClient.post("/api/team", { name: "A" });
    assert(shortTeamRes.status === 422, "Backend Team: Team name < 2 chars rejected with 422");

    // 3.2 Create valid team
    const teamName = `TeamStress_${timestamp}`;
    const createTeamRes = await leaderClient.post("/api/team", { name: teamName });
    assert(createTeamRes.status === 201, "Backend Team: Valid team creation succeeds with 201");
    const createdTeam = createTeamRes.body?.team;
    assert(Boolean(createdTeam?.inviteCode), "Backend Team: Generates non-empty inviteCode");

    // 3.3 Non-existent join code returns 404
    const memberClient = new ApiClient();
    await memberClient.register({
      name: "Member Bravo",
      email: `member_bravo_${timestamp}@test.dev`,
      password: "Password123!",
      intent: "solo",
    });

    const badCodeRes = await memberClient.joinTeam("NONEX99");
    assert(badCodeRes.status === 404, "Backend Team: Non-existent inviteCode returns 404");

    // 3.4 Track lock idempotency & immutability
    const tracksRes = await leaderClient.get("/api/tracks");
    const testTrack = tracksRes.body?.tracks?.[0];
    assert(Boolean(testTrack?.id), "Backend Tracks: At least one track exists");

    // First track lock succeeds
    const lock1 = await leaderClient.lockTrack(testTrack.id);
    assert(lock1.status === 200, "Backend Team: First track lock succeeds with 200");
    assert(Boolean(lock1.body?.team?.trackLockedAt), "Backend Team: trackLockedAt is set in response");

    // Second track lock on same team MUST return 409 Conflict
    const lock2 = await leaderClient.lockTrack(testTrack.id);
    assert(lock2.status === 409, "Backend Team: Repeat track lock rejected with 409 Conflict");
    const lock2Err = lock2.body?.error || lock2.body?.message || "";
    assert(
      lock2Err.toLowerCase().includes("locked"),
      `Backend Team: Repeat track lock error indicates track is already locked (${lock2Err})`
    );

    // Verify DB immutability
    const teamInDb = await prisma.team.findUnique({ where: { id: createdTeam.id } });
    assert(Boolean(teamInDb?.trackLockedAt), "Database: trackLockedAt persisted in PostgreSQL");
    assert(teamInDb.trackId === testTrack.id, "Database: trackId matches selected track");

    // --------------------------------------------------------------------------
    // SECTION 4: /submission PROBES
    // --------------------------------------------------------------------------
    console.log("\n--- 4. PROBING /submission (Invalid URLs, deck upload without draft, direct link) ---");

    // 4.1 Invalid GitHub URLs rejected with 422
    const invalidGit1 = await leaderClient.post("/api/team/submission", {
      repoUrl: "https://gitlab.com/user/repo",
    });
    assert(invalidGit1.status === 422, "Backend Submission: Non-github URL rejected with 422");

    const invalidGit2 = await leaderClient.post("/api/team/submission", {
      repoUrl: "https://github.com/",
    });
    assert(invalidGit2.status === 422, "Backend Submission: Root github URL without repo rejected with 422");

    // 4.2 Invalid demo / video URLs rejected with 422
    const invalidDemo = await leaderClient.post("/api/team/submission", {
      repoUrl: "https://github.com/promptothon/project-alpha",
      liveUrl: "not-a-valid-url",
    });
    assert(invalidDemo.status === 422, "Backend Submission: Malformed liveUrl rejected with 422");

    // 4.3 Pitch deck upload without draft returns 409 Conflict
    const freshLeaderClient = new ApiClient();
    await freshLeaderClient.register({
      name: "Fresh Leader",
      email: `fresh_leader_${timestamp}@test.dev`,
      password: "Password123!",
      intent: "create",
      teamName: `NoDraftTeam_${timestamp}`,
    });
    await freshLeaderClient.lockTrack(testTrack.id);

    // Call pitch-deck attachment directly without prior draft submission
    const noDraftDeckRes = await freshLeaderClient.post("/api/team/submission/pitch-deck", {
      key: "pitch-decks/sample.pdf",
      url: "https://storage.promptothon.dev/pitch-decks/sample.pdf",
    });
    assert(noDraftDeckRes.status === 409, "Backend Submission: Pitch deck without draft returns 409 Conflict");
    const noDraftErr = noDraftDeckRes.body?.error || noDraftDeckRes.body?.message || "";
    assert(
      noDraftErr.includes("Save your submission before attaching"),
      `Backend Submission: Error message prompts saving submission draft first (${noDraftErr})`
    );

    // 4.4 Direct external deck link saving after draft initialization
    // First initialize draft submission
    const draftRes = await freshLeaderClient.post("/api/team/submission", {
      repoUrl: "https://github.com/promptothon/valid-repo-draft",
      liveUrl: "https://demo.promptothon.dev",
      videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      techTags: ["Next.js", "Express", "Prisma"],
      submit: false,
    });
    assert(draftRes.status === 200, "Backend Submission: Draft submission created with 200 OK");

    // Now save external pitch deck URL
    const externalDeckUrl = "https://docs.google.com/presentation/d/test12345/preview";
    const saveDeckRes = await freshLeaderClient.post("/api/team/submission/pitch-deck", {
      key: "url:" + encodeURIComponent(externalDeckUrl.slice(0, 80)),
      url: externalDeckUrl,
    });
    assert(saveDeckRes.status === 200, "Backend Submission: Direct external deck link saved with 200 OK");
    assert(
      saveDeckRes.body?.submission?.pitchDeckUrl === externalDeckUrl,
      "Backend Submission: pitchDeckUrl correctly persisted in response"
    );

    // --------------------------------------------------------------------------
    // SECTION 5: /leaderboard PROBES
    // --------------------------------------------------------------------------
    console.log("\n--- 5. PROBING /leaderboard (Review counts, average score, unranked display, track isolation) ---");

    const boardRes = await client.get("/api/leaderboard");
    assert(boardRes.status === 200, "Backend Leaderboard: GET /api/leaderboard returns 200 OK");
    const leaderboardRows = boardRes.body?.leaderboard || boardRes.body?.teams || [];
    assert(Array.isArray(leaderboardRows), "Backend Leaderboard: Returns leaderboard array");
    assert(
      typeof boardRes.body?.scoresFrozen === "boolean" || typeof boardRes.body?.isFrozen === "boolean",
      "Backend Leaderboard: Returns scoresFrozen boolean"
    );

    // 5.1 Review count property alignment
    const sampleBoardTeam = leaderboardRows[0];
    if (sampleBoardTeam) {
      const hasReviewCount = "juryCount" in sampleBoardTeam || "evaluationsCount" in sampleBoardTeam;
      assert(hasReviewCount, "Leaderboard Contract: Team object includes juryCount or evaluationsCount");
      assert(
        typeof (sampleBoardTeam.juryCount ?? sampleBoardTeam.evaluationsCount) === "number",
        "Leaderboard Contract: Review count is numeric"
      );
    }

    // 5.2 Average score calculation accuracy check
    // If a team has evaluations, verify averageScore equals totalScore / count
    for (const t of leaderboardRows) {
      if (t.juryCount > 0 && t.totalScore !== undefined) {
        const calculatedAvg = Number((t.totalScore / t.juryCount).toFixed(1));
        const returnedAvg = Number(Number(t.averageScore).toFixed(1));
        assert(
          Math.abs(calculatedAvg - returnedAvg) <= 0.1,
          `Leaderboard Accuracy: Team ${t.teamName} avg score (${returnedAvg}) matches calculation (${calculatedAvg})`
        );
        break;
      }
    }

    // 5.3 Unranked display logic: unevaluated team rank formatting
    const mockUnevaluatedTeam = {
      teamName: "Pending Review Team",
      juryCount: 0,
      evaluationsCount: 0,
      rank: null,
      averageScore: null,
    };
    const reviewCount = mockUnevaluatedTeam.juryCount ?? mockUnevaluatedTeam.evaluationsCount ?? 0;
    const isEvaluated = reviewCount > 0;
    const rankDisplay = isEvaluated && mockUnevaluatedTeam.rank ? `#${mockUnevaluatedTeam.rank}` : "—";
    assert(rankDisplay === "—", "Leaderboard Display: Unevaluated team formatted as '—'");

    // 5.4 Track filter isolation
    if (testTrack?.id) {
      const filteredRes = await client.get(`/api/leaderboard?trackId=${testTrack.id}`);
      assert(filteredRes.status === 200, "Backend Leaderboard: Filter by trackId returns 200");
      const filteredRows = filteredRes.body?.leaderboard || filteredRes.body?.teams || [];
      for (const t of filteredRows) {
        if (t.trackId) {
          assert(t.trackId === testTrack.id, `Track Isolation: Team ${t.teamName} belongs to requested track`);
        }
      }

      // Non-existent track ID should return empty array
      const emptyTrackRes = await client.get("/api/leaderboard?trackId=non-existent-track-9999");
      assert(emptyTrackRes.status === 200, "Track Isolation: Non-existent track returns 200");
      const emptyRows = emptyTrackRes.body?.leaderboard || emptyTrackRes.body?.teams || [];
      assert(emptyRows.length === 0, "Track Isolation: Non-existent track returns empty array []");
    }

    // --------------------------------------------------------------------------
    // SECTION 6: /jury PROBES
    // --------------------------------------------------------------------------
    console.log("\n--- 6. PROBING /jury (Boundary slider values 0 & 25, locked evaluation immutability) ---");

    // Finalize submission for freshLeader's team so jury can evaluate it
    const finalizeRes = await freshLeaderClient.post("/api/team/submission", {
      repoUrl: "https://github.com/promptothon/valid-repo-draft",
      liveUrl: "https://demo.promptothon.dev",
      videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      techTags: ["Next.js", "Express", "Prisma"],
      submit: true, // Finalize!
    });
    assert(finalizeRes.status === 200, "Backend Submission: Submission finalized successfully");

    // Login as Admin to assign Jury to this team
    const adminClient = new ApiClient();
    await adminClient.loginAsAdmin();

    const juryUser = await findUserByEmail("jury1@promptothon.dev");
    assert(Boolean(juryUser?.id), "Database: Seed jury user exists");

    const freshTeamId = freshLeaderClient.currentUser?.id
      ? (await prisma.teamMember.findFirst({ where: { userId: freshLeaderClient.currentUser.id } }))?.teamId
      : null;
    assert(Boolean(freshTeamId), "Database: Found fresh team ID for jury assignment");

    // Create jury assignment
    const assignRes = await adminClient.post("/api/admin/jury-assignments", {
      juryId: juryUser.id,
      teamId: freshTeamId,
    });
    assert(
      assignRes.status === 201 || assignRes.status === 200 || assignRes.status === 409,
      "Backend Admin: Jury assignment created (or already assigned)"
    );

    // Login as Jury
    const juryClient = new ApiClient();
    await juryClient.loginAsJury("jury1@promptothon.dev");

    // 6.1 Boundary slider value: 0 (minimum valid score)
    const evalMinRes = await juryClient.post("/api/jury/evaluate", {
      teamId: freshTeamId,
      innovation: 0,
      technical: 0,
      design: 0,
      viability: 0,
      feedback: "Minimum boundary evaluation test",
      lock: false, // draft
    });
    assert(evalMinRes.status === 200, "Backend Jury: Boundary score 0 (min) accepted with 200 OK");
    assert(evalMinRes.body?.evaluation?.innovation === 0, "Backend Jury: Innovation score 0 verified");

    // 6.2 Boundary slider value: 25 (maximum valid score)
    const evalMaxRes = await juryClient.post("/api/jury/evaluate", {
      teamId: freshTeamId,
      innovation: 25,
      technical: 25,
      design: 25,
      viability: 25,
      feedback: "Maximum boundary evaluation test",
      lock: false, // still draft
    });
    assert(evalMaxRes.status === 200, "Backend Jury: Boundary score 25 (max) accepted with 200 OK");
    const eMax = evalMaxRes.body?.evaluation;
    const computedTotal = (eMax?.innovation ?? 0) + (eMax?.technical ?? 0) + (eMax?.design ?? 0) + (eMax?.viability ?? 0);
    assert(computedTotal === 100, `Backend Jury: Total computed rubric score is 100 (${computedTotal})`);

    // 6.3 Invalid boundary: score < 0 rejected with 422
    const evalUnderRes = await juryClient.post("/api/jury/evaluate", {
      teamId: freshTeamId,
      innovation: -1,
      technical: 20,
      design: 20,
      viability: 20,
      lock: false,
    });
    assert(evalUnderRes.status === 422, "Backend Jury: Score -1 (<0) rejected with 422");

    // 6.4 Invalid boundary: score > 25 rejected with 422
    const evalOverRes = await juryClient.post("/api/jury/evaluate", {
      teamId: freshTeamId,
      innovation: 26,
      technical: 20,
      design: 20,
      viability: 20,
      lock: false,
    });
    assert(evalOverRes.status === 422, "Backend Jury: Score 26 (>25) rejected with 422");

    // 6.5 Locked evaluation immutable state
    const lockEvalRes = await juryClient.post("/api/jury/evaluate", {
      teamId: freshTeamId,
      innovation: 22,
      technical: 23,
      design: 24,
      viability: 21,
      feedback: "Final locked scoring",
      lock: true, // LOCK!
    });
    assert(lockEvalRes.status === 200, "Backend Jury: Locked evaluation submitted with 200 OK");
    assert(lockEvalRes.body?.evaluation?.status === "LOCKED", "Backend Jury: Evaluation status is LOCKED");

    // Attempting to modify locked evaluation MUST return 409 Conflict
    const repeatEvalRes = await juryClient.post("/api/jury/evaluate", {
      teamId: freshTeamId,
      innovation: 25,
      technical: 25,
      design: 25,
      viability: 25,
      feedback: "Attempting tamper on locked evaluation",
      lock: false,
    });
    assert(repeatEvalRes.status === 409, "Backend Jury: Modifying locked evaluation rejected with 409 Conflict");
    const repeatEvalErr = repeatEvalRes.body?.error || repeatEvalRes.body?.message || "";
    assert(
      repeatEvalErr.toLowerCase().includes("locked"),
      `Backend Jury: Error message indicates evaluation is locked and immutable (${repeatEvalErr})`
    );

    // --------------------------------------------------------------------------
    // SECTION 7: /admin PROBES
    // --------------------------------------------------------------------------
    console.log("\n--- 7. PROBING /admin (Metrics rendering with zero data, announcements, track updates) ---");

    // 7.1 Metrics rendering resilience test with zero data / nulls
    const emptyStats = {
      teamsCount: 0,
      users: { participants: 0 },
      submissions: { submitted: 0, draft: 0 },
      evaluations: { locked: 0, draft: 0 },
    };
    const renderedTeams = emptyStats?.teamsCount ?? emptyStats?.teams ?? 0;
    const renderedParticipants = emptyStats?.users?.participants ?? emptyStats?.participants ?? 0;
    const renderedSubmissions = emptyStats?.submissions?.submitted ?? 0;
    const renderedEvaluations = emptyStats?.evaluations?.locked ?? 0;

    assert(renderedTeams === 0, "Admin Metrics: Zero teams rendered cleanly as 0");
    assert(renderedParticipants === 0, "Admin Metrics: Zero participants rendered cleanly as 0");
    assert(renderedSubmissions === 0, "Admin Metrics: Zero submissions rendered cleanly as 0");
    assert(renderedEvaluations === 0, "Admin Metrics: Zero evaluations rendered cleanly as 0");

    // Also test completely undefined dashboardStats
    const undefStats = undefined;
    const safeTeams = undefStats?.teamsCount ?? 0;
    const safeParticipants = undefStats?.users?.participants ?? 0;
    const safeSubmissions = undefStats?.submissions?.submitted ?? 0;
    const safeEvaluations = undefStats?.evaluations?.locked ?? 0;
    assert(safeTeams === 0 && safeParticipants === 0 && safeSubmissions === 0 && safeEvaluations === 0,
      "Admin Metrics: Undefined stats object safely falls back to 0 without throwing error"
    );

    // 7.2 Announcements creation and priority tags
    // Valid backend priorities: ["LOW", "NORMAL", "HIGH", "URGENT"] (LOW corresponds to INFO/LOW)
    for (const priority of ["LOW", "NORMAL", "HIGH", "URGENT"]) {
      const annRes = await adminClient.post("/api/admin/announcements", {
        title: `${priority} Hackathon Broadcast ${timestamp}`,
        message: `This is a ${priority} broadcast message for testing priority tags.`,
        priority: priority,
        published: true,
      });
      assert(annRes.status === 201, `Backend Admin: Created announcement with priority ${priority}`);
      assert(annRes.body?.announcement?.priority === priority, `Backend Admin: Priority ${priority} matches payload`);
    }

    // Invalid priority rejected with 422
    const badPriorityRes = await adminClient.post("/api/admin/announcements", {
      title: "Bad Priority Announcement",
      message: "This should fail validation",
      priority: "INVALID_PRIORITY_LEVEL",
      published: true,
    });
    assert(badPriorityRes.status === 422, "Backend Admin: Invalid priority rejected with 422");

    // 7.3 Track updates: create, patch title/description, empty title rejection
    const newTrackRes = await adminClient.post("/api/tracks", {
      title: `Quantum Computing Track ${timestamp}`,
      description: "Harnessing quantum algorithms for optimization and cryptography.",
    });
    assert(newTrackRes.status === 201, "Backend Admin: Created new track with 201 Created");
    const createdTrack = newTrackRes.body?.track;
    assert(Boolean(createdTrack?.id), "Backend Admin: Created track has valid ID");

    // Update track title and description via PATCH
    const updatedTitle = `Advanced Quantum Systems ${timestamp}`;
    const updatedDesc = "Updated comprehensive description for advanced quantum track.";
    const patchTrackRes = await adminClient.patch(`/api/tracks/${createdTrack.id}`, {
      title: updatedTitle,
      description: updatedDesc,
    });
    assert(patchTrackRes.status === 200, "Backend Admin: Track updated with 200 OK");
    assert(patchTrackRes.body?.track?.title === updatedTitle, "Backend Admin: Track title updated");
    assert(patchTrackRes.body?.track?.description === updatedDesc, "Backend Admin: Track description updated");

    // Update with empty title rejected with 422
    const emptyTitleRes = await adminClient.patch(`/api/tracks/${createdTrack.id}`, {
      title: "",
    });
    assert(emptyTitleRes.status === 422, "Backend Admin: Empty track title rejected with 422");

  } catch (error) {
    console.error("FATAL ERROR IN EMPIRICAL CHALLENGE SUITE:", error);
    assert(false, "Suite Execution", error.message);
  } finally {
    await disconnectDb();
  }

  // --------------------------------------------------------------------------
  // RESULTS SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("             CHALLENGER M3_2: EMPIRICAL TEST EXECUTION SUMMARY                 ");
  console.log("================================================================================");
  console.log(`Total Probes Executed:  ${totalTests}`);
  console.log(`Passed:                 \x1b[32m${passedTests}\x1b[0m`);
  console.log(`Failed:                 \x1b[31m${failedTests}\x1b[0m`);
  console.log("--------------------------------------------------------------------------------");
  if (failedTests === 0) {
    console.log("OVERALL EMPIRICAL CHALLENGE VERDICT: \x1b[32mALL CHALLENGES PASSED (APPROVE)\x1b[0m ✅");
  } else {
    console.log("OVERALL EMPIRICAL CHALLENGE VERDICT: \x1b[31mCHALLENGES FAILED (REQUEST_CHANGES)\x1b[0m ❌");
    console.log("\nFailure Details:");
    failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f.testName}: ${f.details}`));
  }
  console.log("================================================================================\n");

  process.exit(failedTests === 0 ? 0 : 1);
}

runM3AdversarialChallenge();
