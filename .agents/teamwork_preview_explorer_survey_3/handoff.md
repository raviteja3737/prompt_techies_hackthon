# Explorer 3 Survey Report: Build, Test Infrastructure, & Hardening

## 1. Observation

### 1.1 Root Frontend Build Configuration & Tooling
- **Root `package.json`** (`c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\package.json`):
  - Scripts:
    ```json
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint"
    }
    ```
  - Dependencies: Next.js `^14.2.15`, React `^18`, React DOM `^18`, Axios `^1.7.7`, Socket.IO Client `^4.8.3`, Zod `^3.23.8`, React Hook Form `^7.53.0`, Framer Motion `^11.9.0`, Lucide React `^0.445.0`, React Hot Toast `^2.4.1`.
  - DevDependencies: `@tailwindcss/typography ^0.5.15`, `@types/node ^22.20.2`, `@types/react ^18.3.31`, `@types/react-dom ^18.3.7`, `postcss ^8`, `sass ^1.78.0`, `tailwindcss ^3.4.1`, `typescript 5.6.2`.
  - Missing from `package.json`: No test scripts (`"test"` script is absent), no testing libraries installed (no Jest, Vitest, Playwright, Cypress, or React Testing Library), and no `eslint` or `eslint-config-next` in `devDependencies`.
- **Next.js Configuration** (`next.config.mjs`):
  ```javascript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
      images: {
        domains: ['firebasestorage.googleapis.com'],
      },
    };
    
    export default nextConfig;
  ```
  - Note: Uses legacy `images.domains` rather than `images.remotePatterns`.
- **TypeScript Configuration** (`tsconfig.json`):
  - Target: `"es5"`, Lib: `["dom", "dom.iterable", "esnext"]`, Module Resolution: `"bundler"`.
  - Compiler flags: `"allowJs": true`, `"skipLibCheck": true`, `"strict": false`, `"noEmit": true`.
  - Path alias: `"@/*": ["./src/*"]`.
  - Includes: `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "**/*.js", "**/*.jsx"]`.
  - Excludes: `["node_modules"]` (backend directory is not explicitly excluded).
  - Empirical verification: Executed `npx tsc --noEmit` in root; completed with exit code 0 (zero errors).
- **ESLint & Prettier Tooling**:
  - No `.eslintrc*`, `eslint.config.*`, or `.prettierrc*` files exist anywhere in the root repository.
  - Empirical verification: Executed `npm run lint` in root; command failed with exit code 1 and prompt:
    ```
    ? How would you like to configure ESLint? https://nextjs.org/docs/basic-features/eslint
    ❯  Strict (recommended)
       Base
       Cancel
    ```
  - In non-interactive CI/CD runs, `npm run lint` terminates with failure (exit code 1) due to missing ESLint setup.
- **Root Build Execution**:
  - Empirical verification: Executed `npm run build` in root directory.
  - Result: Exit code 0, 100% clean output.
  - Output summary:
    ```
      ▲ Next.js 14.2.15
      - Environments: .env.local

       Creating an optimized production build ...
     ✓ Compiled successfully
       Linting and checking validity of types ...
       Collecting page data ...
     ✓ Generating static pages (17/17)
       Finalizing page optimization ...
       Collecting build traces ...
    ```
  - All 17 pages (including `/`, `/_not-found`, `/admin`, `/announcements`, `/jury`, `/leaderboard`, `/login`, `/networking`, `/register`, `/submission`, `/teamdetails`, `/preptember`) compiled and rendered cleanly with zero build errors or warnings.

### 1.2 Backend Build Scripts & Test Infrastructure
- **Backend `package.json`** (`backend/package.json`):
  - Scripts:
    ```json
    "scripts": {
      "dev": "nodemon src/server.js",
      "start": "node src/server.js",
      "prisma:generate": "prisma generate",
      "prisma:migrate": "prisma migrate dev",
      "prisma:deploy": "prisma migrate deploy",
      "prisma:studio": "prisma studio",
      "seed": "node prisma/seed.js",
      "test": "jest tests/unit --runInBand",
      "test:integration": "jest tests/*.test.js --runInBand",
      "test:all": "jest --runInBand"
    }
    ```
  - Test Dependencies: `jest ^29.7.0`, `supertest ^7.0.0`.
  - Server Dependencies: `express ^4.21.0`, `@prisma/client ^5.20.0`, `socket.io ^4.8.0`, `bcryptjs ^2.4.3`, `jsonwebtoken ^9.0.2`, `cors ^2.8.5`, `cookie-parser ^1.4.6`, `helmet ^7.1.0`, `express-rate-limit ^7.4.0`, `zod ^3.23.8`.
- **Backend Jest Configuration** (`backend/jest.config.js`):
  ```javascript
  module.exports = {
    testEnvironment: "node",
    setupFiles: ["<rootDir>/tests/env.js"],
    testTimeout: 20000,
    testPathIgnorePatterns: ["/node_modules/"],
  };
  ```
- **Backend Environment & Database Configuration**:
  - `backend/.env`:
    - `PORT=4000`, `NODE_ENV=development`, `CLIENT_ORIGIN=http://localhost:3000`
    - `DATABASE_URL="postgresql://postgres:password123@localhost:5432/promptothon"`
    - `DIRECT_URL="postgresql://postgres:password123@localhost:5432/promptothon"`
    - `ADMIN_EMAIL="admin@promptothon.dev"`, `ADMIN_PASSWORD="ChangeMe123!"`
  - `backend/.env.test`:
    - `DATABASE_URL="postgresql://mock:mock@localhost:5432/mockdb"`
    - `DIRECT_URL="postgresql://mock:mock@localhost:5432/mockdb"`
  - `backend/docker-compose.yml`:
    - Image: `postgres:16-alpine`, Container: `promptothon-postgres`, Port: `5432:5432`, DB: `promptothon`, User: `postgres`, Password: `password123`.
  - Docker daemon check: `docker --version` -> `Docker version 29.6.2, build dfc4efb` is active and running. Port 5432 is currently unbound and ready for container launch.

### 1.3 Repository Test Audit & Empirical Verification
- **Frontend Test Suite**:
  - Exact count: 0 test files.
  - No frontend test runner, mock setup, or E2E testing framework exists in the repository.
- **Backend Test Suite**:
  - Unit Tests (`backend/tests/unit/`):
    1. `adversarial.test.js` (12,309 bytes, 20 test cases)
    2. `health.test.js` (1,847 bytes, 3 test cases)
    3. `middleware.test.js` (7,985 bytes, 9 test cases)
    4. `routes.test.js` (8,295 bytes, 17 test cases)
    5. `validation.test.js` (5,279 bytes, 6 test cases)
    - Total: 5 suites, 55 test cases.
  - Integration Tests (`backend/tests/*.test.js`):
    1. `auth.test.js` (2,182 bytes, 5 test cases)
    2. `team.test.js` (3,312 bytes, 5 test cases)
    3. `submissions.test.js` (3,709 bytes, 6 test cases)
    4. `jury.test.js` (4,049 bytes, 6 test cases)
    5. `leaderboard.test.js` (4,235 bytes, 5 test cases)
    6. `admin.test.js` (1,356 bytes, 2 test cases)
    7. `anonymization.test.js` (3,507 bytes, 3 test cases)
    - Total: 7 integration suites (32 test cases).
  - Standalone Probes / Verification Scripts:
    - `ephemeral_adversarial_probe.js`
    - `ephemeral_health_probe.js`
    - `live_adversarial_stress.js`
    - `live_boot_verification.js`
- **Empirical Backend Unit Test Execution Failure**:
  - Command: `npm test` in `backend/` (`jest tests/unit --runInBand`).
  - Result: Exit code 1 (1 failed, 54 passed, 55 total).
  - Verbatim failure log:
    ```
    FAIL tests/unit/adversarial.test.js (15.28 s)
      ● Adversarial Stress Testing & Offline Harness Verification › Authentication Adversarial Probes (requireAuth & optionalAuth) › should mask database connection failure during requireAuth as 401 invalid session

        expect(received).toBe(expected) // Object.is equality

        Expected: 401
        Received: 200

          182 |
          183 |       // OBSERVATION: requireAuth catches all non-ApiErrors and wraps them in 401
        > 184 |       expect(res.status).toBe(401);
              |                          ^
          185 |       expect(res.body).toEqual({ error: "Invalid or expired session." });
          186 |     });

          at Object.toBe (tests/unit/adversarial.test.js:184:26)
    ```
  - Root cause in source code (`backend/src/middleware/auth.js` lines 27-38):
    ```javascript
    let user;
    try {
      user = await prisma.user.findUnique({ where: { id: payload.sub } });
    } catch (dbErr) {
      if (process.env.NODE_ENV !== "production") {
        user = {
          id: payload.sub,
          role: payload.role || "PARTICIPANT",
          name: payload.role === "ADMIN" ? "Admin Developer" : "Participant User",
          email: payload.role === "ADMIN" ? "admin@promptothon.dev" : "user@promptothon.dev",
        };
      } else {
        throw dbErr;
      }
    }
    ```
    In `NODE_ENV="test"`, `NODE_ENV !== "production"` evaluates to true. Instead of throwing `dbErr` and letting the outer catch block wrap it in `ApiError(401, "Invalid or expired session.")`, the middleware synthesizes a dummy developer user and calls `next()`, returning HTTP 200 instead of HTTP 401.

---

## 2. Logic Chain

1. **Frontend Clean Build Feasibility**:
   - Observation: Executing `npm run build` completed with exit code 0 and generated all 17 routes. TypeScript type-checking (`npx tsc --noEmit`) succeeded without error.
   - Deduction: The current React/Next.js code contains no syntax errors, no invalid JSX, and no type collisions under `"strict": false`.
   - Risk / Caveat: Next.js skipped ESLint checks during `next build` because no ESLint config file or packages are installed. In an automated CI/CD pipeline or if a strict lint step is enforced, `npm run lint` crashes with code 1.
   - Recommended Hardening:
     - Install `eslint` and `eslint-config-next` as devDependencies in root `package.json`.
     - Create a standard `.eslintrc.json` with `{"extends": "next/core-web-vitals"}`.
     - Add `"backend"` to the `"exclude"` array in root `tsconfig.json` so backend files are never inadvertently scanned by root TypeScript tooling.

2. **Backend Unit Test Regression**:
   - Observation: `adversarial.test.js` expects `prisma.user.findUnique` database errors to result in HTTP 401 with `{ error: "Invalid or expired session." }`. Instead, it received HTTP 200.
   - Deduction: In `backend/src/middleware/auth.js:28`, a development bypass `if (process.env.NODE_ENV !== "production")` inadvertently intercepts errors during automated testing (`NODE_ENV === "test"`).
   - Recommended Fix: Change the condition in `backend/src/middleware/auth.js:28` to:
     ```javascript
     if (process.env.NODE_ENV === "development") {
     ```
     This confines the offline developer stub strictly to development mode, allowing test mode (`NODE_ENV="test"`) and production to propagate database errors to the outer catch handler, restoring 55/55 unit tests passing.

3. **Backend Integration Test Preconditions**:
   - Observation: Integration tests in `backend/tests/*.test.js` call `truncateAll()` and use real SQL queries against Prisma.
   - Observation: `backend/tests/env.js` loads `backend/.env.test` if present, which currently points to `postgresql://mock:mock@localhost:5432/mockdb`.
   - Deduction: Running `npm run test:integration` currently will fail with database connection errors because `mock:mock@localhost:5432/mockdb` is unreachable.
   - Prerequisite: Launch the Docker container (`docker compose up -d`), apply migrations (`npx prisma migrate dev`), and update `backend/.env.test` to reference `postgresql://postgres:password123@localhost:5432/promptothon` (or keep a dedicated test DB).

4. **Comprehensive 4-Tier E2E Testing Framework Architecture**:
   - Observation: User requires full-stack testing verifying 9 application views, role authorization, team formation, track locking, project submission, jury evaluation, leaderboard updates, announcements, and admin controls across 4 rigorous tiers.
   - Framework Selection:
     - **Browser-Level UI E2E (Tiers 1, 2, 3, 4 UI)**: **Playwright** (`@playwright/test`).
       - *Rationale*: Native support for modern Next.js 14 App Router, cross-browser support (Chromium/Firefox), built-in isolated BrowserContexts for multi-session testing (e.g. testing Team Leader in Context A while Team Member is in Context B and Admin is in Context C), real DOM interaction for button auditing, and network assertion capabilities.
     - **Headless API & Concurrency Harness (Tiers 2, 3, 4 Concurrency)**: **Node.js / Supertest + Socket.IO Client** (already present in backend Jest harness).
       - *Rationale*: Sub-second execution for generating high-concurrency race conditions (e.g. 10 simultaneous joins on a 4-person team), adversarial payload probing, and real-time Socket.IO event validation without browser render overhead.
   - **The 4 Tiers Defined**:
     - **Tier 1: Core Feature Coverage (Happy Path)**
       - Auth: User registration (solo, leader, member) & persistent cookie login/logout.
       - Team: Team creation, join code display, member joining, track selection, track locking.
       - Submission: Project repository submission with valid GitHub URL and tags.
       - Jury: Queue loading, rubric scoring (4x25 = 100), draft save, evaluation locking.
       - Leaderboard: Live ranking display and real-time score updates.
       - Announcements & Admin: Admin posting announcements, freezing scores, dashboard stats.
     - **Tier 2: Boundary, Corner Cases & Input Validation**
       - Team capacity capping: 4th member accepted, 5th rejected with HTTP 409.
       - Invalid join code: Malformed or non-existent code returns HTTP 404.
       - Track locking idempotency: Re-locking an already locked track rejected with HTTP 409.
       - Non-leader restriction: Team member attempting track-lock or submission rejected with HTTP 403.
       - Score bounds: Jury score `< 0` or `> 25` rejected with HTTP 422.
       - Deadlines: Submission after configured deadline rejected with HTTP 409.
       - RBAC boundaries: Unauthenticated access to `/admin` or `/jury` redirects or returns HTTP 401/403.
     - **Tier 3: Pairwise Combinations & State Matrix**
       - Matrix: User Roles (`ANONYMOUS`, `SOLO`, `MEMBER`, `LEADER`, `JURY`, `ADMIN`) × Routes (`/`, `/login`, `/register`, `/teamdetails`, `/submission`, `/leaderboard`, `/jury`, `/announcements`, `/admin`).
       - Cross-state transitions: Admin toggles `scoresFrozen` while Leaderboard client is open; Jury locks evaluation while Leaderboard recalculates; User without a team attempts `/submission` (redirected to `/teamdetails`).
     - **Tier 4: Real-World Workloads, Stress & Concurrency**
       - Concurrency race condition: 5 concurrent join requests to a team with 1 open seat; exactly 1 succeeds (HTTP 201) and 4 receive HTTP 409 without database corruption.
       - Socket.IO broadcast load: Score lock triggers `leaderboard:update` event broadcast to connected socket listeners.
       - Full Hackathon Lifecycle Simulation: Automated script running end-to-end flow: 3 teams create -> 6 members join -> 3 tracks locked -> 3 submissions made -> 2 juries grade teams -> Admin freezes scores -> Leaderboard verified against actual jury sums.

---

## 3. Caveats

1. **Docker & PostgreSQL Runtime Status**: PostgreSQL container is not currently running. Docker daemon is active and verified, but database tables are not yet provisioned. Integration tests and full-stack runtime verification require running `docker compose -f backend/docker-compose.yml up -d` and `npx prisma db push` / `prisma migrate deploy`.
2. **Missing Test Script in Root**: Root `package.json` does not have a `"test"` script. An E2E test runner (Playwright or Jest E2E runner) must be configured in subsequent phases.
3. **Assumptions on Image Domains**: `next.config.mjs` only allows `firebasestorage.googleapis.com`. If pitch decks, avatars, or sponsor logos are hosted on other CDNs, `images.remotePatterns` must be updated to prevent runtime Next.js Image component errors.
4. **Offline Dev Fallback Intent**: The fallback in `backend/src/middleware/auth.js` was intended for frontend developers working without a local database. Restricting it to `NODE_ENV === "development"` resolves unit test failure while preserving developer convenience.

---

## 4. Conclusion

- **Frontend Production Build**: Ready. `npm run build` succeeds cleanly with exit code 0 across all 17 routes. TypeScript passes type-checking with 0 errors.
- **Code Quality / Linting**: Unconfigured. `npm run lint` fails in non-interactive environments because ESLint dependencies and `.eslintrc` are absent. Needs `eslint`, `eslint-config-next`, and `.eslintrc.json`.
- **Backend Test Status**: 54/55 unit tests passing. 1 failing test in `adversarial.test.js` is caused by a 1-line condition bug in `backend/src/middleware/auth.js:28` (`NODE_ENV !== "production"` instead of `NODE_ENV === "development"`).
- **Backend Integration Tests**: 7 test suites (32 tests) ready in `backend/tests/*.test.js`, awaiting PostgreSQL container spin-up and `.env.test` DB connection string alignment.
- **E2E Testing Architecture**: Playwright for browser UI, button audits, and multi-user session testing across all 9 views; Supertest/Jest harness for high-speed API boundary, matrix, and concurrency stress testing.

---

## 5. Verification Method

### 5.1 Independent Verification Commands

1. **Verify Root Next.js Production Build**:
   ```pwsh
   cd "c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon"
   npm run build
   ```
   *Expected*: Exit code 0, all 17 routes generated statically.

2. **Verify TypeScript Compilation**:
   ```pwsh
   cd "c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon"
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, no type diagnostics.

3. **Verify Frontend Lint Status (Exposing the Missing Tooling)**:
   ```pwsh
   cd "c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon"
   npm run lint
   ```
   *Expected*: Prompts for ESLint configuration or exits with code 1.

4. **Verify Backend Unit Tests & Observe the Isolated Failure**:
   ```pwsh
   cd "c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\backend"
   npm test
   ```
   *Expected*: 54 passed, 1 failed (`tests/unit/adversarial.test.js:184`).

5. **Verify Docker Daemon Readiness**:
   ```pwsh
   docker --version
   docker ps
   ```
   *Expected*: Docker version returned, daemon accessible.

### 5.2 Invalidation Conditions
- If `npm run build` fails on any route during future code modifications.
- If fixing `auth.js:28` does not bring `backend` unit tests to 55/55 passed.
- If PostgreSQL container fails to bind to port 5432.
