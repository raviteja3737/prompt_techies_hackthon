# Milestone 4 Handoff Report: Backend Integration Test Setup & Execution

## 1. Observation

### Current Test Suite Inventory & Scripts
- In `backend/package.json` (lines 15–17):
  ```json
  "test": "jest tests/unit --runInBand",
  "test:integration": "jest tests/*.test.js --runInBand",
  "test:all": "jest --runInBand"
  ```
- In `backend/jest.config.js`:
  ```javascript
  module.exports = {
    testEnvironment: "node",
    setupFiles: ["<rootDir>/tests/env.js"],
    testTimeout: 20000,
    testPathIgnorePatterns: ["/node_modules/"],
  };
  ```
- In `backend/tests/env.js` (lines 8–15):
  ```javascript
  const testEnvPath = path.resolve(__dirname, "..", ".env.test");
  dotenv.config({ path: fs.existsSync(testEnvPath) ? testEnvPath : path.resolve(__dirname, "..", ".env") });

  process.env.NODE_ENV = "test";
  if (!process.env.PORT) process.env.PORT = "4001";
  if (!process.env.CLIENT_ORIGIN) process.env.CLIENT_ORIGIN = "http://localhost:3000";
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mockdb";
  if (!process.env.DIRECT_URL) process.env.DIRECT_URL = "postgresql://mock:mock@localhost:5432/mockdb";
  ```
- In `backend/.env.test` (lines 1–12):
  ```ini
  NODE_ENV=test
  PORT=4001
  CLIENT_ORIGIN=http://localhost:3000
  DATABASE_URL="postgresql://mock:mock@localhost:5432/mockdb"
  DIRECT_URL="postgresql://mock:mock@localhost:5432/mockdb"
  JWT_SECRET="test-secret-min-32-chars-for-promptothon-testing"
  JWT_EXPIRES_IN="7d"
  COOKIE_NAME="promptothon_token"
  JURY_ALIAS_SALT="test-jury-alias-salt-offline"
  STORAGE_PROVIDER="disabled"
  GITHUB_API_VERIFICATION="disabled"
  ```
- In `backend/tests/helpers.js` (lines 46–55):
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

### Empirical Test Execution Results

#### 1. Unit Tests (`npm --prefix backend test`)
- Command: `npm --prefix backend test`
- Exit Code: **0**
- Output:
  ```
  PASS tests/unit/routes.test.js
  PASS tests/unit/adversarial.test.js
  PASS tests/unit/validation.test.js
  PASS tests/unit/health.test.js
  PASS tests/unit/middleware.test.js

  Test Suites: 5 passed, 5 total
  Tests:       56 passed, 56 total
  Snapshots:   0 total
  Time:        2.359 s
  ```

#### 2. Existing Integration Test Script (`npm --prefix backend run test:integration`)
- Command: `npm --prefix backend run test:integration`
- Exit Code: **1**
- Output:
  ```
  > promptothon-backend@1.0.0 test:integration
  > jest tests/*.test.js --runInBand

  No tests found, exiting with code 1
  Run with `--passWithNoTests` to exit with code 0
  In C:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\backend
    81 files checked.
    testMatch: **/__tests__/**/*.[jt]s?(x), **/?(*.)+(spec|test).[tj]s?(x) - 12 matches
    testPathIgnorePatterns: \\node_modules\\ - 81 matches
    testRegex:  - 0 matches
  Pattern: tests\*.test.js - 0 matches
  ```

#### 3. Full Test Suite Out-of-the-Box (`npm --prefix backend run test:all`)
- Command: `npm --prefix backend run test:all`
- Exit Code: **1**
- Output:
  ```
  PrismaClientInitializationError:
  Authentication failed against database server at `localhost`, the provided database credentials for `mock` are not valid.

  Test Suites: 7 failed, 5 passed, 12 total
  Tests:       32 failed, 56 passed, 88 total
  ```

#### 4. Integration Tests Against Dedicated `promptothon_test` Database
- After creating `promptothon_test` in PostgreSQL and running `prisma db push` to load the schema, we executed the 7 integration test suites with `DATABASE_URL` pointing to `promptothon_test`:
  - `tests/leaderboard.test.js`: **PASS** (5/5 passed)
  - `tests/submissions.test.js`: **PASS** (6/6 passed)
  - `tests/jury.test.js`: **PASS** (6/6 passed)
  - `tests/auth.test.js`: **PASS** (5/5 passed)
  - `tests/anonymization.test.js`: **PASS** (3/3 passed)
  - `tests/admin.test.js`: **PASS** (2/2 passed)
  - `tests/team.test.js`: **FAIL (1 test failed, 4 passed)**
- Detailed failure in `backend/tests/team.test.js`:
  ```
  ● team › POST /api/team/join rejects a user who already has a team

    TypeError: Cannot read properties of undefined (reading 'inviteCode')

       6 | async function getInviteCode(token) {
       7 |   const res = await request(app).get("/api/team/me").set("Authorization", `Bearer ${token}`);
    >  8 |   return res.body.team.inviteCode;
         |                        ^
       9 | }
      10 |
      11 | describe("team", () => {

      at inviteCode (tests/team.test.js:8:24)
      at Object.<anonymous> (tests/team.test.js:34:25)
  ```
- Root Cause in `backend/tests/team.test.js` (lines 31–34):
  ```javascript
  test("POST /api/team/join rejects a user who already has a team", async () => {
    const { res: leaderA } = await createTeamLeader({ teamName: "A" });
    const { res: leaderB } = await createTeamLeader({ teamName: "B" });
    const inviteCodeB = await getInviteCode(leaderB.body.token);
  ```
- Corresponding Zod schema in `backend/src/modules/auth/auth.schema.js` (line 17):
  ```javascript
  teamName: z.string().min(2).max(60),
  ```
  `teamName: "A"` and `"B"` are single-character strings (length 1 < min 2). Registration fails with HTTP 422 Unprocessable Entity (`POST /api/auth/register 422`), resulting in `leaderB.body.token` being `undefined`. Subsequent `getInviteCode` call returns HTTP 401 and `res.body.team` is undefined.

---

## 2. Logic Chain

1. **Database Credentials Issue**:
   - `backend/.env.test` specifies `DATABASE_URL="postgresql://mock:mock@localhost:5432/mockdb"`.
   - The active PostgreSQL container on port 5432 (`promptothon-postgres`) uses user `postgres` and password `password123`.
   - `mock` is not a valid user on localhost:5432, resulting in `PrismaClientInitializationError: Authentication failed`.

2. **Need for a Dedicated Database**:
   - In `backend/tests/helpers.js`, `truncateAll()` executes `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` across all 13 application tables between tests.
   - If tests were pointed directly at `promptothon` (the main development database), every test run would wipe all seed data (tracks, admin account, initial announcements) seeded during Milestone 1.
   - Therefore, a dedicated test database (e.g. `promptothon_test`) is mandatory to isolate test truncation from development data.

3. **Windows CLI Glob Expansion Issue in `package.json`**:
   - On Linux/macOS shells (bash/zsh), `tests/*.test.js` is glob-expanded by the shell into individual file arguments before Jest runs.
   - On Windows (cmd.exe and PowerShell), npm passes the literal string `tests/*.test.js` to Jest.
   - Jest compiles this as a regex. In Windows file paths, directory separators are backslashes (`tests\...`), which do not match `tests/` followed by `*`. Consequently, Jest reports `0 matches` and exits with code 1.
   - Changing the script to a cross-platform pattern like `jest "tests/[^/]+\.test\.js" --runInBand` or `jest "tests[\\/][^\\/]+\.test\.js" --runInBand` matches all 7 integration files on both Windows and Unix platforms.

4. **Integration Test Suite Health (31/32 Passed)**:
   - Once `promptothon_test` was created and synced via `prisma db push`, 6 out of 7 test suites passed completely with 0 errors.
   - The only failure across all 32 tests is in `backend/tests/team.test.js:32-33`, where team names `"A"` and `"B"` violate the minimum length constraint (`min(2)`) of `auth.schema.js`.
   - Modifying `"A"` and `"B"` to `"Team A"` and `"Team B"` satisfies the schema, allowing registration to return 201, `inviteCodeB` to be fetched, and `POST /api/team/join` to verify the 409 rejection. This will bring integration test pass rate to **32/32 (100%)**.

---

## 3. Caveats

- **Investigation Boundary**: Investigation was conducted against the local Docker PostgreSQL 16 instance running on `localhost:5432`. Supabase hosted DB was not used for local integration tests, following the project specification.
- **Read-Only Explorer Discipline**: No files in `backend/src/` or `backend/tests/` were modified during this investigation. The database `promptothon_test` was created inside PostgreSQL and tested empirically without modifying source code.
- **Root-level Execution vs. Backend Directory**: When running Jest from the workspace root via `npx --prefix backend jest`, Jest defaults `<rootDir>` to the workspace root, which skips `<rootDir>/tests/env.js`. Test commands should always be executed with cwd in `backend/` (e.g. `npm --prefix backend ...` or `cd backend && npm ...`).

---

## 4. Conclusion

- **Backend Unit Tests**: 5 suites, 56 tests — **100% PASSING** out of the box.
- **Backend Integration Tests**: 7 suites, 32 tests — **31/32 PASSING** once the test database is provisioned and connection strings are configured. 1 test failure is isolated to a 1-character team name in `tests/team.test.js`.
- **Total Backend Tests**: 88 tests (56 unit + 32 integration). With the recommended fixes applied, **88 / 88 tests will pass (100%)**.

---

## 5. Concrete Instructions for Worker

### Task 1: Update `backend/.env.test`
Update `backend/.env.test` to point to the dedicated `promptothon_test` database:
```ini
NODE_ENV=test
PORT=4001
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL="postgresql://postgres:password123@localhost:5432/promptothon_test"
DIRECT_URL="postgresql://postgres:password123@localhost:5432/promptothon_test"
JWT_SECRET="test-secret-min-32-chars-for-promptothon-testing"
JWT_EXPIRES_IN="7d"
COOKIE_NAME="promptothon_token"
JURY_ALIAS_SALT="test-jury-alias-salt-offline"
STORAGE_PROVIDER="disabled"
GITHUB_API_VERIFICATION="disabled"
```

### Task 2: Update `test:integration` in `backend/package.json`
In `backend/package.json`, change line 16 from:
```json
"test:integration": "jest tests/*.test.js --runInBand",
```
to:
```json
"test:integration": "jest \"tests/[^/]+\\.test\\.js\" --runInBand",
```
Also add a test DB setup script to `backend/package.json`:
```json
"test:db:setup": "prisma db push --schema=prisma/schema.prisma --skip-generate",
```

### Task 3: Fix Team Name Validation in `backend/tests/team.test.js`
In `backend/tests/team.test.js`, lines 31–35:
Replace:
```javascript
  test("POST /api/team/join rejects a user who already has a team", async () => {
    const { res: leaderA } = await createTeamLeader({ teamName: "A" });
    const { res: leaderB } = await createTeamLeader({ teamName: "B" });
    const inviteCodeB = await getInviteCode(leaderB.body.token);
```
With:
```javascript
  test("POST /api/team/join rejects a user who already has a team", async () => {
    const { res: leaderA } = await createTeamLeader({ teamName: "Team A" });
    const { res: leaderB } = await createTeamLeader({ teamName: "Team B" });
    const inviteCodeB = await getInviteCode(leaderB.body.token);
```

### Task 4: Ensure Test Database is Provisioned and In Sync
Worker should run the provisioning command:
```powershell
docker exec promptothon-postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'promptothon_test'" | Select-String -Pattern "1" -Quiet || docker exec promptothon-postgres psql -U postgres -c "CREATE DATABASE promptothon_test;"
```
And sync the schema:
```powershell
$env:DATABASE_URL="postgresql://postgres:password123@localhost:5432/promptothon_test"; $env:DIRECT_URL="postgresql://postgres:password123@localhost:5432/promptothon_test"; npx --prefix backend prisma db push --schema=backend/prisma/schema.prisma --skip-generate
```

---

## 6. Verification Method

To verify the fixes independently, execute these commands from the workspace root:

1. **Verify Unit Tests (56 tests)**:
   ```bash
   npm --prefix backend test
   ```
   *Expected*: `Test Suites: 5 passed, 5 total. Tests: 56 passed, 56 total. Exit code 0.`

2. **Verify Integration Tests (32 tests)**:
   ```bash
   npm --prefix backend run test:integration
   ```
   *Expected*: `Test Suites: 7 passed, 7 total. Tests: 32 passed, 32 total. Exit code 0.`

3. **Verify All Backend Tests (88 tests)**:
   ```bash
   npm --prefix backend run test:all
   ```
   *Expected*: `Test Suites: 12 passed, 12 total. Tests: 88 passed, 88 total. Exit code 0.`

4. **Verify Development Database Isolation**:
   ```bash
   docker exec promptothon-postgres psql -U postgres -d promptothon -c "SELECT COUNT(*) FROM \"User\"; SELECT COUNT(*) FROM \"Track\";"
   ```
   *Expected*: User and Track counts in `promptothon` remain intact and are not wiped by test execution.
