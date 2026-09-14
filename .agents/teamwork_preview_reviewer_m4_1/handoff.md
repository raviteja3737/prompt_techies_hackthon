# Review Handoff — teamwork_preview_reviewer_m4_1 (Milestone 4)

**Reviewer**: `teamwork_preview_reviewer_m4_1`
**Date**: 2026-09-14
**Worker report reviewed**: `.agents/teamwork_preview_worker_m4_1/handoff.md`
**Scope note**: Per parent instruction, this review covers ONLY `npm run lint`, `npm --prefix backend test`,
`npm --prefix backend run test:integration`, and `node tests/e2e/runner.js --smoke`.
`npm run build` and the full 316-test E2E (`--all`) are explicitly SKIPPED here — `reviewer_m4_2` covers those.
**Status**: REVIEW COMPLETE — verdict: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 File-by-file inspection (all 11 in-scope files read in full)

- **`package.json`**: `install`/`npm` bloat deps gone; `eslint@^8.57.0` + `eslint-config-next@14.2.15` present under
  `devDependencies`. `lint` script = `next lint`. Correct.
- **`.eslintrc.json`**: extends `next/core-web-vitals`; `ignorePatterns` excludes `backend/**`, `tests/**`,
  `.agents/**`, `node_modules/**`, `.next/**`, `out/**`, `dist/**`, `*.config.js`, `*.config.mjs`.
  Rules relax `react/no-unescaped-entities` (off), `react/jsx-no-undef` (off), demote `no-img-element`/`jsx-key`
  to warn. Pragmatic for a zero-error gate; acceptable, though `jsx-no-undef: off` is lax.
- **`.eslintignore`**: mirrors the ignore list. Correct.
- **`next.config.mjs`**: `reactStrictMode: true`, `poweredByHeader: false`, `eslint.dirs: ['src']`,
  `images.remotePatterns` for `firebasestorage.googleapis.com`, 4 security headers
  (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). Correct, modern.
- **`src/app/global-error.js`**: `'use client'`, proper `<html>`/`<body>`, `useEffect` logging with `[error]` dep,
  `error.digest` display, reset + home actions. Correct Next.js 14 root error boundary.
- **`src/app/error.js`**: `'use client'`, `useEffect(() => { console.error(error); }, [error])`, try-again + home.
  No `console.clear()`. Correct.
- **`.env.example`**: documents all `NEXT_PUBLIC_*` vars + commented backend reference vars. No secrets
  (Firebase values are placeholders). Correct.
- **`.gitignore`**: ignores `.env`, `.env*.local`, `.env.test`, dev/test/prod local variants; whitelists
  `!.env.example`. Correct — `.env.test` (contains a password) stays out of git.
- **`backend/package.json`**: `test:integration` =
  `jest "tests/[^/]+\.test\.js" --runInBand`. Discovers exactly the 7 top-level integration suites on
  Windows pwsh (verified: 7 suites collected on every run; unit tests correctly excluded). Correct.
- **`backend/.env.test`**: `DATABASE_URL`/`DIRECT_URL` → `promptothon_test`, `NODE_ENV=test`, `PORT=4001`,
  test-only JWT secret/salts, storage disabled. Correct isolation config.
- **`backend/tests/team.test.js`**: lines 32–33 use `"Team A"` / `"Team B"` (≥2 chars, satisfies
  `teamName: z.string().min(2)`). All other assertions unchanged. Correct fix.

### 1.2 Verbatim verification outputs

**Command 1 — `npm run lint` → EXIT 0 (PASS, matches worker claim)**
Only warnings, zero errors (verbatim tail):
```
./src/app/(auth)/login/page.js
43:6  Warning: React Hook useEffect has a missing dependency: 'redirectByRole'. ...  react-hooks/exhaustive-deps
./src/components/chatbot.js
82:4  Warning: React Hook useEffect has missing dependencies: 'chatHistory.length' and 'typeMessage'. ...  react-hooks/exhaustive-deps
./src/components/Hero.js
8:9  Warning: Using `<img>` could result in slower LCP ...  @next/next/no-img-element
./src/components/Timeline/EventCard.js
18:5  Warning: Using `<img>` ...  @next/next/no-img-element
36:5  Warning: Missing "key" prop for element in iterator  react/jsx-key
36:5  Warning: Image elements must have an alt prop ...  jsx-a11y/alt-text
./src/components/ui/card-fan-carousel.tsx
388:9  Warning: Using `<img>` ...  @next/next/no-img-element
./src/components/ui/sliding-ease.tsx
287:6  Warning: React Hook useCallback has a missing dependency: 'generatePattern'. ...  react-hooks/exhaustive-deps
./src/utils/contexts/WindowSize.js
30:5  Warning: React Hook useEffect has a missing dependency: 'handleWindowSizeChange'. ...  react-hooks/exhaustive-deps
EXIT_CODE:0
```

**Command 2 — `npm --prefix backend test` → 5 suites, 56/56, EXIT 0 (PASS, matches worker claim)**
```
Test Suites: 5 passed, 5 total
Tests:       56 passed, 56 total
Snapshots:   0 total
Time:        3.889 s, estimated 4 s
Ran all test suites matching /tests\\unit/i.
EXIT_CODE:0
```

**Command 3 — `npm --prefix backend run test:integration` → FAIL, FLAKY (DOES NOT match worker's 32/32 claim)**
Three consecutive full runs on a clean `promptothon_test` DB, Docker `promptothon-postgres` up on 5432:
- Run A: `Test Suites: 6 failed, 1 passed, 7 total` / `Tests: 18 failed, 14 passed, 32 total` / `EXIT_CODE:1`
- Run B: `Test Suites: 1 failed, 6 passed, 7 total` / `Tests: 2 failed, 30 passed, 32 total` / `EXIT_CODE:1`
- Run C (via `npx jest 'tests/[^/]+\.test\.js' --runInBand` from `backend/`): `Test Suites: 5 failed, 2 passed` /
  `Tests: 9 failed, 23 passed, 32 total` / `EXIT_CODE:1`
Representative verbatim failures (vary run to run — e.g. Run C `team.test.js`):
```
● team › a team fills up to capacityMax and further joins are rejected
    Expected: 201
    Received: 404
      at Object.toBe (tests/team.test.js:19:26)
```
plus intermittent `401` on just-issued tokens (`GET /api/team/me`, `POST /api/team/submission`,
`POST /api/auth/login`), intermittent `404` on register-join with a seconds-old invite code, and
`AuditLog_actorId_fkey` / `JuryAssignment_teamId_fkey` / `Submission_teamId_fkey` FK noise.
Counter-evidence that the worker's touched test is sound in isolation:
`npx jest tests/team.test.js --runInBand` → `Test Suites: 1 passed` / `Tests: 5 passed, 5 total` / `EXIT_CODE:0`.
Pre-conditions verified: both `promptothon` and `promptothon_test` DBs exist; `promptothon_test` starts each
run at 0 users / 0 teams; dev DB intact (2578 users, 4 tracks — NOT wiped).

**Command 4 — `node tests/e2e/runner.js --smoke` (with `$env:DATABASE_URL/DIRECT_URL` → `promptothon`,
`$env:JWT_SECRET`, `$env:COOKIE_NAME`, `$env:JURY_ALIAS_SALT` from `backend/.env`) → 56/56, EXIT 0 (PASS)**
```
Total Executed:  56
Passed:          56
Failed:          0
Skipped:         260
Duration:        3.93s
OVERALL STATUS: PASSED ALL TESTS ✅
EXIT_CODE:0
```

### 1.3 Integrity check (scope files only)
No hardcoded test results, no mock facades, no fabricated logs in any of the 11 files. Backend unit tests use
the pre-existing `backend/tests/mocks/prisma` harness (not introduced by this worker; integration + E2E suites
hit the real Postgres). `requireAuth`'s `NODE_ENV === "development"` fallback and similar controller dev
fallbacks are pre-existing and inert under `NODE_ENV=test`. **No integrity violations found.**

---

## 2. Logic Chain

1. Worker claim "lint exit 0" reproduces exactly (warnings only) → ESLint setup (Feature 24) is genuinely done.
2. Worker claim "56/56 unit" reproduces exactly → backend unit gate holds.
3. Worker claim "7 suites 32/32 integration" does NOT reproduce: 3/3 full runs fail with *different* failing
   sets (18, 2, 9 failures). Same-code/same-DB nondeterminism + single-file passes (team 5/5) ⇒ the failures
   are cross-test/shared-state flakiness in the integration harness or API under suite load (e.g. DB-error paths
   surfacing as 401 via `requireAuth`'s catch-all, FK-write races against `truncateAll`), NOT a deterministic
   regression from the worker's 3-line change — but it equally means "32/32 integration green" is not an
   established fact in this environment.
4. Smoke E2E 56/56 passes against the live dev DB ⇒ core user lifecycle (register → login → team → track-lock →
   submission → leaderboard/jury/admin) works end to end; consistent with unit + lint gates.
5. Dev `promptothon` DB retains all data (2578 users, 4 tracks) ⇒ test isolation respected, no data-loss event.

---

## 3. Caveats

- **Split scope**: `npm run build` and full `node tests/e2e/runner.js --all` (316) were NOT executed here per
  parent instruction; `reviewer_m4_2` owns them. This verdict covers only lint / unit / integration / smoke.
- **Integration flakiness is environment-real, cause not fully isolated**: three full-suite outcomes differ
  (18/2/9 failures); single-file runs pass. Possible contributors: rapid `TRUNCATE … RESTART IDENTITY CASCADE`
  churn vs pooled Prisma clients across the 7 sequential suites on local Docker Postgres; `requireAuth`
  converting any `findUnique` throw into 401 (masks DB errors as auth failures); fire-and-forget `recordAudit`
  writes landing after truncates (FK noise). Not root-caused; needs owner follow-up, not reviewer speculation.
- **Worker's 32/32 may have been a single lucky/ordered run** — reviewers should treat backend integration as
  not-yet-stable rather than broken-by-M4.
- **Smoke E2E writes to the dev `promptothon` DB** (by design of the E2E harness); user count grew accordingly
  (≈2445 → 2578 across agents' runs). Expected, not a violation.
- **pwsh quoting fragility noted**: double-escaped regex via `npx` from `backend/` matched 0 tests; the npm
  script form (`npm --prefix backend run test:integration`) is the reliable invocation on Windows.

---

## 4. Conclusion + Verdict

M4's frontend hardening (ESLint, `next.config.mjs` security headers, both error boundaries, `.env.example`,
`.gitignore`) and the `team.test.js` validation fix are correct and verified; lint (exit 0), backend unit
(56/56), and smoke E2E (56/56) all reproduce green with the dev DB intact and no integrity violations.
However, the worker's headline backend-integration claim (7 suites, 32/32) failed to reproduce in 3/3
independent full runs (14/32, 30/32, 23/32 with run-varying failures), so Milestone 4's "integration testing
fully enabled and green" cannot be certified on current evidence.

**Verdict: REQUEST_CHANGES** — stabilize the backend integration suite (or scope/pin the conditions under
which 32/32 holds) and re-verify with ≥2 consecutive green full runs before M4 sign-off. Suggested owner
actions: retry-loop/quarantine for the flaky suites, investigate `requireAuth` 401-masking of DB errors under
suite load, and confirm no cross-suite state leaks via `truncateAll`.

---

## 5. Verification Method

```powershell
# 1. Lint (expect exit 0, warnings only)
npm run lint
# 2. Backend unit (expect 5 suites, 56/56, exit 0)
npm --prefix backend test
# 3. Backend integration (worker claims 7 suites 32/32 exit 0 — OBSERVED FLAKY, exit 1;
#    re-run ≥2x; single-file control: npx jest tests/team.test.js --runInBand  → 5/5)
npm --prefix backend run test:integration
# 4. Smoke E2E (expect 56/56, exit 0)
$env:DATABASE_URL="postgresql://postgres:password123@localhost:5432/promptothon"
$env:DIRECT_URL="postgresql://postgres:password123@localhost:5432/promptothon"
$env:JWT_SECRET="promptothon-super-secret-jwt-key-2026-production"
$env:COOKIE_NAME="promptothon_token"
$env:JURY_ALIAS_SALT="promptothon-jury-alias-salt-2026"
node tests/e2e/runner.js --smoke
# 5. DB guardrails (expect both DBs present; promptothon data retained)
docker exec promptothon-postgres psql -U postgres -d promptothon -c 'SELECT COUNT(*) FROM "User";'
docker exec promptothon-postgres psql -U postgres -d promptothon_test -c 'SELECT COUNT(*) FROM "User";'
# NOT run here (reviewer_m4_2): npm run build ; node tests/e2e/runner.js --all
```
