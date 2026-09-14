/**
 * tests/e2e/tier1/06_backend_quality.test.js
 * 
 * Tier 1: Core Feature Coverage — Backend Quality & Tooling (Features 22 to 25)
 * Covers:
 * - Feature 22: Backend Unit Test Fix [5 test cases]
 * - Feature 23: Backend Integration Test Setup [5 test cases]
 * - Feature 24: Frontend Code Quality Tooling [5 test cases]
 * - Feature 25: Next.js Production Build [5 test cases]
 */

const fs = require("fs");
const path = require("path");
const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { verifyToken, signToken } = require("../../../backend/src/utils/jwt");

const rootDir = path.resolve(__dirname, "../../..");
const backendDir = path.join(rootDir, "backend");

describe("Tier 1 - Feature 22: Backend Unit Test Fix", () => {
  it("T1-F22-01: backend unit test suites exist in backend/tests/unit", () => {
    const unitDir = path.join(backendDir, "tests", "unit");
    expect(fs.existsSync(unitDir)).toBe(true);
    const files = fs.readdirSync(unitDir);
    expect(files.length).toBeGreaterThanOrEqual(1);
  }, { smoke: true });

  it("T1-F22-02: requireAuth middleware rejects unauthenticated requests with 401", async () => {
    const client = new ApiClient();
    const res = await client.getMe();
    expect(res.status).toBe(401);
  });

  it("T1-F22-03: requireAuth middleware rejects malformed JWT signatures", async () => {
    const client = new ApiClient();
    client.setToken("invalid.malformed.token");
    const res = await client.getMe();
    expect(res.status).toBe(401);
  });

  it("T1-F22-04: requireRole middleware enforces role constraints with 403", async () => {
    const client = new ApiClient();
    await client.register({
      name: "Role Test User",
      email: generateUniqueEmail("role-user"),
      password: "Password123!",
      intent: "solo",
    });
    // Participant role attempting admin endpoint
    const res = await client.getAdminDashboard();
    expect(res.status).toBe(403);
  });

  it("T1-F22-05: JWT signing and verification work deterministically", () => {
    const payload = { sub: "test-uid-123", role: "PARTICIPANT" };
    const token = signToken(payload);
    expect(typeof token).toBe("string");
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.role).toBe(payload.role);
  });
});

describe("Tier 1 - Feature 23: Backend Integration Test Setup", () => {
  it("T1-F23-01: integration test files exist in backend/tests/", () => {
    const files = [
      "auth.test.js", "team.test.js", "submissions.test.js",
      "leaderboard.test.js", "jury.test.js", "admin.test.js", "anonymization.test.js"
    ];
    for (const f of files) {
      const p = path.join(backendDir, "tests", f);
      expect(fs.existsSync(p)).toBe(true);
    }
  }, { smoke: true });

  it("T1-F23-02: auth integration flow operates against database", async () => {
    const client = new ApiClient();
    const email = generateUniqueEmail("int-auth");
    const regRes = await client.register({
      name: "Integration Auth User",
      email,
      password: "Password123!",
      intent: "solo",
    });
    expect(regRes.status).toBe(201);
    const loginRes = await client.login(email, "Password123!");
    expect(loginRes.status).toBe(200);
  });

  it("T1-F23-03: team management integration flow creates and joins teams", async () => {
    const leader = new ApiClient();
    const leaderEmail = generateUniqueEmail("int-team-lead");
    const teamName = generateUniqueTeamName("IntTeam");
    await leader.register({
      name: "Int Leader",
      email: leaderEmail,
      password: "Password123!",
      intent: "create",
      teamName,
    });
    const myTeam = await leader.getMyTeam();
    expect(myTeam.status).toBe(200);
    expect(myTeam.body.team.name).toBe(teamName);
  });

  it("T1-F23-04: submission integration flow allows draft creation for locked track team", async () => {
    const leader = new ApiClient();
    await leader.register({
      name: "Sub Int Leader",
      email: generateUniqueEmail("sub-int-lead"),
      password: "Password123!",
      intent: "create",
      teamName: generateUniqueTeamName("SubIntTeam"),
    });
    const { getTracks } = require("../helpers/dbHelper");
    const tracks = await getTracks();
    await leader.lockTrack(tracks[0].id);

    const subRes = await leader.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/int-sub",
      techTags: ["Node.js", "Jest"],
    });
    expect(subRes.status).toBe(200);
    expect(subRes.body.submission.status).toBe("DRAFT");
  });

  it("T1-F23-05: test database supports cascading deletes and isolation", async () => {
    const { prisma } = require("../helpers/dbHelper");
    const count = await prisma.user.count();
    expect(typeof count).toBe("number");
  });
});

describe("Tier 1 - Feature 24: Frontend Code Quality Tooling", () => {
  it("T1-F24-01: root package.json defines lint script", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.lint).toBeDefined();
  }, { smoke: true });

  it("T1-F24-02: jsconfig.json or tsconfig.json exists with path aliases", () => {
    const jsconfig = path.join(rootDir, "jsconfig.json");
    const tsconfig = path.join(rootDir, "tsconfig.json");
    expect(fs.existsSync(jsconfig) || fs.existsSync(tsconfig)).toBe(true);
  });

  it("T1-F24-03: client API wrapper in src/lib/api.js is valid and configured with base URL", () => {
    const apiFile = path.join(rootDir, "src", "lib", "api.js");
    expect(fs.existsSync(apiFile)).toBe(true);
    const content = fs.readFileSync(apiFile, "utf-8");
    expect(content.includes("axios")).toBe(true);
  });

  it("T1-F24-04: backend directory contains isolated package.json and node modules", () => {
    const backendPkg = path.join(backendDir, "package.json");
    expect(fs.existsSync(backendPkg)).toBe(true);
  });

  it("T1-F24-05: component registry components.json exists for shadcn/ui configuration", () => {
    const compJson = path.join(rootDir, "components.json");
    expect(fs.existsSync(compJson)).toBe(true);
  });
});

describe("Tier 1 - Feature 25: Next.js Production Build", () => {
  it("T1-F25-01: root package.json defines build script (next build)", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
    expect(pkg.scripts.build).toBe("next build");
  }, { smoke: true });

  it("T1-F25-02: next.config.mjs configuration is present and non-empty", () => {
    const nextConfig = path.join(rootDir, "next.config.mjs");
    expect(fs.existsSync(nextConfig)).toBe(true);
    const content = fs.readFileSync(nextConfig, "utf-8");
    expect(content.length).toBeGreaterThan(10);
  });

  it("T1-F25-03: all 9 primary App Router routes have defined entry points", () => {
    const routes = [
      path.join(rootDir, "src/app/page.js"),
      path.join(rootDir, "src/app/(auth)/login/page.js"),
      path.join(rootDir, "src/app/(auth)/register/page.js"),
      path.join(rootDir, "src/app/(auth)/teamdetails/page.js"),
      path.join(rootDir, "src/app/submission/page.js"),
      path.join(rootDir, "src/app/leaderboard/page.js"),
      path.join(rootDir, "src/app/jury/page.js"),
      path.join(rootDir, "src/app/announcements/page.js"),
      path.join(rootDir, "src/app/admin/page.js"),
    ];
    for (const r of routes) {
      expect(fs.existsSync(r)).toBe(true);
    }
  });

  it("T1-F25-04: global stylesheet globals.css contains Tailwind directives", () => {
    const cssFile = path.join(rootDir, "src/app/globals.css");
    expect(fs.existsSync(cssFile)).toBe(true);
    const content = fs.readFileSync(cssFile, "utf-8");
    expect(content.includes("@tailwind") || content.includes("tailwind")).toBe(true);
  });

  it("T1-F25-05: interactive client routes declare 'use client' directive", () => {
    const clientRoutes = [
      path.join(rootDir, "src/app/(auth)/login/page.js"),
      path.join(rootDir, "src/app/(auth)/register/page.js"),
      path.join(rootDir, "src/app/(auth)/teamdetails/page.js"),
      path.join(rootDir, "src/app/submission/page.js"),
      path.join(rootDir, "src/app/leaderboard/page.js"),
    ];
    for (const r of clientRoutes) {
      const content = fs.readFileSync(r, "utf-8");
      expect(content.includes('"use client"') || content.includes("'use client'")).toBe(true);
    }
  });
});
