## 2026-09-13T20:27:26Z
You are Test Writer 1 for the E2E Testing Track.
Your working directory is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_test_writer_e2e_1
The workspace root is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon
The authoritative user request is in: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\ORIGINAL_REQUEST.md
The project architecture and feature inventory are in: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\PROJECT.md

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md and PROJECT.md completely.

Your mission:
Design and implement the complete requirement-driven, opaque-box E2E testing suite according to the 4-tier methodology:
1. Create `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\TEST_INFRA.md` at project root documenting test philosophy, runner, format, directory layout, and feature coverage goals.
2. Build automated test suites in `tests/e2e/` (or designated directory) covering:
   - Tier 1: Core Feature Coverage (>=5 test cases per feature across Auth, Teams, Tracks, Submissions, Leaderboard, Jury, Announcements, Admin).
   - Tier 2: Boundary & Corner Cases (>=5 test cases per feature covering capacity limits, invalid codes, locked track re-locks, non-leader restrictions, score bounds 0-25, etc.).
   - Tier 3: Cross-Feature Combinations & State Matrix (pairwise role x view matrix, state transitions).
   - Tier 4: Real-World Application Scenarios (full end-to-end multi-user hackathon lifecycle).
3. Ensure test scripts are callable via an executable command (e.g. `npm run test:e2e` or `node tests/e2e/runner.js`).
4. Publish `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\TEST_READY.md` at project root once the suite is constructed.

Write your handoff report to:
`c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_test_writer_e2e_1\handoff.md`
Also maintain your `progress.md` in your working directory.
When done, notify the orchestrator (caller id) via `send_message`.
