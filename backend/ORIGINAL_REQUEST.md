# Original User Request

## Initial Request — 2026-09-13T19:12:14Z

Audit and test the new standalone Express/Prisma backend to verify operational readiness, confirm zero Firebase remnants, and perform a full compatibility analysis against the existing Next.js frontend, generating an exhaustive test report and an actionable frontend migration blueprint.

Working directory: C:\Users\ravit\Downloads\promptothon-backend-final-2\backend
Frontend reference: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon
Integrity mode: development

## Context

- The backend codebase at `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend` is an Express.js + Prisma + PostgreSQL + JWT system designed to replace Firebase. It currently lacks installed `node_modules` and a configured `.env`.
- The frontend codebase at `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon` is a Next.js application that historically integrated directly with Firebase Authentication and Firestore.

## Requirements

### R1. Backend Codebase & Firebase Cleanliness Verification
- Audit the entire backend codebase to confirm there are no remaining Firebase SDKs, config files, imports, or references.
- Verify environment configuration templates (`.env.example`) and document all required runtime variables.

### R2. Backend Testing & Operational Health (Without Live Supabase)
- Install backend dependencies and generate Prisma client bindings via `npx prisma generate` (works completely offline without a live database).
- Configure testing with **Prisma Mocking / Unit Testing**: mock `@prisma/client` queries in Jest so tests can run without an active Supabase or PostgreSQL connection.
- Verify core Express middlewares (JWT authentication, role authorization, Zod schema validations, rate limiting, error handling).
- Execute test suites (`npm test`), verify server boot and health probe (`GET /health`), and document pass/fail results.

### R3. Frontend-to-Backend Compatibility & Contract Analysis
- Cross-reference all user-facing frontend workflows (Authentication, Registration, Team Formation, Leaderboard, Submissions, Jury) against the backend Express routes, controllers, and Prisma data models.
- Document all discrepancies between frontend expectations (e.g. Firebase user UID, client-side Firestore document reads/writes) and backend API contracts (e.g. JWT cookies/bearer tokens, REST endpoints, Socket.IO channels).

### R4. Comprehensive Deliverables & Frontend Extension Blueprint
- Produce an organized, detailed Markdown report (`COMPATIBILITY_AND_TESTING_REPORT.md`) containing:
  1. **Backend Test Report**: Test execution logs, route health status, and identified bugs or warnings.
  2. **Firebase Cleanliness Audit**: Confirmation of backend decoupling.
  3. **Compatibility Matrix**: Route-by-route and feature-by-feature mapping between frontend components and backend API endpoints.
  4. **Frontend Migration Blueprint**: Specific, actionable instructions on what Firebase code to delete in the frontend, how to implement JWT authentication context/hooks, how to connect existing UI components to the new REST endpoints, and what missing UI features need to be built (e.g., jury scoring, admin settings, live socket leaderboard).

## Acceptance Criteria

### Backend Verification
- [ ] Backend dependencies install cleanly with `npm install` and `npx prisma generate` runs without error.
- [ ] Automated tests run via `npm test` and every suite's pass/fail status is recorded in the report.
- [ ] Backend server initializes and responds to `/health`.

### Contract & Gap Analysis
- [ ] Every frontend file containing Firebase calls (`@/app/firebase`, `firebase/auth`, `firebase/firestore`) is cataloged with its backend replacement target.
- [ ] Complete endpoint compatibility table comparing method, URL, expected auth header/cookie, request body, and response payload.
- [ ] Itemized list of new frontend API services and UI pages required to achieve parity with the backend feature set.
