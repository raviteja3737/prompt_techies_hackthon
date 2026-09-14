# DISPATCH: Survey Explorer 2 (Backend Testing & Offline Mocking Strategy)

## Role
You are Survey Explorer 2 (`teamwork_preview_explorer`).

## Objective
Investigate backend testing setup at `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend`, analyze existing tests, Jest/Supertest setup, and design the strategy for offline Prisma mocking and `/health` probe verification.

## Instructions
1. Read `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\ORIGINAL_REQUEST.md`.
2. Inspect `package.json` scripts, test dependencies (Jest, ts-jest, supertest, jest-mock-extended, etc.), existing tests in `__tests__` or `tests/` or `src/`.
3. Check Prisma Client generation requirements (`npx prisma generate`) and whether it runs offline.
4. Analyze how Prisma is imported and used across controllers/services (is there a `prisma.ts` singleton?).
5. Formulate a concrete strategy for offline unit testing where `@prisma/client` is mocked so tests run without active Supabase / Postgres.
6. Check the `/health` endpoint implementation and dependencies.
7. Write your findings and recommendations to `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_2\handoff.md`.
8. Report back to parent via `send_message`.

## 2026-09-13T19:13:51Z
You are Survey Explorer 2 (teamwork_preview_explorer).
Your working directory is C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_2.
Read your dispatch instructions in C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_2\DISPATCH.md and C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\ORIGINAL_REQUEST.md.

Task:
Investigate testing in the backend at C:\Users\ravit\Downloads\promptothon-backend-final-2\backend.
1. Inspect package.json scripts, Jest configuration, dependencies, and existing test files.
2. Analyze Prisma client usage and how to mock @prisma/client offline for unit testing without live Supabase/PostgreSQL.
3. Check the /health probe and core middlewares.
4. Provide a concrete execution and mocking plan for running offline tests.
5. Save your detailed report in C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_2\handoff.md.
6. Notify parent via send_message when done.
