# BRIEFING — 2026-09-14T01:57:30Z

## Mission
Design and implement the complete requirement-driven, opaque-box E2E testing suite according to the 4-tier methodology, creating TEST_INFRA.md, tests/e2e/ test suites, and publishing TEST_READY.md.

## 🔒 My Identity
- Archetype: Test Writer
- Roles: specialist, qa
- Working directory: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_test_writer_e2e_1
- Original parent: d45adec3-90dc-401b-bf72-347d22054b28
- Milestone: E2E Testing Suite Creation

## 🔒 Key Constraints
- Test writer writes and modifies TEST CODE ONLY — never implementation code.
- Opaque-box E2E testing: treat system as a black box / interface level (HTTP/API and UI/flow contracts).
- 4-Tier methodology:
  - Tier 1: Core Feature Coverage (>=5 test cases per feature across Auth, Teams, Tracks, Submissions, Leaderboard, Jury, Announcements, Admin)
  - Tier 2: Boundary & Corner Cases (>=5 test cases per feature covering capacity limits, invalid codes, locked track re-locks, non-leader restrictions, score bounds 0-25, etc.)
  - Tier 3: Cross-Feature Combinations & State Matrix (pairwise role x view matrix, state transitions)
  - Tier 4: Real-World Application Scenarios (full end-to-end multi-user hackathon lifecycle)
- Create TEST_INFRA.md and TEST_READY.md at workspace root.
- Provide executable command to run tests (e.g. npm run test:e2e or node tests/e2e/runner.js).
- Handoff report in handoff.md, heartbeat in progress.md, communicate via send_message.

## Current Parent
- Conversation ID: d45adec3-90dc-401b-bf72-347d22054b28
- Updated: not yet

## Task Summary
- **What to build**: Comprehensive 4-tier E2E test suite in tests/e2e/, runner, TEST_INFRA.md, TEST_READY.md
- **Success criteria**: All 4 tiers fully implemented with required case density, runnable via single command, passing or accurately diagnosing implementation status, docs published.
- **Interface contracts**: PROJECT.md, ORIGINAL_REQUEST.md
- **Code layout**: tests/e2e/

## Key Decisions Made
- [TBD based on codebase inspection]

## Artifact Index
- [TBD]

## Loaded Skills
- None

## Quality Status
- Build/test result: Not yet run
- Lint status: Not yet run
- Tests added/modified: Initial setup
