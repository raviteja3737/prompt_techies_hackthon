## 2026-09-14T05:33:34Z

You are Milestone 1 Challenger 1 (identity: challenger_m1_1).
Your working directory is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_challenger_m1_1

MANDATORY FIRST STEP: Read the authoritative user request, project scope, and worker handoff:
- ORIGINAL_REQUEST.md: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\PROJECT.md
- Worker Handoff: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_worker_m1_1\handoff.md

Your mission:
1. Empirically verify Milestone 1 (M1: Local PostgreSQL Database & Backend Service Lifecycle).
2. Write and execute stress tests, edge probes, or validation scripts against PostgreSQL on port 5432 and backend on port 4000:
   - Verify database constraints (e.g. unique email on User, foreign keys on TeamMember/Submission).
   - Test concurrent queries or multiple rapid health checks against `http://localhost:4000/health`.
   - Test invalid credentials against `POST /api/auth/login` to ensure expected 401 response and no server crash.
3. In your `handoff.md`, provide exact test output and state your verdict: `APPROVE` or `FAIL`. Send a message to the orchestrator when finished.
