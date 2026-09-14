# Milestone 2 Investigation Report: Team Lifecycle & Track Operations

## Executive Summary
This investigation analyzes the backend and frontend implementations for Milestone 2 (Team Lifecycle and Track Operations), focusing on team creation (`POST /api/team` / `POST /api/teams`), invite code generation and format, team joining via code (`POST /api/team/join`), capacity enforcement (maximum 4 members), single-team-per-user invariants (`TeamMember.userId @unique`), and track selection/locking (`POST /api/team/track-lock`).

Four major defects and critical payload mismatches were identified that currently prevent proper team management and track locking in the UI:
1. **Missing Backend Team Creation Endpoint & Frontend Form**: `POST /api/team` and `POST /api/teams` do not exist in `backend/src/modules/team/team.routes.js` or `team.controller.js` (team creation only exists at registration time in `auth.controller.js`). In the frontend `/teamdetails`, when a user has no team, only a "Join Team" input is rendered; there is no UI to create a team.
2. **Field Name Mismatch for Invite Code (`teamData.code` vs `teamData.inviteCode`)**: The database schema and controller return `inviteCode`, but `src/app/(auth)/teamdetails/page.js` references `teamData.code`, rendering `"N/A"` in the UI and causing code copy to fail.
3. **Field Name Mismatch for Track Lock (`teamData.trackLocked` vs `teamData.trackLockedAt`)**: The Prisma model defines `trackLockedAt DateTime?`, but the frontend checks `teamData.trackLocked` (Boolean), meaning the track lock badge never displays and the selection controls remain active even after locking.
4. **Invite Code Input Length Restriction vs 12-Character Generator**: `generateTeamCode()` produces `PRMPT-XXXXXX` (12 characters, including prefix and hyphen) and seed data uses 12 characters (`PRMPT-ALPHA1`), but the frontend input has `maxLength={6}` and toast warns "Please enter a 6-character team invite code", preventing users from typing or pasting valid codes.

---

## 1. Observation

### 1.1 Team Creation Routing & Controllers
- **File**: `backend/src/modules/team/team.routes.js` (Lines 1-12)
  ```javascript
  const router = express.Router();
  router.get("/me", requireAuth, requireRole("PARTICIPANT"), getMyTeam);
  router.post("/join", requireAuth, requireRole("PARTICIPANT"), joinTeam);
  router.post("/track-lock", requireAuth, requireRole("PARTICIPANT"), lockTrack);
  module.exports = router;
  ```
  *Observation*: There is no `POST /` route or handler mounted on `team.routes.js`.
- **File**: `backend/src/app.js` (Lines 66-69)
  ```javascript
  // team.routes and submissions.routes both live under /api/team
  // (team.routes: GET /me, POST /track-lock — submissions.routes: /submission)
  app.use("/api/team", teamRoutes);
  app.use("/api/team", submissionRoutes);
  ```
  *Observation*: Express only mounts `/api/team`. `/api/teams` is not mounted.
- **File**: `backend/src/modules/team/team.controller.js` (Lines 1-134)
  *Observation*: `team.controller.js` exports only `getMyTeam`, `joinTeam`, `lockTrack`, `getMembershipOrThrow`. There is no `createTeam` controller function.
- **File**: `backend/src/modules/auth/auth.controller.js` (Lines 56-80)
  ```javascript
  if (input.intent === "create") {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: profileData });
      let inviteCode = generateTeamCode();
      for (let attempts = 0; attempts < 5; attempts += 1) {
        const clash = await tx.team.findUnique({ where: { inviteCode } });
        if (!clash) break;
        inviteCode = generateTeamCode();
      }
      await tx.team.create({
        data: {
          name: input.teamName,
          inviteCode,
          leaderId: created.id,
          members: {
            create: { userId: created.id, role: "LEADER" },
          },
        },
      });
      return created;
    });
  }
  ```
  *Observation*: Team creation is currently exclusively implemented within `auth.controller.js` under `POST /api/auth/register` with `intent === "create"`. Existing users (e.g. registered with `intent: "solo"`) have no HTTP API to create a team.
- **File**: `src/app/(auth)/login/page.js` (Lines 57-64)
  ```javascript
  if (isSignUp) {
    await authRegister({
      intent: "solo",
      name: data.name?.trim() || data.email.split("@")[0],
      email: data.email.trim(),
      password: data.password,
    });
  ```
  *Observation*: Frontend registration always defaults to `intent: "solo"`. Users cannot choose `create` or `join` during web registration.
- **File**: `src/app/(auth)/teamdetails/page.js` (Lines 226-258)
  ```jsx
  {!teamData ? (
    /* No Team State -> Join Team Option */
    <div className="p-8 bg-[#0d1525]/85 backdrop-blur-xl border border-white/10 rounded-2xl space-y-6 text-center max-w-lg mx-auto">
      <div className="w-14 h-14 mx-auto rounded-full bg-[#00c8ff]/10 border border-[#00c8ff]/30 flex items-center justify-center text-[#00c8ff]">
        <Users className="w-7 h-7" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold font-orbitron text-white">Join a Team</h2>
        <p className="text-xs text-slate-400">
          Enter the 6-character team invite code provided by your team leader to join their roster.
        </p>
      </div>
      <form onSubmit={handleJoinTeam} className="space-y-4">
  ```
  *Observation*: In `/teamdetails`, when `!teamData`, there is only a "Join a Team" form. There is no UI component, tab, or modal to create a team.

### 1.2 Invite Code Generation, Format & Storage
- **File**: `backend/src/utils/teamCode.js` (Lines 1-12)
  ```javascript
  const { customAlphabet } = require("nanoid");

  // Cryptographically secure 6-char alphanumeric suffix, uppercase-only,
  // excluding visually ambiguous characters (0/O, 1/I).
  const nanoid = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

  function generateTeamCode() {
    return `PRMPT-${nanoid()}`;
  }

  module.exports = { generateTeamCode };
  ```
  *Observation*: `nanoid()` is 6 characters, but `generateTeamCode()` prefixes it with `PRMPT-`, creating a 12-character string with a hyphen (e.g. `PRMPT-7K8M9Q`).
- **File**: `backend/prisma/schema.prisma` (Lines 98-102)
  ```prisma
  model Team {
    id             String    @id @default(cuid())
    name           String
    inviteCode     String    @unique
  ```
  *Observation*: PostgreSQL stores the code in `Team.inviteCode` with a `@unique` constraint. The column name is `inviteCode`, not `code`.
- **File**: `backend/prisma/seed.js` (Lines 137-166)
  *Observation*: Seeded teams use 12-character codes: `PRMPT-ALPHA1`, `PRMPT-BETA01`, `PRMPT-GAMMA1`.
- **File**: `src/app/(auth)/teamdetails/page.js` (Lines 120-127, 240-247, 270-274)
  ```javascript
  // Line 121:
  if (teamData?.code) {
    navigator.clipboard.writeText(teamData.code);
    setCopied(true);
  // Line 242:
  <input
    type="text"
    maxLength={6}
    value={joinCodeInput}
    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
    placeholder="e.g. PT26AB"
  // Line 272:
  <span className="font-mono text-xl font-bold tracking-widest text-white">
    {teamData.code || "N/A"}
  </span>
  ```
  *Observation*:
  1. The code display and copy button check `teamData.code`, which is undefined because Prisma returns `teamData.inviteCode`. The UI displays `"N/A"`.
  2. The input field enforces `maxLength={6}` and placeholder `"e.g. PT26AB"`, blocking entry of 12-character `PRMPT-XXXXXX` codes.

### 1.3 Team Joining, Capacity Enforcement & Single-Team Invariant
- **File**: `backend/src/modules/team/team.controller.js` (Lines 65-95)
  ```javascript
  const joinTeam = asyncHandler(async (req, res) => {
    const { teamCode } = joinTeamSchema.parse(req.body);

    const existingMembership = await prisma.teamMember.findUnique({ where: { userId: req.user.id } });
    if (existingMembership) {
      throw new ApiError(409, "You're already part of a team.");
    }

    const team = await prisma.$transaction(async (tx) => {
      const found = await tx.team.findUnique({ where: { inviteCode: teamCode } });
      if (!found) {
        throw new ApiError(404, "Invalid team code.");
      }

      const seatReserved = await tryReserveTeamSeat(tx, found.id);
      if (!seatReserved) {
        throw new ApiError(409, "This team is already at full capacity.");
      }

      await tx.teamMember.create({
        data: { teamId: found.id, userId: req.user.id, role: "MEMBER" },
      });

      return found;
    });

    await recordAudit(req.user.id, "TEAM_JOINED", { teamId: team.id });

    const membership = await getMembershipOrThrow(req.user.id);
    res.json({ team: membership.team, myRole: membership.role });
  });
  ```
- **File**: `backend/src/utils/teamCapacity.js` (Lines 13-21)
  ```javascript
  async function tryReserveTeamSeat(tx, teamId) {
    const rows = await tx.$queryRaw`
      UPDATE "Team"
      SET "memberCount" = "memberCount" + 1, "updatedAt" = now()
      WHERE id = ${teamId} AND "memberCount" < "capacityMax"
      RETURNING id
    `;
    return rows.length > 0;
  }
  ```
  *Observation*:
  1. Atomic conditional update increments `memberCount` only if `memberCount < capacityMax`.
  2. In `schema.prisma` line 106, `capacityMax` defaults to 4. Leader is 1, so up to 3 joining members are accepted (total 4). 5th member attempt returns 409 Conflict.
  3. Single-team invariant: In `schema.prisma` line 132, `TeamMember.userId` is `@unique`. A participant cannot belong to multiple teams.
  4. Discrepancy: `src/app/(auth)/teamdetails/page.js` lines 268 and 349 hardcode `"Max 3 Members"` and `"{teamData.members?.length || 1} / 3 Members"`.
  5. Schema discrepancy: `team.schema.js` line 8 defines `joinTeamSchema = z.object({ teamCode: z.string().min(4).max(20) })`. If a client sends `{ inviteCode }` or `{ code }` as specified in `PROJECT.md` line 56, Zod throws 422.

### 1.4 Track Selection & Track Locking
- **File**: `backend/src/modules/team/team.controller.js` (Lines 103-131)
  ```javascript
  const lockTrack = asyncHandler(async (req, res) => {
    const { trackId } = lockTrackSchema.parse(req.body);
    const membership = await getMembershipOrThrow(req.user.id);

    if (membership.role !== "LEADER") {
      throw new ApiError(403, "Only the team leader can lock the track selection.");
    }
    if (membership.team.trackLockedAt) {
      throw new ApiError(409, "This team's track selection is already locked.");
    }
    if (!(await isBeforeDeadline(KEYS.TRACK_SELECTION_DEADLINE))) {
      throw new ApiError(409, "The track selection deadline has passed.");
    }

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) {
      throw new ApiError(404, "Track not found.");
    }

    const updated = await prisma.team.update({
      where: { id: membership.team.id },
      data: { trackId, trackLockedAt: new Date() },
      include: { track: true },
    });

    await recordAudit(req.user.id, "TRACK_LOCKED", { teamId: updated.id, trackId });

    res.json({ team: updated });
  });
  ```
- **File**: `src/app/(auth)/teamdetails/page.js` (Lines 295-307)
  ```jsx
  {teamData.trackLocked ? (
    <div className="p-4 rounded-xl bg-green-950/30 border border-green-500/30 space-y-2">
      <div className="flex items-center gap-2 text-green-400 font-semibold text-xs">
        <Lock className="w-3.5 h-3.5" /> Track Locked
      </div>
      <p className="text-sm font-bold text-white">
        {teamData.track?.title || "Assigned Problem Track"}
      </p>
      <p className="text-xs text-slate-300">
        {teamData.track?.description || "Track selection is permanent."}
      </p>
    </div>
  ) : (
  ```
  *Observation*: In `schema.prisma` line 115, the model field is `trackLockedAt DateTime?`. There is no `trackLocked` boolean field. Because `teamData.trackLocked` evaluates to `undefined` (falsy), the track lock badge never shows up even after locking, and the `<select>` + lock button remain rendered.

---

## 2. Logic Chain

1. **Team Creation**:
   - Step 1: `PROJECT.md` line 55 mandates `POST /api/team` (or creation route) accepting `{ name }` and returning `{ team }`.
   - Step 2: `team.routes.js` contains only `GET /me`, `POST /join`, and `POST /track-lock`. Neither `POST /api/team` nor `POST /api/teams` exists.
   - Step 3: In `src/app/(auth)/login/page.js`, account creation unconditionally calls `authRegister({ intent: "solo" })`.
   - Step 4: In `src/app/(auth)/teamdetails/page.js`, when a solo user arrives without a team (`!teamData`), the view only renders a "Join a Team" form.
   - Step 5: *Conclusion*: A registered user cannot create a team via the UI or standalone API. A dedicated `createTeam` handler must be added to `team.controller.js`, mounted on `POST /` in `team.routes.js` (under both `/api/team` and `/api/teams`), and a "Create Team" UI must be provided in `/teamdetails`.

2. **Invite Code & Code Display**:
   - Step 1: Prisma's `Team` model defines `inviteCode String @unique`.
   - Step 2: `backend/src/modules/team/team.controller.js` returns `team: membership.team`. The JSON payload contains `inviteCode`, not `code`.
   - Step 3: Frontend `teamdetails/page.js` line 272 renders `{teamData.code || "N/A"}` and line 121 copies `teamData.code`.
   - Step 4: *Conclusion*: `teamData.code` is undefined. The UI renders `"N/A"` and copy fails. The backend should return `code: team.inviteCode` (or alias it) and the frontend should read `teamData.inviteCode || teamData.code`.

3. **Invite Code Length & Input Constraint**:
   - Step 1: `generateTeamCode()` outputs `PRMPT-${nanoid()}` (12 characters). Seeded codes are 12 characters.
   - Step 2: `teamdetails/page.js` input specifies `maxLength={6}` and toast validates 6 characters.
   - Step 3: *Conclusion*: Users cannot enter 12-character invite codes into `/teamdetails`. `maxLength` should be increased to 20, and `joinTeamSchema` should accept `{ teamCode, inviteCode, code }`.

4. **Track Locking State**:
   - Step 1: Prisma's `Team` model records locking as `trackLockedAt: DateTime?`.
   - Step 2: `lockTrack` updates `data: { trackId, trackLockedAt: new Date() }`.
   - Step 3: Frontend `teamdetails/page.js` tests `teamData.trackLocked ?`.
   - Step 4: *Conclusion*: `teamData.trackLocked` is always undefined. The locked state is never displayed. The frontend must check `Boolean(teamData.trackLocked || teamData.trackLockedAt)`, and the controller can attach `trackLocked: Boolean(team.trackLockedAt)`.

---

## 3. Caveats
- **Deadlines**: `lockTrack` enforces `isBeforeDeadline(KEYS.TRACK_SELECTION_DEADLINE)`. If no deadline is set in `SystemSetting`, `isBeforeDeadline` returns `true` (unrestricted).
- **Submissions Dependency**: `upsertSubmission` in `submissions.controller.js` checks `if (!membership.team.trackId)` and rejects submission with 409 if no track is locked. Thus, Milestone 2 track locking is a hard prerequisite for Milestone 3 submissions.
- **Admin vs Participant**: `team.routes.js` guards all routes with `requireRole("PARTICIPANT")`. Admins or Jury accounts accessing `/api/team/*` receive 403 Forbidden, which is verified by Tier 1 RBAC tests.

---

## 4. Conclusion
The core backend business logic in PostgreSQL (atomic seat reservations, unique constraints, track locking logic) is architecturally robust and covered by E2E tests (`03_team_track.test.js` and `boundary_team_track.test.js`).
However, four critical integration disconnects exist:
1. Missing `POST /api/team` (and `/api/teams`) route handler and missing "Create Team" UI toggle in `/teamdetails`.
2. Property naming mismatches: `inviteCode` vs `code`, and `trackLockedAt` vs `trackLocked`.
3. Input length mismatch: 6-char frontend constraint vs 12-char backend code generator.
4. Input payload mismatch: `joinTeam` accepts only `teamCode`, whereas contracts and API clients may provide `inviteCode` or `code`.

---

## 5. Implementation Guidance for the Worker

### 5.1 Backend Changes

1. **`backend/src/modules/team/team.schema.js`**:
   - Add `createTeamSchema`:
     ```javascript
     const createTeamSchema = z.object({
       name: z.string().min(2).max(60).optional(),
       teamName: z.string().min(2).max(60).optional(),
     }).refine((data) => data.name || data.teamName, {
       message: "Team name is required.",
     });
     ```
   - Update `joinTeamSchema`:
     ```javascript
     const joinTeamSchema = z.object({
       teamCode: z.string().min(4).max(20).optional(),
       inviteCode: z.string().min(4).max(20).optional(),
       code: z.string().min(4).max(20).optional(),
     }).refine((data) => data.teamCode || data.inviteCode || data.code, {
       message: "Team invite code is required.",
     });
     ```

2. **`backend/src/modules/team/team.controller.js`**:
   - Implement `createTeam`:
     ```javascript
     const createTeam = asyncHandler(async (req, res) => {
       const parsed = createTeamSchema.parse(req.body);
       const teamName = (parsed.name || parsed.teamName).trim();

       const existingMembership = await prisma.teamMember.findUnique({ where: { userId: req.user.id } });
       if (existingMembership) {
         throw new ApiError(409, "You're already part of a team.");
       }

       let inviteCode = generateTeamCode();
       for (let attempts = 0; attempts < 5; attempts += 1) {
         const clash = await prisma.team.findUnique({ where: { inviteCode } });
         if (!clash) break;
         inviteCode = generateTeamCode();
       }

       const team = await prisma.$transaction(async (tx) => {
         return tx.team.create({
           data: {
             name: teamName,
             inviteCode,
             leaderId: req.user.id,
             capacityMax: 4,
             memberCount: 1,
             members: {
               create: { userId: req.user.id, role: "LEADER" },
             },
           },
           include: {
             track: true,
             members: { include: { user: { select: { id: true, name: true, college: true, skills: true } } } },
             submission: true,
           },
         });
       });

       await recordAudit(req.user.id, "TEAM_CREATED", { teamId: team.id });

       // Provide code and trackLocked aliases for frontend compatibility
       const formattedTeam = {
         ...team,
         code: team.inviteCode,
         trackLocked: Boolean(team.trackLockedAt),
       };

       res.status(201).json({ team: formattedTeam, myRole: "LEADER" });
     });
     ```
   - Update `getMyTeam`, `joinTeam`, and `lockTrack` to include `code: team.inviteCode` and `trackLocked: Boolean(team.trackLockedAt)` in their response payloads.
   - Update `joinTeam` to extract code with:
     `const targetCode = (req.body.teamCode || req.body.inviteCode || req.body.code)?.trim().toUpperCase();`

3. **`backend/src/modules/team/team.routes.js`**:
   - Add route:
     ```javascript
     router.post("/", requireAuth, requireRole("PARTICIPANT"), createTeam);
     ```

4. **`backend/src/app.js`**:
   - Mount both singular and plural forms:
     ```javascript
     app.use("/api/team", teamRoutes);
     app.use("/api/teams", teamRoutes);
     ```

### 5.2 Frontend Changes

1. **`src/app/(auth)/teamdetails/page.js`**:
   - When `!teamData`: Provide a dual tab/toggle: "Join Team" or "Create Team".
   - In "Create Team" mode: Input for `teamName` + "Create Team" button calling `api.post("/api/team", { name: teamName })` then refreshing `fetchTeamAndTracks()`.
   - In "Join Team" mode: Update input `maxLength={20}` and placeholder `"e.g. PRMPT-AB12CD or PT26AB"`.
   - In code display: Use `{teamData.inviteCode || teamData.code || "N/A"}`.
   - In `copyTeamCode`: Copy `teamData.inviteCode || teamData.code`.
   - In track lock section: Check `{Boolean(teamData.trackLocked || teamData.trackLockedAt) ? ...}`.
   - In roster header: Change `"Max 3 Members"` to `Max {teamData.capacityMax || 4} Members`.

---

## 6. Verification Method

### 6.1 Backend Unit & Integration Tests
Run existing team and submission integration tests:
```powershell
cd "c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\backend"
npx jest tests/team.test.js
npx jest tests/submissions.test.js
```

### 6.2 E2E Tier 1 & Tier 2 Automated Tests
Run the authoritative test suites for Features 9-12:
```powershell
cd "c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon"
node tests/e2e/tier1/03_team_track.test.js
node tests/e2e/tier2/boundary_team_track.test.js
node tests/e2e/tier1/04_rbac.test.js
node tests/e2e/tier2/boundary_rbac.test.js
node tests/e2e/tier1/05_frontend_views_audit.test.js
node tests/e2e/tier2/boundary_views.test.js
```

### 6.3 Invalidation Conditions
- If `POST /api/team` returns 404, team creation route is missing.
- If `/teamdetails` renders `"N/A"` for the team code, the `inviteCode` alias is missing.
- If locking a track keeps the dropdown and button visible, the `trackLockedAt` check is missing.
- If pasting a 12-character invite code truncates at 6 chars, `maxLength={6}` has not been updated.
