# Promptothon Backend — API Reference

Base URL (local): `http://localhost:4000`

All request/response bodies are JSON. Authenticated requests use either:
- the `promptothon_token` HTTP-only cookie (set automatically by
  `/api/auth/login` and `/api/auth/register`), **or**
- an `Authorization: Bearer <token>` header (the same token is returned
  in the JSON body of login/register responses — convenient for curl/
  Postman/automated tests).

Error responses are always `{ "error": "message", "details"?: {...} }`.
Validation failures (Zod) return `422` with `details` from `err.flatten()`.

---

## Auth — `/api/auth`

### POST /api/auth/register
One endpoint, three flows via `intent`.

**Create a team (leader)**
```json
{
  "intent": "create",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "SuperSecret123",
  "teamName": "Team Analytical Engine",
  "college": "Cambridge",
  "skills": ["Python", "Rust"],
  "githubUrl": "https://github.com/ada",
  "linkedinUrl": "https://linkedin.com/in/ada"
}
```

**Join a team (member)**
```json
{ "intent": "join", "name": "Bob", "email": "bob@example.com", "password": "SuperSecret123", "teamCode": "PRMPT-XXXXXX" }
```

**Solo (matchmaking)**
```json
{ "intent": "solo", "name": "Cy", "email": "cy@example.com", "password": "SuperSecret123" }
```

Response `201`: `{ "user": {...}, "token": "..." }` (cookie also set).

### POST /api/auth/login
`{ "email": "...", "password": "..." }` → `200 { "user": {...}, "token": "..." }`

### POST /api/auth/logout
No body. Clears the cookie. `204`.

### GET /api/auth/me
Requires auth. `200 { "user": {...} }`.

---

## Team — `/api/team`

All routes require auth + role `PARTICIPANT`.

- `GET /api/team/me` → `{ "team": {...}, "myRole": "LEADER" | "MEMBER" }`
- `POST /api/team/join` — for an already-registered participant with no
  team (e.g. found teammates via networking). `{ "teamCode": "..." }`
- `POST /api/team/track-lock` — leader only, one-way.
  `{ "trackId": "..." }`. Rejected after `trackSelectionDeadline` (see
  Admin → Settings) or if already locked.

---

## Submissions — `/api/team` (mounted alongside team routes)

Leader-only, requires a locked track first. A `SUBMITTED` submission is
immutable. Rejected after `submissionDeadline`.

- `POST /api/team/submission`
  ```json
  { "repoUrl": "https://github.com/org/repo", "liveUrl": "...", "videoUrl": "...", "techTags": ["Next.js"], "submit": false }
  ```
  `submit: true` finalizes as `SUBMITTED` (records `submittedAt`).
- `GET /api/team/submission`
- `POST /api/team/submission/upload-url` — `{ "contentType": "application/pdf" }` →
  presigned upload URL (see Environment Variables → storage). Returns
  `501` if `STORAGE_PROVIDER` isn't configured.
- `POST /api/team/submission/pitch-deck` — `{ "key": "...", "url": "..." }`,
  called after a successful direct upload to persist the reference.

---

## Tracks — `/api/tracks`

- `GET /api/tracks` — any authenticated user.
- `GET /api/tracks/:id`
- `POST /api/tracks` — admin only. `{ "title", "description", "guidelines"?, "datasetUrl"?, "capacity"? }`
- `PATCH /api/tracks/:id` — admin only, partial update.
- `DELETE /api/tracks/:id` — admin only.

---

## Networking — `/api/networking`

Requires auth + role `PARTICIPANT`.

- `POST /api/networking/check-in` — marks the caller discoverable.
- `GET /api/networking/attendees?skill=&technology=&college=&search=&page=&pageSize=`
  → `{ "attendees": [{ id, name, college, skills, githubUrl, linkedinUrl, hasTeam, teamName }], "pagination": {...} }`
  Never returns email, passwordHash, or role.

---

## Jury — `/api/jury`

Requires auth + role `JURY`. A jury member only ever sees/affects teams
they've been assigned (`JuryAssignment`).

- `GET /api/jury/queue` → list of `{ assignmentId, team, track, submission, evaluation, status }`
  for teams assigned to the caller.
- `POST /api/jury/evaluate`
  ```json
  { "teamId": "...", "innovation": 20, "technical": 18, "design": 22, "viability": 19, "feedback": "...", "lock": false }
  ```
  Each rubric field is `0–25`, validated server-side; the total is
  computed server-side and never trusted from the client. `lock: true`
  finalizes the evaluation (immutable afterwards) and triggers a
  leaderboard recompute + broadcast (unless scores are frozen).

---

## Leaderboard — `/api/leaderboard`

- `GET /api/leaderboard?trackId=` — public (optional auth).
  ```json
  {
    "leaderboard": [
      {
        "teamId": "...", "teamName": "...", "track": {...}, "members": ["..."],
        "juryCount": 2, "averageScore": 87.5, "totalScore": 175, "rank": 1,
        "breakdown": [{ "innovation": 22, "technical": 20, "design": 21, "viability": 19, "feedback": "...", "juryAlias": "Jury #1" }]
      }
    ],
    "scoresFrozen": false
  }
  ```
  Only `LOCKED` evaluations count. `juryId`/jury identity is never present
  — see Jury Anonymization below. Teams with no locked evaluations sort
  last with `rank: null`.

---

## Admin — `/api/admin`

Every route requires auth + role `ADMIN`.

- `GET /api/admin/dashboard` — headline counts (users by role, teams,
  submissions by status, evaluations by status, tracks, assignments,
  checked-in participants) + current settings.
- `GET /api/admin/settings` / `PATCH /api/admin/settings` —
  `{ "trackSelectionDeadline": "2026-01-01T00:00:00.000Z" | null, "submissionDeadline": "..." | null }`
- `GET /api/admin/score-status` → `{ "scoresFrozen": boolean }`
- `POST /api/admin/freeze-scores` — `{ "frozen": true }`. Persists the
  flag, audits `SCORES_FROZEN`/`SCORES_UNFROZEN`, and notifies connected
  clients over `leaderboard:freeze-changed` (unfreezing also pushes a
  fresh `leaderboard:update`).
- `GET /api/admin/jury-assignments?juryId=&teamId=&trackId=` — includes
  real jury name/email (admin-only view).
- `POST /api/admin/jury-assignments` — `{ "juryId", "teamId", "trackId"? }`
- `DELETE /api/admin/jury-assignments/:id`
- `GET /api/admin/audit-logs?action=&actorId=&page=&pageSize=`

---

## Jury Anonymization

`Evaluation.juryId` is the real judge identity and is retained in the
database for admin auditing (`GET /api/admin/jury-assignments`, audit
logs). It is **never** present in any participant-facing response
(`/api/leaderboard`, and the jury's own queue only ever shows the jury's
*own* evaluation, never anyone else's).

Per team, `src/utils/anonymizer.js` independently orders that team's
locked evaluations by an HMAC of `(teamId + juryId + JURY_ALIAS_SALT)`
and labels them `Jury #1, Jury #2, ...`. There is no fixed judge → alias
mapping: the same judge can be `Jury #1` on one team's card and
`Jury #2` on another's.

---

## Socket.IO events

Connect to the same HTTP server Express is mounted on. Auth is optional
(anonymous viewers can watch the public leaderboard); pass a JWT via
`socket.handshake.auth.token` or the session cookie to identify the
caller for future privileged channels.

**Client → server**
- `leaderboard:subscribe { trackId?: string }` — joins `leaderboard:public`
  automatically on connect, and `leaderboard:track:{trackId}` if a valid
  `trackId` is given (unknown ids get `leaderboard:error`). Replies with
  a `leaderboard:snapshot`.

**Server → client**
- `leaderboard:snapshot { leaderboard, scoresFrozen }` — sent once after `subscribe`.
- `leaderboard:update { leaderboard, scoresFrozen: false }` — sent to
  `leaderboard:public` and the relevant `leaderboard:track:{trackId}`
  room whenever a jury member locks an evaluation. Never sent while
  frozen.
- `leaderboard:freeze-changed { scoresFrozen }` — sent to `leaderboard:public`
  whenever an admin toggles the freeze flag. Carries no score data.
- `leaderboard:error { error }`

---

## Audit log actions

`USER_REGISTERED`, `USER_LOGIN`, `TEAM_JOINED`, `TRACK_LOCKED`,
`TRACK_CREATED`, `TRACK_UPDATED`, `TRACK_DELETED`,
`SUBMISSION_DRAFT_SAVED`, `SUBMISSION_FINALIZED`,
`PARTICIPANT_CHECKED_IN`, `JURY_ASSIGNED`, `JURY_EVALUATION_DRAFT`,
`JURY_EVALUATION_LOCKED`, `SCORES_FROZEN`, `SCORES_UNFROZEN`,
`ADMIN_ACTION` (generic, with a `metadata.type` discriminator for
settings updates and jury-assignment removal).

---

## Environment variables

See `.env.example` for the full annotated list: server/CORS, `DATABASE_URL`,
JWT config, `JURY_ALIAS_SALT`, admin/seed bootstrap credentials, and the
optional `STORAGE_PROVIDER`/`AWS_*` block for pitch-deck uploads.

---

## Running locally

```bash
npm install
cp .env.example .env       # fill in real secrets, at minimum DATABASE_URL, JWT_SECRET, JURY_ALIAS_SALT, ADMIN_EMAIL/ADMIN_PASSWORD
npx prisma generate
npx prisma migrate dev --name init
npm run seed                # bootstraps the admin + a full dev dataset (see prisma/seed.js)
npm run dev                 # http://localhost:4000, GET /health should return { ok: true }
```

## Testing

```bash
cp .env.example .env.test
# edit .env.test: point DATABASE_URL at a throwaway test database
npx dotenv -e .env.test -- npx prisma migrate deploy
npm test
```

Tests use Jest + Supertest against the real Express app and a real
Postgres test database (truncated between tests) — no mocking of Prisma.
See `tests/` for auth, team, submissions, jury, anonymization, leaderboard,
and admin coverage.

A Postman collection covering every endpoint is at
`postman/promptothon.postman_collection.json`.
