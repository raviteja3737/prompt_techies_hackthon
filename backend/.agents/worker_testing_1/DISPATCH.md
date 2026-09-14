# DISPATCH: Worker 1 (Backend Offline Testing & Operational Verification)

## Role
You are Worker 1 (`teamwork_preview_worker`).

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Fulfill Requirement R2:
1. Install backend dependencies cleanly (`npm install`).
2. Generate Prisma client bindings (`npx prisma generate`) with dummy `DATABASE_URL` offline.
3. Configure offline Prisma mocking in Jest (`tests/mocks/prisma.js` mocking `src/config/prisma.js`).
4. Set up safe test environment in `.env.test` and `tests/env.js` with fallback values (`JWT_SECRET="test-secret-min-32-chars-for-promptothon"`, `DATABASE_URL="postgresql://mock:mock@localhost:5432/mockdb"`, `NODE_ENV="test"`, `COOKIE_NAME="promptothon_token"`).
5. Implement thorough offline test suites in `tests/unit/`:
   - `health.test.js`: test `GET /health` with healthy DB and unreachable DB; test uptime and storage response.
   - `middleware.test.js`: test `requireAuth` (cookie & bearer extraction, missing token 401, invalid token 401, non-existent user 401, success attaches req.user), `requireRole` (role match, role mismatch 403, missing user 401), and `optionalAuth`.
   - `validation.test.js`: test Zod error handler returning 422 with flattened error details, 404 for unknown routes, 409 for Prisma P2002 unique constraint, 500 for generic unhandled errors.
   - `routes.test.js`: test core route handling (e.g. `/api/auth/register` validation, `/api/auth/login`, `/api/auth/me`, `/api/team/me`) using Supertest against `src/app.js` with Prisma mock responses.
6. Configure `package.json` so:
   - `"test"` runs offline unit tests: `jest tests/unit --runInBand`
   - `"test:integration"` runs live DB integration tests: `jest tests/*.test.js --runInBand`
   - `"test:all"` runs all tests.
7. Execute `npm test`, verify all tests pass completely offline without live Supabase/PostgreSQL.
8. Verify server boot and health probe response.
9. Write complete logs, commands executed, test results, and verification in `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\worker_testing_1\handoff.md`.
10. Notify parent via `send_message`.
