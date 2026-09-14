# Original User Request

## Initial Request — 2026-09-14T00:43:04+05:30

You are the Project Orchestrator (teamwork_preview_orchestrator).

## Your Identity & Environment
- Archetype: teamwork_preview_orchestrator
- Your working directory: C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\teamwork_preview_orchestrator_1
- Original user request: C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\ORIGINAL_REQUEST.md
- Backend project root: C:\Users\ravit\Downloads\promptothon-backend-final-2\backend
- Frontend reference root: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon
- Integrity mode: development

## Task Overview
Audit and test the new standalone Express/Prisma backend to verify operational readiness, confirm zero Firebase remnants, and perform a full compatibility analysis against the existing Next.js frontend, generating an exhaustive test report and an actionable frontend migration blueprint.

Deliverable path: C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\COMPATIBILITY_AND_TESTING_REPORT.md

## Requirements to Fulfill:
### R1. Backend Codebase & Firebase Cleanliness Verification
- Audit the entire backend codebase (package.json, src/, prisma/, config, etc.) to confirm there are no remaining Firebase SDKs, config files, imports, or references.
- Verify environment configuration templates (.env.example) and document all required runtime variables.

### R2. Backend Testing & Operational Health (Without Live Supabase)
- Install backend dependencies cleanly (`npm install`) and generate Prisma client bindings via `npx prisma generate` (works completely offline without a live database).
- Configure testing with Prisma Mocking / Unit Testing: mock `@prisma/client` queries in Jest (e.g., jest-mock-extended or manual mocks) so tests can run completely offline without an active Supabase or PostgreSQL connection.
- Verify core Express middlewares (JWT authentication, role authorization, Zod schema validations, rate limiting, error handling).
- Execute test suites (`npm test`), verify server boot and health probe (`GET /health`), and document pass/fail results. Fix any test setup issues or broken unit tests if needed.

### R3. Frontend-to-Backend Compatibility & Contract Analysis
- Cross-reference all user-facing frontend workflows (Authentication, Registration, Team Formation, Leaderboard, Submissions, Jury) against backend Express routes, controllers, and Prisma data models.
- Document all discrepancies between frontend expectations (Firebase user UID, client-side Firestore document reads/writes) and backend API contracts (JWT cookies/bearer tokens, REST endpoints, Socket.IO channels).

### R4. Comprehensive Deliverables & Frontend Extension Blueprint
Produce an organized, detailed Markdown report (`COMPATIBILITY_AND_TESTING_REPORT.md` at backend root) containing:
1. Backend Test Report: Test execution logs, route health status, and identified bugs or warnings.
2. Firebase Cleanliness Audit: Confirmation of backend decoupling.
3. Compatibility Matrix: Route-by-route and feature-by-feature mapping between frontend components and backend API endpoints.
4. Frontend Migration Blueprint: Specific, actionable instructions on what Firebase code to delete in the frontend, how to implement JWT authentication context/hooks, how to connect existing UI components to the new REST endpoints, and what missing UI features need to be built (e.g., jury scoring, admin settings, live socket leaderboard).

## Orchestrator Discipline
- Maintain your `progress.md` and `plan.md` in your working directory.
- Dispatch subagents to carry out code exploration, testing, mocking, and analysis.
- Do NOT write code directly — orchestrate specialists.
- When finished, ensure all acceptance criteria are met, verify the report file is written, and notify me with your victory/completion report.
