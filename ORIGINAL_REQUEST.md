# Original User Request

## Initial Request — 2026-09-13T20:20:56Z

Execute full-stack testing, local PostgreSQL database provisioning, end-to-end authentication and track selection verification, comprehensive frontend button and navigation auditing, automatic error resolution, and production readiness certification for the Prompt Techies Hackathon application.

Working directory: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon
Integrity mode: development

## Requirements

### R1. Local PostgreSQL Database & Backend Service Lifecycle
- Provision and verify a running local PostgreSQL instance on port 5432 with database `promptothon` (using Docker container via `backend/docker-compose.yml` or native service).
- Run Prisma migrations and seed the database with required baseline data (admin credentials, hackathon tracks, initial announcements).
- Ensure the backend service in `backend/` starts and operates cleanly on port 4000 with live database connectivity.

### R2. End-to-End Authentication & Hackathon Workflow
- Test new account registration using email and password, verify persistent storage in the database, and verify session generation.
- Test user logout and subsequent login using the identical email and password credentials.
- Verify team creation, team joining via team invite/join code, track selection, and track locking in `/teamdetails`.
- Verify role-based routing and authorization for participants, team leaders, jury reviewers, and administrators.

### R3. Comprehensive Frontend UI & Button Audit
- Audit all interactive buttons, links, navigation bars, modals, and submission controls across all application routes (`/`, `/login`, `/register`, `/teamdetails`, `/submission`, `/leaderboard`, `/jury`, `/announcements`, `/admin`).
- Ensure no broken links, unresponsive buttons, unhandled promise rejections, or console exceptions occur during user interactions.

### R4. Error Triaging, Resolution & Production Hardening
- Automatically identify and fix any encountered bugs, including API payload mismatches, missing route handlers, database schema constraints, or frontend state race conditions.
- Ensure the Next.js production build (`npm run build`) executes cleanly with zero errors or warnings.
- Ensure backend test suites execute and pass.

### R5. Final Multi-Feature Regression & Certification
- Conduct an exhaustive final regression run verifying all major workflows (auth, team management, track locking, project submission, jury grading, leaderboard updates, announcements, and admin controls).
- Certify the complete application as production-ready with documented test results.

## Acceptance Criteria

### Database & Backend Connectivity
- [ ] PostgreSQL is accessible on `localhost:5432` and Prisma migration (`npx prisma migrate dev` / `prisma db push`) is applied with all models.
- [ ] Backend server on port 4000 returns HTTP 200 on health endpoint with `database.connected: true`.

### Authentication & Account Flow
- [ ] New user registration with email and password creates a valid user record in PostgreSQL and signs the user in.
- [ ] Logging out and logging back in with the exact same email and password succeeds and navigates to the authenticated dashboard.

### Team & Track Operations
- [ ] Team creation and join-code generation persist in the database.
- [ ] Selecting a problem track and locking the track updates the team record and freezes track modification as intended.

### Frontend Interactions & Buttons
- [ ] Every button and action element across all 9 primary views performs its intended action without uncaught runtime errors.
- [ ] Form validations provide clear visual feedback upon empty or invalid inputs.

### Build & Test Quality Gate
- [ ] `npm run build` in the root frontend directory succeeds with exit code 0.
- [ ] Backend tests run and pass with zero failures.
- [ ] End-to-end sanity check verifies the entire user lifecycle from registration to project submission.
