## 2026-09-14T07:26:26Z
You are teamwork_preview_worker_m4_1.
Your working directory is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_worker_m4_1
The workspace root is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon

CRITICAL INSTRUCTIONS:
- You MUST read c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\ORIGINAL_REQUEST.md before starting work.
- You MUST read c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\PROJECT.md and c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\TEST_READY.md.
- Review predecessor audit reports:
  - c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m4_1\handoff.md
  - c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m4_2\handoff.md
  - c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m4_3\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You have exclusive write ownership over:
- `package.json`
- `.eslintrc.json`
- `.eslintignore`
- `next.config.mjs`
- `src/app/global-error.js`
- `src/app/error.js`
- `.env.example`
- `.gitignore`
- `backend/package.json`
- `backend/.env.test`
- `backend/tests/team.test.js`

YOUR MISSION — MILESTONE 4 IMPLEMENTATION (Error Triaging, Resolution & Production Hardening):

1. Configure Frontend Code Quality Tooling (ESLint):
   - In root `package.json`: remove accidental dependencies `"npm"` and `"install"`. Add to `devDependencies`: `"eslint": "^8.57.0"` and `"eslint-config-next": "14.2.15"`.
   - Install the dependencies via `npm install --package-lock-only` or `npm install`.
   - Create root `.eslintrc.json` extending `"next/core-web-vitals"` with `ignorePatterns` for `backend/**`, `tests/**`, `.agents/**`, `node_modules/**`, `.next/**`, `out/**`, `dist/**`.
   - Create root `.eslintignore` ignoring `backend/**`, `tests/**`, `.agents/**`.
   - In `next.config.mjs`: set `eslint: { dirs: ['src'] }`.
   - Verify `npm run lint` executes cleanly and passes with 0 errors.

2. Production Build Cleanliness & Hardening:
   - In `next.config.mjs`:
     - Update image config from deprecated `domains` to `remotePatterns`.
     - Disable `poweredByHeader: false`.
     - Add production security headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).
   - Create `src/app/global-error.js` to catch root layout runtime errors cleanly.
   - Clean up `src/app/error.js` (remove `console.clear()`, log `console.error(error)`).
   - Create `.env.example` at root documenting all environment variables.
   - Ensure `.gitignore` ignores all local env files (`.env*.local`, `.env.test`).
   - Run `npm run build` — must succeed with exit code 0 across all 17 routes.

3. Backend Integration Test Setup & Execution:
   - In `backend/package.json`: update `test:integration` script from `jest tests/*.test.js --runInBand` to `"jest \"tests/[^/]+\\.test\\.js\" --runInBand"` for cross-platform execution on Windows.
   - In `backend/tests/team.test.js`: update 1-character team names `"A"` and `"B"` (lines 32-33) to `"Team A"` and `"Team B"` to satisfy Zod validation `min(2)`.
   - In `backend/.env.test`: update `DATABASE_URL` to `postgresql://postgres:password123@localhost:5432/promptothon_test`.
   - Provision test database: Ensure database `promptothon_test` exists (e.g. using `docker exec promptothon-postgres psql -U postgres -c "CREATE DATABASE promptothon_test;"` or via Prisma) and apply schema via `npx --prefix backend prisma db push --schema=prisma/schema.prisma` with `DATABASE_URL="postgresql://postgres:password123@localhost:5432/promptothon_test"`.
   - Verify:
     - `npm --prefix backend test` -> 56/56 unit tests pass.
     - `npm --prefix backend run test:integration` -> 32/32 integration tests pass across all 7 suites.

4. Master Regression Verification:
   - Run `node tests/e2e/runner.js --all` -> 316/316 tests pass.
   - Run `npm run build` -> exit code 0.
   - Run `npm run lint` -> exit code 0.

5. Document all changes and verification outputs in `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_worker_m4_1\handoff.md`.
6. Send completion message to parent.
