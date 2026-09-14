# Prompt Techies Hackathon — Promptothon

Full-stack hackathon platform: public site + participant workflows + jury evaluation + real-time leaderboard + admin console.

Monorepo layout:

- **Frontend (`./src/`)** — Next.js 14 App Router, Tailwind CSS, Axios client (`src/lib/api.js`), Socket.IO client (`src/lib/socket.js`), React Hook Form + Zod.
- **Backend (`./backend/`)** — Node.js + Express + Prisma + PostgreSQL + JWT + Socket.IO + Zod. See [`backend/README.md`](backend/README.md) and [`backend/docs/API.md`](backend/docs/API.md).
- **DB** — PostgreSQL 16 (`promptothon`), 13 Prisma models (`User`, `Team`, `TeamMember`, `Track`, `Submission`, `JuryAssignment`, `Evaluation`, `SystemSetting`, `AuditLog`, `Announcement`, `Notification`, `Connection`, `MagicLinkToken`).
- **Infra** — `docker-compose.yml` (web + api + db), `Dockerfile` (frontend), `backend/Dockerfile` (API).

Data flow: Next.js UI → Axios → Express routes → Controller/Service → Prisma → PostgreSQL. Live updates via Socket.IO (`leaderboard:update`, `scores:freeze`, `announcement:new`).

## Features

- Auth: register (create / join / solo), login, logout, `me`, HTTP-only JWT cookie + Bearer support, RBAC (Participant, Leader, Jury, Admin).
- Teams: create with unique name + 6-char invite code, join by code (cap 4, atomic seat reservation), track select + leader-only track-lock (deadline-aware).
- Submissions: repo/live/video upsert, draft vs. final submit, pitch-deck upload via presigned/local URLs.
- Tracks: problem-statement CMS (admin CRUD + public read).
- Jury: assignment-scoped queue, rubric scoring with draft/lock, self-evaluation guard, anonymized jury aliases (HMAC).
- Leaderboard: public, jury-anonymized, freeze-aware, optional z-score normalization.
- Networking: check-in + filtered/paginated attendee directory.
- Admin: dashboard stats, deadlines/settings, freeze-scores, jury assignments, announcements CRUD, audit logs.
- Realtime: Socket.IO leaderboard broadcast (public + per-track rooms).
- Extras: announcements feed + toasts, notifications fan-out, Ask PT chatbot (Groq).

## Prerequisites

- Node.js >= 18, npm >= 10
- Docker + Docker Compose (for Postgres, or full-stack run)
- Groq API key (optional, only for Ask PT chatbot: `NEXT_PUBLIC_GROQ_API_KEY`)

## Quickstart

### 1. Env (single unified template)

```bash
cp .env.example .env   # fill JWT_SECRET, JURY_ALIAS_SALT, POSTGRES_PASSWORD, ADMIN_PASSWORD
```

Frontend reads root `.env` (`NEXT_PUBLIC_*`). Backend reads ONLY root `.env` (`backend/.env` is not read — do not create it). See `.env.example` header for the full prod checklist and test overrides.

### 2a. Full stack with Docker (recommended)

```bash
docker compose up --build
# web -> http://localhost:3000, api -> http://localhost:4000, db -> localhost:5432
# first boot only:
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run seed
```

Changing any `NEXT_PUBLIC_*` var requires `docker compose build web` (Next.js bakes them in at build time).

### 2b. Local dev (without Docker, needs local Postgres)

```bash
# terminal 1 — backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed   # creates ADMIN user + dev dataset
npm run dev    # :4000, GET /health -> { ok: true }

# terminal 2 — frontend (repo root)
npm install
npm run dev    # :3000
```

Health: `GET http://localhost:4000/health` and `GET http://localhost:4000/api/health` → `{ ok: true, database: { connected: true } }`.

Default seed admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (defaults in `.env.example`: `admin@promptothon.dev` / `ChangeMe123!` — change in prod).

## Project structure

```
src/app/            Next.js routes: /, /login, /register, /teamdetails,
                    /submission, /leaderboard, /jury, /announcements,
                    /admin, /networking, /About-sectioned, /preptember
src/components/     UI components (incl. chatbot.js -> Ask PT)
src/lib/            api.js (Axios), socket.js (Socket.IO), utils
backend/src/        server.js, app.js, config/, middleware/,
                    utils/, sockets/, services/, modules/
backend/prisma/     schema.prisma, seed.js, migrations/
backend/tests/      Jest unit + Supertest integration tests
backend/docs/API.md Full endpoint-by-endpoint API reference
backend/postman/    Postman collection covering every endpoint
tests/e2e/          Tier 1-4 E2E suite (node tests/e2e/runner.js)
```

## Frontend routes

| Route | Purpose |
|-------|---------|
| `/` | Hero CTA, tracks, timeline, mentors |
| `/login`, `/register` | Auth forms with Zod validation |
| `/teamdetails` | Team info, invite-code copy, track select + lock |
| `/submission` | Repo URL, tags, pitch-deck `{ key, url }`, submit |
| `/leaderboard` | Public ranking, track filter, realtime updates |
| `/jury` | Evaluation queue, rubric sliders, draft/lock |
| `/announcements` | Feed with priority tags + realtime toasts |
| `/admin` | Stats, score freeze, jury assign, announcements |
| `/networking` | Check-in + attendee directory |

API base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). Socket URL: `NEXT_PUBLIC_SOCKET_URL`.

## Backend API (summary)

Full reference: [`backend/docs/API.md`](backend/docs/API.md).

| Area | Key endpoints |
|------|---------------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Team | `GET /api/team/me`, `POST /api/team/join`, `POST /api/team/track-lock` |
| Submission | `POST /api/team/submission`, `GET /api/team/submission`, `POST /api/team/submission/upload-url`, `POST /api/team/submission/pitch-deck` |
| Tracks | `GET /api/tracks`, `GET /api/tracks/:id` (+ admin CRUD) |
| Jury | `GET /api/jury/queue`, `POST /api/jury/evaluate`, `GET /api/jury/evaluations/:teamId`, `POST /api/jury/magic-link/*` |
| Leaderboard | `GET /api/leaderboard` (public, anonymized, freeze-aware) |
| Networking | `GET /api/networking/attendees`, `POST /api/networking/check-in` |
| Admin | `/api/admin/dashboard`, `/api/admin/settings`, `/api/admin/score-status`, `POST /api/admin/freeze-scores`, jury-assignments, announcements, audit-logs |
| Misc | `GET /api/profile` + `PATCH`, `GET /api/announcements`, `GET/PATCH /api/notifications` |

## Scripts

```bash
# frontend (repo root)
npm run dev        # Next.js dev :3000
npm run build      # production build (must pass with zero errors)
npm start          # serve production build
npm run lint       # Next.js lint
npm run test:e2e   # node tests/e2e/runner.js (Tiers 1-4)

# backend (./backend)
npm run dev               # nodemon src/server.js :4000
npm start                 # node src/server.js
npm run seed              # seed admin + dev dataset
npm test                  # Jest unit tests
npm run test:integration  # Supertest integration tests (needs test DB)
npm run test:all          # all Jest suites
```

## Testing

- Backend unit: `cd backend && npm test` (auth middleware, utils).
- Backend integration (real Postgres): point `backend/.env.test` at `promptothon_test` (`NODE_ENV=test`, `PORT=4001`), `npx prisma migrate deploy`, then `npm run test:integration`. Covers auth, team capacity race, submissions, jury scoping/locks, anonymization, leaderboard freeze, admin auth.
- E2E (frontend + API): `npm run test:e2e` — Tiers 1-4 across auth, teams, tracks, submissions, jury, leaderboard, announcements, admin.
- Production gate: `npm run build` clean + backend suites green + E2E lifecycle (register → team → track-lock → submit) passing.

## Deployment

- VPS single-file deploy: `cp .env.example .env`, fill secrets (`JWT_SECRET`, `JURY_ALIAS_SALT`, `POSTGRES_PASSWORD`, `ADMIN_PASSWORD`, `NODE_ENV=production`, `SITE_URL`/`CLIENT_ORIGIN`), then `docker compose up --build -d`.
- Pitch decks default to `STORAGE_PROVIDER=local` on a persistent `pitchdeck_data` volume (`/data/pitch-decks`); `disabled` returns 501.
- CORS defaults to `CLIENT_ORIGIN` (`http://localhost:3000` locally) with `credentials: true`.
- Rate limiting is in-memory by default; see `backend/src/middleware/rateLimiter.js` for Redis swap.
