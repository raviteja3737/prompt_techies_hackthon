# TEST_INFRA.md — Prompt Techies Hackathon E2E Test Infrastructure

## 1. Executive Summary & Testing Philosophy

The Prompt Techies Hackathon E2E Testing Infrastructure provides an opaque-box, requirement-driven verification harness designed to validate all 27 core features across the application stack. Following the Project Pattern Dual Track methodology, the E2E test harness is decoupled from implementation internals, verifying observable system contracts, HTTP API status codes, database integrity, real-time socket events, and UI route behaviors.

### Core Testing Principles
1. **Opaque-Box Verification**: Tests validate inputs, outputs, side effects, and state transitions without monkey-patching or relying on non-public implementation details.
2. **Progressive Testability & Isolation**: Each test case is self-contained, creates unique entities (isolated user emails, team names, codes), and cleans up or relies on deterministic namespaces so test execution order never affects results.
3. **Dual-Track Adaptability**: The test runner seamlessly executes against:
   - Live HTTP services (`http://localhost:4000` for backend, `http://localhost:3000` for frontend), or
   - In-process Express application instances with direct PostgreSQL Prisma connectivity when background services are warming up.
4. **Adversarial Resilience**: The harness exercises edge values, malformed inputs, boundary overflows, SQL/XSS injection attempts, and concurrency stress to certify production readiness.

---

## 2. The 4-Tier Testing Methodology

The test suite is structured into four distinct, hierarchically escalating tiers:

```
+-----------------------------------------------------------------------+
|  Tier 4: Real-World Multi-User Application Scenarios                  |
|  (Full Hackathon Day Lifecycle, Solo Networking, Multi-Team Freeze)   |
+-----------------------------------------------------------------------+
                                  ^
+-----------------------------------------------------------------------+
|  Tier 3: Cross-Feature Combinations & State Matrix                    |
|  (Auth x Teams, Teams x Tracks x Submissions, Jury x Leaderboard)     |
+-----------------------------------------------------------------------+
                                  ^
+-----------------------------------------------------------------------+
|  Tier 2: Boundary, Corner & Negative Exception Cases                  |
|  (>=5 test cases per feature across all 27 features = >=135 tests)    |
+-----------------------------------------------------------------------+
                                  ^
+-----------------------------------------------------------------------+
|  Tier 1: Core Feature Coverage & Primary Happy Paths                  |
|  (>=5 test cases per feature across all 27 features = >=135 tests)    |
+-----------------------------------------------------------------------+
```

### Tier 1: Core Feature Coverage (Happy Path)
- **Objective**: Verify the fundamental happy path for all 27 features in `PROJECT.md § Feature Inventory`.
- **Threshold**: At least **5 distinct, non-trivial test cases per feature** (27 features × 5 = **>=135 tests**).
- **Scope**: Database connectivity, Prisma CRUD, seed data, service startup, health endpoints, registration, login/logout, team creation, team joining, track selection/locking, RBAC, 9 frontend view audits, backend unit/integration tests, linting, build, and test suite execution.

### Tier 2: Boundary & Corner Cases (Edge Values & Negative Paths)
- **Objective**: Probe edge boundaries, invalid inputs, constraint violations, permission denials, and rate-limiting limits.
- **Threshold**: At least **5 distinct boundary test cases per feature** (27 features × 5 = **>=135 tests**).
- **Scope**: Null/empty/oversized payloads, duplicate entries, SQL/XSS injection patterns, unauthorized role escalations, deadline expirations, and invalid state transitions.

### Tier 3: Cross-Feature Combinations & State Matrix
- **Objective**: Validate pairwise and n-ary interactions between disparate system domains.
- **Scope**:
  - `Auth x Teams`: Leader registration vs Member registration, solo participant late team joining, team capacity caps.
  - `Teams x Tracks x Submissions`: Submitting without locked track (rejected), locking track twice (rejected), draft editing vs finalized submission immutability.
  - `Submissions x Jury x Leaderboard`: Draft submission hidden from jury queue, jury rubric grading bounds (0-25 per dimension), anonymization of jury marks, leaderboard score aggregation, and admin score freeze toggles.
  - `Admin x Settings x Announcements`: Admin broadcast creation, published vs scheduled visibility, deadline setting updates, audit log generation.

### Tier 4: Real-World Application Scenarios
- **Objective**: Execute end-to-end multi-persona workflows mimicking a live hackathon event from start to finish.
- **Scenarios**:
  - **Scenario 1: Complete Hackathon Lifecycle**: Admin setup -> Team Leader & Member onboarding -> Track lock -> Pitch deck upload -> GitHub repo submission -> Jury evaluation -> Leaderboard updates -> Admin score freeze.
  - **Scenario 2: Solo Hacker Journey**: Solo registration -> Public networking directory check-in -> 1-click connection request -> Late team joining via invite code.
  - **Scenario 3: Multi-Team Competition & Real-Time Leaderboard**: Multiple teams submitting to different tracks, multiple judges evaluating independently, track-scoped filtering, and score freeze verification.
  - **Scenario 4: Adversarial Concurrency & Security Hardening**: Concurrent team seat reservation race condition (enforcing cap of 4), privilege escalation attempts, malformed JWT attacks, and resilient error recovery.

---

## 3. 27-Feature Inventory Mapping Matrix

| # | Feature Name | Target Layer / Module | Tier 1 Core Tests | Tier 2 Boundary Tests | Tier 3 Matrix Coverage | Tier 4 Scenario |
|---|--------------|-----------------------|-------------------|----------------------|------------------------|-----------------|
| 1 | Local PostgreSQL Provisioning | Port 5432 / Docker | T1-F01-01..05 | T2-F01-01..05 | Env DB binding | Scenarios 1-4 |
| 2 | Prisma Schema & Migrations | `backend/prisma/` | T1-F02-01..05 | T2-F02-01..05 | Schema FK relations | Scenarios 1-4 |
| 3 | Baseline Data Seeding | `backend/prisma/seed.js` | T1-F03-01..05 | T2-F03-01..05 | Admin/Track defaults | Scenarios 1, 3 |
| 4 | Backend Service Startup | `backend/src/server.js` | T1-F04-01..05 | T2-F04-01..05 | Express middlewares | Scenarios 1-4 |
| 5 | Health Check Endpoints | `/health`, `/api/health` | T1-F05-01..05 | T2-F05-01..05 | DB status reporting | Scenarios 1, 4 |
| 6 | User Registration Flow | `/api/auth/register` | T1-F06-01..05 | T2-F06-01..05 | Auth × Teams | Scenarios 1, 2 |
| 7 | Session Generation & Login | `/api/auth/login`, `/me` | T1-F07-01..05 | T2-F07-01..05 | Auth tokens & cookies| Scenarios 1-4 |
| 8 | User Logout & Re-login | `/api/auth/logout` | T1-F08-01..05 | T2-F08-01..05 | Session termination | Scenario 1 |
| 9 | Team Creation Flow | `POST /api/auth/register` | T1-F09-01..05 | T2-F09-01..05 | Teams × Capacity | Scenarios 1, 3, 4|
| 10| Team Joining via Code | `/api/team/join` | T1-F10-01..05 | T2-F10-01..05 | Capacity cap of 4 | Scenarios 1, 2, 4|
| 11| Track Selection & Locking | `/api/team/track-lock` | T1-F11-01..05 | T2-F11-01..05 | Tracks × Submissions | Scenarios 1, 3 |
| 12| Role-Based Routing & Access | `src/middleware/auth.js` | T1-F12-01..05 | T2-F12-01..05 | RBAC Matrix (4 roles)| Scenarios 1, 4 |
| 13| View Audit: Home (`/`) | `src/app/page.js` | T1-F13-01..05 | T2-F13-01..05 | Hero, Tracks, Nav | Scenario 1 |
| 14| View Audit: Login (`/login`) | `src/app/(auth)/login` | T1-F14-01..05 | T2-F14-01..05 | Form validation | Scenario 1 |
| 15| View Audit: Register (`/register`)| `src/app/(auth)/register`| T1-F15-01..05 | T2-F15-01..05 | Role & Intent forms | Scenarios 1, 2 |
| 16| View Audit: Team Details (`/teamdetails`)| `src/app/(auth)/teamdetails`| T1-F16-01..05 | T2-F16-01..05 | Code copy, lock UI | Scenarios 1, 2 |
| 17| View Audit: Submission (`/submission`)| `src/app/submission` | T1-F17-01..05 | T2-F17-01..05 | Pitch deck & Repo | Scenarios 1, 3 |
| 18| View Audit: Leaderboard (`/leaderboard`)| `src/app/leaderboard` | T1-F18-01..05 | T2-F18-01..05 | Realtime & Anonymity | Scenarios 1, 3 |
| 19| View Audit: Jury Portal (`/jury`)| `src/app/jury` | T1-F19-01..05 | T2-F19-01..05 | Rubric sliders 0-25 | Scenarios 1, 3 |
| 20| View Audit: Announcements (`/announcements`)| `src/app/announcements`| T1-F20-01..05 | T2-F20-01..05 | Priority badges feed | Scenario 1 |
| 21| View Audit: Admin Console (`/admin`)| `src/app/admin` | T1-F21-01..05 | T2-F21-01..05 | Freeze & Assignments | Scenarios 1, 3 |
| 22| Backend Unit Test Fix | `backend/src/middleware/auth.js`| T1-F22-01..05 | T2-F22-01..05 | Unit test suite | Regression gate |
| 23| Backend Integration Setup | `backend/tests/*.test.js`| T1-F23-01..05 | T2-F23-01..05 | DB integration suite| Regression gate |
| 24| Frontend Code Quality Tooling | ESLint config & rules | T1-F24-01..05 | T2-F24-01..05 | Static analysis | Regression gate |
| 25| Next.js Production Build | `npm run build` | T1-F25-01..05 | T2-F25-01..05 | Build artifact check| Regression gate |
| 26| E2E Testing Suite (Tiers 1-4)| `tests/e2e/runner.js` | T1-F26-01..05 | T2-F26-01..05 | Test runner CLI | Full Suite Runner|
| 27| Full Regression & Certify | Whole application | T1-F27-01..05 | T2-F27-01..05 | Adversarial stress | Production Signoff|

---

## 4. Test Harness Architecture & File Layout

```
tests/e2e/
+-- runner.js                               # CLI Test Runner with tier selection, smoke mode & reports
+-- helpers/
|   +-- apiClient.js                        # Unified HTTP / Supertest API client with cookie jar & auth
|   +-- testFramework.js                    # Zero-dependency test runner engine (describe, it, hooks, assert)
|   +-- dbHelper.js                         # Database helper for seed verification & state cleanup
+-- tier1/
|   +-- 01_infrastructure.test.js           # Features 1-5 (Postgres, Prisma, Seed, Startup, Health) [25 tests]
|   +-- 02_auth.test.js                     # Features 6-8 (Register, Login, Logout/Re-login) [15 tests]
|   +-- 03_team_track.test.js               # Features 9-11 (Team Create, Team Join, Track Lock) [15 tests]
|   +-- 04_rbac.test.js                     # Feature 12 (Role-Based Access Control) [5 tests]
|   +-- 05_frontend_views_audit.test.js     # Features 13-21 (9 Views: Home, Login, Register, etc.) [45 tests]
|   +-- 06_backend_quality.test.js          # Features 22-25 (Unit tests, Integration, Lint, Build) [20 tests]
|   +-- 07_certification.test.js            # Features 26-27 (E2E Suite Integrity, Regression Cert) [10 tests]
+-- tier2/
|   +-- boundary_infrastructure.test.js     # Edge cases for Features 1-5 [25 tests]
|   +-- boundary_auth.test.js               # Edge cases for Features 6-8 [15 tests]
|   +-- boundary_team_track.test.js         # Edge cases for Features 9-11 [15 tests]
|   +-- boundary_rbac.test.js               # Edge cases for Feature 12 [5 tests]
|   +-- boundary_views.test.js              # Edge cases for Features 13-21 [45 tests]
|   +-- boundary_quality_certification.test.js # Edge cases for Features 22-27 [30 tests]
+-- tier3/
|   +-- matrix_auth_teams.test.js           # Pairwise matrix: Auth states x Team states [5 tests]
|   +-- matrix_teams_tracks_submissions.test.js # Pairwise matrix: Team x Track lock x Submissions [5 tests]
|   +-- matrix_jury_evaluations_leaderboard.test.js # Pairwise matrix: Submissions x Jury x Leaderboard [5 tests]
|   +-- matrix_admin_settings_announcements.test.js # Pairwise matrix: Admin x System Settings x Feed [5 tests]
+-- tier4/
|   +-- scenario_full_hackathon_lifecycle.test.js      # Multi-user journey: Start to evaluation & freeze
|   +-- scenario_solo_hacker_networking.test.js        # Solo participant networking & joining
|   +-- scenario_multi_team_leaderboard_freeze.test.js # Multi-track competition & score freezing
|   +-- scenario_adversarial_concurrency_security.test.js # Concurrency race & security penetration
```

---

## 5. Coverage Thresholds & Quality Gates

| Metric | Target / Minimum | Verification Command |
|--------|------------------|----------------------|
| **Total Features Covered** | 27 of 27 (100%) | `node tests/e2e/runner.js --all` |
| **Tier 1 Test Cases** | >= 135 tests (>=5 per feature) | `node tests/e2e/runner.js --tier=1` |
| **Tier 2 Test Cases** | >= 135 tests (>=5 per feature) | `node tests/e2e/runner.js --tier=2` |
| **Tier 3 Test Cases** | >= 20 matrix combinations | `node tests/e2e/runner.js --tier=3` |
| **Tier 4 Scenarios** | >= 4 end-to-end multi-user scenarios | `node tests/e2e/runner.js --tier=4` |
| **Total Test Count** | **>= 294 total test cases** | `npm run test:e2e` |
| **Pass Rate** | 100% (0 failures, 0 uncaught errors) | Exit code 0 |
| **Execution Time** | Fast execution (< 30 seconds for full suite) | Runner benchmark |

---

## 6. Execution Commands

```bash
# Run all tiers (Tiers 1-4)
npm run test:e2e
# or
node tests/e2e/runner.js --all

# Run specific tier
node tests/e2e/runner.js --tier=1
node tests/e2e/runner.js --tier=2
node tests/e2e/runner.js --tier=3
node tests/e2e/runner.js --tier=4

# Run fast smoke test
node tests/e2e/runner.js --smoke

# Output JSON summary report
node tests/e2e/runner.js --json
```
