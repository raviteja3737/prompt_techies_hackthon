# progress.md — teamwork_preview_challenger_m4_1 (backend integration challenge)

## Status: DONE (2026-09-14)

Read-only adversarial challenge complete. No source/config/test files touched.

## Evidence log

- Read: `.agents/ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_READY.md`,
  `.agents/teamwork_preview_worker_m4_1/handoff.md`,
  `.agents/teamwork_preview_explorer_m4_1/handoff.md`,
  `backend/.env.test`, `backend/tests/helpers.js`, `backend/tests/env.js`,
  `backend/package.json`, `backend/jest.config.js`,
  `backend/tests/{team,jury,leaderboard,submissions,auth,anonymization}.test.js`,
  `backend/src/utils/auditLog.js`.
- `backend/.env.test` verified: DATABASE_URL + DIRECT_URL both → `promptothon_test`.
- `npm --prefix backend test` → **5 suites, 56/56 PASS**, exit 0.
- `npm --prefix backend run test:integration` run 1 → **21/32** (6 failed suites / 1 passed).
- `npm --prefix backend run test:integration` run 2 (back-to-back) → **23/32** (4 failed / 3 passed), different failing set → flaky, not idempotent.
- Recurring signature: Postgres `40P01` deadlock (`truncateAll` TRUNCATE vs in-flight background `recordAudit` INSERT) on OID 16893 = `promptothon_test`; `afterEach`-only teardown cascades pollution (FK violations, 401s, 404s).
- Dev-DB guard (`promptothon.User` count, read-only): BEFORE **2555** → AFTER **2578** (+23 = sibling-agent `@promptothon.dev` E2E rows @07:44; **0** `@test.dev` rows minted after 07:30:00) → no leakage from these runs.
- `promptothon_test` ends truncate-clean (0 users/teams/tracks). No stray app servers (live node PIDs all MCP tooling).

## Artifacts

- `handoff.md` — full 5-component report, verdict **REQUEST_CHANGES**.
- `BRIEFING.md` — updated with outcome.

## Verdict

**REQUEST_CHANGES** — worker's 32/32 idempotent-integration claim refuted (21/32, 23/32); isolation + unit 56/56 confirmed.
