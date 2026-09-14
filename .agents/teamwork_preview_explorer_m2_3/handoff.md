# Milestone 2: RBAC and Routing Architectural Exploration Report

**Explorer Identity**: `explorer_m2_3`  
**Working Directory**: `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m2_3`  
**Target Milestone**: Milestone 2 (Authentication & Hackathon Workflow — Role-Based Access Control and Routing)  
**Date**: 2026-09-14  

---

## 1. Observation

### 1.1 Backend RBAC Middleware & Role System
- **`backend/src/middleware/auth.js:10-50` (`requireAuth`)**:
  - Extracts JWT token from cookie (`process.env.COOKIE_NAME || "promptothon_token"`) or `Authorization: Bearer <token>` header (lines 12-16).
  - Verifies token signature via `verifyToken(token)` using `process.env.JWT_SECRET` (line 22).
  - Fetches user from database via `prisma.user.findUnique({ where: { id: payload.sub } })` (line 26).
  - **Dev bypass bug at line 28**:
    ```javascript
    } catch (dbErr) {
      if (process.env.NODE_ENV !== "production") {
        user = {
          id: payload.sub,
          role: payload.role || "PARTICIPANT",
          name: payload.role === "ADMIN" ? "Admin Developer" : "Participant User",
          email: payload.role === "ADMIN" ? "admin@promptothon.dev" : "user@promptothon.dev",
        };
      } else {
        throw dbErr;
      }
    }
    ```
    When `NODE_ENV === "test"`, `process.env.NODE_ENV !== "production"` evaluates to `true`. This causes database error tests in `backend/tests/unit/adversarial.test.js:173-186` to fail (received HTTP 200 with fake user instead of expected HTTP 401).
- **`backend/src/middleware/auth.js:56-66` (`requireRole`)**:
  - Expects `req.user` to be populated by `requireAuth`; returns HTTP 401 (`"Authentication required."`) if absent (lines 58-60).
  - Evaluates `if (!roles.includes(req.user.role)) return next(new ApiError(403, "You do not have access to this resource."));` (lines 61-63).
  - Role check is strict whitelist equality. Roles do NOT inherit permissions automatically; an endpoint with `requireRole("PARTICIPANT")` rejects `ADMIN` and `JURY` with HTTP 403.
- **`backend/prisma/schema.prisma:22-31` (Role Definitions)**:
  - `GlobalRole`: `enum GlobalRole { PARTICIPANT, JURY, ADMIN }` stored on `User.role`.
  - `TeamRole`: `enum TeamRole { LEADER, MEMBER }` stored on `TeamMember.role`.
  - `Team` model links to `User` via `leaderId` and has relation `members TeamMember[]`.

### 1.2 Route Permissions Map Across All Backend Modules

| Route / Prefix | Method | Authentication | Role Guard | Controller Handler | Enforced Permission / Behavior |
|---|---|---|---|---|---|
| `/health`, `/api/health` | GET | None | None | `healthHandler` | Public status with live database check |
| `/api/auth/register` | POST | None | None (`authLimiter`) | `register` | Public: registers new user with role `PARTICIPANT` (intents: `create`, `join`, `solo`) |
| `/api/auth/login` | POST | None | None (`authLimiter`) | `login` | Public: authenticates any registered `PARTICIPANT`, `JURY`, `ADMIN` |
| `/api/auth/logout` | POST | None | None | `logout` | Public: clears cookie |
| `/api/auth/me` | GET | `requireAuth` | None | `me` | Authenticated session check (all roles) |
| `/api/admin/*` | ALL | `requireAuth` | `requireRole("ADMIN")` | `admin.controller.*` | All subroutes locked to `ADMIN` only via `router.use(requireAuth, requireRole("ADMIN"))` |
| `/api/admin/dashboard` | GET | `requireAuth` | `requireRole("ADMIN")` | `getDashboard` | Admin statistics and system metrics |
| `/api/admin/announcements` | GET/POST/PATCH/DELETE | `requireAuth` | `requireRole("ADMIN")` | `announcements.controller.*` | Admin CRUD on event announcements |
| `/api/admin/settings` | GET/PATCH | `requireAuth` | `requireRole("ADMIN")` | `getSettings`, `updateSettings` | Manage deadlines & scoring flags |
| `/api/admin/score-status` | GET | `requireAuth` | `requireRole("ADMIN")` | `getScoreStatus` | Checks `scoresFrozen` status |
| `/api/admin/freeze-scores` | POST | `requireAuth` | `requireRole("ADMIN")` | `freezeScores` | Toggles `scoresFrozen` system setting. **Requires `{ frozen: boolean }`** |
| `/api/admin/jury-assignments` | GET/POST/DELETE | `requireAuth` | `requireRole("ADMIN")` | `listJuryAssignments`, etc. | Manage judge-to-team assignments |
| `/api/admin/audit-logs` | GET | `requireAuth` | `requireRole("ADMIN")` | `listAuditLogs` | Paginated immutable audit trail |
| `/api/jury/magic-link/*` | POST | None | None (`authLimiter`) | `requestLink`, `verifyLink` | Public passwordless jury authentication |
| `/api/jury/queue` | GET | `requireAuth` | `requireRole("JURY")` | `getQueue` | JURY only: returns assigned teams from `prisma.juryAssignment` |
| `/api/jury/evaluate` | POST | `requireAuth` | `requireRole("JURY")` | `evaluate` | JURY only: rubric evaluation (0-25 per dimension). Checks assignment, self-membership, and lock status |
| `/api/jury/evaluations/:teamId` | GET | `requireAuth` | None (service-level matrix) | `getEvaluations` | ADMIN sees all + jury identities; JURY sees assigned team only (anonymized + `isYou`); PARTICIPANT sees own team locked evaluations only |
| `/api/team/me` | GET | `requireAuth` | `requireRole("PARTICIPANT")` | `getMyTeam` | PARTICIPANT in a team. Throws 404 if solo/no team; 403 for ADMIN/JURY |
| `/api/team/join` | POST | `requireAuth` | `requireRole("PARTICIPANT")` | `joinTeam` | PARTICIPANT without team. Throws 409 if already in a team |
| `/api/team/track-lock` | POST | `requireAuth` | `requireRole("PARTICIPANT")` | `lockTrack` | Team `LEADER` only. Non-leader gets 403; already locked gets 409; past deadline gets 409 |
| `/api/team/submission` | POST | `requireAuth` | `requireRole("PARTICIPANT")` | `upsertSubmission` | Team `LEADER` only. Non-leader gets 403; no locked track gets 409; post-lock gets 409 |
| `/api/team/submission` | GET | `requireAuth` | `requireRole("PARTICIPANT")` | `getMySubmission` | PARTICIPANT in a team (LEADER or MEMBER) |
| `/api/team/submission/upload-url` | POST | `requireAuth` | `requireRole("PARTICIPANT")` | `requestUploadUrl` | Team `LEADER` only |
| `/api/team/submission/pitch-deck` | POST | `requireAuth` | `requireRole("PARTICIPANT")` | `attachPitchDeck` | Team `LEADER` only. **Requires `{ key, url }`** |
| `/api/team/submission/pitch-deck-url` | GET | `requireAuth` | `requireRole("PARTICIPANT", "JURY", "ADMIN")` | `getPitchDeckUrl` | Multi-role: own team (participant), assigned team (jury), all teams (admin) |
| `/api/tracks` | GET | `requireAuth` | None | `listTracks` | Any authenticated user. **Note: Unauthenticated visitors get 401** |
| `/api/tracks` | POST/PATCH/DELETE | `requireAuth` | `requireRole("ADMIN")` | `tracks.controller.*` | ADMIN only |
| `/api/leaderboard` | GET | `optionalAuth` | None | `getLeaderboard` | Public |
| `/api/networking/*` | GET/POST | `requireAuth` | `requireRole("PARTICIPANT")` | `networking.controller.*` | PARTICIPANT only |
| `/api/announcements` | GET | `requireAuth` | None | `listForParticipant` | Any authenticated user |
| `/api/notifications/*` | GET/PATCH | `requireAuth` | None | `notifications.controller.*` | Any authenticated user (scoped to `req.user.id`) |
| `/api/profile` | GET/PATCH | `requireAuth` | None | `profile.controller.*` | Any authenticated user (scoped to `req.user.id`) |

### 1.3 Frontend Route Guards, Navigation, and Auth State
- **`src/utils/contexts/AuthContext.js`**:
  - `refreshUserData`: calls `GET /api/auth/me`. If user exists, attempts `GET /api/team/me`.
  - For `ADMIN` and `JURY`: `GET /api/team/me` throws 403; catch block sets `teamData: null, isRegistered: false, isTeamLeader: false`.
  - For solo `PARTICIPANT`: `GET /api/team/me` throws 404; catch block sets `teamData: null, isRegistered: false, isTeamLeader: false`.
  - Exposes: `user`, `role: user?.role || null`, `isRegistered`, `isTeamLeader`, `teamData`.
- **`/admin` (`src/app/admin/page.js:26-36`)**:
  - Unauthenticated visitors: `router.push("/login")`.
  - Non-admin users (`user.role !== "ADMIN"`): `toast.error("Access restricted to Hackathon Administrators."); router.push("/teamdetails");`.
  - Admin users: loads `/api/admin/dashboard`, `/api/tracks`, `/api/admin/score-status`.
- **`/jury` (`src/app/jury/page.js:29-53`)**:
  - Unauthenticated visitors: `router.push("/login")`.
  - **Missing Authorization Guard**: Does NOT check `user.role !== "JURY"`. A `PARTICIPANT` or `ADMIN` can open `/jury`. The page mounts, calls `GET /api/jury/queue`, receives HTTP 403, catches it silently, and displays an empty queue.
- **`/teamdetails` (`src/app/(auth)/teamdetails/page.js:76-82`)**:
  - Unauthenticated visitors: `router.push("/login")`.
  - Allows all authenticated roles. If user has no team (including `JURY` and `ADMIN` who cannot have teams), displays "Join a Team" input.
  - Track lock controls: `disabled={!isLeader}` (line 315) and `handleLockTrack` button hidden for non-leaders (line 325).
- **`/submission` (`src/app/submission/page.js:28-33`)**:
  - Unauthenticated visitors: `router.push("/login")`.
  - **Missing Role/Leader Guard**: Does NOT check if user has a team or if user is `LEADER`. Non-leader team members, solo users, and jury/admin can view the form; clicking submit triggers an error toast from the backend 403/404 response.
- **Global Navbar (`src/components/navbar.js:178-224` & `289-335`)**:
  - Logged-in state only renders `Team Details` and `Logout`.
  - There are NO navigation links for `Admin Control` (for `ADMIN`) or `Jury Portal` (for `JURY`) in the main header.
- **Login Redirection (`src/app/(auth)/login/page.js:27-31, 46, 69`)**:
  - Unconditionally redirects all roles to `/teamdetails`.

### 1.4 Discrepancies and Bugs Discovered
1. **Freeze Scores Payload Mismatch**:
   - `src/app/admin/page.js:70`: calls `api.post("/api/admin/freeze-scores", { freeze: !scoresFrozen })`.
   - `backend/src/modules/admin/admin.schema.js:3-5` & `admin.controller.js:97`: expects `{ frozen: z.boolean() }`.
   - Result: Clicking freeze scores on the admin dashboard causes HTTP 422 validation failure (`"Required"` for field `frozen`).
2. **Pitch Deck Attach Payload Mismatch**:
   - `src/app/submission/page.js:87`: calls `api.post("/api/team/submission/pitch-deck", { key })`.
   - `backend/src/modules/submissions/submissions.controller.js:148-150`:
     ```javascript
     const { key, url } = req.body || {};
     if (!key || !url) throw new ApiError(422, "key and url are required.");
     ```
   - Result: Calling pitch-deck attach fails with HTTP 422.
3. **Team Details Field Mappings**:
   - `src/app/(auth)/teamdetails/page.js:121, 272`: uses `teamData.code`. Backend returns `team.inviteCode`. Result: displays `"N/A"` and copy code fails.
   - `src/app/(auth)/teamdetails/page.js:295`: uses `teamData.trackLocked`. Backend returns `team.trackLockedAt`. Result: evaluates to `undefined` (falsy), so track remains displayed as unlocked.
4. **Public Track Access Requirement**:
   - `backend/src/modules/tracks/tracks.routes.js:8`: `router.get("/", requireAuth, listTracks);`.
   - `src/app/leaderboard/page.js:33`: public visitors fetch `/api/tracks` for the filter dropdown, receiving HTTP 401. PROJECT.md interface contracts specify `/api/tracks` should be public or accessible without error.

---

## 2. Logic Chain

1. **Premise 1: Backend RBAC is the Single Source of Truth for Security Boundaries.**
   - Observations 1.1 and 1.2 demonstrate that Express middleware (`requireAuth`, `requireRole`) and controller validations (`getMembershipOrThrow`, `membership.role !== "LEADER"`, `prisma.juryAssignment`) enforce strict boundaries:
     - A participant cannot access `/api/admin/*` (rejected with 403).
     - A participant cannot evaluate teams on `/api/jury/evaluate` (rejected with 403).
     - A non-leader cannot lock a track or manage submissions (rejected with 403).
     - A solo user cannot submit without a team (rejected with 404).
     - An unassigned or self-member jury member cannot grade a team (rejected with 403).
2. **Premise 2: Frontend Route Guards Prevent Confusing UX and Information Leakage.**
   - While the backend is secure, observation 1.3 reveals frontend gaps:
     - `/jury` lacks a role check; participants loading `/jury` see an empty evaluation interface instead of being redirected to `/teamdetails`.
     - `/submission` lacks a team/leader check; non-leaders and solo users fill forms only to be blocked on submission.
     - `/login` redirects all users to `/teamdetails`, forcing admins and jury members to manually find their portal links.
3. **Premise 3: API Contracts Must Align Across Client and Server.**
   - Observations 1.4.1 and 1.4.2 demonstrate direct payload discrepancies:
     - `{ freeze }` vs `{ frozen }` in admin score freeze.
     - `{ key }` vs `{ key, url }` in submission pitch deck.
     - `teamData.code` vs `team.inviteCode` and `teamData.trackLocked` vs `team.trackLockedAt`.
     - `GET /api/tracks` requiring auth despite public leaderboard usage.
   - These mismatches prevent valid user operations from succeeding even when authenticated with proper roles.
4. **Premise 4: Test Suite Quality Gate Requires Fixing `auth.js:28`.**
   - Observation 1.1 identifies the exact condition `process.env.NODE_ENV !== "production"` in `backend/src/middleware/auth.js:28`.
   - Running `npx jest tests/unit` empirically proved that `adversarial.test.js:184` fails solely because this branch catches mocked database connection failures in test mode and returns HTTP 200 instead of 401.
   - Changing line 28 to `if (process.env.NODE_ENV === "development")` ensures test errors bubble up and pass with 56/56.

---

## 3. Caveats

- **Network Session Transport**: The backend supports both HTTP-only cookies and Bearer tokens. In browser environments, HTTP-only cookies are automatically sent (`credentials: "include"` / `withCredentials: true`), while API testing uses `Authorization: Bearer <token>`. Both paths were verified.
- **Offline Fallback Behavior**: The backend contains offline dev fallback logic when PostgreSQL is disconnected (`NODE_ENV === "development"`). When Docker PostgreSQL is running (Milestone 1), the live database path is used, which enforces real database constraints.
- **No other caveats**: The codebase was inspected completely across all relevant frontend pages, backend modules, Prisma models, and Jest unit tests.

---

## 4. Conclusion

The application's RBAC architecture is robust at the database and middleware layers, with explicit role hierarchies (`PARTICIPANT`, `JURY`, `ADMIN`) and team roles (`LEADER`, `MEMBER`). However, full production readiness for Milestone 2 requires the Worker to address four specific implementation items:

1. **Backend Middleware Fix (`backend/src/middleware/auth.js:28`)**:
   Change `if (process.env.NODE_ENV !== "production")` to `if (process.env.NODE_ENV === "development")` so unit and integration tests handle database exceptions correctly (fixing the 1 failing unit test).
2. **Frontend Route Guards & Role-Aware Navigation**:
   - In `src/app/jury/page.js`: add check `if (!authLoading && user && user.role !== "JURY") { router.push(user.role === "ADMIN" ? "/admin" : "/teamdetails"); }`.
   - In `src/app/submission/page.js`: check `if (!authLoading && user && (!isRegistered || !isTeamLeader))` to inform or restrict non-leaders.
   - In `src/app/(auth)/login/page.js`: route user based on role upon login (`ADMIN` -> `/admin`, `JURY` -> `/jury`, `PARTICIPANT` -> `/teamdetails`).
   - In `src/components/navbar.js`: conditionally show `Admin` or `Jury Portal` links when `user.role === "ADMIN"` or `user.role === "JURY"`.
3. **Payload & Data Binding Synchronization**:
   - In `src/app/admin/page.js:70`: send `{ frozen: !scoresFrozen }` (or support both in backend schema).
   - In `src/app/submission/page.js:87`: send `{ key, url: uploadUrl.split("?")[0] }` (or derive url on backend).
   - In `src/app/(auth)/teamdetails/page.js`: resolve `teamData?.inviteCode || teamData?.code` and `teamData?.trackLockedAt || teamData?.trackLocked`.
   - In `backend/src/modules/tracks/tracks.routes.js:8`: use `optionalAuth` for `GET /api/tracks` so public leaderboard viewers can query tracks.

---

## 5. Verification Method

### 5.1 Independent Test Commands
Execute the following commands from the `backend/` directory:

1. **Verify Middleware Unit Tests**:
   ```bash
   npx jest tests/unit/middleware.test.js
   ```
   *Expected Result*: 12/12 tests PASS.

2. **Verify Adversarial Stress Suite (Fix for Feature 22)**:
   ```bash
   npx jest tests/unit/adversarial.test.js
   ```
   *Current Status*: 1 test fails at line 184 (`received 200, expected 401`).  
   *Post-Fix Status*: All tests PASS once `auth.js:28` is updated.

3. **Verify Full Unit Test Suite**:
   ```bash
   npx jest tests/unit
   ```
   *Expected Result*: 5 test suites pass, 56/56 tests PASS.

4. **Verify RBAC Integration Tests (with PostgreSQL running)**:
   ```bash
   npx jest tests/auth.test.js tests/admin.test.js tests/jury.test.js tests/team.test.js tests/submissions.test.js
   ```
   *Expected Result*: All 5 test suites pass cleanly.

### 5.2 Specific Assertions to Implement in Worker Test Suite

#### Assertion Set 1: Role-Based Route Protection (Backend)
- `GET /api/admin/dashboard` with no token -> `401 Unauthorized`
- `GET /api/admin/dashboard` with `PARTICIPANT` token -> `403 Forbidden`
- `GET /api/admin/dashboard` with `JURY` token -> `403 Forbidden`
- `GET /api/admin/dashboard` with `ADMIN` token -> `200 OK`
- `GET /api/jury/queue` with `PARTICIPANT` token -> `403 Forbidden`
- `GET /api/jury/queue` with `JURY` token -> `200 OK`
- `POST /api/team/track-lock` with `JURY` or `ADMIN` token -> `403 Forbidden` (`requireRole("PARTICIPANT")`)

#### Assertion Set 2: Team Role Hierarchy
- `POST /api/team/track-lock` with team `MEMBER` token -> `403 Forbidden` (`"Only the team leader can lock the track selection."`)
- `POST /api/team/track-lock` with team `LEADER` token -> `200 OK`
- `POST /api/team/track-lock` repeated by `LEADER` -> `409 Conflict` (`"This team's track selection is already locked."`)
- `POST /api/team/submission` with team `MEMBER` token -> `403 Forbidden` (`"Only the team leader can manage the submission."`)
- `POST /api/team/submission` with team `LEADER` token -> `200 OK` (draft)
- `POST /api/team/submission` with `submit: true` -> `200 OK` (final)
- `POST /api/team/submission` edit after final -> `409 Conflict` (`"This submission has already been finalized and cannot be edited."`)

#### Assertion Set 3: Boundary & Edge Cases
- Solo participant (no team) `POST /api/team/submission` -> `404 Not Found` (`"You're not part of a team yet."`)
- Jury evaluating team without assignment -> `403 Forbidden` (`"You are not assigned to evaluate this team."`)
- Jury evaluating own team -> `403 Forbidden` (`"You cannot evaluate a team you are a member of."`)
- Freeze scores toggle payload `{ frozen: true }` -> `200 OK` with `scoresFrozen: true`
- Pitch deck attach payload `{ key: "...", url: "..." }` -> `200 OK` with updated submission

### 5.3 Invalidation Conditions
- If `GlobalRole` enum is modified without updating Prisma migrations.
- If Express routes change mounting prefixes in `backend/src/app.js`.
- If client-side cookies fail to propagate across ports 3000 and 4000 due to `SameSite` or `secure` flag configurations.
