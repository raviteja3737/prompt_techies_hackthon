# Challenger Handoff — Backend Integration Adversarial Challenge (M4)

**Challenger**: `teamwork_preview_challenger_m4_1`
**Date**: 2026-09-14
**Scope**: Backend integration isolation + idempotency ONLY (read-only; no source edits made)
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Config: isolation is correctly configured (PASS)

- `backend/.env.test` (11 lines, read verbatim) points **exclusively** at the isolated database:
  `DATABASE_URL="postgresql://postgres:password123@localhost:5432/promptothon_test"`
  `DIRECT_URL="postgresql://postgres:password123@localhost:5432/promptothon_test"` — no reference to `promptothon` anywhere in the file.
- `backend/tests/env.js:8-9` prefers `.env.test` over `.env` (`dotenv.config({ path: fs.existsSync(testEnvPath) ? testEnvPath : ... })`), forces `NODE_ENV=test`, `PORT=4001`.
- `backend/tests/helpers.js:47-55` `truncateAll()` executes `TRUNCATE TABLE "AuditLog","Evaluation","JuryAssignment","Submission","TeamMember","Team","Track","SystemSetting","User","Announcement","Notification","Connection","MagicLinkToken" RESTART IDENTITY CASCADE` — total wipe of all 13 tables. Safe **only** by virtue of the `.env.test` pointer; there is **no runtime guard** (no assertion on DB name / NODE_ENV) inside `truncateAll` itself.
- `backend/package.json:16` `test:integration` uses the Windows-safe pattern `jest "tests/[^/]+\.test\.js" --runInBand` (worker's glob fix confirmed present).

### 1.2 Unit tests (PASS, stable)

- Command: `npm --prefix backend test`
- Verbatim tally: `Test Suites: 5 passed, 5 total` / `Tests: 56 passed, 56 total` / exit 0.

### 1.3 Integration run 1 (FAIL) — 21/32

- Command: `npm --prefix backend run test:integration`
- Verbatim tally: `Test Suites: 6 failed, 1 passed, 7 total` / `Tests: 11 failed, 21 passed, 32 total`
- Only `tests/admin.test.js` passed fully. Failures spanned team (409-vs-404 capacity), jury (FK `JuryAssignment_teamId_fkey`), submissions (403-vs-401, 200-vs-401), leaderboard (FK `Evaluation_teamId_fkey`, `scoresFrozen` false), auth (deadlock **inside `truncateAll` itself**, `40P01`), anonymization (FK `JuryAssignment_juryId_fkey`).

### 1.4 Integration run 2, back-to-back (FAIL, DIFFERENT set) — 23/32

- Same command, immediately after run 1 on the untouched DB.
- Verbatim tally: `Test Suites: 4 failed, 3 passed, 7 total` / `Tests: 9 failed, 23 passed, 32 total`
- This time `auth` and `anonymization` passed, while `team`/`jury`/`submissions`/`leaderboard` failed with a shifted signature (e.g. `GET /api/team/me → 401` immediately after a `201` register; `me.body.team` undefined → `TypeError: Cannot read properties of undefined (reading 'id')`). Different failing set across identical back-to-back runs = **flaky, not idempotent**. Worker's claimed `32/32` reproduced **zero times out of two**.

### 1.5 Recurring failure mechanism (captured verbatim, both runs)

- Postgres deadlock inside the test harness, always on database OID **16893 = `promptothon_test`** (verified via `SELECT oid, datname FROM pg_database`):
  `Raw query failed. Code: 40P01. Message: ERROR: deadlock detected — Process N waits for AccessExclusiveLock ... blocked by process M. Process M waits for RowExclusiveLock ... blocked by process N.`
  Thrown from `tests/helpers.js:48` (`truncateAll`).
- One party is the `afterEach(truncateAll)` TRUNCATE (AccessExclusiveLock on all 13 tables); the other is an in-flight row write (RowExclusiveLock), with the logs showing fire-and-forget background `recordAudit` → `prisma.auditLog.create` calls (`src/utils/auditLog.js:8-16`, try/catch, console noise `Foreign key constraint violated: AuditLog_actorId_fkey`) landing around truncations.
- A deadlocked `afterEach` both **fails the just-passed test** and **leaves the DB dirty**, and since every suite uses `afterEach`-only (no `beforeEach` wipe, confirmed in all 7 test files), the pollution cascades deterministically into the next tests: duplicate fixed emails (`jury@test.dev`, `lb-jury*@test.dev`), teams that no longer exist (401/404), `undefined` team bodies → FK violations. This fully explains the shifting run-to-run signatures.

### 1.6 Dev-DB negative probe (PASS — no leakage from these runs)

- `promptothon` `User` count BEFORE any test execution: **2555**. AFTER all three runs (unit + 2× integration): **2578** (+23).
- The +23 is **not** leakage: newest dev rows are `@promptothon.dev` E2E-scenario users (`race-*`, `peer-network-*`, `solo-network-*`, `asa-part-*`, `jel-/tts-lead-*`, created 2026-09-14 07:44) from concurrently active sibling agents — a disjoint email domain the backend suite never emits (`helpers.js` emits only `@test.dev`).
- Decisive checks: `SELECT COUNT(*) FROM "User" WHERE email LIKE '%test.dev%' AND "createdAt" > '2026-09-14 07:30:00'` (covers my entire execution window) = **0**. The 12 pre-existing `@test.dev` rows in dev date to 07:15–07:16 with foreign patterns (`dup_*`, `leader_alpha_*`) from an earlier sibling probe, predating my BEFORE count.
- `promptothon_test` ends at **0 users / 0 teams / 0 tracks** (truncate-clean), and every deadlock trace names OID 16893 (`promptothon_test`), never 16384 (`promptothon`).

---

## 2. Logic Chain

1. Isolation config is sound (1.1) and the dev-DB probe is clean (1.6): **not one byte of test writes reached `promptothon`** — the safety property the worker claimed holds empirically.
2. But the claimed `32/32 twice = idempotent` does **not** hold (1.3 vs 1.4): 21/32 then 23/32 with disjoint failure sets on identical back-to-back runs.
3. The mechanism (1.5) is a self-inflicted race inside the harness/DB contract, not an environment flake: un-awaited background audit writes collide with the global TRUNCATE; the `afterEach`-only design converts one deadlock into a cascade. It reproduces across runs without any external interference (no app servers running — all live `node` processes are MCP tooling: chrome-devtools/shadcn/shodan).
4. Therefore the worker's M4 backend-integration claim is **refuted as stated**: the suite is red and non-deterministic in its current form. The fix space (await audit writes or serialize teardown; add `beforeEach` wipe and/or per-file DB reset with retry; re-run `prisma db push` hygiene) is worker-owned — challenger makes no source edits.

---

## 3. Caveats

- No source, test, or config file was created, edited, or deleted by this challenger; only `handoff.md`/`progress.md`/BRIEFING updates inside the challenger's own folder. Test executions themselves write to `promptothon_test` by design (the prescribed verification method).
- Full verbatim logs (~25 s and ~19 s runs) exceed this file; tallies above are exact Jest summary lines; per-suite failure details were captured from the live output transcript.
- Dev-DB row growth (+23) during the window is attributed via email-domain + timestamp forensics to concurrent sibling-agent E2E activity, not to these runs; a fully quiesced re-run was out of scope and would require halting all sibling agents.
- `backend/` and `tests/` are untracked in git, so the deadlocked-DB forensics rely on live container state, not diffs.
- Broader DISPATCH items (`npm run lint`, `npm run build`, `test:e2e`) were out of this run's narrowed backend-integration scope and were not executed here.

---

## 4. Conclusion + Verdict

- Isolation: **CONFIRMED** — `.env.test` → `promptothon_test`, dev untouched by these runs.
- Unit: **56/56 PASS**.
- Integration idempotency: **REFUTED** — run1 21/32, run2 23/32, flaky via truncate/audit deadlock + afterEach-only cascade.
- Worker's "32/32, idempotent, 88/88" certification claim does not reproduce.

**Verdict: REQUEST_CHANGES** — worker must eliminate the `truncateAll` ↔ background-write race (and/or add `beforeEach` self-healing teardown) and demonstrate **two consecutive clean 32/32 integration runs plus a stable dev-DB count** before M4 backend sign-off.

---

## 5. Verification Method

From the workspace root (requires `promptothon-postgres` on `localhost:5432`):

```powershell
# 1. Isolation config (expect promptothon_test, twice, no 'promptothon"' dev reference)
Get-Content backend\.env.test
# 2. Unit (expect 5 suites / 56 tests, exit 0)
npm --prefix backend test
# 3. Integration run 1 (challenger observed 21/32, NOT 32/32)
npm --prefix backend run test:integration
# 4. Integration run 2 back-to-back (challenger observed 23/32 with a different failing set)
npm --prefix backend run test:integration
# 5. Dev-DB guard, before and after (read-only; expect count stable modulo sibling-agent activity,
#    and zero helper-domain rows minted in-window)
docker exec promptothon-postgres psql -U postgres -d promptothon -c 'SELECT COUNT(*) FROM "User";'
docker exec promptothon-postgres psql -U postgres -d promptothon -c 'SELECT COUNT(*) FROM "User" WHERE email LIKE ''%test.dev%'' AND "createdAt" > ''2026-09-14 07:30:00'';'
# 6. Deadlock attribution (expect 16893 = promptothon_test in any 40P01 trace)
docker exec promptothon-postgres psql -U postgres -tc "SELECT oid, datname FROM pg_database WHERE datname LIKE 'promptothon%';"
```
