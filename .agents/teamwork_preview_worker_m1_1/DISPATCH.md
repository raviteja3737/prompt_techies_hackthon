## 2026-09-14T05:28:54Z
You are the Milestone 1 Worker (identity: worker_m1_1).
Your working directory is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_worker_m1_1

MANDATORY FIRST STEP: Read the authoritative user request and project scope:
- ORIGINAL_REQUEST.md: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\PROJECT.md
- Explorer 1 Report (Docker & Port 5432): c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m1_1\handoff.md
- Explorer 2 Report (Prisma & Seeding): c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m1_2\handoff.md

Your task is to implement Milestone 1: Local PostgreSQL Database & Backend Service Lifecycle.
Follow the recommended execution sequence from the Explorer handoff reports:
1. Provision PostgreSQL: In `backend/`, run `docker compose up -d`.
2. Await readiness: Run a polling loop with `docker exec promptothon-postgres pg_isready -U postgres -d promptothon` until it accepts connections (exit code 0).
3. Verify container is healthy and port 5432 is listening.
4. Deploy Prisma Schema:
   In `backend/`, execute:
   - `npx prisma generate`
   - `npx prisma migrate dev --name init` (if any shadow DB issue arises, fallback to `npx prisma db push`).
5. Seed Baseline Data:
   In `backend/`, run `npm run seed` (`node prisma/seed.js`). Verify Admin (`admin@promptothon.dev`), 2 tracks, 3 jury users, 1 solo user, 3 teams, submissions, evaluations, and announcements are populated.
6. Verify & Align Server Health Endpoints:
   Inspect `backend/src/app.js` and `backend/src/server.js`. Ensure both `GET /health` and `GET /api/health` return HTTP 200 with `{ ok: true, database: { connected: true } }`.
7. Start Backend Server on Port 4000:
   Launch the backend server (e.g. `node src/server.js`) as a background daemon process so port 4000 is persistently listening and accepting requests.
8. Execute Full Verification:
   - Query `http://localhost:4000/health` and `http://localhost:4000/api/health`.
   - Run SQL queries in container `promptothon-postgres` to verify all 13 tables are created and seeded records exist.
   - Run bcrypt check verifying `admin@promptothon.dev` with password `ChangeMe123!`.
9. Document all actions, command outputs, and verification checks in `handoff.md` in your working directory and notify the orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
