/**
 * tests/empirical_challenge_auth.js
 * 
 * Milestone 2 Challenger 1 (challenger_m2_1) Empirical Verification Suite.
 * Empirically tests:
 * 1. User Registration (Features 6):
 *    - Brand-new user registration via POST /api/auth/register
 *    - Verification of persistent storage in PostgreSQL via Prisma Client
 *    - Verification that password is salt-hashed with bcrypt (never stored plaintext)
 *    - Registration with intent="create" and team persistence in PostgreSQL
 * 2. JWT Cookie & Session Return (Feature 7):
 *    - Verification of HTTP-only, SameSite=Lax cookie promptothon_token
 *    - Session verification via GET /api/auth/me using cookie
 *    - Session verification via GET /api/auth/me using Bearer token
 * 3. User Logout & Session Termination (Feature 8):
 *    - Logout via POST /api/auth/logout returning 204
 *    - Verification of cookie clearing headers (Max-Age=0 or Expires=1970)
 *    - Verification of session invalidation on GET /api/auth/me (returns 401)
 * 4. Subsequent Re-login (Feature 7 & 8):
 *    - Login with identical email & password returning 200 and fresh JWT session
 *    - Immediate access to protected endpoints post-login
 * 5. Wrong Password & Credential Rejection (Feature 7):
 *    - Login with wrong password returning 401
 *    - Login with non-existent email returning 401
 * 6. Adversarial Stress Probes:
 *    - Duplicate registration rejection (409 Conflict)
 *    - Short password boundary (< 8 chars) rejection (422)
 *    - Invalid email format rejection (422)
 *    - Email case-insensitivity on login (uppercase/mixed case)
 *    - Tampered/corrupt JWT rejection (401)
 *    - PostgreSQL AuditLog verification for USER_REGISTERED and USER_LOGIN
 */

const path = require("path");
const axios = require("axios");
const prisma = require(path.resolve(__dirname, "../backend/src/config/prisma"));

const BASE_URL = "http://localhost:4000";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

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

let ipCounter = 1;
function getClientHeaders(extra = {}) {
  const ip = `10.42.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
  ipCounter++;
  return {
    "X-Forwarded-For": ip,
    ...extra,
  };
}

function parseCookie(setCookieHeaders, cookieName = "promptothon_token") {
  if (!setCookieHeaders) return null;
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const h of headers) {
    if (h.includes(`${cookieName}=`)) {
      const match = h.match(new RegExp(`${cookieName}=([^;]+)`));
      return {
        full: h,
        value: match ? match[1] : "",
        isHttpOnly: /httponly/i.test(h),
        sameSite: (h.match(/samesite=([^;]+)/i) || [])[1] || null,
        path: (h.match(/path=([^;]+)/i) || [])[1] || null,
        isCleared: /expires=thu, 01 jan 1970/i.test(h) || /max-age=0/i.test(h) || h.includes(`${cookieName}=;`),
      };
    }
  }
  return null;
}

async function runEmpiricalVerification() {
  console.log("================================================================================");
  console.log("   MILIESTONE 2 CHALLENGER 1: AUTHENTICATION & SESSION EMPIRICAL VERIFICATION   ");
  console.log("================================================================================\n");

  const timestamp = Date.now();
  const testUser = {
    name: `Empirical Challenger User ${timestamp}`,
    email: `challenger_${timestamp}@empirical.test`,
    password: `P@ssword_${timestamp}!`,
    intent: "solo",
    college: "Test University of Engineering",
    skills: ["Adversarial Testing", "PostgreSQL", "Node.js"],
  };

  const leaderUser = {
    name: `Leader Challenger ${timestamp}`,
    email: `leader_${timestamp}@empirical.test`,
    password: `LeaderP@ss_${timestamp}!`,
    intent: "create",
    teamName: `EmpiricalTeam_${timestamp}`,
  };

  let registeredToken = null;
  let registeredCookieHeader = null;
  let loggedInCookieHeader = null;

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION 1: Health & Database Connectivity
    // -------------------------------------------------------------------------
    console.log("[Section 1] Backend Health & PostgreSQL Connection Check");
    const healthRes = await axios.get(`${BASE_URL}/health`, { validateStatus: () => true });
    assert(healthRes.status === 200, "GET /health returns HTTP 200");
    assert(healthRes.data.ok === true, "Health status ok is true");
    assert(healthRes.data.database && healthRes.data.database.connected === true, "Database is actively connected in PostgreSQL");

    // -------------------------------------------------------------------------
    // TEST SECTION 2: User Registration & PostgreSQL Persistence
    // -------------------------------------------------------------------------
    console.log("\n[Section 2] User Registration (Feature 6) & PostgreSQL Persistence");
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, testUser, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });
    assert(regRes.status === 201, "POST /api/auth/register returns HTTP 201 Created", `status=${regRes.status}`);
    assert(regRes.data.user && regRes.data.user.email === testUser.email.toLowerCase(), "Response contains registered user email");
    assert(regRes.data.user.passwordHash === undefined, "Response body NEVER exposes passwordHash");
    assert(typeof regRes.data.token === "string" && regRes.data.token.length > 20, "Response contains valid JWT token string");
    registeredToken = regRes.data.token;

    // Check Set-Cookie on registration
    const regCookie = parseCookie(regRes.headers["set-cookie"]);
    assert(regCookie !== null, "Registration sets session cookie promptothon_token");
    if (regCookie) {
      assert(regCookie.isHttpOnly === true, "Session cookie has HttpOnly flag");
      assert(regCookie.sameSite && regCookie.sameSite.toLowerCase() === "lax", "Session cookie has SameSite=Lax");
      registeredCookieHeader = `promptothon_token=${regCookie.value}`;
    }

    // Direct Database Verification in PostgreSQL via Prisma
    console.log("  Directly inspecting PostgreSQL database via Prisma...");
    const dbUser = await prisma.user.findUnique({ where: { email: testUser.email.toLowerCase() } });
    assert(dbUser !== null, "User record persisted in PostgreSQL User table");
    if (dbUser) {
      assert(dbUser.email === testUser.email.toLowerCase(), "DB record has matching email");
      assert(dbUser.name === testUser.name, "DB record has matching name");
      assert(dbUser.role === "PARTICIPANT", "DB record has role PARTICIPANT");
      assert(dbUser.isSolo === true, "DB record has isSolo: true for solo intent");
      assert(typeof dbUser.passwordHash === "string", "DB record has passwordHash column populated");
      assert(dbUser.passwordHash.startsWith("$2"), "DB record passwordHash is bcrypt hashed ($2a/$2b)");
      assert(dbUser.passwordHash !== testUser.password, "DB record does NOT store plaintext password");
    }

    // Registration with intent="create" (Leader + Team in PostgreSQL)
    console.log("  Testing intent='create' with team creation in PostgreSQL...");
    const leaderRes = await axios.post(`${BASE_URL}/api/auth/register`, leaderUser, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });
    assert(leaderRes.status === 201, "POST /api/auth/register with intent='create' returns HTTP 201");
    const dbLeader = await prisma.user.findUnique({
      where: { email: leaderUser.email.toLowerCase() },
      include: { teamMember: { include: { team: true } } },
    });
    assert(dbLeader !== null, "Leader user persisted in PostgreSQL");
    assert(dbLeader?.teamMember !== null, "Leader user has teamMember relation created in PostgreSQL");
    assert(dbLeader?.teamMember?.role === "LEADER", "Leader teamMember role is LEADER");
    assert(dbLeader?.teamMember?.team?.name === leaderUser.teamName, "Team persisted in PostgreSQL with specified teamName");
    assert(typeof dbLeader?.teamMember?.team?.inviteCode === "string", "Team generated valid inviteCode in PostgreSQL");

    // -------------------------------------------------------------------------
    // TEST SECTION 3: JWT Cookie & Session Return (Feature 7)
    // -------------------------------------------------------------------------
    console.log("\n[Section 3] Session Return & Validation (Feature 7)");
    // GET /api/auth/me with Cookie
    const meCookieRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: getClientHeaders({ Cookie: registeredCookieHeader }),
      validateStatus: () => true,
    });
    assert(meCookieRes.status === 200, "GET /api/auth/me with registration cookie returns HTTP 200 OK");
    assert(meCookieRes.data.user && meCookieRes.data.user.email === testUser.email.toLowerCase(), "GET /api/auth/me returns authenticated user");

    // GET /api/auth/me with Bearer token
    const meBearerRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: getClientHeaders({ Authorization: `Bearer ${registeredToken}` }),
      validateStatus: () => true,
    });
    assert(meBearerRes.status === 200, "GET /api/auth/me with Bearer token returns HTTP 200 OK");
    assert(meBearerRes.data.user && meBearerRes.data.user.email === testUser.email.toLowerCase(), "Bearer token authentication matches user");

    // -------------------------------------------------------------------------
    // TEST SECTION 4: User Logout & Session Termination (Feature 8)
    // -------------------------------------------------------------------------
    console.log("\n[Section 4] User Logout & Session Termination (Feature 8)");
    const logoutRes = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
      headers: getClientHeaders({ Cookie: registeredCookieHeader }),
      validateStatus: () => true,
    });
    assert(logoutRes.status === 204, "POST /api/auth/logout returns HTTP 204 No Content");

    const logoutCookie = parseCookie(logoutRes.headers["set-cookie"]);
    assert(logoutCookie !== null, "Logout returns set-cookie header for promptothon_token");
    if (logoutCookie) {
      assert(logoutCookie.isCleared === true, "Logout clears session cookie (Max-Age=0 or expired)");
    }

    // Call GET /api/auth/me without cookies / with cleared cookie
    const meAfterLogoutRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: getClientHeaders(logoutCookie ? { Cookie: `promptothon_token=${logoutCookie.value}` } : {}),
      validateStatus: () => true,
    });
    assert(meAfterLogoutRes.status === 401, "GET /api/auth/me returns HTTP 401 after logout / without valid session");

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Subsequent Login with Identical Credentials (Features 7 & 8)
    // -------------------------------------------------------------------------
    console.log("\n[Section 5] Subsequent Login with Identical Credentials");
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password,
    }, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });

    assert(loginRes.status === 200, "POST /api/auth/login with identical credentials returns HTTP 200 OK");
    assert(loginRes.data.user && loginRes.data.user.email === testUser.email.toLowerCase(), "Login returns correct user profile");
    assert(loginRes.data.user.passwordHash === undefined, "Login response does NOT expose passwordHash");
    assert(typeof loginRes.data.token === "string", "Login returns new JWT token");

    const loginCookie = parseCookie(loginRes.headers["set-cookie"]);
    assert(loginCookie !== null, "Login response sets session cookie promptothon_token");
    if (loginCookie) {
      assert(loginCookie.isHttpOnly === true, "Login cookie has HttpOnly flag");
      assert(loginCookie.sameSite && loginCookie.sameSite.toLowerCase() === "lax", "Login cookie has SameSite=Lax");
      loggedInCookieHeader = `promptothon_token=${loginCookie.value}`;
    }

    // Access protected endpoint with new login session
    const mePostLoginRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: getClientHeaders({ Cookie: loggedInCookieHeader }),
      validateStatus: () => true,
    });
    assert(mePostLoginRes.status === 200, "GET /api/auth/me succeeds with new post-login cookie session");
    assert(mePostLoginRes.data.user.id === dbUser.id, "Authenticated user ID matches original PostgreSQL user ID");

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Wrong Password & Invalid Credential Rejection
    // -------------------------------------------------------------------------
    console.log("\n[Section 6] Wrong Password & Invalid Credential Rejection");
    const wrongPassRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: "WrongPassword999!",
    }, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });
    assert(wrongPassRes.status === 401, "POST /api/auth/login with wrong password returns HTTP 401 Unauthorized", `status=${wrongPassRes.status}`);
    assert(
      (wrongPassRes.data.error || wrongPassRes.data.message)?.toLowerCase().includes("invalid"),
      "Error message states Invalid email or password",
      JSON.stringify(wrongPassRes.data)
    );

    const unknownEmailRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: "nonexistent_random_user_99999@test.com",
      password: "SomePassword123!",
    }, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });
    assert(unknownEmailRes.status === 401, "POST /api/auth/login with non-existent email returns HTTP 401 Unauthorized");

    // -------------------------------------------------------------------------
    // TEST SECTION 7: Adversarial Stress Probes
    // -------------------------------------------------------------------------
    console.log("\n[Section 7] Adversarial Stress Probes");

    // 7.1 Duplicate email registration
    const dupRes = await axios.post(`${BASE_URL}/api/auth/register`, testUser, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });
    assert(dupRes.status === 409, "POST /api/auth/register with duplicate email returns HTTP 409 Conflict", `status=${dupRes.status}`);

    // 7.2 Short password (< 8 chars)
    const shortPassRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: "Short Pass User",
      email: `short_${timestamp}@test.com`,
      password: "Short1!", // 7 chars
      intent: "solo",
    }, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });
    assert(shortPassRes.status === 422, "POST /api/auth/register with password < 8 chars returns HTTP 422 Unprocessable Entity", `status=${shortPassRes.status}`);

    // 7.3 Malformed email address
    const badEmailRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: "Bad Email User",
      email: "not-a-valid-email",
      password: "ValidPassword123!",
      intent: "solo",
    }, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });
    assert(badEmailRes.status === 422, "POST /api/auth/register with invalid email returns HTTP 422", `status=${badEmailRes.status}`);

    // 7.4 Email normalization on login (Uppercase / Mixed case)
    const upperEmailRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email.toUpperCase(),
      password: testUser.password,
    }, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });
    assert(upperEmailRes.status === 200, "POST /api/auth/login with uppercase email normalizes and returns HTTP 200", `status=${upperEmailRes.status}`);

    // 7.5 Tampered / Invalid JWT
    const tamperedRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: getClientHeaders({ Cookie: "promptothon_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature" }),
      validateStatus: () => true,
    });
    assert(tamperedRes.status === 401, "GET /api/auth/me with tampered JWT token returns HTTP 401 Unauthorized");

    // 7.6 Missing token / No auth
    const noAuthRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: getClientHeaders(),
      validateStatus: () => true,
    });
    assert(noAuthRes.status === 401, "GET /api/auth/me with no token returns HTTP 401 Unauthorized");

    // 7.7 Database Audit Logs Verification
    console.log("  Inspecting PostgreSQL AuditLog entries...");
    const auditLogs = await prisma.auditLog.findMany({
      where: { actorId: dbUser.id },
      orderBy: { createdAt: "asc" },
    });
    const actions = auditLogs.map(l => l.action);
    assert(actions.includes("USER_REGISTERED"), "AuditLog records USER_REGISTERED event in PostgreSQL");
    assert(actions.includes("USER_LOGIN"), "AuditLog records USER_LOGIN event in PostgreSQL");

  } catch (err) {
    console.error("Unexpected error during empirical verification:", err);
    assert(false, "Execution threw unexpected exception", err.message);
  } finally {
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  if (failedTests === 0) {
    console.log("FINAL EMPIRICAL VERDICT: \x1b[32mAPPROVE\x1b[0m (100% of checks passed)");
  } else {
    console.log("FINAL EMPIRICAL VERDICT: \x1b[31mFAIL\x1b[0m");
    console.log("Failures:", failures);
  }
  console.log("================================================================================\n");

  process.exit(failedTests === 0 ? 0 : 1);
}

runEmpiricalVerification();
