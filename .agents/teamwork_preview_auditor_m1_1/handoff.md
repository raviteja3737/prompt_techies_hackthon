# Forensic Audit Report: Milestone 1 Local PostgreSQL Database & Backend Service Lifecycle

**Work Product**: Milestone 1 (PostgreSQL Docker Container, Prisma Migrations & Seed Data, Backend Express Server on Port 4000, `backend/src/app.js`)  
**Profile**: General Project  
**Integrity Mode**: Development  
**Auditor**: `auditor_m1_1`  
**Verdict**: **CLEAN**  

---

## Executive Summary

An exhaustive, independent forensic integrity audit was conducted on Milestone 1 (M1: Local PostgreSQL Database & Backend Service Lifecycle). Every claim in the worker handoff was independently tested and verified against empirical evidence:
1. **Container Genuineness**: Container `promptothon-postgres` runs official PostgreSQL 16.15 on Alpine Linux (`postgres:16-alpine`), listening on port 5432, backed by a persistent Docker volume `backend_pgdata`. No proxies, stubs, or mocks are present.
2. **Schema & Migration Authenticity**: 13 application tables and 6 enums exist in PostgreSQL schema `public`. Migration `20260914053019_init` is formally registered in `_prisma_migrations` and validated by `npx prisma migrate status`.
3. **Seed Data & Cryptographic Verification**: Seed records were verified across all tables. Admin and non-admin password hashes were evaluated using `bcryptjs`: valid passwords matched (`true`) and invalid passwords failed (`false`). Relational integrity among teams, members, tracks, submissions, jury assignments, and evaluations was confirmed.
4. **Backend Process & Health Check Authenticity**: The process listening on port 4000 is an authentic Node.js process executing `src/server.js`. Both `/health` and `/api/health` dynamically query PostgreSQL via `await prisma.$queryRaw\`SELECT 1\``, returning HTTP 200 with incrementing `uptimeSeconds` and `database.connected: true`.
5. **Code Integrity of `backend/src/app.js`**: Inspection confirmed that the worker introduced no hardcoded responses, mock bypasses, or facade implementations. Authentication routes properly reject invalid passwords with HTTP 401 and issue JWT tokens only upon valid bcrypt matches.

---

## 1. Observation

### 1.1 Docker Container Forensic Inspection
Execution of `docker inspect promptothon-postgres`:
- **Image**: `postgres:16-alpine` (`sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685`)
- **Base Image**: `alpine:3.24`, PostgreSQL major version: `16`, version: `16.15`
- **Cmd**: `["postgres"]`
- **Entrypoint**: `["docker-entrypoint.sh"]`
- **Mounts**:
  ```json
  [
    {
      "Type": "volume",
      "Name": "backend_pgdata",
      "Source": "/var/lib/docker/volumes/backend_pgdata/_data",
      "Destination": "/var/lib/postgresql/data",
      "Driver": "local",
      "Mode": "rw",
      "RW": true
    }
  ]
  ```
- **Port Bindings**: Host `0.0.0.0:5432` and `[::]:5432` mapped to container `5432/tcp`.
- **Live Version Query**:
  Command: `docker exec promptothon-postgres psql -U postgres -d promptothon -c "SELECT version(); SELECT pg_postmaster_start_time();"`
  Output:
  ```
  PostgreSQL 16.15 on x86_64-pc-linux-musl, compiled by gcc (Alpine 15.2.0) 15.2.0, 64-bit
  pg_postmaster_start_time: 2026-09-14 05:29:52.889734+00
  ```

### 1.2 Database Schema, Tables, and Enums
Execution of `docker exec promptothon-postgres psql -U postgres -d promptothon -c "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"`:
- Tables present (14 total):
  1. `Announcement` (BASE TABLE)
  2. `AuditLog` (BASE TABLE)
  3. `Connection` (BASE TABLE)
  4. `Evaluation` (BASE TABLE)
  5. `JuryAssignment` (BASE TABLE)
  6. `MagicLinkToken` (BASE TABLE)
  7. `Notification` (BASE TABLE)
  8. `Submission` (BASE TABLE)
  9. `SystemSetting` (BASE TABLE)
  10. `Team` (BASE TABLE)
  11. `TeamMember` (BASE TABLE)
  12. `Track` (BASE TABLE)
  13. `User` (BASE TABLE)
  14. `_prisma_migrations` (BASE TABLE)
- Execution of `docker exec promptothon-postgres psql -U postgres -d promptothon -c "SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid GROUP BY t.typname ORDER BY t.typname;"`:
  - `AnnouncementPriority`: `LOW, NORMAL, HIGH, URGENT`
  - `EvaluationStatus`: `DRAFT, LOCKED`
  - `GlobalRole`: `PARTICIPANT, JURY, ADMIN`
  - `NotificationType`: `ANNOUNCEMENT, JURY_ASSIGNED, EVALUATION_LOCKED, CONNECTION_REQUEST, SYSTEM`
  - `SubmissionStatus`: `DRAFT, SUBMITTED`
  - `TeamRole`: `LEADER, MEMBER`
- Migration Registry:
  `_prisma_migrations` contains:
  - `migration_name`: `20260914053019_init`
  - `checksum`: `45ea0aa5976245b7c02d3f3d76fd4c1730a9900431964fb6b332f8122de47e60`
  - `applied_steps_count`: `1`
  - `finished_at`: `2026-09-14 05:30:20.147543+00`
- `npx prisma migrate status` executed in `backend/`:
  Output: `Database schema is up to date!`

### 1.3 Independent Seed Data & Bcrypt Password Hash Verification
Auditor executed an independent test script (`verify_m1.js`) directly querying PostgreSQL via Prisma and verifying password hashes via `bcryptjs`:
- **Bcrypt Hash Verifications**:
  - `admin@promptothon.dev` with `ChangeMe123!`: `true` (PASS)
  - `admin@promptothon.dev` with `WrongPassword!`: `false` (PASS)
  - `admin@promptothon.dev` with `Password123!`: `false` (PASS)
  - `jury1@promptothon.dev` with `Password123!`: `true` (PASS)
  - `jury1@promptothon.dev` with `WrongPass`: `false` (PASS)
  - `jury2@promptothon.dev` with `Password123!`: `true` (PASS)
  - `jury3@promptothon.dev` with `Password123!`: `true` (PASS)
  - `solo1@promptothon.dev` with `Password123!`: `true` (PASS)
  - `alpha.leader@promptothon.dev` with `Password123!`: `true` (PASS)
  - `alpha.member1@promptothon.dev` with `Password123!`: `true` (PASS)
  - `beta.leader@promptothon.dev` with `Password123!`: `true` (PASS)
  - `gamma.leader@promptothon.dev` with `Password123!`: `true` (PASS)
- **Relational Integrity**:
  - Teams `Team Alpha` (2 members, 1 track, 1 submission `SUBMITTED`, 2 jury assignments, 2 evaluations), `Team Beta` (1 member, 1 submission `DRAFT`, 1 jury assignment), `Team Gamma` (1 member, unlocked).
  - Foreign key references from `TeamMember.userId` -> `User.id` and `TeamMember.teamId` -> `Team.id` resolved without orphaned records.
  - Baseline Announcements present: `[NORMAL] Welcome to Promptothon!` and `[HIGH] Submission deadline reminder` authored by `admin@promptothon.dev`.
  - Baseline SystemSetting present: `scoresFrozen: false`.

### 1.4 Process Inspection & Dynamic Health Check Verification
- Process listening on port 4000:
  - Command: `Get-CimInstance Win32_Process -Filter "ProcessId = 18376"`
  - `CommandLine`: `"C:\Program Files\nodejs\node.exe" src/server.js`
- HTTP Health Check Verification:
  - `curl.exe -i http://127.0.0.1:4000/health`:
    - Status: `HTTP/1.1 200 OK`
    - Payload: `{"ok":true,"uptimeSeconds":361,"database":{"connected":true},"storage":{"provider":"disabled","configured":false},"redis":{"configured":false}}`
  - `curl.exe -i http://127.0.0.1:4000/api/health`:
    - Status: `HTTP/1.1 200 OK`
    - Payload: `{"ok":true,"uptimeSeconds":363,"database":{"connected":true},"storage":{"provider":"disabled","configured":false},"redis":{"configured":false}}`
  - Two consecutive requests verified that `uptimeSeconds` incremented dynamically, and security headers (`Helmet`, `CORS`, `express-rate-limit`) were present.

### 1.5 Code Inspection of `backend/src/app.js`
Inspection of `backend/src/app.js` (lines 43-63):
```javascript
const healthHandler = async (req, res) => {
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
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);
```
- Query executed: `await prisma.$queryRaw`SELECT 1``.
- Database unreachable fallback: `{ connected: false, error: "unreachable" }`.
- No hardcoded boolean or constant return values.
- No dummy facades or mock bypasses.

### 1.6 Authentication & Live Query Verification Over HTTP
- **Bad Password Test**:
  - `POST http://localhost:4000/api/auth/login` with `{"email":"admin@promptothon.dev","password":"WrongPassword!"}`
  - Response: `HTTP 401 Unauthorized` (`{"error":"Invalid email or password."}`).
  - Proves authentication is authentic and strictly checks the bcrypt hash.
- **Valid Admin Login Test**:
  - `POST http://localhost:4000/api/auth/login` with `{"email":"admin@promptothon.dev","password":"ChangeMe123!"}`
  - Response: `HTTP 200 OK`, returned signed JWT Bearer token and admin profile (`role: "ADMIN"`).
- **Authenticated Data Retrieval**:
  - `GET http://localhost:4000/api/tracks` using Bearer token returned 2 tracks (`"AI Agents for Healthcare"`, `"Sustainable Fintech"`).
  - `GET http://localhost:4000/api/announcements` using Bearer token returned 2 announcements (`"Submission deadline reminder"`, `"Welcome to Promptothon!"`).
- **Jest Unit Test Execution**:
  - `npx jest tests/unit/health.test.js` executed in `backend/`:
    - Result: `Test Suites: 1 passed, 1 total; Tests: 4 passed, 4 total`.

---

## 2. Logic Chain

1. **Premise 1**: Container inspection via `docker inspect promptothon-postgres` and direct SQL query `SELECT version()` proved that an official PostgreSQL 16.15 instance is running inside the container with volume persistence at `backend_pgdata`.
2. **Premise 2**: Direct catalog inspection via `information_schema.tables`, `pg_type`, `pg_enum`, and `_prisma_migrations` confirmed that all 13 application tables, 6 PostgreSQL enums, and migration `20260914053019_init` exist natively in the database.
3. **Premise 3**: Evaluating seed users with `bcryptjs` proved that password hashes stored in PostgreSQL are cryptographically genuine: valid passwords match and incorrect passwords are rejected.
4. **Premise 4**: Code review of `backend/src/app.js` demonstrated that `healthHandler` performs a real database probe (`await prisma.$queryRaw`SELECT 1``) and does not hardcode results.
5. **Premise 5**: Live HTTP requests to `http://localhost:4000` confirmed that both `/health` and `/api/health` return HTTP 200 with dynamic uptime and live DB connectivity.
6. **Premise 6**: Live HTTP authentication rejected invalid credentials with HTTP 401 and authenticated valid credentials to return JWT tokens and database-backed track/announcement records.
7. **Conclusion**: Milestone 1 contains zero facades, dummy stubs, or mock bypasses. All deliverables are authentic, functional, and verified.

---

## 3. Caveats

1. **Authentication Rate Limiting in Development**: `backend/src/middleware/rateLimiter.js` enforces a 20-request window per 15 minutes on `/api/auth/*` routes. High-frequency automated testing against `/api/auth/` routes without process restarts or time delays may trigger HTTP 429 ("Too many attempts"). This is standard production security middleware, not a mock or bug.
2. **Backend Daemon Process**: The backend is running as a daemon on port 4000 (`node src/server.js`). While Docker containers persist with `restart: always`, host reboots require re-launching `node src/server.js`.
3. **Known Auth Middleware Test in Milestone 4**: The unit test `adversarial.test.js` failure related to `src/middleware/auth.js:28` is explicitly scheduled for resolution in Milestone 4 (Feature 22 in `PROJECT.md`). It does not affect M1 deliverables or health endpoints.

---

## 4. Conclusion

**Verdict: CLEAN**

Milestone 1 satisfies all acceptance criteria in `ORIGINAL_REQUEST.md` and `PROJECT.md`:
- PostgreSQL 16 is live and operational on `localhost:5432`.
- Prisma migrations and schema are fully deployed with 13 tables and 6 enums.
- Seed data and bcrypt credentials are cryptographically authentic and relationally intact.
- Express backend is operational on port 4000, with both `/health` and `/api/health` performing genuine database queries.
- No cheating, dummy mocks, or integrity violations were introduced.

Milestone 1 is certified as **CLEAN**.

---

## 5. Verification Method

To independently reproduce and verify this audit:

### 5.1 Docker Container & PostgreSQL Engine
```powershell
docker inspect promptothon-postgres --format "{{.Config.Image}} {{.State.Status}} {{range .Mounts}}{{.Name}} {{.Destination}}{{end}}"
docker exec promptothon-postgres psql -U postgres -d promptothon -c "SELECT version();"
```
*Expected*: Image `postgres:16-alpine`, Status `running`, Volume `backend_pgdata` mounted at `/var/lib/postgresql/data`, PostgreSQL version 16.15.

### 5.2 Public Schema Tables and Migration History
```powershell
docker exec promptothon-postgres psql -U postgres -d promptothon -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
docker exec promptothon-postgres psql -U postgres -d promptothon -c "SELECT migration_name, applied_steps_count FROM _prisma_migrations;"
```
*Expected*: 14 tables (13 models + `_prisma_migrations`), migration `20260914053019_init` with step count 1.

### 5.3 Programmatic Bcrypt Hash & Relational Audit
In project root:
```powershell
node .agents/teamwork_preview_auditor_m1_1/verify_m1.js
```
*Expected*: All 12 password tests report `PASS` and summary shows `Bcrypt checks: ALL PASSED; Relational integrity: ALL PASSED`.

### 5.4 Backend Health Endpoints & Live Authentication
```powershell
$h1 = Invoke-RestMethod -Uri "http://127.0.0.1:4000/health" -Method Get
$h2 = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/health" -Method Get
Write-Host "H1:" ($h1 | ConvertTo-Json -Compress)
Write-Host "H2:" ($h2 | ConvertTo-Json -Compress)

$login = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/auth/login" -Method Post -Body (@{ email = "admin@promptothon.dev"; password = "ChangeMe123!" } | ConvertTo-Json) -ContentType "application/json"
Write-Host "TOKEN_LEN:" $login.token.Length
```
*Expected*: Both endpoints return HTTP 200 with `database.connected: true`, login returns valid JWT token.
