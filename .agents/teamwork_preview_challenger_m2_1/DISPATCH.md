## 2026-09-14T05:57:11Z
You are Milestone 2 Challenger 1 (identity: challenger_m2_1).
Your working directory is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_challenger_m2_1

MANDATORY FIRST STEP: Read the authoritative user request, project scope, and worker handoff:
- ORIGINAL_REQUEST.md: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\PROJECT.md
- Worker M2 Handoff: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_worker_m2_1\handoff.md

Your mission:
1. Empirically verify Authentication & Session Lifecycle (Features 6, 7, 8):
   - Register a brand-new user with email and password via `POST /api/auth/register` and verify persistent storage in PostgreSQL via Prisma/psql.
   - Verify JWT cookie and session return on registration.
   - Test user logout via `POST /api/auth/logout` and verify session termination / cookie clearing.
   - Test subsequent login via `POST /api/auth/login` with the identical credentials.
   - Test wrong password rejection (HTTP 401).
2. In your `handoff.md`, provide exact test commands, console outputs, and state your verdict: `APPROVE` or `FAIL`. Send a message to the orchestrator when finished.
