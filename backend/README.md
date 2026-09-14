# Promptothon — Backend

Express.js API for Promptothon: RBAC auth, team formation, networking
directory, jury evaluation with transparent anonymization, and a
real-time score-frozen-aware leaderboard. Framework/stack per the
technical spec: Node.js + Express + Prisma + PostgreSQL + JWT +
Socket.IO + Zod.

Full endpoint-by-endpoint reference: **[docs/API.md](docs/API.md)**.
Postman collection: **[postman/promptothon.postman_collection.json](postman/promptothon.postman_collection.json)**.

## Setup

Unified env template lives at the repo root (`../.env.example`).
The API reads ONLY the root `.env` (single-file deploy);
`backend/.env.test` isolates Jest. Do not create `backend/.env`.

```bash
npm install
cp ../.env.example ../.env   # run from backend/, or `cp .env.example .env` from repo root — then fill in real secrets
npx prisma generate
npx prisma migrate dev --name init
npm run seed            # creates the ADMIN user + a full dev dataset
npm run dev
```

Docker (full stack from repo root):

```bash
docker compose up --build
docker compose exec api npx prisma migrate deploy  # first boot only
docker compose exec api npm run seed                # first boot only
```

Server boots on `PORT` (default 4000) with Socket.IO attached to the
same HTTP server. `GET /health` → `{ ok: true }`.

## Structure

```
src/
  server.js          # HTTP + Socket.io bootstrap
  app.js             # Express app: middleware stack + route mounting
  config/prisma.js   # shared PrismaClient singleton
  middleware/         auth.js (requireAuth/requireRole/optionalAuth), rateLimiter.js, errorHandler.js
  utils/               ApiError, asyncHandler, auditLog, jwt, teamCode, anonymizer,
                       settings (freeze flag + deadlines), teamCapacity (atomic seat
                       reservation), storage (presigned pitch-deck uploads)
  sockets/            live leaderboard broadcast (public + per-track rooms), score-freeze aware
  modules/
    auth/             register (create/join/solo), login, logout, me
    team/             get my team, join a team post-registration, lock track selection
    tracks/            problem-statement CMS (admin CRUD + public read)
    submissions/       repo/live/video upsert, draft vs. final submit, pitch-deck upload flow
                       (routes mounted under /api/team)
    networking/         check-in + filtered/paginated attendee directory
    jury/               assignment-scoped queue + score-locking evaluation engine
    admin/              dashboard, settings/deadlines, freeze-scores, jury assignment
                        CRUD, audit log access
    leaderboard/        GET /api/leaderboard — aggregated + jury-anonymized
prisma/
  schema.prisma
  seed.js             # idempotent: admin, jury, teams/tracks, assignments, evaluations
tests/                 Jest + Supertest integration tests against a real Postgres DB
postman/                Postman collection covering every endpoint
docs/API.md             Full API reference
```

## Implemented endpoints

| Method | Endpoint                              | Notes |
|--------|-----------------------------------------|-------|
| POST   | `/api/auth/register`                    | create / join / solo |
| POST   | `/api/auth/login`                       | |
| POST   | `/api/auth/logout`                      | |
| GET    | `/api/auth/me`                          | |
| GET    | `/api/team/me`                          | |
| POST   | `/api/team/join`                        | post-registration join (e.g. after networking) |
| POST   | `/api/team/track-lock`                  | leader-only, deadline-aware |
| POST   | `/api/team/submission`                  | leader-only, deadline + immutability aware |
| GET    | `/api/team/submission`                  | |
| POST   | `/api/team/submission/upload-url`       | presigned pitch-deck upload |
| POST   | `/api/team/submission/pitch-deck`       | persist uploaded pitch-deck reference |
| GET    | `/api/tracks`, `/api/tracks/:id`        | + admin create/update/delete |
| GET    | `/api/networking/attendees`             | filters + pagination |
| POST   | `/api/networking/check-in`              | |
| GET    | `/api/jury/queue`                       | assignment-scoped only |
| POST   | `/api/jury/evaluate`                    | server-computed total, draft/lock |
| GET    | `/api/jury/evaluations/:teamId`         | role-scoped (admin=real IDs, assigned jury/team-mate=anonymized) |
| POST   | `/api/jury/magic-link/request`          | public, jury pre-provisioning login |
| POST   | `/api/jury/magic-link/verify`           | public |
| GET    | `/api/leaderboard`                      | public, jury-anonymized, normalization-aware |
| GET    | `/api/profile`, `PATCH /api/profile`    | whitelist-only self-service |
| GET    | `/api/announcements`                    | authenticated dashboard feed |
| GET    | `/api/notifications`                    | own notifications only, paginated |
| PATCH  | `/api/notifications/:id/read`           | own notification only |
| PATCH  | `/api/notifications/read-all`           | |
| GET    | `/api/admin/dashboard`                  | |
| GET/PATCH | `/api/admin/settings`                | deadlines + `normalizationEnabled` |
| GET    | `/api/admin/score-status`               | |
| POST   | `/api/admin/freeze-scores`              | |
| GET/POST/DELETE | `/api/admin/jury-assignments`  | |
| GET/POST/PATCH/DELETE | `/api/admin/announcements` | |
| GET    | `/api/admin/audit-logs`                 | |

## Supabase setup

1. Create a project at supabase.com.
2. **Database**: Project Settings -> Database -> Connection string. Copy
   the pooled (port 6543, `?pgbouncer=true`) URL into `DATABASE_URL` and
   the direct (port 5432) URL into `DIRECT_URL`. Prisma migrations use
   `DIRECT_URL`; every runtime query uses `DATABASE_URL`.
3. **API keys**: Project Settings -> API. Copy `SUPABASE_URL`,
   `anon` `public` key into `SUPABASE_ANON_KEY`, and the `service_role`
   key into `SUPABASE_SERVICE_ROLE_KEY`. The service-role key is
   server-side only — it's read exclusively by
   `src/services/storage/supabaseStorage.js` and is never returned in any
   API response or logged.
4. **Storage bucket**: Storage -> New bucket -> name it `pitch-decks`
   (or set `PITCH_DECK_BUCKET`) -> **leave "Public bucket" OFF**. No RLS
   policies are required since every read/write goes through the
   service-role key server-side (see file for details); the app issues
   short-lived signed upload/download URLs instead of exposing the bucket.
5. `npm install && npx prisma generate && npx prisma migrate deploy`
6. `npm run seed`

## Notifications

`Notification` rows are fanned out (not just socket events) for: jury
assignment (`JURY_ASSIGNED`), evaluation lock (`EVALUATION_LOCKED`, sent to
the scored team, never revealing which jury member locked it), a new
1-click connection (`CONNECTION_REQUEST`), and any immediately-visible
announcement (`ANNOUNCEMENT`). All three endpoints
(`GET /api/notifications`, `PATCH /api/notifications/:id/read`,
`PATCH /api/notifications/read-all`) are scoped to `req.user.id` only —
there is no ID-based path to another user's notifications.

## Email delivery

`src/services/email/emailService.js` abstracts outbound email behind a
single `sendMail()` call. No vendor is wired up by default — it logs to
the console (or, in production with `EMAIL_PROVIDER` unset, logs a
warning and does not deliver) so `POST /api/jury/magic-link/request`
works out of the box without live plumbing. The raw magic-link token is
only ever included in the API response when `NODE_ENV !== "production"`
(`devToken`); in production it is delivered exclusively through
`sendMail()`. Add a real provider by extending `emailService.js` — no
other file needs to change.

## Score normalization (spec §17)

Off by default (`SystemSetting.normalizationEnabled = false`) — raw
scores drive the leaderboard. An admin can flip it on via
`PATCH /api/admin/settings { "normalizationEnabled": true }`. When on,
`src/services/normalization/normalizationService.js` re-centers each jury
member's scores (per rubric criterion) onto the event-wide mean/stddev
using a z-score, so a harsh grader and a generous grader contribute
comparably. Raw `Evaluation` rows are never modified — normalization is
computed in memory at leaderboard build time only.

## Testing

```bash
cp ../.env.example .env.test  # point DATABASE_URL at a throwaway test DB (NODE_ENV=test, PORT=4001)
npx dotenv -e .env.test -- npx prisma migrate deploy
npm test                      # unit; `npm run test:integration` / `npm run test:all` for the full suites
```

See `tests/` and `docs/API.md` → Testing for details. The suite covers
auth, team formation (including the atomic capacity race fix), submission
rules (deadline + immutability), jury evaluation (assignment scoping,
score validation, lock immutability, self-evaluation guard), anonymization
(no real juryId ever leaks; independent per-team aliasing), leaderboard
aggregation/ranking/ties/freeze behavior, and admin authorization.

## Notes / decisions

- **Prisma schema** was originally inferred from the existing controllers,
  then extended for this pass: `User.checkedInAt` (networking), `Team.memberCount`
  (atomic capacity — see `src/utils/teamCapacity.js`), `Submission.pitchDeckKey/Url`.
- **Team capacity** is enforced with a single conditional `UPDATE ... WHERE memberCount < capacityMax`
  inside the join transaction, not a separate `COUNT(*)` read, to close the
  last-seat race condition.
- **Deadlines** (`trackSelectionDeadline`, `submissionDeadline`) and the
  score-freeze flag all live in the existing generic `SystemSetting` table,
  accessed through the typed helpers in `src/utils/settings.js` — no new
  migration needed to add another admin toggle later.
- **File uploads**: `src/utils/storage.js` fronts the presigned-URL
  interface with `local` (default — PDFs on server disk under
  `LOCAL_STORAGE_DIR`, persistent `pitchdeck_data` volume in compose)
  and `disabled` (endpoints return 501) providers, plus a real S3 driver
  and Supabase driver (`src/services/storage/`). The AWS SDK is lazily
  `require()`d so the server boots with zero new dependencies until
  `STORAGE_PROVIDER=s3` is actually set. See root `.env.example`.
- **Rate limiting** is in-memory (`express-rate-limit`), fine for a single
  instance; `src/middleware/rateLimiter.js` documents how to swap in a
  Redis-backed store if this scales horizontally. `ioredis` is already a
  listed dependency but unused by default.
- **CORS** now defaults to `http://localhost:3000` instead of `"*"` —
  `credentials: true` with a wildcard origin is unsafe (and browsers
  reject the combination anyway).
