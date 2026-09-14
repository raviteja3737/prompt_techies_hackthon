# Project: Prompt Techies Hackathon Production Readiness

## Architecture
- **Frontend Architecture**: Next.js 14 App Router (`src/app/`), Tailwind CSS, Axios client (`src/lib/api.js`), Socket.IO client (`src/lib/socket.js`), React Hook Form + Zod.
- **Backend Architecture**: Node.js / Express server (`backend/src/server.js`, `backend/src/app.js`), Prisma ORM (`backend/prisma/schema.prisma`), PostgreSQL 16 on port 5432, Socket.IO server, JWT authentication via HTTP-only cookies and Bearer tokens.
- **Database Architecture**: PostgreSQL database `promptothon` on `localhost:5432` with 13 models (`User`, `Team`, `TeamMember`, `Track`, `Submission`, `JuryAssignment`, `Evaluation`, `SystemSetting`, `AuditLog`, `Announcement`, `Notification`, `Connection`, `MagicLinkToken`).
- **Data Flow**: Frontend UI -> Axios API Client -> Express Routes -> Controller/Service -> Prisma Client -> PostgreSQL. Real-time updates pushed via Socket.IO events (`leaderboard:update`, `scores:freeze`, `announcement:new`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Local PostgreSQL Provisioning | Run Docker container on port 5432 with database `promptothon` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Prisma Schema & Migrations | Deploy Prisma schema with 13 models to PostgreSQL | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Baseline Data Seeding | Seed admin, tracks, jury, solo user, teams, announcements | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Backend Service Startup | Launch backend on port 4000 with live DB connectivity | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Health Check Endpoints | Provide `/health` and `/api/health` returning DB connection status | M1 | ORIGINAL_REQUEST §R1 |
| 6 | User Registration Flow | Register new participant/solo user, hash password, persist in DB | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Session Generation & Login | Authenticate email/password, issue JWT cookie, restore session | M2 | ORIGINAL_REQUEST §R2 |
| 8 | User Logout & Re-login | Terminate session, re-login with identical credentials | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Team Creation Flow | Create new team with unique name, generate join/invite code | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Team Joining via Code | Join existing team using 6-character invite code, enforce cap of 4 | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Track Selection & Locking | Select hackathon track, freeze modification via track-lock | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Role-Based Routing & Access | Restrict routes for Participant, Leader, Jury, Admin | M2 | ORIGINAL_REQUEST §R2 |
| 13 | View Audit: Home (`/`) | Audit Hero CTA, track list, timeline, mentors, navbar, footer | M3 | ORIGINAL_REQUEST §R3 |
| 14 | View Audit: Login (`/login`) | Audit login form, error message display, redirection | M3 | ORIGINAL_REQUEST §R3 |
| 15 | View Audit: Register (`/register`) | Audit registration form, password validation, role options | M3 | ORIGINAL_REQUEST §R3 |
| 16 | View Audit: Team Details (`/teamdetails`) | Audit team info, code copy, track select, track lock dialog | M3 | ORIGINAL_REQUEST §R3 |
| 17 | View Audit: Submission (`/submission`) | Audit repo URL, tags, pitch deck payload `{key, url}`, submit | M3 | ORIGINAL_REQUEST §R3 |
| 18 | View Audit: Leaderboard (`/leaderboard`) | Audit public track filter, ranking table, real-time updates | M3 | ORIGINAL_REQUEST §R3 |
| 19 | View Audit: Jury Portal (`/jury`) | Audit evaluation queue, rubric sliders (0-25), draft/lock | M3 | ORIGINAL_REQUEST §R3 |
| 20 | View Audit: Announcements (`/announcements`) | Audit announcements feed, priority tags, real-time toasts | M3 | ORIGINAL_REQUEST §R3 |
| 21 | View Audit: Admin Console (`/admin`) | Audit dashboard stats, score freeze, jury assign, announcements | M3 | ORIGINAL_REQUEST §R3 |
| 22 | Backend Unit Test Fix | Fix `src/middleware/auth.js:28` development bypass for 55/55 pass | M4 | ORIGINAL_REQUEST §R4 |
| 23 | Backend Integration Test Setup | Configure `.env.test` for local DB, run 7 suites (32 tests) | M4 | ORIGINAL_REQUEST §R4 |
| 24 | Frontend Code Quality Tooling | Configure ESLint dependencies & `.eslintrc.json`, exclude backend | M4 | ORIGINAL_REQUEST §R4 |
| 25 | Next.js Production Build | Ensure `npm run build` succeeds with zero errors and warnings | M4 | ORIGINAL_REQUEST §R4 |
| 26 | E2E Testing Suite (Tiers 1-4) | Comprehensive test suite covering features, boundaries, combinations, workflows | E2E Track | ORIGINAL_REQUEST §R5 |
| 27 | Full Regression & Certification | Pass 100% E2E tests, execute Tier 5 adversarial coverage hardening | M5 | ORIGINAL_REQUEST §R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven test harness and test suites across Tiers 1-4; issues `TEST_READY.md` | none | DONE |
| M1 | Local Database & Backend Lifecycle | Docker PostgreSQL container, Prisma migrations & seed, backend port 4000 live server | none | DONE |
| M2 | Authentication & Hackathon Workflow | Auth registration, login/logout, team creation, join code, track locking, RBAC | M1 | DONE |
| M3 | Frontend UI & Button Audit | Audit and fix all interactive controls and data bindings across all 9 views | M1, M2 | IN_PROGRESS |
| M4 | Error Triaging & Production Hardening | Fix auth middleware unit test bug, run integration tests, configure ESLint, clean build | M1, M2, M3 | PLANNED |
| M5 | Final Multi-Feature Regression & Certification | Pass 100% E2E test suite (Tiers 1-4) + Tier 5 Adversarial Coverage Hardening | E2E, M1-M4 | PLANNED |

## Interface Contracts
### Frontend (`src/lib/api.js`) ↔ Backend (`/api/*`)
- **Auth**: `POST /api/auth/register` accepts `{ name, email, password, role?, intent? }`, returns `{ user }` with HTTP-only cookie.
- **Auth**: `POST /api/auth/login` accepts `{ email, password }`, returns `{ user }` with HTTP-only cookie.
- **Team**: `GET /api/team/me` returns `{ id, name, inviteCode, trackId, trackLockedAt, members: [...] }`.
- **Team**: `POST /api/team` (or creation route) accepts `{ name }`, returns `{ team }`.
- **Team**: `POST /api/team/join` accepts `{ inviteCode }` (or `{ code }`), returns `{ team }`.
- **Team**: `POST /api/team/track-lock` accepts `{ trackId }`, returns `{ team, trackLockedAt }`.
- **Submissions**: `POST /api/team/submission` accepts `{ repoUrl, demoVideoUrl?, pitchDeck: { key, url }?, tags? }`.
- **Tracks**: `GET /api/tracks` (public or accessible without error), returns `Track[]`.
- **Leaderboard**: `GET /api/leaderboard` returns `{ teams: [...], isFrozen: boolean }`.
- **Health**: `GET /health` and `GET /api/health` return `{ ok: true, database: { connected: true } }`.

## Code Layout
- Frontend Application: `src/app/`
- Frontend Components: `src/components/`
- Frontend Libs / Clients: `src/lib/`
- Backend Server: `backend/src/server.js`, `backend/src/app.js`
- Backend Modules: `backend/src/modules/` (`auth`, `team`, `submissions`, `tracks`, `leaderboard`, `jury`, `admin`, `networking`, `announcements`)
- Backend Config: `backend/src/config/`
- Backend Prisma: `backend/prisma/` (`schema.prisma`, `seed.js`, `migrations/`)
- Backend Tests: `backend/tests/`
- E2E Test Suite: `tests/e2e/`
- Agent Metadata: `.agents/`
