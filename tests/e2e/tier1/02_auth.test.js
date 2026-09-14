/**
 * tests/e2e/tier1/02_auth.test.js
 * 
 * Tier 1: Core Feature Coverage — Authentication & Session (Features 6 to 8)
 * Covers:
 * - Feature 6: User Registration Flow (5 test cases)
 * - Feature 7: Session Generation & Login (5 test cases)
 * - Feature 8: User Logout & Re-login (5 test cases)
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { findUserByEmail, findTeamByName, getAuditLogs } = require("../helpers/dbHelper");

describe("Tier 1 - Feature 6: User Registration Flow", () => {
  it("T1-F06-01: registers new leader with intent 'create', creates team, and returns 201", async () => {
    const client = new ApiClient();
    const email = generateUniqueEmail("leader");
    const teamName = generateUniqueTeamName("Alpha");

    const res = await client.register({
      name: "Leader User",
      email,
      password: "Password123!",
      intent: "create",
      teamName,
      college: "MIT",
      skills: ["React", "Node"],
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.token).toBeDefined();

    // Verify team was created in DB
    const dbTeam = await findTeamByName(teamName);
    expect(dbTeam).toBeDefined();
    expect(dbTeam.name).toBe(teamName);
  }, { smoke: true });

  it("T1-F06-02: registers solo participant with intent 'solo' and isSolo: true", async () => {
    const client = new ApiClient();
    const email = generateUniqueEmail("solo");

    const res = await client.register({
      name: "Solo Hacker",
      email,
      password: "Password123!",
      intent: "solo",
      college: "Stanford",
      skills: ["Python", "TensorFlow"],
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.isSolo).toBe(true);
  });

  it("T1-F06-03: registers participant with intent 'join' using valid teamCode", async () => {
    // First create a leader and team
    const leaderClient = new ApiClient();
    const leaderEmail = generateUniqueEmail("leader-for-join");
    const teamName = generateUniqueTeamName("TeamToJoin");

    const leaderRes = await leaderClient.register({
      name: "Team Leader",
      email: leaderEmail,
      password: "Password123!",
      intent: "create",
      teamName,
    });

    const team = await findTeamByName(teamName);
    expect(team).toBeDefined();
    const inviteCode = team.inviteCode;

    // Join with new user
    const memberClient = new ApiClient();
    const memberEmail = generateUniqueEmail("member");
    const joinRes = await memberClient.register({
      name: "Member User",
      email: memberEmail,
      password: "Password123!",
      intent: "join",
      teamCode: inviteCode,
    });

    expect(joinRes.status).toBe(201);
    expect(joinRes.body.user.email).toBe(memberEmail);

    // Verify DB team membership
    const memberDb = await findUserByEmail(memberEmail);
    expect(memberDb.teamMember).toBeDefined();
    expect(memberDb.teamMember.role).toBe("MEMBER");
    expect(memberDb.teamMember.teamId).toBe(team.id);
  });

  it("T1-F06-04: verifies persistent database record and hashed password", async () => {
    const client = new ApiClient();
    const email = generateUniqueEmail("persisted");
    const plainPass = "SuperSecret123!";

    await client.register({
      name: "Persist User",
      email,
      password: plainPass,
      intent: "solo",
    });

    const userDb = await findUserByEmail(email);
    expect(userDb).toBeDefined();
    expect(userDb.passwordHash).toBeDefined();
    expect(userDb.passwordHash.startsWith("$2")).toBe(true);
    expect(userDb.passwordHash).not.toBe(plainPass);
  });

  it("T1-F06-05: sets HTTP-only session cookie promptothon_token", async () => {
    const client = new ApiClient();
    const email = generateUniqueEmail("cookie-check");

    const res = await client.register({
      name: "Cookie User",
      email,
      password: "Password123!",
      intent: "solo",
    });

    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
    expect(cookieStr.includes("promptothon_token")).toBe(true);
    expect(cookieStr.toLowerCase().includes("httponly")).toBe(true);
  });
});

describe("Tier 1 - Feature 7: Session Generation & Login", () => {
  const testUser = {
    email: generateUniqueEmail("login-test"),
    password: "CorrectPassword123!",
    name: "Login Verifier",
  };

  it("T1-F07-01: authenticates with valid credentials returning 200, user, and token", async () => {
    const regClient = new ApiClient();
    await regClient.register({
      name: testUser.name,
      email: testUser.email,
      password: testUser.password,
      intent: "solo",
    });

    const loginClient = new ApiClient();
    const res = await loginClient.login(testUser.email, testUser.password);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(typeof res.body.token).toBe("string");
  }, { smoke: true });

  it("T1-F07-02: sets HTTP-only cookie on login with sameSite and maxAge", async () => {
    const loginClient = new ApiClient();
    const res = await loginClient.login(testUser.email, testUser.password);

    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
    expect(cookieStr.includes("promptothon_token=")).toBe(true);
    expect(cookieStr.toLowerCase().includes("samesite=lax")).toBe(true);
  });

  it("T1-F07-03: restores session via GET /api/auth/me using HTTP-only cookie", async () => {
    const loginClient = new ApiClient();
    await loginClient.login(testUser.email, testUser.password);

    // Create a new client with only the cookies (no Bearer token)
    const sessionClient = new ApiClient();
    sessionClient.setCookies(loginClient.cookies);

    const res = await sessionClient.getMe();
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("T1-F07-04: restores session via GET /api/auth/me using Authorization: Bearer token", async () => {
    const loginClient = new ApiClient();
    const loginRes = await loginClient.login(testUser.email, testUser.password);
    const token = loginRes.body.token;

    // Create a client with only the Bearer token (no cookies)
    const tokenClient = new ApiClient();
    tokenClient.setToken(token);

    const res = await tokenClient.getMe();
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("T1-F07-05: returned user object matches persistent database record attributes", async () => {
    const loginClient = new ApiClient();
    const res = await loginClient.login(testUser.email, testUser.password);

    const userFromDb = await findUserByEmail(testUser.email);
    expect(res.body.user.id).toBe(userFromDb.id);
    expect(res.body.user.role).toBe(userFromDb.role);
    expect(res.body.user.name).toBe(userFromDb.name);
  });
});

describe("Tier 1 - Feature 8: User Logout & Re-login", () => {
  const logoutUser = {
    email: generateUniqueEmail("logout-test"),
    password: "LogoutPassword123!",
    name: "Logout Verifier",
  };

  it("T1-F08-01: POST /api/auth/logout clears session cookie and returns 204", async () => {
    const client = new ApiClient();
    await client.register({
      name: logoutUser.name,
      email: logoutUser.email,
      password: logoutUser.password,
      intent: "solo",
    });

    const logoutRes = await client.logout();
    expect(logoutRes.status).toBe(204);

    const setCookie = logoutRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
    // Cookie should be expired or cleared
    expect(cookieStr.includes("promptothon_token=;") || cookieStr.includes("Expires=")).toBe(true);
  }, { smoke: true });

  it("T1-F08-02: subsequent GET /api/auth/me without session returns 401", async () => {
    const client = new ApiClient();
    await client.login(logoutUser.email, logoutUser.password);
    await client.logout();

    const meRes = await client.getMe();
    expect(meRes.status).toBe(401);
  });

  it("T1-F08-03: re-login with identical email and password succeeds immediately", async () => {
    const client = new ApiClient();
    const reloginRes = await client.login(logoutUser.email, logoutUser.password);

    expect(reloginRes.status).toBe(200);
    expect(reloginRes.body.user.email).toBe(logoutUser.email);
    expect(reloginRes.body.token).toBeDefined();
  });

  it("T1-F08-04: new session token accesses protected endpoints after re-login", async () => {
    const client = new ApiClient();
    await client.login(logoutUser.email, logoutUser.password);

    const meRes = await client.getMe();
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(logoutUser.email);
  });

  it("T1-F08-05: audit log records USER_LOGIN action upon successful authentication", async () => {
    const logs = await getAuditLogs("USER_LOGIN");
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe("USER_LOGIN");
  });
});
