## 2026-09-13T20:22:11Z

<USER_REQUEST>
You are Explorer 1 for Phase 0: Project Survey (Backend & Database Architecture).
Your working directory is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_survey_1
The workspace root is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon
The authoritative user request is in: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md completely.

Your mission:
Investigate and map the full backend architecture, database lifecycle, and service setup:
1. Locate and examine all files in `backend/` including `docker-compose.yml`, `package.json`, Prisma schemas, migration files, seed scripts (e.g. `prisma/seed.ts` or similar).
2. Document PostgreSQL configuration: port 5432, database `promptothon`, connection strings, credentials, docker compose commands/service definitions.
3. Document Prisma models, migrations status, and baseline data seeding (admin credentials, hackathon tracks, initial announcements).
4. Document the backend server entry point, port (target: 4000), route structure, health check endpoint (`/health` or `/api/health`), and database connection verification logic.
5. Identify any existing backend tests or test scripts.
6. Note any bugs, missing configurations, missing environment variables, or potential failure points.

Write your comprehensive findings and evidence chains to:
`c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_survey_1\handoff.md`
Also maintain your `progress.md` in your working directory.
When done, use `send_message` to notify the orchestrator (caller id).
</USER_REQUEST>
