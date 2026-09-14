# Investigation Report: Backend Testing, Offline Prisma Mocking & Middleware Verification

**Agent**: Survey Explorer 2 (`teamwork_preview_explorer`)  
**Working Directory**: `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_2`  
**Target Codebase**: `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend`  
**Date**: 2026-09-14T00:47:30+05:30  

---

## 1. Observation

### 1.1 Package.json, Dependencies, and Runtime Environment
* **Module System**: Plain CommonJS (`package.json:6`: `"type": "commonjs"`, `"main": "src/server.js"`).
* **Node & npm versions**: Node `v22.18.0`, npm `11.6.2` (satisfies `"engines": { "node": ">=18" }`).
* **Test Dependencies**:
  * `jest`: `^29.7.0` (devDependencies line 38)
  * `supertest`: `^7.0.0` (devDependencies line 39)
  * `prisma`: `^5.20.0` (devDependencies line 37)
  * `@prisma/client`: `^5.20.0` (dependencies line 18)
  * `nodemon`: `^3.1.7` (devDependencies line 36)
  * **Missing / Not Present**: `ts-jest` and `jest-mock-extended` are **not installed**. Because this project is pure CommonJS JavaScript (no `tsconfig.json` or TypeScript compiler), `ts-jest` is not needed.
* **Current Scripts** (`package.json:7-16`):
  ```json
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio",
    "seed": "node prisma/seed.js",
    "test": "jest --runInBand"
  }
  ```
* **Node Modules**: `node_modules` directory does not yet exist. Clean installation via `npm install` is required before running tests or client generation.

### 1.2 Jest & Test Environment Configuration
* **`jest.config.js`** (`jest.config.js:1-10`):
  ```javascript
  module.exports = {
    testEnvironment: "node",
    setupFiles: ["<rootDir>/tests/env.js"],
    testTimeout: 20000,
    testPathIgnorePatterns: ["/node_modules/"],
  };
  ```
* **`tests/env.js`** (`tests/env.js:1-12`):
  ```javascript
  const fs = require("fs");
  const path = require("path");
  const dotenv = require("dotenv");

  const testEnvPath = path.resolve(__dirname, "..", ".env.test");
  dotenv.config({ path: fs.existsSync(testEnvPath) ? testEnvPath : path.resolve(__dirname, "..", ".env") });

  process.env.NODE_ENV = "test";
  ```
  * **Critical Observation**: Neither `.env` nor `.env.test` currently exists in the backend directory.
  * If `.env.test` is missing, `process.env.JWT_SECRET` is `undefined`.
  * In `src/utils/jwt.js:4` (`jwt.sign(payload, process.env.JWT_SECRET)`), calling `signToken` throws `Error: secretOrPrivateKey must have a value`.
  * `tests/env.js` does not currently provide fallback defaults for `JWT_SECRET` or `DATABASE_URL`.

### 1.3 Existing Test Files Analysis
* The `tests/` directory contains 9 files:
  1. `env.js` (Jest setup file)
  2. `helpers.js` (Test utilities and database helpers)
  3. `admin.test.js` (Admin freeze scores toggle, audit log query, 403 on non-admin)
  4. `anonymization.test.js` (Jury masking on public leaderboard, independent per-team aliases, admin visibility)
  5. `auth.test.js` (Solo registration, create-team registration, join-team registration, password validation, protected routes)
  6. `jury.test.js` (Unassigned rejection, draft evaluation, score range 0-25 validation, lock immutability, jury queue scoping, self-evaluation prevention)
  7. `leaderboard.test.js` (Locked evaluation filtering, ranking by average score, tie handling, score freeze response)
  8. `submissions.test.js` (GitHub URL validation, non-leader rejection, submission finalization immutability, track lock check, deadline check)
  9. `team.test.js` (Capacity limits, invalid invite code, duplicate team membership, solo join, track lock permissions)
* **Coupling to Live PostgreSQL**:
  * In `tests/helpers.js:46-55`:
    ```javascript
    async function truncateAll() {
      await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE
          "AuditLog", "Evaluation", "JuryAssignment", "Submission",
          "TeamMember", "Team", "Track", "SystemSetting", "User",
          "Announcement", "Notification", "Connection", "MagicLinkToken"
        RESTART IDENTITY CASCADE;
      `);
    }
    ```
  * Every one of the 7 test files (`auth.test.js`, `team.test.js`, `jury.test.js`, etc.) executes:
    ```javascript
    afterEach(async () => truncateAll());
    afterAll(async () => prisma.$disconnect());
    ```
  * All 7 test files are full end-to-end integration suites expecting a live PostgreSQL database. Running `npm test` without an active database fails immediately with connection errors.

### 1.4 Prisma Schema & Client Generation Offline Capability
* **Schema Location**: `prisma/schema.prisma` (348 lines, 13 models, 6 enums).
* **Generator & Datasource**:
  ```prisma
  generator client {
    provider = "prisma-client-js"
  }
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```
* **Offline Execution**: `npx prisma generate` only parses `prisma/schema.prisma` and writes generated JavaScript client bindings into `node_modules/@prisma/client`. It performs **zero network calls** and does not require an active database server. As long as `DATABASE_URL` is set to any dummy string (e.g. `postgresql://mock:mock@localhost:5432/mockdb`), schema parsing succeeds 100% offline.

### 1.5 Prisma Import Pattern & Codebase Singleton
* **Singleton Definition**: `src/config/prisma.js`:
  ```javascript
  const { PrismaClient } = require("@prisma/client");
  const globalForPrisma = globalThis;
  const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
  module.exports = prisma;
  ```
* **Grep Evidence**: Exactly 16 files across `src/` import `prisma` exclusively from `src/config/prisma`:
  * `src/app.js`
  * `src/middleware/auth.js`
  * `src/sockets/index.js`
  * `src/utils/auditLog.js`
  * `src/utils/notify.js`
  * `src/utils/settings.js`
  * `src/modules/admin/admin.controller.js`
  * `src/modules/announcements/announcements.controller.js`
  * `src/modules/auth/auth.controller.js`
  * `src/modules/jury/jury.service.js`
  * `src/modules/leaderboard/leaderboard.service.js`
  * `src/modules/networking/networking.controller.js`
  * `src/modules/notifications/notifications.controller.js`
  * `src/modules/profile/profile.controller.js`
  * `src/modules/submissions/submissions.controller.js`
  * `src/modules/tracks/tracks.controller.js`
* **Zero direct `new PrismaClient()` calls** exist in controllers or services. Mocking `src/config/prisma.js` (or `@prisma/client`) completely intercepts all database operations throughout the entire application.

### 1.6 Health Probe (`GET /health`) Analysis
* **Implementation** (`src/app.js:48-64`):
  ```javascript
  app.get("/health", async (req, res) => {
    let database = { connected: false };
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = { connected: true };
    } catch (err) {
      database = { connected: false, error: "unreachable" };
    }

    res.json({
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      database,
      storage: getStorageStatus(),
      redis: { configured: Boolean(process.env.REDIS_URL) },
    });
  });
  ```
* **Characteristics**:
  * Probes database liveness with `prisma.$queryRaw`SELECT 1``.
  * **Never crashes on DB failure**: If the database is unreachable, it catches the error and returns `{ ok: true, database: { connected: false, error: "unreachable" }, ... }` with HTTP status `200`.
  * Probes storage driver status via `getStorageStatus()` from `src/utils/storage.js`. Default is `{ provider: "disabled", configured: false }`.
  * Probes redis status: `{ configured: Boolean(process.env.REDIS_URL) }`.
  * Exposes uptime without leaking secrets or credentials.

### 1.7 Core Middlewares Analysis
1. **JWT Authentication (`src/middleware/auth.js:10-35`)**:
   * Reads token from cookie (`req.cookies[COOKIE_NAME]`, default `promptothon_token`) or `Authorization: Bearer <token>`.
   * Rejects missing token with 401 (`"Authentication required."`).
   * Verifies token with `verifyToken(token)` via `jsonwebtoken.verify(token, process.env.JWT_SECRET)`.
   * Checks database: `await prisma.user.findUnique({ where: { id: payload.sub } })`. Rejects non-existent user with 401 (`"Session is no longer valid."`).
   * Sets `req.user = user` and calls `next()`.
2. **Role Authorization (`src/middleware/auth.js:41-51`)**:
   * `requireRole(...roles)` ensures `req.user` exists (or returns 401).
   * Checks `roles.includes(req.user.role)`. If user lacks required role, returns 403 (`"You do not have access to this resource."`).
3. **Optional Authentication (`src/middleware/auth.js:54-70`)**:
   * Inspects cookie / bearer header. If valid, attaches `req.user`. If absent or invalid, silently continues (`next()`).
4. **Zod Validation & Error Handling (`src/middleware/errorHandler.js`)**:
   * Catches `ZodError` -> returns HTTP 422 with `{ error: "Validation failed.", details: err.flatten() }`.
   * Catches `ApiError` -> returns `err.statusCode` with `{ error: err.message, details? }`.
   * Catches Prisma `P2002` (unique constraint) -> returns HTTP 409 with `{ error: "A record with this ... already exists." }`.
   * Fallback -> returns HTTP 500 with `{ error: "Something went wrong on our end." }`.
5. **Not Found Handler (`src/middleware/errorHandler.js:4-6`)**:
   * Any unmatched route returns HTTP 404 with `{ error: "Route not found." }`.
6. **Rate Limiting (`src/middleware/rateLimiter.js`)**:
   * In-memory limiters (`express-rate-limit`):
     * `generalLimiter`: 300 requests per 15 minutes (mounted globally on `app`).
     * `authLimiter`: 20 requests per 15 minutes (mounted on `/api/auth/register`, `/api/auth/login`).
     * `juryLimiter`: 60 requests per 5 minutes.
     * `adminLimiter`: 100 requests per 15 minutes.

---

## 2. Logic Chain

1. **Premise 1**: The backend codebase uses CommonJS without TypeScript compilation (`package.json:6`). All database queries are routed through the singleton `src/config/prisma.js`.
2. **Premise 2**: `npx prisma generate` generates `@prisma/client` artifacts locally inside `node_modules` without reaching out to any remote server or live database.
3. **Premise 3**: The existing test suite in `tests/` consists of 7 integration files coupled to a live PostgreSQL instance via `truncateAll()` (`prisma.$executeRawUnsafe`) and stateful database writes. Running `npm test` without Postgres results in immediate test failures across all 7 suites.
4. **Premise 4**: `tests/env.js` lacks fallback environment variables. When `.env.test` is absent, `JWT_SECRET` is `undefined`, crashing JWT operations (`jwt.sign`, `jwt.verify`).
5. **Inference 1**: `jest-mock-extended` is unneeded and sub-optimal because it is designed for TypeScript interface introspection (`mockDeep<PrismaClient>()`). In a pure CommonJS JavaScript project, a manual Jest mock (`tests/mocks/prisma.js` or `src/config/__mocks__/prisma.js`) is zero-dependency, 100% reliable, and directly controls all 13 Prisma models and top-level methods.
6. **Inference 2**: Testing requirements for R2 (operational health, `/health` probe, core middlewares, error handling, and business logic) can be fully validated offline by:
   * Providing an offline environment file (`.env.test`) with default secrets.
   * Implementing a manual Prisma mock that emulates model operations (`findUnique`, `findMany`, `create`, `update`, `upsert`, `$queryRaw`, `$transaction`).
   * Creating dedicated unit/route tests verifying:
     - `GET /health` with healthy DB (`database.connected: true`) and unreachable DB (`database.connected: false, error: "unreachable"`).
     - JWT auth middleware (`requireAuth`, `requireRole`, `optionalAuth`).
     - Zod schema validation (422 response) and global error handling (404, 409, 500).
     - Core route handling via Supertest without binding to a network port.

---

## 3. Caveats

1. **Stateful Integration vs. Stateless Unit Mocking**:
   The existing 7 test files in `tests/` (`auth.test.js`, `team.test.js`, `jury.test.js`, `submissions.test.js`, `leaderboard.test.js`, `admin.test.js`, `anonymization.test.js`) are integration tests designed to verify end-to-end multi-entity state mutations against real PostgreSQL (e.g. registering a user, creating a team, having members join, locking tracks, submitting pitch decks, locking jury scores, and querying the computed leaderboard).
   * If `npm test` is run against these existing 7 suites with a simple static mock, multi-step dependencies will fail because static mocks do not maintain relational foreign keys or state across successive HTTP calls.
   * **Recommendation**: Separate the test runner into:
     - **Offline Unit & Middleware Suite** (`npm run test:offline` or default `npm test`): runs offline unit tests for `/health`, middlewares, validations, and controller logic with mocked Prisma.
     - **Integration Suite** (`npm run test:integration`): runs against live PostgreSQL when `DATABASE_URL` points to a real test DB.
2. **Rate Limiting State in Memory**:
   `express-rate-limit` stores hit counts in memory within the active Node process. Because `npm test` runs with `--runInBand`, high volumes of requests to the same endpoint across multiple tests could trigger 429 status codes unless mocked or reset between test suites.
3. **Prisma Engine Binary**:
   `npx prisma generate` requires the Prisma engine binary, which is installed into `node_modules/@prisma/engines` during `npm install`. Therefore, `npm install` must be run once before `npx prisma generate` can execute.

---

## 4. Conclusion

The Express/Prisma backend is clean, modern, zero-Firebase, and well-structured around a clean singleton pattern (`src/config/prisma.js`). However:
1. It currently lacks installed `node_modules`, `.env.test`, and `.env`.
2. All 7 existing test files in `tests/` are PostgreSQL integration tests that fail without a live database.
3. `tests/env.js` must be hardened with default fallbacks for `JWT_SECRET` and `DATABASE_URL`.
4. A clean offline testing architecture is achievable without external mocking libraries by:
   - Creating a manual Prisma mock object (`tests/mocks/prisma.js`).
   - Implementing comprehensive offline unit tests covering `/health`, `requireAuth`, `requireRole`, `errorHandler`, Zod schemas, and core controller logic.
   - Enabling both offline testing (`npm test`) and live integration testing (`npm run test:integration`).

---

## 5. Concrete Execution & Mocking Plan

### Step 1: Environment & Dependency Installation
1. Run `npm install` to install dependencies.
2. Create `.env.test` at `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.env.test`:
   ```env
   NODE_ENV=test
   PORT=4001
   CLIENT_ORIGIN=http://localhost:3000
   DATABASE_URL="postgresql://mock:mock@localhost:5432/mockdb"
   DIRECT_URL="postgresql://mock:mock@localhost:5432/mockdb"
   JWT_SECRET="test-jwt-secret-key-min-32-characters-long-offline"
   JWT_EXPIRES_IN="7d"
   COOKIE_NAME="promptothon_token"
   JURY_ALIAS_SALT="test-jury-alias-salt-offline"
   STORAGE_PROVIDER="disabled"
   GITHUB_API_VERIFICATION="disabled"
   EMAIL_PROVIDER="console"
   ```
3. Update `tests/env.js` to ensure fallback safety:
   ```javascript
   if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-jwt-secret-key-min-32-characters-long-offline";
   if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mockdb";
   ```
4. Run `npx prisma generate` to create `@prisma/client` bindings locally.

### Step 2: Prisma Mock Module (`tests/mocks/prisma.js`)
Create a manual mock object covering all models and methods:
```javascript
function createModelMock() {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
  };
}

const mockPrisma = {
  user: createModelMock(),
  team: createModelMock(),
  teamMember: createModelMock(),
  track: createModelMock(),
  submission: createModelMock(),
  juryAssignment: createModelMock(),
  evaluation: createModelMock(),
  systemSetting: createModelMock(),
  auditLog: createModelMock(),
  announcement: createModelMock(),
  notification: createModelMock(),
  connection: createModelMock(),
  magicLinkToken: createModelMock(),

  $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  $executeRaw: jest.fn().mockResolvedValue(1),
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  $transaction: jest.fn(async (cbOrArray) => {
    if (typeof cbOrArray === "function") return cbOrArray(mockPrisma);
    return Promise.all(cbOrArray);
  }),
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

module.exports = mockPrisma;
```

### Step 3: Offline Test Suites
Create dedicated offline test files:
1. **`tests/health.test.js`**:
   - Mocks `src/config/prisma`.
   - Tests `GET /health` with `prisma.$queryRaw` resolving `[{ 1: 1 }]` -> expects status 200, `database.connected === true`, `ok === true`.
   - Tests `GET /health` with `prisma.$queryRaw` rejecting with `Error("DB unreachable")` -> expects status 200, `database.connected === false`, `database.error === "unreachable"`, `ok === true`.
   - Verifies `storage.provider === "disabled"` and `redis.configured === false`.
2. **`tests/middlewares.test.js`**:
   - Tests `requireAuth`:
     - Missing token -> 401 `"Authentication required."`
     - Invalid JWT -> 401 `"Invalid or expired session."`
     - Valid JWT but user not found in DB (`prisma.user.findUnique` returns null) -> 401 `"Session is no longer valid."`
     - Valid JWT and user found -> sets `req.user`, passes to next handler.
   - Tests `requireRole`:
     - Missing `req.user` -> 401.
     - Role mismatch (e.g. user is `PARTICIPANT`, route requires `ADMIN`) -> 403 `"You do not have access to this resource."`.
     - Matching role -> calls `next()`.
   - Tests `errorHandler`:
     - Zod schema violation -> status 422 with validation details.
     - `ApiError(409, "Conflict message")` -> status 409.
     - Prisma `P2002` error -> status 409.
     - Generic `new Error("Unhandled")` -> status 500.
   - Tests `notFoundHandler`:
     - Requesting unknown route `GET /api/unknown-probe` -> status 404 `{ error: "Route not found." }`.
3. **`tests/services.test.js`**:
   - Tests `aliasForEvaluations`: verifies HMAC-based alias generation, ensures raw `juryId` is stripped and sequential `Jury #N` aliases are assigned.
   - Tests `settings.js`: `isScoresFrozen()`, `isBeforeDeadline()`.
   - Tests `jwt.js`: `signToken`, `verifyToken`.

### Step 4: Package.json Scripts Update
Update `package.json` to expose both offline tests and integration tests:
```json
"scripts": {
  "test": "jest --runInBand --testPathPattern=tests/(health|middlewares|services).test.js",
  "test:all": "jest --runInBand",
  "test:integration": "jest --runInBand --testPathPattern=tests/(auth|team|jury|leaderboard|submissions|admin|anonymization).test.js"
}
```

---

## 6. Verification Method

### How to Independently Verify:
1. **Dependency Installation & Prisma Client Generation**:
   ```pwsh
   cd C:\Users\ravit\Downloads\promptothon-backend-final-2\backend
   npm install
   npx prisma generate
   ```
   *Verification criteria*: Output confirms `Generated Prisma Client (v5.20.0) to .\node_modules\@prisma/client in ...ms`.
2. **Offline Health Probe Verification**:
   Execute Supertest against `GET /health` with mocked Prisma:
   ```pwsh
   npx jest tests/health.test.js --runInBand
   ```
   *Verification criteria*: Both DB-connected (status 200, `database.connected: true`) and DB-unreachable (status 200, `database.connected: false`) test cases pass without any live network connection.
3. **Middleware & Validation Verification**:
   ```pwsh
   npx jest tests/middlewares.test.js --runInBand
   ```
   *Verification criteria*: Auth, role guards, Zod 422 formatting, 404, and error handling tests pass 100%.
4. **Invalidation Conditions**:
   * If `JWT_SECRET` is unset in the test environment, tests calling `signToken` will throw `secretOrPrivateKey must have a value`.
   * If `tests/*.test.js` are run without mocking or without a live Postgres DB, `truncateAll()` will throw `Can't reach database server`.
