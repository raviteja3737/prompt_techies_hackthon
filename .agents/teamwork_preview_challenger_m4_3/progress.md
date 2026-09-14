# Progress — teamwork_preview_challenger_m4_3 (M4 stress challenger, second round)

## Task
Adversarial probe of worker_m4_2's self-heal + 40P01-retry fix. No source edits; write only `handoff.md` + `progress.md` in `.agents/teamwork_preview_challenger_m4_3/`.

## Steps
- [x] Mandatory reads: worker_m4_2 handoff (135 lines), `backend/tests/helpers.js` (retry verified lines 50-80), `backend/jest.config.js` (maxWorkers 1 verified line 5); spot-checked beforeEach in auth/submissions suites + auditLog warn-only
- [x] Dev guard PRE (read twice): `@test.dev` = 12, 12 on `promptothon` (read-only)
- [x] Dirt adaptation documented: brief's bash-quoted INSERT fails under pwsh + omits non-null `id`; planted equivalent junk row (`dirty-probe-id`, confirmed count 1)
- [x] PROBE run #1 (dirty → `test:integration`): RED — 6 failed/1 passed suites, 22/32, exit non-zero, live 40P01 + cascade in log; probe dirt healed to 0 afterwards
- [x] Control (clean TRUNCATE → `test:integration`): GREEN 7/7, 32/32 (17.409 s, no 40P01)
- [x] Repeat dirty probe (`dirty-probe-id2` → `test:integration`): GREEN 7/7, 32/32 (17.078 s, no 40P01) — dirt exonerated, intermittency proven (2/3 green)
- [x] Step 2 (`test:all` serially once): GREEN 12/12 suites, 88/88 (19.152 s, exit 0)
- [x] Dev guard POST (read twice): `@test.dev` = 12, 12 — untouched, no dev writes
- [x] Wrote `handoff.md` (verdict REQUEST_CHANGES + evidence + verification method) and this `progress.md`
- [x] No source edits made (only this dir's two files)

## Verdict
**REQUEST_CHANGES** — mandated adversarial run went 22/32 with live 40P01 despite retry+beforeEach; suite remains flaky (1 red / 3 runs). Static-dirt healing confirmed, `test:all` 88/88 single-run green, dev 12/12→12/12 clean — none of which overturn the red gate.
