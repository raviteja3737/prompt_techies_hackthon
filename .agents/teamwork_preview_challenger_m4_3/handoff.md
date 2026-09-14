# Handoff — teamwork_preview_challenger_m4_3 (M4 stress challenger, second round)

**Challenger**: `teamwork_preview_challenger_m4_3`
**Date**: 2026-09-14
**Working directory**: `C:\Users\ravit\OneDrive\Desktop\prompt techies hackthon`
**Target**: fixer claim in `.agents/teamwork_preview_worker_m4_2/handoff.md` (beforeEach(truncateAll) self-heal + 40P01 retry + maxWorkers 1)
**Status**: PROBE COMPLETE — verdict **REQUEST_CHANGES** (mandated adversarial run went red; flakiness persists)
**Source edits**: NONE (probe-only; only this dir's `handoff.md` + `progress.md` written)

---

## 1. Observation (verbatim tallies + dev-guard counts)

### Mandatory reads confirmed BEFORE probing
- `.agents/teamwork_preview_worker_m4_2/handoff.md` (135 lines): 10 backend files, two back-to-back `test:all` 88/88 claims.
- `backend/tests/helpers.js:50-73`: `truncateAll(attempts=3)` with 40P01 retry (`delaysMs=[100,250]`), `resetTestDb` alias; export line 80 includes it.
- `backend/jest.config.js:5`: `maxWorkers: 1`, `testTimeout: 20000` unchanged.
- Spot-check: `backend/tests/auth.test.js:3-4` and `backend/tests/submissions.test.js:3-4` both contain `beforeEach(async () => truncateAll());` alongside `afterEach`; `backend/src/utils/auditLog.js:16` is `console.warn`, never rethrows. Fixer code present as claimed.

### Environment
- `promptothon-postgres` `Up 2 hours 0.0.0.0:5432->5432/tcp`; DBs `promptothon`, `promptothon_test` present.

### Dev-DB guard (`promptothon`, READ-ONLY, never written)
- PRE-probe read 1: `@test.dev` count = **12**
- PRE-probe read 2: `@test.dev` count = **12**
- POST-probe read 1 (after all runs): `@test.dev` count = **12**
- POST-probe read 2 (after all runs): `@test.dev` count = **12**
- Dev untouched: 12 / 12 → 12 / 12. No leakage, no dev writes by this probe.

### PROBE step 1 — dirty test DB, then `test:integration` (MANDATED adversarial run)
Deviation note (honest, material): the brief's verbatim `psql -c 'INSERT ...'` uses bash `'\\''` escaping, which under this host's PowerShell parses as broken quoting (`syntax error at end of input`), and the verbatim column list omits `"id"`, which violates the non-null constraint (`User.id text`, no default → `null value in column "id"`). Inserted the equivalent junk row with explicit id/timestamps instead:
`INSERT INTO "User" (id,email,name,"passwordHash",role,"createdAt","updatedAt") VALUES ('dirty-probe-id','dirty-probe@test.dev','Dirty','x','PARTICIPANT',NOW(),NOW()) ON CONFLICT DO NOTHING;` → `INSERT 0 1`, pre-run `User` count in `promptothon_test` = 1 (dirt confirmed).
Result (`npm --prefix backend run test:integration`, `--runInBand`):
```
Test Suites: 6 failed, 1 passed, 7 total
Tests:       10 failed, 22 passed, 32 total
Snapshots:   0 total
Time:        22.472 s
Ran all test suites matching /tests\\[^\\]+\.test\.js/i.
```
Exit non-zero. Per-test-file split: jury PASS; submissions 1 fail; leaderboard 3 fail; team 2 fail; auth 1 fail; anonymization 2 fail; admin 1 fail (10 failed / 22 passed). **Mandated expectation (7 suites 32/32 exit 0) NOT met.**
Smoking gun in the same log (submissions section): live Postgres deadlock still strikes THROUGH the retry wrapper —
`Raw query failed. Code: 40P01. Message: ERROR: deadlock detected / Process 1640 waits for AccessExclusiveLock on relation 16952 ... blocked by process 1641. / Process 1641 waits for RowExclusiveLock on relation 16962 ... blocked by process 1640.` —
followed by the classic cascade the fixer claimed to eliminate: `GET /api/team/me 401`, `TypeError: Cannot read properties of undefined (reading 'inviteCode'/'juryCount'/'id')`, `Foreign key constraint violated: Evaluation_teamId_fkey / JuryAssignment_juryId_fkey / AuditLog_actorId_fkey`, `POST /api/auth/register 404`. No test failed with 40P01 directly (truncate retry absorbed the throw), but 10 downstream tests still cascaded.
Post-run forensics: `SELECT COUNT(*) FROM "User" WHERE email='dirty-probe@test.dev'` on `promptothon_test` = **0** — the static probe dirt WAS healed by beforeEach; the red run is a live-timing deadlock, not leftover dirt.

### Control + repeat (disambiguation, same serial commands)
- Clean control (manual full TRUNCATE of `promptothon_test`, then `test:integration`): `Test Suites: 7 passed, 7 total` / `Tests: 32 passed, 32 total` (17.409 s), no 40P01 in log. Green.
- Repeat dirty probe (fresh junk id `dirty-probe-id2`, then `test:integration`): `Test Suites: 7 passed, 7 total` / `Tests: 32 passed, 32 total` (17.078 s), no 40P01 in log. Green.
- Integration scorecard this session: 2 green / 1 red out of 3 serial runs. Static-dirt healing holds (probe row wiped every run; dirty run #2 fully green), but the suite is still FLAKY: a live 40P01 mid-run deadlock collapsed one run 22/32 despite the 3-attempt truncate retry + beforeEach.

### PROBE step 2 — `test:all` once more, serially (`npm --prefix backend run test:all`)
```
Test Suites: 12 passed, 12 total
Tests:       88 passed, 88 total
Snapshots:   0 total
Time:        19.152 s
Ran all test suites.
```
Exit 0. 88/88 green on this single run — but it follows (and does not erase) the red adversarial integration run above.

---

## 2. Logic Chain
1. Fixer artifacts verified present (retry loop, 7× beforeEach, audit warn-only, maxWorkers 1) — no claim of missing code; the challenge is behavioral, not textual.
2. Static self-heal CONFIRMED: deliberately planted `dirty-probe@test.dev` row was wiped to 0 in every run, and dirty run #2 passed 32/32 with dirt pre-planted — beforeEach heals pre-existing dirt as advertised.
3. Adversarial robustness REFUTED: mandated dirty run #1 went 22/32 with an explicit live 40P01 (TRUNCATE AccessExclusiveLock vs concurrent row-write RowExclusiveLock) mid-run and the exact downstream cascade (401s → undefined inviteCode/juryCount/id → FK violations → 404s) the fixer claimed to eliminate. Retry kept the truncate itself from throwing, but did not save the 10 downstream tests — consistent with the deadlock victim being the app's own write path (or damage already done before retry succeeds), which a truncate-side-only retry cannot repair.
4. Clean-control green (32/32) plus dirty-repeat green (32/32) exonerate the dirt itself and prove intermittency: 1 red in 3 serial runs under identical config. "Holds under adversarial conditions" requires determinism; observed behavior is probabilistic (~m4_1's 21-23/32 history corroborates).
5. `test:all` 88/88 (single run) and dev guard 12/12→12/12 are green but insufficient to override the red mandated probe — per the brief, APPROVE requires ALL green.
6. Therefore verdict is REQUEST_CHANGES with this evidence. Recommended fixer follow-up (not applied here): eliminate the truncate-vs-write race itself rather than retrying one side — e.g., DELETE-based reset in dependency order instead of multi-table TRUNCATE AccessExclusiveLock, or a test-wide mutex/serialized audit drain before truncate, plus masking-fix in `requireAuth` (DB throw → 401 hides deadlocks as auth failures per reviewer_m4_1).

---

## 3. Caveats
- No source file was created, edited, or deleted outside `.agents/teamwork_preview_challenger_m4_3/` (probe-only mandate honored).
- The brief's verbatim INSERT required adaptation (pwsh quoting + non-null `id` + timestamps); the deviation is documented in §1 and is behaviorally equivalent (one junk PARTICIPANT row pre-planted, confirmed count 1 before run #1).
- Only ONE `test:all` run was executed per the brief's step 2 ("once more serially"); its 88/88 is a single-sample green, not a stability proof.
- Deadlock timing analysis is inferential from logs (victim identity not conclusively attributed); the load-bearing facts ( tallies, 40P01 verbatim, cascade signatures, dirt-healed-to-0, dev counts) are direct observations.
- Full `npm run build` / full 316 E2E deliberately NOT run (out of probe scope).

---

## 4. Conclusion
Static self-heal works; adversarial stability does not. Evidence: mandated dirty-DB integration run = 6 failed/1 passed suites, 22/32 tests, exit non-zero, with live 40P01 + full cascade in-log, against clean-control 32/32 and dirty-repeat 32/32 (2/3 green = flaky, not fixed). `test:all` 88/88 once and dev `@test.dev` 12/12→12/12 do not overturn the red gate. **Verdict: REQUEST_CHANGES.**

---

## 5. Verification Method (exact commands + invalidation conditions)
From workspace root (PowerShell; note `''` = escaped quote inside pwsh single-quoted strings):
```powershell
# 0. Reads (already done; re-verify fixer code present, no source diffs expected outside .agents/)
Get-Content backend\jest.config.js
docker ps --filter name=promptothon-postgres --format "{{.Names}} {{.Status}} {{.Ports}}"
docker exec promptothon-postgres psql -U postgres -tc "SELECT datname FROM pg_database WHERE datname LIKE 'promptothon%';"
# Dev guard (expect 12; read twice; NEVER write to promptothon)
docker exec promptothon-postgres psql -U postgres -d promptothon -tc 'SELECT COUNT(*) FROM "User" WHERE email LIKE ''%@test.dev'';'
# Dirty the TEST db only (adapted: explicit id, pwsh-safe quoting)
docker exec promptothon-postgres psql -U postgres -d promptothon_test -c 'INSERT INTO "User" (id,email,name,"passwordHash",role,"createdAt","updatedAt") VALUES (''dirty-probe-verify'',''dirty-probe@test.dev'',''Dirty'',''x'',''PARTICIPANT'',NOW(),NOW()) ON CONFLICT DO NOTHING;'
# Mandated probe (expectation per fixer claim: 7 suites 32/32 exit 0 — OBSERVED RED 22/32 on run #1)
npm --prefix backend run test:integration
# Serial full gate (observed 12 suites 88/88 exit 0 on single run)
npm --prefix backend run test:all
# Dirt-heal check (expect 0: beforeEach wipes static dirt even on red runs)
docker exec promptothon-postgres psql -U postgres -d promptothon_test -tc 'SELECT COUNT(*) FROM "User" WHERE email=''dirty-probe@test.dev'';'
# Dev guard again twice (expect 12, 12 — unchanged)
docker exec promptothon-postgres psql -U postgres -d promptothon -tc 'SELECT COUNT(*) FROM "User" WHERE email LIKE ''%@test.dev'';'
```
Invalidation conditions (any one voids THIS challenger finding):
- The full tool-call transcript above cannot reproduce: (a) at least one 22/32-class red with 40P01 across repeated dirty/clean serial runs (flakiness), or (b) the green tallies quoted (clean 32/32, test:all 88/88).
- Dev `@test.dev` ≠ 12 on any re-read (would indicate probe contamination — none observed).
- Evidence shows a source edit by this challenger outside `.agents/teamwork_preview_challenger_m4_3/` (none made).
```
