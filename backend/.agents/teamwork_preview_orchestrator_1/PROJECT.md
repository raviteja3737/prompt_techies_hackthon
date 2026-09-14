# Project: Standalone Express/Prisma Backend Audit, Offline Testing & Frontend Migration

## Architecture
- Backend: Standalone Express 4 + Prisma ORM + PostgreSQL + Socket.IO + JWT (HTTP-only cookie + Bearer) + Zod + In-memory Rate Limiter
- Frontend: Next.js 14.2 App Router + React 18 + Tailwind CSS + Axios + Zod

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Firebase Cleanliness Audit | Verify 0% Firebase in backend (deps, configs, imports, env) | M1 | Survey Explorer 1 |
| 2 | Runtime Environment Configuration | Audit .env.example, document all 22 required/optional vars | M1 | Survey Explorer 1 |
| 3 | Offline Prisma Client Generation | Offline `npx prisma generate` parsing schema without live DB | M2 | Survey Explorer 2 |
| 4 | Offline Prisma Mocking Layer | Manual Jest mock for `src/config/prisma.js` to simulate DB queries | M2 | Survey Explorer 2 |
| 5 | Health Probe Verification | Validate `GET /health` offline with connected/unreachable states | M2 | Survey Explorer 2 |
| 6 | Core Middleware Test Suite | Offline tests for `requireAuth`, `requireRole`, `optionalAuth`, Zod 422, 404, 409, 500, Rate Limiting | M2 | Survey Explorer 2 |
| 7 | Route Unit & Offline Test Execution | Offline test suite verifying auth/team/health routes; passing `npm test` | M2 | Survey Explorer 2 |
| 8 | Frontend-to-Backend Contract Mapping | Exhaustive route-by-route and feature mapping between Next.js UI and Express REST | M3 | Survey Explorer 3 |
| 9 | Frontend Discrepancies & Gap Identification | Document Auth UID vs cuid, team invite codes, relational vs Firestore, missing pages | M3 | Survey Explorer 3 |
| 10 | Master Report & Migration Blueprint | Compilation of COMPATIBILITY_AND_TESTING_REPORT.md deliverable | M4 | Synthesis & Review |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Survey & Cleanliness Audit | Verify zero Firebase remnants in backend & document env vars | none | DONE |
| 2 | Offline Testing & Operational Health | Install deps, generate Prisma client offline, create Prisma mock, write unit/offline tests, verify /health & middlewares, execute `npm test` | M1 | DONE |
| 3 | Frontend Contract & Compatibility Analysis | Cross-reference all frontend components vs backend REST/Socket contracts | M1 | DONE |
| 4 | Master Deliverable & Migration Blueprint | Author COMPATIBILITY_AND_TESTING_REPORT.md and verify all acceptance criteria | M2, M3 | DONE |

## Interface Contracts
### Auth Module ↔ Client
- `POST /api/auth/register`: `{ intent: "create" | "join" | "solo", name, email, password (min 8), ... }` -> 201 `{ user, token }` + Cookie `promptothon_token`
- `POST /api/auth/login`: `{ email, password }` -> 200 `{ user, token }` + Cookie `promptothon_token`
- `POST /api/auth/logout`: -> 204 No Content, clears cookie
- `GET /api/auth/me`: -> 200 `{ user }`

### Team Module ↔ Client
- `GET /api/team/me`: -> 200 `{ team, members, submission, track }`
- `POST /api/team/join`: `{ inviteCode }` -> 200 `{ team }`
- `POST /api/team/track-lock`: `{ trackId }` -> 200 `{ team }`

### Health Probe
- `GET /health`: -> 200 `{ ok: true, uptimeSeconds, database: { connected: boolean, error?: string }, storage, redis }`
