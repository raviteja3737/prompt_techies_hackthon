# Project Execution Plan — orchestrator_2

## Strategy & Topology
- **Topology**: Top-level Project Orchestrator with Dual Tracks:
  1. **Implementation Track**: Sequential Milestones M1 -> M2 -> M3 -> M4 -> M5.
  2. **E2E Testing Track**: Autonomous Test Writer constructing requirement-driven opaque-box test suites (Tiers 1-4) publishing `TEST_READY.md`.
- **Iteration Loop (2B)** for each implementation milestone:
  - 3 Explorers (or inherited exploration if already completed with high quality)
  - 1 Worker (armed with domain skills & strict integrity warning)
  - 2 Reviewers (code quality, interface contracts, regression prevention)
  - 2 Challengers (empirical verification, edge cases, failure injection)
  - 1 Forensic Auditor (binary veto integrity audit)

## Milestones & Execution Steps

### E2E Testing Track (Concurrent)
- **Agent**: `teamwork_preview_test_writer` (`e2e_writer_1`)
- **Scope**:
  - `TEST_INFRA.md` definition (methodology, thresholds, runners)
  - Tier 1: Feature coverage (>=5 tests per feature for all 27 features)
  - Tier 2: Boundary & corner cases (>=5 tests per feature)
  - Tier 3: Cross-feature combinations (pairwise matrix)
  - Tier 4: Real-world application scenarios
  - E2E Test Runner (`npm run test:e2e` or `node tests/e2e/runner.js`)
  - Publish `TEST_READY.md`

### Milestone 1: Local PostgreSQL Database & Backend Service Lifecycle
- **Prerequisites**: Docker daemon running, port 5432 free (verified by M1 Explorers).
- **Worker Execution**:
  1. `docker compose up -d` in `backend/`
  2. Readiness poll loop on `pg_isready`
  3. Verify port 5432 listening and container healthy
  4. `npx prisma generate` and `npx prisma migrate dev --name init` (or `npx prisma db push`)
  5. `npm run seed` to populate Admin, Tracks, Jury, Solo, Teams, Submissions, Evaluations, Announcements
  6. Start backend on port 4000 as background process
  7. Verify `GET http://localhost:4000/health` returns HTTP 200 with `database.connected: true`
- **Verification Gate**:
  - Worker completion report & verification output
  - 2 Reviewers APPROVE
  - 2 Challengers PASS
  - 1 Forensic Auditor CLEAN

### Milestone 2: End-to-End Authentication & Hackathon Workflow
- **Scope**:
  - Register new participant/solo user, verify DB persistence & session cookie
  - Logout and re-login with exact same credentials
  - Team creation, unique join-code generation (6-char), team joining (cap 4)
  - Track selection, track locking in `/teamdetails`
  - RBAC verification for PARTICIPANT, LEADER, JURY, ADMIN

### Milestone 3: Comprehensive Frontend UI & Button Audit across all 9 Primary Views
- **Scope**:
  - Audit `/`, `/login`, `/register`, `/teamdetails`, `/submission`, `/leaderboard`, `/jury`, `/announcements`, `/admin`
  - Audit all buttons, links, form validation, error states, and real-time socket events

### Milestone 4: Error Triaging, Resolution & Production Hardening
- **Scope**:
  - Fix auth middleware unit test bug (`src/middleware/auth.js:28` dev bypass)
  - Run all backend unit & integration tests (`npm run test`, `npm run test:integration`)
  - Configure ESLint and frontend code quality tooling
  - Verify clean Next.js production build (`npm run build`) with zero errors or warnings

### Milestone 5: Final Multi-Feature Regression & Certification
- **Scope**:
  - Phase 1: Run 100% of E2E test suite from `TEST_READY.md` (Tiers 1-4)
  - Phase 2: Tier 5 Adversarial Coverage Hardening
  - Forensic Auditor Final Certification

### Final Human Reporting
- Synthesize all findings and verification proofs
- Transmit victory report to Sentinel via `send_message`
