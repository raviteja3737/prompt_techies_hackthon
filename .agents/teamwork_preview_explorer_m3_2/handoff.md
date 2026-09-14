# Audit Report & Handoff: Views 4 to 6 Frontend Audit
**Agent**: `teamwork_preview_explorer_m3_2`  
**Working Directory**: `.agents/teamwork_preview_explorer_m3_2/`  
**Date**: 2026-09-14T06:48:00Z  
**Scope**: Views 4 to 6 of Prompt Techies Hackathon Frontend:
- View 4: `/teamdetails` (`src/app/(auth)/teamdetails/page.js`)
- View 5: `/submission` (`src/app/submission/page.js`)
- View 6: `/leaderboard` (`src/app/leaderboard/page.js`)

---

## 1. Observation

### General System & Build Health
- **Next.js Production Build**: `npm run build` executed and completed with exit code 0 across all 17 routes, generating static routes for `/teamdetails` (6.42 kB), `/submission` (4.93 kB), and `/leaderboard` (16.2 kB).
- **E2E Smoke Tests**: `npm run test:e2e -- --smoke` executed 56/56 passing tests with zero failures.

---

### View 4: `/teamdetails` (`src/app/(auth)/teamdetails/page.js`)

#### Obs 4.1: Member Email Field Contract Mismatch
- **Frontend Code**: `src/app/(auth)/teamdetails/page.js:457-459`
  ```jsx
  <span className="text-xs text-slate-400 flex items-center gap-1">
      <Mail className="w-3 h-3 text-slate-500" /> {m.user?.email}
  </span>
  ```
- **Backend Query**: `backend/src/modules/team/team.controller.js:28` & `line 125`
  ```javascript
  members: { include: { user: { select: { id: true, name: true, college: true, skills: true } } } }
  ```
- **Discrepancy**: The backend Prisma query specifically restricts `select` to `{ id, name, college, skills }`, omitting `email`. Consequently, `m.user?.email` evaluates to `undefined`, leaving the `<Mail />` icon rendered next to an empty space. Note: The mock fallback at `team.controller.js:48` included `email`, but the production database query does not.

#### Obs 4.2: Missing Track Lock Confirmation Modal
- **Frontend Code**: `src/app/(auth)/teamdetails/page.js:408-417`
  ```jsx
  {isLeader && (
      <button
          onClick={handleLockTrack}
          disabled={isLockingTrack || !selectedTrackId}
          className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-black bg-[#00c8ff] hover:bg-[#38bdf8] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
          <Lock className="w-3.5 h-3.5" />
          <span>{isLockingTrack ? "Locking Track..." : "Lock Track Selection"}</span>
      </button>
  )}
  ```
- **Discrepancy**: Clicking "Lock Track Selection" immediately fires `handleLockTrack()`, calling `POST /api/team/track-lock`. Track locking is permanent, irreversible, and locks the team's problem statement permanently. The prompt specifically mandated a confirmation modal before locking, which is currently absent.

#### Obs 4.3: Clipboard Copy Error Handling
- **Frontend Code**: `src/app/(auth)/teamdetails/page.js:147-155`
  ```javascript
  const copyTeamCode = () => {
      const code = teamData?.inviteCode || teamData?.code;
      if (code) {
          navigator.clipboard.writeText(code);
          setCopied(true);
          toast.success("Team code copied to clipboard!");
          setTimeout(() => setCopied(false), 2000);
      }
  };
  ```
- **Observation**: `navigator.clipboard.writeText` is a Promise and can reject in insecure contexts, non-focused documents, or restricted browser permissions. There is no `.catch()` handler; an unhandled rejection can cause silent failures without user feedback.

#### Obs 4.4: Team Disband / Leave / Kick Controls
- **Observation**: `src/app/(auth)/teamdetails/page.js` does not render any "Leave Team" or "Remove Member" buttons.
- **Backend Inspection**: `backend/src/modules/team/team.routes.js:7-10` only defines:
  ```javascript
  router.post("/", requireAuth, requireRole("PARTICIPANT"), createTeam);
  router.get("/me", requireAuth, requireRole("PARTICIPANT"), getMyTeam);
  router.post("/join", requireAuth, requireRole("PARTICIPANT"), joinTeam);
  router.post("/track-lock", requireAuth, requireRole("PARTICIPANT"), lockTrack);
  ```
  Neither the backend nor frontend currently supports voluntary team leaving or member removal.

---

### View 5: `/submission` (`src/app/submission/page.js`)

#### Obs 5.1: Critical Upload Ordering Dependency (Draft Requirement)
- **Frontend Code**: `src/app/submission/page.js:91-96`
  ```javascript
  // Step 3: Confirm storage key with backend
  await api.post("/api/team/submission/pitch-deck", {
      key,
      url: uploadUrl.split("?")[0],
  });
  ```
- **Backend Code**: `backend/src/modules/submissions/submissions.controller.js:157-159`
  ```javascript
  if (!membership.team.submission) {
    throw new ApiError(409, "Save your submission before attaching a pitch deck.");
  }
  ```
- **Discrepancy**: If a user uploads a pitch deck file prior to having saved an initial draft via "Save Draft", Step 1 (`/upload-url`) and Step 2 (S3/Supabase upload) succeed, but Step 3 (`POST /api/team/submission/pitch-deck`) throws HTTP 409 Conflict. The UI shows an error toast and leaves the uploaded object orphaned.

#### Obs 5.2: Storage Provider Disabled by Default & Missing Direct Link Fallback
- **Backend Code**: `backend/src/utils/storage.js:42-49`
  ```javascript
  const provider = process.env.STORAGE_PROVIDER || "disabled";
  if (provider === "disabled") {
    throw new ApiError(
      501,
      "File uploads are not configured on this server. Set STORAGE_PROVIDER=supabase and the SUPABASE_* environment variables to enable pitch-deck uploads."
    );
  }
  ```
- **Frontend Code**: `src/app/submission/page.js:274-290` only provides an `<input type="file" accept="application/pdf">`.
- **Discrepancy**: When `STORAGE_PROVIDER` is unset or `disabled` (e.g. local development or self-hosted instances without S3/Supabase credentials), pitch deck uploads throw 501. There is no alternative input field for users to provide a direct URL (Google Slides, Canva, Figma, OneDrive, external PDF link), despite the prompt specifying: "Pitch deck upload / payload handling (`{ key, url }` or direct link input)".

#### Obs 5.3: Incomplete URL Format Validations
- **Frontend Code**: `src/app/submission/page.js:111-114`
  ```javascript
  if (!repoUrl.trim() || !GITHUB_REGEX.test(repoUrl.trim())) {
      toast.error("Please enter a valid GitHub repository URL (e.g. https://github.com/org/repo).");
      return;
  }
  ```
- **Backend Schema**: `backend/src/modules/submissions/submissions.schema.js:6-7`
  ```javascript
  liveUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  ```
- **Discrepancy**: Frontend does not validate `liveUrl` or `videoUrl`. If a user enters `youtu.be/xyz` or `myproject.vercel.app` without the `https://` scheme, the backend Zod validation throws an unformatted 400/422 validation error.

#### Obs 5.4: Pitch Deck Download / Verification Link Absent
- **Frontend Code**: `src/app/submission/page.js:267-272`
  ```jsx
  {pitchDeckKey && (
      <div className="p-3 rounded-lg bg-green-950/20 border border-green-500/20 text-xs text-green-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>Pitch deck file stored: {pitchDeckKey}</span>
      </div>
  )}
  ```
- **Backend Route**: `GET /api/team/submission/pitch-deck-url` returns a signed download link.
- **Discrepancy**: The frontend displays the raw key text but does not provide a clickable link or button to view/download the uploaded deck to verify its contents.

#### Obs 5.5: Lack of Visual Tech Stack Chips
- **Frontend Code**: `src/app/submission/page.js:250-258` renders a plain text input for comma-separated values.
- **Discrepancy**: The specification requests "Tech Stack tags/chips". The current implementation lacks tag pill badges with individual removal buttons.

---

### View 6: `/leaderboard` (`src/app/leaderboard/page.js`)

#### Obs 6.1: Blatant Review Count Field Mismatch (`evaluationsCount` vs `juryCount`)
- **Frontend Code**: `src/app/leaderboard/page.js:217-219`
  ```jsx
  <td className="py-3 px-4 text-center font-mono text-slate-400">
      {team.evaluationsCount || 0}
  </td>
  ```
- **Backend Response**: `backend/src/modules/leaderboard/leaderboard.service.js:78`
  ```javascript
  return {
    teamId: team.id,
    teamName: team.name,
    track: team.track ? { id: team.track.id, title: team.track.title } : null,
    members: team.members.map((m) => m.user.name),
    juryCount,
    averageScore: Math.round(averageScore * 100) / 100,
    totalScore: Math.round(totalScore * 100) / 100,
    normalized: normalizationEnabled,
    breakdown,
  };
  ```
- **Discrepancy**: The backend field is named `juryCount`, whereas the frontend reads `team.evaluationsCount`. Because `evaluationsCount` is `undefined`, the "Reviews" column renders `0` for every single team in the hackathon, regardless of how many jury reviews were submitted.

#### Obs 6.2: Column Header vs Metric Mismatch: "Average Score" Showing `totalScore`
- **Frontend Code**: `src/app/leaderboard/page.js:208` & `line 221`
  ```jsx
  <th className="py-3 px-4 text-right">Average Score</th>
  ...
  <td className="py-3 px-4 text-right font-mono font-bold text-[#00c8ff]">
      {scoresFrozen ? "Locked 🔒" : (team.totalScore?.toFixed(1) || "0.0")}
  </td>
  ```
  And in the podium card (`line 177`):
  ```jsx
  {scoresFrozen ? "Locked 🔒" : (team.totalScore?.toFixed(1) || "0.0")}
  ```
- **Discrepancy**: The column header explicitly states "Average Score", but the table and podium display `team.totalScore`. The backend calculates both `averageScore` (0-100 average across evaluations) and `totalScore` (sum across all evaluations). If a team has 3 evaluations averaging 88.0, their `totalScore` is 264.0, which renders under a header labeled "Average Score".

#### Obs 6.3: Socket Filter Overwrite Race Condition
- **Frontend Code**: `src/app/leaderboard/page.js:49-56`
  ```javascript
  socket.on("leaderboard:update", (data) => {
      if (data?.leaderboard) {
          setLeaderboardData(data.leaderboard);
      }
      if (typeof data?.scoresFrozen !== "undefined") {
          setScoresFrozen(data.scoresFrozen);
      }
  });
  ```
- **Backend Code**: `backend/src/sockets/index.js:41` and `lines 89-90`
  ```javascript
  socket.join("leaderboard:public");
  ...
  const full = await buildLeaderboard();
  io.to("leaderboard:public").emit("leaderboard:update", { leaderboard: full, scoresFrozen: false });
  ```
- **Discrepancy**: When a user selects a track filter via the dropdown, `fetchLeaderboard` fetches only the teams for that track. However, whenever any evaluation is locked in the entire system, the backend broadcasts the unfiltered global leaderboard to `leaderboard:public`. The frontend listener unconditionally calls `setLeaderboardData(data.leaderboard)`, wiping out the user's active filter and resetting the view to all tracks without user interaction.

#### Obs 6.4: Unranked Teams Displaying Fake Ranks
- **Frontend Code**: `src/app/leaderboard/page.js:214`
  ```jsx
  <td className="py-3 px-4 font-mono font-bold text-white">#{index + 1}</td>
  ```
- **Backend Code**: `backend/src/modules/leaderboard/leaderboard.service.js:94-102`
  ```javascript
  let rank = 0;
  rows.forEach((row) => {
    if (row.juryCount > 0) {
      rank += 1;
      row.rank = rank;
    } else {
      row.rank = null;
    }
  });
  ```
- **Discrepancy**: The backend calculates `row.rank` and sets it to `null` for teams with 0 evaluations (`juryCount === 0`). The frontend displays `#{index + 1}`, giving unreviewed teams artificial ranks like `#4` or `#5` instead of showing `team.rank ? `#${team.rank}` : "—"`.

#### Obs 6.5: Missing Search, Status Column, and Category Breakdown
- **Frontend Code**: Table headers (`lines 204-208`) are `Rank`, `Team`, `Track`, `Reviews`, `Average Score`.
- **Discrepancy**:
  - No `Status` column (e.g. "Evaluated", "Pending Review").
  - No search input to filter teams by name.
  - The `breakdown` array provided by the backend is completely unrendered; there is no modal or accordion to view the 4 rubric scores (Innovation, Technical, Design, Viability) or anonymized jury feedback.

---

## 2. Comprehensive Inventory Table for Views 4 to 6

| View | Interactive Element | Component / Selector | Current Backing Handler / Event | API / Contract Target | Status / Observed Behavior |
|---|---|---|---|---|---|
| **`/teamdetails`** | Sign Out Button | `<button onClick={logout}>` | `logout()` via `AuthContext` | `POST /api/auth/logout` | ✅ Working properly, clears session and redirects |
| **`/teamdetails`** | Navigation Hub Links | `<Link href="...">` | Next.js Client Navigation | Route links | ✅ Navigates to `/leaderboard`, `/submission`, `/networking`, `/announcements`, `/jury`, `/admin` |
| **`/teamdetails`** | Join/Create Tab Toggle | `<button onClick={() => setNoTeamTab("join"/"create")}>` | Local state toggle | N/A | ✅ Smooth tab switching |
| **`/teamdetails`** | Join Team Input & Submit | `<form onSubmit={handleJoinTeam}>` | `api.post("/api/team/join", { teamCode })` | `POST /api/team/join` | ✅ Working, supports inviteCode / teamCode |
| **`/teamdetails`** | Create Team Input & Submit | `<form onSubmit={handleCreateTeam}>` | `api.post("/api/team", { name })` | `POST /api/team` | ✅ Working, enforces length >= 2 |
| **`/teamdetails`** | Copy Invite Code Button | `<button onClick={copyTeamCode}>` | `navigator.clipboard.writeText` | Browser API | ⚠️ Works, but missing `.catch()` error guard |
| **`/teamdetails`** | Track Selection Dropdown | `<select onChange={setSelectedTrackId}>` | Local state selection | `GET /api/tracks` | ✅ Populates options from API |
| **`/teamdetails`** | Track Lock Button | `<button onClick={handleLockTrack}>` | `api.post("/api/team/track-lock")` | `POST /api/team/track-lock` | ❌ **Missing confirmation modal** before irreversible lock |
| **`/teamdetails`** | Member Email Display | `<Mail /> {m.user?.email}` | State interpolation | `GET /api/team/me` | ❌ **Displays blank**: backend query omits `email` from select |
| **`/teamdetails`** | Leave / Disband Team | Not present | N/A | N/A | ℹ️ No backend route exists; not implemented in UI |
| **`/submission`** | Back to Team Button | `<Link href="/teamdetails">` | Client navigation | `/teamdetails` | ✅ Working |
| **`/submission`** | Repository URL Input | `<input type="url" value={repoUrl}>` | Validated with `GITHUB_REGEX` | `POST /api/team/submission` | ✅ Validates GitHub URL format |
| **`/submission`** | Live URL & Video URL Inputs | `<input type="url">` | Value bound to state | `POST /api/team/submission` | ⚠️ **Missing URL validation** (rejects on backend if missing scheme) |
| **`/submission`** | Tech Stack Tags Input | `<input type="text">` | Comma split into array | `POST /api/team/submission` | ⚠️ Plain text input, lacks interactive tags/chips |
| **`/submission`** | Pitch Deck File Picker & Upload | `<input type="file">` & `<button>` | `handleUploadPitchDeck` | `POST .../upload-url` + S3 + `POST .../pitch-deck` | ❌ **Crashes with 409** if draft not saved first; **501** if storage disabled |
| **`/submission`** | Pitch Deck Direct Link Input | Not present | N/A | `POST /api/team/submission` | ❌ **Missing**: no direct URL input for external slides |
| **`/submission`** | Pitch Deck Download Link | Not present | N/A | `GET .../pitch-deck-url` | ❌ **Missing**: shows key only, no download/preview link |
| **`/submission`** | Save Draft Button | `<button onClick={() => handleSubmit(false)}>` | `api.post("/api/team/submission", { submit: false })` | `POST /api/team/submission` | ✅ Working |
| **`/submission`** | Final Submit & Lock Button | `<button onClick={() => handleSubmit(true)}>` | `confirm()` + `api.post(..., { submit: true })` | `POST /api/team/submission` | ✅ Working, disables inputs upon submission |
| **`/leaderboard`** | Back Button | `<Link href="/teamdetails">` | Client navigation | `/teamdetails` | ✅ Working |
| **`/leaderboard`** | Track Filter Dropdown | `<select onChange={setSelectedTrackId}>` | Triggers `fetchLeaderboard()` | `GET /api/leaderboard?trackId=...` | ⚠️ **Wiped out on socket update** |
| **`/leaderboard`** | Refresh Button | `<button onClick={fetchLeaderboard}>` | Manual reload with spinner | `GET /api/leaderboard` | ✅ Working |
| **`/leaderboard`** | Real-time Socket Connection | `getSocket()` | Listeners: `leaderboard:update`, `freeze-changed` | Socket.IO server | ⚠️ Overwrites active filter; doesn't listen to `score:updated` |
| **`/leaderboard`** | Frozen Scores Banner | Conditional banner | Bound to `scoresFrozen` | Backend setting | ✅ Working, displays banner and masks points |
| **`/leaderboard`** | Reviews Count Cell | `{team.evaluationsCount \|\| 0}` | Property access | `GET /api/leaderboard` | ❌ **Always 0**: backend property is `juryCount` |
| **`/leaderboard`** | Average Score Cell | `{team.totalScore?.toFixed(1)}` | Property access | `GET /api/leaderboard` | ❌ **Metric mismatch**: displays `totalScore` under "Average Score" |
| **`/leaderboard`** | Rank Column | `#{index + 1}` | Index math | `GET /api/leaderboard` | ⚠️ Assigns artificial ranks to unscored teams |
| **`/leaderboard`** | Team Search & Column Sort | Not present | N/A | N/A | ❌ Missing search and sort controls |
| **`/leaderboard`** | Status Column | Not present | N/A | N/A | ❌ Missing status column |

---

## 3. Logic Chain

1. **Member Email Discrepancy**:
   - `teamdetails/page.js:458` renders `{m.user?.email}`.
   - `team.controller.js:28` selects only `id, name, college, skills`.
   - Therefore, `m.user.email` is undefined, producing an empty string next to the mail icon.

2. **Irreversible Track Locking without Confirmation**:
   - Track locking is permanently enforced at `team.controller.js:195` (`if (membership.team.trackLockedAt) throw new ApiError(409)`).
   - `teamdetails/page.js:410` binds `onClick={handleLockTrack}` directly with no confirmation dialog or modal.
   - An accidental click permanently restricts the team with no remediation path.

3. **Pitch Deck Upload Failure on Fresh Teams**:
   - `submission/page.js:92` invokes `api.post("/api/team/submission/pitch-deck")` upon file upload.
   - `submissions.controller.js:157` checks `if (!membership.team.submission)` and throws HTTP 409.
   - When a team attempts to upload a deck before saving an initial draft, the upload succeeds to S3/Supabase but fails on the server, leaving an orphaned file and an error state.

4. **Leaderboard Review Count Bug**:
   - `leaderboard/page.js:218` renders `team.evaluationsCount || 0`.
   - `leaderboard.service.js:78` defines the returned key as `juryCount`.
   - As `evaluationsCount` is nonexistent on the response object, it defaults to 0 across all rows.

5. **Socket Race Condition Overriding Filters**:
   - Selecting a track sets `selectedTrackId` and queries `GET /api/leaderboard?trackId=...`.
   - The socket listener for `leaderboard:update` (`leaderboard/page.js:49`) receives global updates and directly runs `setLeaderboardData(data.leaderboard)`.
   - Whenever any jury locks a score anywhere, the user's filtered view is replaced by the unfiltered list.

---

## 4. Caveats
- `STORAGE_PROVIDER` configuration depends on environment variables (`SUPABASE_URL` or `AWS_S3_BUCKET`). In default local dev environments where this is `disabled`, file upload testing returns HTTP 501 unless mocked or configured.
- Team leaving/member removal endpoints do not exist in the backend; implementing them in UI requires either backend route additions or clarifying that rosters are immutable once formed.

---

## 5. Conclusion & Concrete Recommended Fixes for Worker

### Fix 1: `/teamdetails` — Member Email & Confirmation Modal
1. In `backend/src/modules/team/team.controller.js` (lines 28 and 125), add `email: true` to the Prisma select clause:
   ```javascript
   members: { include: { user: { select: { id: true, name: true, email: true, college: true, skills: true } } } }
   ```
2. In `src/app/(auth)/teamdetails/page.js`:
   - Add a confirmation modal state (e.g. `showLockConfirm`, `setShowLockConfirm`) before executing `handleLockTrack()`.
   - Display a modal asking: *"Are you sure you want to lock track '[Track Name]'? Track selection is permanent and cannot be modified."*
   - Wrap `navigator.clipboard.writeText` in a `.catch()` block to safely catch clipboard errors.

### Fix 2: `/submission` — Pitch Deck Upload, Direct Link & URL Validations
1. In `src/app/submission/page.js`:
   - In `handleUploadPitchDeck`, if no submission exists yet (`!sub`), automatically create/upsert a draft first, or notify the user to save a draft before uploading.
   - Add a direct Pitch Deck URL input field (for external Google Slides/Drive/Canva links) as a fallback if file storage is disabled or preferred.
   - In `handleSubmit`, add URL validation for `videoUrl` and `liveUrl` (e.g. ensure they start with `http://` or `https://`).
   - If `pitchDeckKey` or `pitchDeckUrl` exists, render a link or button that calls `GET /api/team/submission/pitch-deck-url` to view/download the uploaded deck.
   - Enhance the tech tags input with an interactive chip/tag interface.

### Fix 3: `/leaderboard` — Field Mismatch, Socket Filter Isolation & Table Metrics
1. In `src/app/leaderboard/page.js`:
   - Line 218: Change `{team.evaluationsCount || 0}` to `{team.juryCount ?? team.evaluationsCount ?? 0}`.
   - Line 221: Change `{team.totalScore?.toFixed(1) || "0.0"}` to `{team.averageScore?.toFixed(1) || "0.0"}` so it accurately matches the "Average Score" column header (or display both `Average` and `Total`).
   - In podium card (line 177): Display `team.averageScore?.toFixed(1)`.
   - Line 214: Replace `#{index + 1}` with `{team.rank ? `#${team.rank}` : "—"}` so unscored teams are marked unranked.
   - In socket listener (`line 49`): Only update `setLeaderboardData(data.leaderboard)` if `!selectedTrackId`; if `selectedTrackId` is active, re-fetch `/api/leaderboard?trackId=${selectedTrackId}` or ignore global broadcasts.
   - Add listeners for `score:updated` and `leaderboard:refresh` for additional socket compatibility.
   - Add a search input to filter teams by name and a Status column ("Evaluated", "Pending").

---

## 6. Verification Method

### Command-Line Verifications
1. **Next.js Production Build**:
   ```bash
   npm run build
   ```
   *Expected: Exit code 0, all 17 routes compiled cleanly.*

2. **E2E Smoke & Views Audit Tests**:
   ```bash
   node tests/e2e/runner.js --filter="views"
   npm run test:e2e -- --smoke
   ```
   *Expected: All tests pass with zero failures.*

3. **Backend Integration Tests**:
   ```bash
   npm --prefix backend test
   ```

### Manual / Browser Verification Checklist
1. Visit `/teamdetails`: Verify member emails render correctly, test clipboard copy with toast feedback, select a track, and verify that clicking "Lock Track Selection" opens a confirmation modal before locking.
2. Visit `/submission`: Verify that entering invalid video/live URLs triggers validation feedback, verify that pitch deck direct URL or upload works without 409 errors, and verify the pitch deck preview/download link appears.
3. Visit `/leaderboard`: Verify the "Reviews" column displays actual jury counts (not 0), verify the "Average Score" column displays `averageScore`, verify unranked teams show `—`, select a track filter, and verify that incoming socket events do not wipe out the filter.
