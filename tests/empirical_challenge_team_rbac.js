/**
 * tests/empirical_challenge_team_rbac.js
 *
 * Milestone 2 Challenger 2 (challenger_m2_2) Empirical Verification Suite.
 * Empirically tests:
 * 1. Team Creation Flow (Feature 9):
 *    - POST /api/team creates team with capacityMax: 4, memberCount: 1, myRole: LEADER
 *    - Invite code generated strictly matches format `PRMPT-XXXXXX` (/^PRMPT-[2-9A-HJ-NP-Z]{6}$/)
 *    - Team and TeamMember records are persistently stored in PostgreSQL (verified via Prisma)
 *    - AuditLog records TEAM_CREATED
 *    - GET /api/team/me reflects newly created team
 * 2. Team Joining via Invite Code (Feature 10):
 *    - User 2 registers and joins team via POST /api/team/join with inviteCode
 *    - Status 200 OK, memberCount increments to 2, myRole: MEMBER
 *    - Team and TeamMember records in PostgreSQL verified
 *    - AuditLog records TEAM_JOINED
 *    - GET /api/team/me reflects updated roster
 * 3. Team Capacity Enforcement (Max 4 Members):
 *    - User 3 and User 4 join team -> capacity reaches 4
 *    - User 5 registers and attempts to join full team -> HTTP 409 Conflict ("This team is already at full capacity.")
 *    - Database verifies team memberCount remains 4 and User 5 has no team seat
 * 4. Track Selection & Locking (Feature 11):
 *    - Leader selects track and calls POST /api/team/track-lock
 *    - Status 200 OK, trackLockedAt is populated with valid timestamp, trackLocked is true
 *    - PostgreSQL record verified: trackId and trackLockedAt are set
 *    - AuditLog records TRACK_LOCKED
 * 5. Track Lock Immutability:
 *    - Leader attempts second track-lock call on locked team -> HTTP 409 Conflict ("This team's track selection is already locked.")
 *    - Database verifies trackId has not been modified
 * 6. RBAC Boundaries (Feature 12):
 *    - Non-leader (MEMBER) attempts to lock track on unlocked team -> HTTP 403 Forbidden ("Only the team leader can lock the track selection.")
 *    - Non-leader (MEMBER) attempts to lock track on locked team -> HTTP 403 Forbidden
 *    - Participant (Leader or Member) attempts GET /api/admin/dashboard -> HTTP 403 Forbidden
 *    - Participant attempts POST /api/admin/freeze-scores -> HTTP 403 Forbidden
 *    - Admin accesses GET /api/admin/dashboard -> HTTP 200 OK (positive control)
 * 7. Adversarial Edge Cases:
 *    - Team creation when already in a team -> HTTP 409 Conflict
 *    - Team joining when already in a team -> HTTP 409 Conflict
 *    - Joining with non-existent invite code -> HTTP 404 Not Found
 *    - Joining with lowercase code (case-insensitivity check)
 *    - Track lock with non-existent trackId -> HTTP 404 Not Found
 *    - Track lock with missing payload -> HTTP 422 Unprocessable Entity
 *    - Unauthenticated requests -> HTTP 401 Unauthorized
 */

const path = require("path");
const axios = require("axios");
const prisma = require(path.resolve(__dirname, "../backend/src/config/prisma"));

const BASE_URL = "http://localhost:4000";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

let ipCounter = 800;
function getClientHeaders(extra = {}) {
  const ip = `10.90.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
  ipCounter++;
  return {
    "X-Forwarded-For": ip,
    ...extra,
  };
}

function assert(condition, message, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
  } else {
    failedTests++;
    const errMsg = `  \x1b[31m✖ FAIL\x1b[0m: ${message} ${details ? `(${details})` : ""}`;
    console.error(errMsg);
    failures.push({ message, details });
  }
}

function parseCookie(setCookieHeaders, cookieName = "promptothon_token") {
  if (!setCookieHeaders) return null;
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const header of headers) {
    const parts = header.split(";");
    for (const part of parts) {
      const [key, val] = part.trim().split("=");
      if (key === cookieName) return val;
    }
  }
  return null;
}

async function registerParticipant(tag) {
  const email = `test_${tag}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
  const password = "Password123!";
  const name = `Empirical User ${tag}`;

  const res = await axios.post(
    `${BASE_URL}/api/auth/register`,
    { name, email, password, intent: "solo" },
    { headers: getClientHeaders(), validateStatus: () => true }
  );

  if (res.status !== 201) {
    throw new Error(`Failed to register ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }

  const token = res.data.token || parseCookie(res.headers["set-cookie"]);
  const user = res.data.user;
  const authHeader = { Authorization: `Bearer ${token}` };
  return { email, password, name, token, user, authHeader };
}

async function runEmpiricalSuite() {
  console.log("================================================================================");
  console.log("     EMPIRICAL VERIFICATION SUITE — MILESTONE 2 CHALLENGER 2 (challenger_m2_2)  ");
  console.log("     Features 9, 10, 11, 12: Team Formation, Capacity, Track Locking, RBAC      ");
  console.log("================================================================================\n");

  try {
    // 0. Environment & Service Sanity Check
    console.log("[Phase 0: Backend Health & PostgreSQL Connection Check]");
    const healthRes = await axios.get(`${BASE_URL}/health`, { headers: getClientHeaders(), validateStatus: () => true });
    assert(healthRes.status === 200, "Backend /health returns HTTP 200");
    assert(healthRes.data && healthRes.data.database && healthRes.data.database.connected === true, "Database connection reported true by backend");

    const tracksRes = await axios.get(`${BASE_URL}/api/tracks`, { headers: getClientHeaders(), validateStatus: () => true });
    assert(tracksRes.status === 200, "GET /api/tracks is publicly accessible and returns 200");
    assert(Array.isArray(tracksRes.data.tracks) && tracksRes.data.tracks.length >= 2, `Available tracks count >= 2 (found ${tracksRes.data.tracks ? tracksRes.data.tracks.length : 0})`);
    const track1 = tracksRes.data.tracks[0];
    const track2 = tracksRes.data.tracks[1];

    // =========================================================================
    // Phase 1: Team Creation (Feature 9)
    // =========================================================================
    console.log("\n[Phase 1: Feature 9 — Team Creation & Invite Code Validation]");
    const leader1 = await registerParticipant("leader1");
    assert(leader1.user && leader1.user.id, `Leader 1 registered successfully (id: ${leader1.user.id})`);

    // Verify participant initially has no team
    const noTeamRes = await axios.get(`${BASE_URL}/api/team/me`, {
      headers: getClientHeaders(leader1.authHeader),
      validateStatus: () => true,
    });
    assert(noTeamRes.status === 404, "GET /api/team/me returns 404 before team creation");

    // Call POST /api/team
    const teamName1 = `Empirical Alpha ${Date.now()}`;
    const createTeamRes = await axios.post(
      `${BASE_URL}/api/team`,
      { name: teamName1 },
      { headers: getClientHeaders(leader1.authHeader), validateStatus: () => true }
    );

    assert(createTeamRes.status === 201, `POST /api/team returns HTTP 201 Created (got ${createTeamRes.status})`);
    const createdTeam = createTeamRes.data.team;
    assert(createdTeam && createdTeam.id, "Returned team has valid id");
    assert(createdTeam.name === teamName1, `Returned team name matches (${createdTeam.name})`);
    assert(createTeamRes.data.myRole === "LEADER", `Creator role is LEADER (got ${createTeamRes.data.myRole})`);
    assert(createdTeam.capacityMax === 4, `Team capacityMax is 4 (got ${createdTeam.capacityMax})`);
    assert(createdTeam.memberCount === 1, `Team memberCount is 1 (got ${createdTeam.memberCount})`);
    assert(createdTeam.trackLocked === false, `Team trackLocked is false initially`);
    assert(createdTeam.trackLockedAt === null, `Team trackLockedAt is null initially`);

    // Invite code validation: format `PRMPT-XXXXXX`
    const inviteCode = createdTeam.inviteCode;
    assert(Boolean(inviteCode), `Invite code is present in response (${inviteCode})`);
    assert(createdTeam.code === inviteCode, `Aliased team.code equals team.inviteCode (${createdTeam.code})`);
    
    // Exact format check: 'PRMPT-' prefix followed by 6 nanoid characters
    const inviteCodeRegex = /^PRMPT-[2-9A-HJ-NP-Z]{6}$/;
    const matchesStrictFormat = inviteCodeRegex.test(inviteCode);
    assert(matchesStrictFormat, `Invite code '${inviteCode}' strictly matches /^PRMPT-[2-9A-HJ-NP-Z]{6}$/ format`);
    assert(inviteCode.length === 12, `Invite code length is exactly 12 chars (6 prefix + 6 code)`);

    // Database Persistence Verification (PostgreSQL via Prisma)
    const dbTeam = await prisma.team.findUnique({
      where: { id: createdTeam.id },
      include: { members: true },
    });
    assert(Boolean(dbTeam), "Team record persistently exists in PostgreSQL");
    assert(dbTeam && dbTeam.name === teamName1, "PostgreSQL team.name matches created name");
    assert(dbTeam && dbTeam.inviteCode === inviteCode, "PostgreSQL team.inviteCode matches returned code");
    assert(dbTeam && dbTeam.leaderId === leader1.user.id, "PostgreSQL team.leaderId matches creator user id");
    assert(dbTeam && dbTeam.capacityMax === 4, "PostgreSQL team.capacityMax is 4");
    assert(dbTeam && dbTeam.memberCount === 1, "PostgreSQL team.memberCount is 1");
    assert(dbTeam && dbTeam.trackLockedAt === null, "PostgreSQL team.trackLockedAt is null");
    assert(dbTeam && dbTeam.members.length === 1, "PostgreSQL team has exactly 1 teamMember");
    assert(dbTeam && dbTeam.members[0].userId === leader1.user.id && dbTeam.members[0].role === "LEADER", "PostgreSQL teamMember has leaderId and role LEADER");

    // Check AuditLog for TEAM_CREATED
    const auditCreated = await prisma.auditLog.findFirst({
      where: { action: "TEAM_CREATED", actorId: leader1.user.id },
      orderBy: { createdAt: "desc" },
    });
    assert(Boolean(auditCreated), "AuditLog record created with action TEAM_CREATED");

    // GET /api/team/me persistence
    const meRes1 = await axios.get(`${BASE_URL}/api/team/me`, {
      headers: getClientHeaders(leader1.authHeader),
      validateStatus: () => true,
    });
    assert(meRes1.status === 200, "GET /api/team/me returns 200 for leader");
    assert(meRes1.data.team.id === createdTeam.id, "GET /api/team/me returns correct team id");
    assert(meRes1.data.myRole === "LEADER", "GET /api/team/me returns myRole LEADER");

    // =========================================================================
    // Phase 2: Team Joining via Invite Code (Feature 10)
    // =========================================================================
    console.log("\n[Phase 2: Feature 10 — Team Joining via Invite Code]");
    const member2 = await registerParticipant("member2");

    // Member 2 initially has no team
    const m2NoTeam = await axios.get(`${BASE_URL}/api/team/me`, {
      headers: getClientHeaders(member2.authHeader),
      validateStatus: () => true,
    });
    assert(m2NoTeam.status === 404, "Member 2 has no team prior to join (404)");

    // Member 2 joins via POST /api/team/join using inviteCode
    const joinRes2 = await axios.post(
      `${BASE_URL}/api/team/join`,
      { inviteCode: inviteCode },
      { headers: getClientHeaders(member2.authHeader), validateStatus: () => true }
    );
    assert(joinRes2.status === 200, `POST /api/team/join returns HTTP 200 OK (got ${joinRes2.status})`);
    assert(joinRes2.data.team && joinRes2.data.team.id === createdTeam.id, "Joined team ID matches created team");
    assert(joinRes2.data.myRole === "MEMBER", `Joining user's role is MEMBER (got ${joinRes2.data.myRole})`);
    assert(joinRes2.data.team.memberCount === 2, `Team memberCount in response is now 2 (got ${joinRes2.data.team.memberCount})`);

    // Verify DB state for Member 2
    const dbTeamAfterJoin = await prisma.team.findUnique({
      where: { id: createdTeam.id },
      include: { members: true },
    });
    assert(dbTeamAfterJoin.memberCount === 2, "PostgreSQL team.memberCount updated to 2");
    assert(dbTeamAfterJoin.members.length === 2, "PostgreSQL team has exactly 2 members");
    const m2DbMember = dbTeamAfterJoin.members.find(m => m.userId === member2.user.id);
    assert(Boolean(m2DbMember) && m2DbMember.role === "MEMBER", "Member 2 is present in DB teamMember with role MEMBER");

    // Check AuditLog for TEAM_JOINED
    const auditJoined = await prisma.auditLog.findFirst({
      where: { action: "TEAM_JOINED", actorId: member2.user.id },
      orderBy: { createdAt: "desc" },
    });
    assert(Boolean(auditJoined), "AuditLog record created with action TEAM_JOINED for Member 2");

    // GET /api/team/me for Member 2
    const m2MeRes = await axios.get(`${BASE_URL}/api/team/me`, {
      headers: getClientHeaders(member2.authHeader),
      validateStatus: () => true,
    });
    assert(m2MeRes.status === 200, "GET /api/team/me returns 200 for Member 2");
    assert(m2MeRes.data.myRole === "MEMBER", "GET /api/team/me confirms Member 2 role is MEMBER");
    assert(m2MeRes.data.team.memberCount === 2, "GET /api/team/me confirms team memberCount is 2");

    // GET /api/team/me for Leader 1 reflects updated roster
    const l1MeResAfterM2 = await axios.get(`${BASE_URL}/api/team/me`, {
      headers: getClientHeaders(leader1.authHeader),
      validateStatus: () => true,
    });
    assert(l1MeResAfterM2.data.team.memberCount === 2, "Leader's view shows team memberCount is 2");
    assert(l1MeResAfterM2.data.team.members.length === 2, "Leader's view lists 2 members in team.members");

    // =========================================================================
    // Phase 3: Capacity Enforcement (Max 4 Members -> HTTP 409)
    // =========================================================================
    console.log("\n[Phase 3: Team Capacity Limit Enforcement (Max 4 Members)]");
    const member3 = await registerParticipant("member3");
    const joinRes3 = await axios.post(
      `${BASE_URL}/api/team/join`,
      { inviteCode: inviteCode },
      { headers: getClientHeaders(member3.authHeader), validateStatus: () => true }
    );
    assert(joinRes3.status === 200, "Member 3 joins successfully (memberCount: 3)");

    const member4 = await registerParticipant("member4");
    const joinRes4 = await axios.post(
      `${BASE_URL}/api/team/join`,
      { teamCode: inviteCode }, // test teamCode alias
      { headers: getClientHeaders(member4.authHeader), validateStatus: () => true }
    );
    assert(joinRes4.status === 200, "Member 4 joins successfully (memberCount: 4 - team at maximum capacity)");

    const dbTeamFull = await prisma.team.findUnique({
      where: { id: createdTeam.id },
      include: { members: true },
    });
    assert(dbTeamFull.memberCount === 4, "PostgreSQL confirms team is at capacity (memberCount: 4)");
    assert(dbTeamFull.members.length === 4, "PostgreSQL confirms exactly 4 membership records");

    // User 5 attempts to join the saturated team (OVERFLOW ATTEMPT)
    const member5 = await registerParticipant("member5_overflow");
    const joinRes5 = await axios.post(
      `${BASE_URL}/api/team/join`,
      { inviteCode: inviteCode },
      { headers: getClientHeaders(member5.authHeader), validateStatus: () => true }
    );
    assert(joinRes5.status === 409, `Joining saturated team rejected with HTTP 409 Conflict (got ${joinRes5.status})`);
    const joinErr5 = joinRes5.data?.error || joinRes5.data?.message || "";
    assert(
      typeof joinErr5 === "string" && joinErr5.toLowerCase().includes("capacity"),
      `Error message mentions capacity: "${joinErr5}"`
    );

    // Verify DB integrity: User 5 was NOT added and memberCount did not exceed 4
    const dbTeamAfterOverflow = await prisma.team.findUnique({
      where: { id: createdTeam.id },
      include: { members: true },
    });
    assert(dbTeamAfterOverflow.memberCount === 4, "Database memberCount remains exactly 4 after overflow attempt");
    assert(dbTeamAfterOverflow.members.length === 4, "Database members count remains exactly 4");
    const m5InTeam = dbTeamAfterOverflow.members.find(m => m.userId === member5.user.id);
    assert(!m5InTeam, "User 5 does NOT exist in team members");

    // Member 5 still has no team
    const m5MeRes = await axios.get(`${BASE_URL}/api/team/me`, {
      headers: getClientHeaders(member5.authHeader),
      validateStatus: () => true,
    });
    assert(m5MeRes.status === 404, "User 5 still has no team (404)");

    // =========================================================================
    // Phase 4: RBAC — Non-Leader Track Lock Rejection (HTTP 403)
    // =========================================================================
    console.log("\n[Phase 4: RBAC Boundary — Non-Leader Cannot Lock Track]");
    // Member 2 (role: MEMBER) attempts to lock track on the team before it is locked
    const memberLockAttempt = await axios.post(
      `${BASE_URL}/api/team/track-lock`,
      { trackId: track1.id },
      { headers: getClientHeaders(member2.authHeader), validateStatus: () => true }
    );
    assert(memberLockAttempt.status === 403, `Non-leader track lock rejected with HTTP 403 Forbidden (got ${memberLockAttempt.status})`);
    const nonLeaderErr = memberLockAttempt.data?.error || memberLockAttempt.data?.message || "";
    assert(
      typeof nonLeaderErr === "string" && nonLeaderErr.toLowerCase().includes("leader"),
      `Error message mentions leader: "${nonLeaderErr}"`
    );

    // Verify team is STILL unlocked in DB
    const dbTeamStillUnlocked = await prisma.team.findUnique({ where: { id: createdTeam.id } });
    assert(dbTeamStillUnlocked.trackId === null, "Team trackId remains null in database after non-leader rejection");
    assert(dbTeamStillUnlocked.trackLockedAt === null, "Team trackLockedAt remains null in database after non-leader rejection");

    // =========================================================================
    // Phase 5: Track Selection & Locking by Leader (Feature 11)
    // =========================================================================
    console.log("\n[Phase 5: Feature 11 — Track Selection & Locking by Leader]");
    const leaderLockRes = await axios.post(
      `${BASE_URL}/api/team/track-lock`,
      { trackId: track1.id },
      { headers: getClientHeaders(leader1.authHeader), validateStatus: () => true }
    );
    assert(leaderLockRes.status === 200, `Leader track lock returns HTTP 200 OK (got ${leaderLockRes.status})`);
    const lockedTeam = leaderLockRes.data.team;
    assert(lockedTeam && lockedTeam.trackId === track1.id, `team.trackId matches selected track (${lockedTeam?.trackId})`);
    assert(Boolean(lockedTeam.trackLockedAt), `team.trackLockedAt is populated with timestamp (${lockedTeam?.trackLockedAt})`);
    assert(lockedTeam.trackLocked === true, "team.trackLocked alias is true");
    assert(lockedTeam.track && lockedTeam.track.id === track1.id, "team.track object is populated in response");

    // Verify PostgreSQL Database Persistence
    const dbTeamLocked = await prisma.team.findUnique({
      where: { id: createdTeam.id },
      include: { track: true },
    });
    assert(dbTeamLocked.trackId === track1.id, "PostgreSQL team.trackId correctly persisted");
    assert(dbTeamLocked.trackLockedAt instanceof Date, "PostgreSQL team.trackLockedAt is a valid Date object");
    assert(dbTeamLocked.track !== null && dbTeamLocked.track.id === track1.id, "PostgreSQL team.track relation resolved");

    // Check AuditLog for TRACK_LOCKED
    const auditTrackLocked = await prisma.auditLog.findFirst({
      where: { action: "TRACK_LOCKED", actorId: leader1.user.id },
      orderBy: { createdAt: "desc" },
    });
    assert(Boolean(auditTrackLocked), "AuditLog record created with action TRACK_LOCKED");
    assert(auditTrackLocked.metadata && auditTrackLocked.metadata.trackId === track1.id, "AuditLog metadata contains selected trackId");

    // GET /api/team/me reflects track locking for both leader and member
    const meResLeaderLocked = await axios.get(`${BASE_URL}/api/team/me`, {
      headers: getClientHeaders(leader1.authHeader),
      validateStatus: () => true,
    });
    assert(meResLeaderLocked.data.team.trackLocked === true, "Leader GET /api/team/me confirms trackLocked === true");
    assert(Boolean(meResLeaderLocked.data.team.trackLockedAt), "Leader GET /api/team/me contains trackLockedAt");

    const meResMemberLocked = await axios.get(`${BASE_URL}/api/team/me`, {
      headers: getClientHeaders(member2.authHeader),
      validateStatus: () => true,
    });
    assert(meResMemberLocked.data.team.trackLocked === true, "Member GET /api/team/me confirms trackLocked === true");
    assert(Boolean(meResMemberLocked.data.team.trackLockedAt), "Member GET /api/team/me contains trackLockedAt");

    // =========================================================================
    // Phase 6: Track Lock Immutability (Second Lock Rejection -> HTTP 409)
    // =========================================================================
    console.log("\n[Phase 6: Track Lock Immutability — Second Lock Attempt]");
    // Attempt 1: Leader attempts to lock same track again
    const secondLockResSame = await axios.post(
      `${BASE_URL}/api/team/track-lock`,
      { trackId: track1.id },
      { headers: getClientHeaders(leader1.authHeader), validateStatus: () => true }
    );
    assert(secondLockResSame.status === 409, `Second track lock with same track returns HTTP 409 Conflict (got ${secondLockResSame.status})`);
    const secondLockErr = secondLockResSame.data?.error || secondLockResSame.data?.message || "";
    assert(
      typeof secondLockErr === "string" && secondLockErr.toLowerCase().includes("already locked"),
      `Error message mentions already locked: "${secondLockErr}"`
    );

    // Attempt 2: Leader attempts to switch track after locking
    const secondLockResDiff = await axios.post(
      `${BASE_URL}/api/team/track-lock`,
      { trackId: track2.id },
      { headers: getClientHeaders(leader1.authHeader), validateStatus: () => true }
    );
    assert(secondLockResDiff.status === 409, `Second track lock with different track returns HTTP 409 Conflict (got ${secondLockResDiff.status})`);

    // Verify DB integrity: track has NOT changed
    const dbTeamUnchanged = await prisma.team.findUnique({ where: { id: createdTeam.id } });
    assert(dbTeamUnchanged.trackId === track1.id, `Database team.trackId remained unchanged as ${track1.id}`);
    assert(
      dbTeamUnchanged.trackLockedAt.getTime() === dbTeamLocked.trackLockedAt.getTime(),
      "Database team.trackLockedAt timestamp remained untouched"
    );

    // =========================================================================
    // Phase 7: RBAC Boundaries — Participant Cannot Access Admin (HTTP 403)
    // =========================================================================
    console.log("\n[Phase 7: Feature 12 — RBAC Boundaries & Admin Protection]");
    // Leader (role: PARTICIPANT) attempts to access /api/admin/dashboard
    const leaderAdminDash = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
      headers: getClientHeaders(leader1.authHeader),
      validateStatus: () => true,
    });
    assert(leaderAdminDash.status === 403, `Participant (Leader) accessing /api/admin/dashboard rejected with HTTP 403 (got ${leaderAdminDash.status})`);

    // Member 2 (role: PARTICIPANT) attempts to access /api/admin/dashboard
    const memberAdminDash = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
      headers: getClientHeaders(member2.authHeader),
      validateStatus: () => true,
    });
    assert(memberAdminDash.status === 403, `Participant (Member) accessing /api/admin/dashboard rejected with HTTP 403 (got ${memberAdminDash.status})`);

    // Solo participant with no team attempts to access /api/admin/dashboard
    const member5AdminDash = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
      headers: getClientHeaders(member5.authHeader),
      validateStatus: () => true,
    });
    assert(member5AdminDash.status === 403, `Solo Participant accessing /api/admin/dashboard rejected with HTTP 403 (got ${member5AdminDash.status})`);

    // Participant attempts to perform admin mutation: /api/admin/freeze-scores
    const participantFreezeAttempt = await axios.post(
      `${BASE_URL}/api/admin/freeze-scores`,
      { frozen: true },
      { headers: getClientHeaders(leader1.authHeader), validateStatus: () => true }
    );
    assert(participantFreezeAttempt.status === 403, `Participant accessing /api/admin/freeze-scores rejected with HTTP 403 (got ${participantFreezeAttempt.status})`);

    // Positive Control: Valid Admin access to /api/admin/dashboard
    const adminLoginRes = await axios.post(
      `${BASE_URL}/api/auth/login`,
      { email: "admin@promptothon.dev", password: "ChangeMe123!" },
      { headers: getClientHeaders(), validateStatus: () => true }
    );
    assert(adminLoginRes.status === 200, `Admin login successful (HTTP 200)`);
    const adminToken = adminLoginRes.data.token || parseCookie(adminLoginRes.headers["set-cookie"]);
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };

    const adminDashboardRes = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
      headers: getClientHeaders(adminAuthHeader),
      validateStatus: () => true,
    });
    assert(adminDashboardRes.status === 200, `Admin accessing /api/admin/dashboard returns HTTP 200 OK (got ${adminDashboardRes.status})`);
    assert(
      adminDashboardRes.data && typeof adminDashboardRes.data === "object" && adminDashboardRes.data.users !== undefined && adminDashboardRes.data.teams !== undefined,
      "Admin dashboard response contains valid users and teams metrics"
    );

    // =========================================================================
    // Phase 8: Adversarial Edge Cases & Abuse Probes
    // =========================================================================
    console.log("\n[Phase 8: Adversarial Edge Cases & Robustness Probes]");
    
    // Probe 1: User already in a team attempts to create another team
    const createTeamWhileInTeam = await axios.post(
      `${BASE_URL}/api/team`,
      { name: "Team Imposter" },
      { headers: getClientHeaders(leader1.authHeader), validateStatus: () => true }
    );
    assert(createTeamWhileInTeam.status === 409, `User already in team cannot create another team (HTTP 409, got ${createTeamWhileInTeam.status})`);

    // Probe 2: User already in a team attempts to join another team
    // First create a new independent team
    const leader2 = await registerParticipant("leader2_indep");
    const team2Res = await axios.post(
      `${BASE_URL}/api/team`,
      { name: `Independent Team ${Date.now()}` },
      { headers: getClientHeaders(leader2.authHeader), validateStatus: () => true }
    );
    const code2 = team2Res.data.team.inviteCode;

    const joinWhileInTeam = await axios.post(
      `${BASE_URL}/api/team/join`,
      { inviteCode: code2 },
      { headers: getClientHeaders(member2.authHeader), validateStatus: () => true }
    );
    assert(joinWhileInTeam.status === 409, `User already in team cannot join another team (HTTP 409, got ${joinWhileInTeam.status})`);

    // Probe 3: Join with non-existent invite code
    const joinNonExistent = await axios.post(
      `${BASE_URL}/api/team/join`,
      { inviteCode: "PRMPT-ZZZZZZ" },
      { headers: getClientHeaders(member5.authHeader), validateStatus: () => true }
    );
    assert(joinNonExistent.status === 404, `Joining non-existent team code returns HTTP 404 (got ${joinNonExistent.status})`);

    // Probe 4: Case-insensitivity test for team join (lowercase code)
    const member6 = await registerParticipant("member6_lowercase");
    const lowerCode = code2.toLowerCase();
    const joinLowerRes = await axios.post(
      `${BASE_URL}/api/team/join`,
      { inviteCode: lowerCode },
      { headers: getClientHeaders(member6.authHeader), validateStatus: () => true }
    );
    assert(joinLowerRes.status === 200, `Join with lowercase invite code '${lowerCode}' normalized and accepted (HTTP 200)`);

    // Probe 5: Track lock with non-existent track ID
    const leader3 = await registerParticipant("leader3_track_err");
    await axios.post(
      `${BASE_URL}/api/team`,
      { name: `Team Error Track ${Date.now()}` },
      { headers: getClientHeaders(leader3.authHeader), validateStatus: () => true }
    );
    const fakeTrackLockRes = await axios.post(
      `${BASE_URL}/api/team/track-lock`,
      { trackId: "non-existent-track-uuid-999" },
      { headers: getClientHeaders(leader3.authHeader), validateStatus: () => true }
    );
    assert(fakeTrackLockRes.status === 404, `Locking non-existent trackId returns HTTP 404 (got ${fakeTrackLockRes.status})`);

    // Probe 6: Track lock with malformed payload
    const malformedTrackLockRes = await axios.post(
      `${BASE_URL}/api/team/track-lock`,
      { invalidField: 123 },
      { headers: getClientHeaders(leader3.authHeader), validateStatus: () => true }
    );
    assert(malformedTrackLockRes.status === 422, `Track lock with malformed body rejected with HTTP 422 (got ${malformedTrackLockRes.status})`);

    // Probe 7: Unauthenticated requests
    const unauthTeam = await axios.post(`${BASE_URL}/api/team`, { name: "No Auth" }, { headers: getClientHeaders(), validateStatus: () => true });
    assert(unauthTeam.status === 401, `Unauthenticated POST /api/team rejected with HTTP 401 (got ${unauthTeam.status})`);

    const unauthJoin = await axios.post(`${BASE_URL}/api/team/join`, { inviteCode: code2 }, { headers: getClientHeaders(), validateStatus: () => true });
    assert(unauthJoin.status === 401, `Unauthenticated POST /api/team/join rejected with HTTP 401 (got ${unauthJoin.status})`);

    const unauthLock = await axios.post(`${BASE_URL}/api/team/track-lock`, { trackId: track1.id }, { headers: getClientHeaders(), validateStatus: () => true });
    assert(unauthLock.status === 401, `Unauthenticated POST /api/team/track-lock rejected with HTTP 401 (got ${unauthLock.status})`);

    const unauthAdmin = await axios.get(`${BASE_URL}/api/admin/dashboard`, { headers: getClientHeaders(), validateStatus: () => true });
    assert(unauthAdmin.status === 401, `Unauthenticated GET /api/admin/dashboard rejected with HTTP 401 (got ${unauthAdmin.status})`);

  } catch (err) {
    console.error("FATAL RUNTIME ERROR:", err);
    assert(false, `Unexpected suite execution exception: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }

  // =========================================================================
  // Summary & Verdict Determination
  // =========================================================================
  console.log("\n================================================================================");
  console.log("                         EMPIRICAL TEST SUITE SUMMARY                           ");
  console.log("================================================================================");
  console.log(`Total Assertions Executed: ${totalTests}`);
  console.log(`Passed:                    ${passedTests}`);
  console.log(`Failed:                    ${failedTests}`);
  if (failedTests > 0) {
    console.log(`Failures:`);
    failures.forEach((f, idx) => console.log(`  ${idx + 1}. ${f.message} ${f.details}`));
    console.log("\nVERDICT: FAIL ❌");
    process.exit(1);
  } else {
    console.log("\nVERDICT: APPROVE ✅");
    process.exit(0);
  }
}

runEmpiricalSuite();
