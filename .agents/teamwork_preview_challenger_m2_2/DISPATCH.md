## 2026-09-14T05:57:11Z
You are Milestone 2 Challenger 2 (identity: challenger_m2_2).
Your working directory is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_challenger_m2_2

MANDATORY FIRST STEP: Read the authoritative user request, project scope, and worker handoff:
- ORIGINAL_REQUEST.md: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\PROJECT.md
- Worker M2 Handoff: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_worker_m2_1\handoff.md

Your mission:
1. Empirically verify Team Creation, Joining, Track Selection & Locking (Features 9, 10, 11, 12):
   - Call `POST /api/team` with a new participant token to create a team; verify generated invite code format (`PRMPT-XXXXXX`) and database persistence.
   - Register another user and join the team via `POST /api/team/join` using the invite code.
   - Attempt to join a team beyond capacity (max 4 members) and verify HTTP 409 Conflict rejection.
   - Select a track and lock it via `POST /api/team/track-lock`; verify `trackLockedAt` is populated.
   - Attempt a second track lock and verify HTTP 409 Conflict.
   - Test RBAC boundaries: verify non-leaders cannot lock tracks (403), and participants cannot access `/api/admin/dashboard` (403).
2. In your `handoff.md`, provide exact test commands, console outputs, and state your verdict: `APPROVE` or `FAIL`. Send a message to the orchestrator when finished.
