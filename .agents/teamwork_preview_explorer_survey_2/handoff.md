# Phase 0 Explorer 2 Handoff Report: Frontend Views, Navigation & User Workflows

**Audit Date**: 2026-09-14  
**Investigator**: Explorer 2 (Frontend Views, Navigation, & User Workflows)  
**Target Project**: Prompt Techies Hackathon Platform (`promptathon`)  
**Workspace Root**: `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon`  

---

## 1. Observation

### 1.1 Architectural Overview & Build Status
- The frontend is built on **Next.js 14.2.15** with React 18, Tailwind CSS, Lucide React, Axios, and Socket.IO client (`package.json:23-43`).
- The application utilizes the **Next.js App Router** structure under `src/app/`.
- Executing `npm run build` completed with **exit code 0** across all 17 static and dynamic route targets:
  - Prerendered static pages: `/`, `/_not-found`, `/admin`, `/announcements`, `/jury`, `/leaderboard`, `/login`, `/networking`, `/register`, `/submission`, `/teamdetails`, `/preptember`.
  - Dynamic server-rendered pages: `/preptember/videos/[id]`.
- Global layout (`src/app/layout.js:98-117`) wraps all pages in `SimulatedDarkModeProvider`, `AuthProvider`, `<Navbar />`, `<Footer />`, and `<Toaster />`.

---

### 1.2 The 9 Primary Views & Interactive Controls Catalog (Requirement R3)

#### View 1: Landing Page (`/` -> `src/app/page.js`)
* **File Structure**: `src/app/page.js` imports `HeroMod`, `About`, `Timer`, `Tracks`, `Mentors`, `TimelineOld`, `ContactUs`, `Footer`, `RootLayoutClient`, and `Chatbot`.
* **Interactive Controls & Links**:
  - **Navbar (`src/components/navbar.js:76-84, 98-225`)**:
    - Brand Logo: `<Link href="/">`
    - Section Anchor Links: `#about`, `#tracks`, `#timeline`, `#contact`
    - Route Links: `/leaderboard`, `/networking`, `/announcements`
    - Mobile Menu Hamburger Toggle: `button[type="button"]` toggles `menuOpen` state and dialog
    - Conditional Auth Links:
      - Authenticated (`user` present): `<Link href="/teamdetails">` ("Team Details") and `<button onClick={logout}>` ("Logout")
      - Unauthenticated (`!user`): `<Link href="/login">` ("Login ->")
  - **Hero Section (`src/app/HeroMod.js:48-75`)**:
    - If `user`: `<Link href="/teamdetails">` ("Team Details")
    - If `!user`: `<Link href="https://forms.gle/L2rvjg4DvLUY6PR26" target="_blank">` ("Register Now") *(Note: External Google Form link rather than `/register`)*
  - **Tracks Section (`src/components/Tracks.js:44-73`)**:
    - Interactive 3D Card Fan Carousel (`CardFanCarousel`)
    - CTA Anchor: `<a href="/register">Choose Your Track & Register</a>`
  - **Mentors Section (`src/components/mentors.js:48-69`)**:
    - Mentor social links: `<a href={mentor.linkedinProfile} target="_blank">`
  - **Contact Us Section (`src/components/contactUs.js:86-122`)**:
    - Email mailto links: `contact@prompttechies.in`, `prompttechies@gmail.com`
    - Phone tel link: `tel:+918008087702`
  - **Footer (`src/components/footer.js:53-97, 122-147`)**:
    - Social links: X/Twitter (`@prompttechies`), Instagram (`@prompt_techies`), LinkedIn (`prompt-techies`), GitHub (`prompttechies-del`)
    - Quick links: `#about`, `#programs`, `https://prompttechies.in`, `#contact`
  - **Chatbot (`src/components/chatbot.js:140-169`)**:
    - Floating Action Button: "Ask PT" / "Close" (`src/components/RootLayoutClient.js:64-72`)
    - Chat input text box + Send icon button (`handleKeyDown`, `sendMessage`)
    - External API integration: Groq Cloud API (`https://api.groq.com/openai/v1/chat/completions`) using model `llama3-8b-8192`

#### View 2: Login Page (`/login` -> `src/app/(auth)/login/page.js`)
* **File Structure**: `src/app/(auth)/login/page.js`
* **Interactive Controls & Forms**:
  - **Toggle Tabs**:
    - "Sign In" button: Sets `isSignUp(false)`
    - "Create Account" button: Sets `isSignUp(true)`
  - **Input Fields**:
    - Full Name input: `register("name")` (visible only when `isSignUp === true`)
    - Email Address input: `register("email")` (`type="email"`)
    - Password input: `register("password")` (`type="password"`)
  - **Submission Buttons**:
    - Primary Submit Button: `type="submit"` ("Sign In" / "Create Account" / "Authenticating...")
    - Quick Seed Login Button: `handleQuickSeedLogin` (`login("admin@promptothon.dev", "ChangeMe123!")`)
    - Back link: `<Link href="/">` ("<- Back to Promptathon Home")
* **API Calls**:
  - `POST /api/auth/login` with `{ email, password }`
  - `POST /api/auth/register` with `{ intent: "solo", name, email, password }`
* **Route Redirection**:
  - `useEffect`: Automatically pushes to `/teamdetails` if `user` is already populated in `AuthContext`.

#### View 3: Registration Splash (`/register` -> `src/app/(auth)/register/page.js`)
* **File Structure**: `src/app/(auth)/register/page.js`
* **Interactive Controls & Links**:
  - Primary CTA: `<Link href="/login">` ("Proceed to Register / Login")
  - Social Links: Instagram, LinkedIn, GitHub (derived from `SOCIAL_LINKS`)
  - Back Button: `<button onClick={() => router.push("/")}>` ("<- Return to Promptathon Home")
* **Route Redirection**:
  - Redirects to `/teamdetails` if `user && isRegistered`.

#### View 4: Team Hub & Details (`/teamdetails` -> `src/app/(auth)/teamdetails/page.js`)
* **File Structure**: `src/app/(auth)/teamdetails/page.js`
* **Interactive Controls & Forms**:
  - **Sign Out Button**: `onClick={logout}` -> calls `POST /api/auth/logout` and pushes to `/login`.
  - **Quick Navigation Hub**:
    - `<Link href="/leaderboard">`
    - `<Link href="/submission">`
    - `<Link href="/networking">`
    - `<Link href="/announcements">`
    - `<Link href="/jury">` (Rendered conditionally if `user?.role === "JURY" || user?.role === "ADMIN"`)
    - `<Link href="/admin">` (Rendered conditionally if `user?.role === "ADMIN"`)
  - **When Not in a Team (`!teamData`)**:
    - Join Team Form: Input `joinCodeInput` (max 6 characters, auto-uppercased)
    - Join Team Button: `type="submit"` (`POST /api/team/join` with `{ teamCode }`)
  - **When in an Active Team (`teamData`)**:
    - Team Code Copy Button: `onClick={copyTeamCode}` (copies `teamData.code` to clipboard)
    - Track Selection Dropdown: `<select value={selectedTrackId} disabled={!isLeader}>`
    - Lock Track Button (Leader only): `onClick={handleLockTrack}` (`POST /api/team/track-lock` with `{ trackId }`)
    - Navigation Action: `<Link href="/submission">` ("Go to Submission Portal")

#### View 5: Project Submission (`/submission` -> `src/app/submission/page.js`)
* **File Structure**: `src/app/submission/page.js`
* **Interactive Controls & Forms**:
  - Back link: `<Link href="/teamdetails">`
  - Input: GitHub Repository URL (`repoUrl`, validated with `GITHUB_REGEX`)
  - Input: Live Demo / Deployment URL (`liveUrl`, optional)
  - Input: Demo Video Walkthrough URL (`videoUrl`, optional)
  - Input: Technologies & Models Used (`techTags`, comma-separated string)
  - Pitch Deck Upload:
    - `<input type="file" accept="application/pdf">`
    - Button: "Upload Pitch Deck" (`handleUploadPitchDeck`)
  - Action Buttons:
    - "Save Draft" Button: `handleSubmit(false)` (`POST /api/team/submission` with `submit: false`)
    - "Final Submit & Lock" Button: `handleSubmit(true)` (`confirm()` prompt -> `POST /api/team/submission` with `submit: true`)

#### View 6: Live Leaderboard (`/leaderboard` -> `src/app/leaderboard/page.js`)
* **File Structure**: `src/app/leaderboard/page.js`
* **Interactive Controls & Data Display**:
  - Back link: `<Link href="/teamdetails">`
  - Dropdown Filter: Filter by Track (`selectedTrackId`)
  - Refresh Button: `onClick={fetchLeaderboard}`
  - Score Freeze Banner: Shown when `scoresFrozen === true`
  - Top 3 Podium Cards (Gold 1st, Silver 2nd, Bronze 3rd)
  - Full Standings Table: Columns for Rank, Team Name, Track, Number of Reviews, Average Score. Numeric scores masked as "Locked 🔒" when `scoresFrozen === true`.
  - Real-time Sockets: Listens to `socket.on("leaderboard:update")` and `socket.on("leaderboard:freeze-changed")`.

#### View 7: Jury Evaluation Portal (`/jury` -> `src/app/jury/page.js`)
* **File Structure**: `src/app/jury/page.js`
* **Interactive Controls & Scoring**:
  - Back link: `<Link href="/teamdetails">`
  - Assigned Queue Selector: List of team buttons (`onClick={() => setSelectedTeam(item)}`)
  - Deliverables Links: External link to GitHub repo and Live demo
  - 4x25 Rubric Sliders:
    - Innovation & Creativity (range 0–25)
    - Technical Execution (range 0–25)
    - UI/UX & Design (range 0–25)
    - Commercial Viability (range 0–25)
  - Constructive Feedback Textarea: `textarea[value={feedback}]`
  - Computed Total Display: `${totalScore} / 100`
  - "Save Draft" Button: `handleEvaluate(false)` (`POST /api/jury/evaluate` with `lock: false`)
  - "Lock & Submit Score" Button: `handleEvaluate(true)` (`POST /api/jury/evaluate` with `lock: true`)

#### View 8: Broadcast Center & Announcements (`/announcements` -> `src/app/announcements/page.js`)
* **File Structure**: `src/app/announcements/page.js`
* **Interactive Controls**:
  - Back link: `<Link href="/teamdetails">`
  - Tab Switcher: "Announcements" vs "Notifications"
  - "Mark all as read" Button: `PATCH /api/notifications/read-all`
  - Announcement Feed: Rendered with priority badges (`URGENT`, `HIGH`, `NORMAL`) and timestamps
  - Notifications Feed: Rendered with read/unread visual indicators

#### View 9: Admin Operations Panel (`/admin` -> `src/app/admin/page.js`)
* **File Structure**: `src/app/admin/page.js`
* **Interactive Controls & Governance**:
  - Back link: `<Link href="/teamdetails">`
  - Metric Cards: Total Teams, Registered Participants, Submissions Locked, Jury Evaluations
  - Score Freeze Toggle Button: `handleToggleFreeze` (`POST /api/admin/freeze-scores` with `{ freeze: !scoresFrozen }`)
  - Problem Track Creation Form:
    - Input: Track Title (`newTrackTitle`)
    - Input: Track Description (`newTrackDesc`)
    - Submit Button: "Add Track" (`POST /api/tracks`)
  - Problem Track Deletion Button: `Trash2` icon (`DELETE /api/tracks/:id` with `confirm()`)

---

### 1.3 Backend Alignment Audit & Critical Discrepancies

| # | Domain | Frontend Location | Backend Location | Exact Discrepancy & Symptom |
|---|---|---|---|---|
| **1** | Pitch Deck Upload | `src/app/submission/page.js:87` | `backend/src/modules/submissions/submissions.controller.js:149-151` | **Payload Mismatch**: Frontend calls `api.post("/api/team/submission/pitch-deck", { key })`. Backend explicitly checks `if (!key \|\| !url) throw new ApiError(422, "key and url are required.");`. Frontend never sends `url`, causing permanent HTTP 422 errors. |
| **2** | Team Code Property | `src/app/(auth)/teamdetails/page.js:121, 271` | `backend/prisma/schema.prisma:101`, `team.controller.js:74` | **Field Name Mismatch**: Prisma model defines `inviteCode String @unique`. Frontend reads `teamData.code`. When backed by PostgreSQL, `teamData.code` is `undefined`, causing the UI to display `"N/A"` and copying undefined. |
| **3** | Track Lock Property | `src/app/(auth)/teamdetails/page.js:59, 295` | `backend/prisma/schema.prisma:115`, `team.controller.js:124` | **Field Name Mismatch**: Prisma model defines `trackLockedAt DateTime?`. Frontend reads `teamData.trackLocked`. When backed by PostgreSQL, `teamData.trackLocked` is `undefined`, causing the track to stay permanently unlocked in the UI even after successful locking. |
| **4** | Team Creation UI | `src/app/(auth)/teamdetails/page.js:226-258` | `backend/src/modules/auth/auth.controller.js:56-80`, `team.routes.js` | **Missing UI Flow**: In `/teamdetails`, users without a team only have "Join a Team". In `/login`, registration always sends `intent: "solo"`. There is no form or button to create a team (`intent: "create"` with `teamName`), blocking Requirement R2. |
| **5** | Password Length | `src/app/(auth)/login/page.js:17` | `backend/src/modules/auth/auth.schema.js:6` | **Validation Schema Delta**: Frontend Zod allows passwords of length 6 (`min(6)`). Backend Zod schema enforces `min(8)`. A 6- or 7-character password passes client validation but fails with HTTP 400 from backend. |
| **6** | Hero Register Link | `src/app/HeroMod.js:63` | `src/app/(auth)/register/page.js` | **External Redirect**: Hero "Register Now" button points to `https://forms.gle/L2rvjg4DvLUY6PR26` (external Google Form) instead of the internal `/register` route. |
| **7** | Public Track Query | `src/app/leaderboard/page.js:33` | `backend/src/modules/tracks/tracks.routes.js:8` | **RBAC Guard Conflict**: `/leaderboard` is a public view, but it calls `api.get("/api/tracks")` which requires `requireAuth`. An unauthenticated visitor receives HTTP 401 in console, and track filtering is empty. |
| **8** | Admin Jury Access | `src/app/(auth)/teamdetails/page.js:206` | `backend/src/modules/jury/jury.routes.js:13-14` | **RBAC Guard Conflict**: UI gives Admins access to `/jury` (`role === "ADMIN"`). Backend routes `/api/jury/queue` and `/evaluate` use `requireRole("JURY")`, rejecting Admins with HTTP 403. |
| **9** | Pitch Deck Ordering | `src/app/submission/page.js:58-95` | `submissions.controller.js:157` | **Unhandled State Precondition**: Backend requires an existing submission before attaching a pitch deck (`if (!membership.team.submission) throw 409`). Frontend enables upload before "Save Draft" is clicked. |
| **10**| Legacy Contacts | `src/utils/socialLinks.js:8-43`, `.env.local:16-38` | `src/components/footer.js:53-97` | **Outdated Links**: Centralized `SOCIAL_LINKS` and `.env.local` still contain legacy `cbitosc` URLs and contact emails, conflicting with Prompt Techies URLs in `footer.js`. |
| **11**| Navbar Route Gap | `src/components/navbar.js:76-84` | R3 Requirement | **Missing Navigation Links**: Navbar lacks direct links for logged-in users to `/submission`, `/jury`, or `/admin`. Users must navigate through `/teamdetails`. |

---

## 2. Logic Chain

### 2.1 Authentication & Session Life Cycle
1. **Observation**: `src/lib/api.js:5` sets `withCredentials: true`. `AuthContext.js:32-61` triggers `api.get("/api/auth/me")` on component mount.
2. **Backend Match**: `backend/src/modules/auth/auth.controller.js:14, 112, 154` sets an HTTP-only cookie `promptothon_token` upon successful login/register and clears it on `POST /api/auth/logout`.
3. **Inference**: Session generation and persistence operate correctly via HTTP-only cookies across requests, satisfying R2. However, the password validation mismatch (Obs 5) will cause unexpected registration rejections for 6-7 char passwords.

### 2.2 Team Management & Track Locking Life Cycle
1. **Observation**: `teamdetails/page.js:109` sends `POST /api/team/join` with `{ teamCode }`. Backend `team.controller.js:65-95` verifies code against `team.inviteCode` and reserves seat atomically via `tryReserveTeamSeat`.
2. **Observation**: Once in a team, `teamdetails/page.js:121, 271` renders `teamData.code`. In `backend/prisma/schema.prisma:101`, the model property is `inviteCode`.
3. **Observation**: In `teamdetails/page.js:295`, track locked UI conditional is `teamData.trackLocked ? ... : ...`. In `backend/prisma/schema.prisma:115` and `team.controller.js:124`, the updated field is `trackLockedAt: new Date()`.
4. **Inference**: While backend logic correctly records the invite code and lock timestamp in PostgreSQL, the frontend fails to read them due to property name mismatches (`code` vs `inviteCode`, and `trackLocked` vs `trackLockedAt`). This causes the frontend to display "N/A" for invite codes and remain in the unlocked state even after the database updates.

### 2.3 Submission & Pitch Deck Upload Life Cycle
1. **Observation**: `submission/page.js:72-88` requests a presigned URL (`/api/team/submission/upload-url`), executes PUT fetch to `uploadUrl`, and calls `POST /api/team/submission/pitch-deck` with `{ key }`.
2. **Observation**: `backend/src/modules/submissions/submissions.controller.js:149-151` extracts `const { key, url } = req.body` and throws `ApiError(422, "key and url are required.")` if either is missing.
3. **Inference**: Because `submission/page.js` never provides `url` in the payload, every pitch deck attachment attempt is rejected with HTTP 422.

---

## 3. Caveats
- **Live Database Connection**: This survey was performed in development integrity mode without an active PostgreSQL instance running on port 5432. All data contracts and schema attributes were cross-referenced against Prisma schemas, controllers, and offline test mocks.
- **External Services**: Pitch deck direct PUT upload relies on storage provider configuration (`STORAGE_PROVIDER=supabase` or `s3`). If `STORAGE_PROVIDER=disabled`, backend returns HTTP 501. Chatbot relies on `NEXT_PUBLIC_GROQ_API_KEY`.
- **Preptember Pages**: `src/app/preptember` is a legacy route from the previous hackathon template. It builds cleanly but is not part of the Promptathon 2026 primary view specifications.

---

## 4. Conclusion
1. All 9 primary views (`/`, `/login`, `/register`, `/teamdetails`, `/submission`, `/leaderboard`, `/jury`, `/announcements`, `/admin`) are present in `src/app/` and successfully compile under Next.js production build (`npm run build` exit code 0).
2. The core user workflows (authentication, navigation, track selection, submission, grading, leaderboard updates) have their UI structures and controllers implemented.
3. However, **11 specific contract mismatches and UI flow omissions** currently exist between the frontend components and backend Prisma/Express endpoints. The most critical items that prevent full end-to-end operational execution are:
   - Inability to create a team from the frontend UI.
   - Failure to display team invite codes due to `teamData.code` vs `teamData.inviteCode`.
   - Failure to display track lock state due to `teamData.trackLocked` vs `teamData.trackLockedAt`.
   - Rejection of pitch deck uploads due to missing `url` property in `POST /api/team/submission/pitch-deck`.
   - Rejection of Admin users on `/jury` routes due to `requireRole("JURY")`.

---

## 5. Verification Method

### 5.1 Production Build Verification
Execute in the workspace root:
```pwsh
npm run build
```
*Expected Result*: Exit code 0, all 17 routes compile and prerender.

### 5.2 Key Code Locations to Inspect & Verify
1. **Pitch Deck Upload Payload**: Inspect `src/app/submission/page.js:87` vs `backend/src/modules/submissions/submissions.controller.js:148-151`.
2. **Team Invite Code & Track Lock Property**: Inspect `src/app/(auth)/teamdetails/page.js:121, 271, 295` vs `backend/prisma/schema.prisma:101, 115`.
3. **Password Validation Schema**: Inspect `src/app/(auth)/login/page.js:17` vs `backend/src/modules/auth/auth.schema.js:6`.
4. **Hero Register CTA Link**: Inspect `src/app/HeroMod.js:63`.
5. **Jury Route RBAC**: Inspect `backend/src/modules/jury/jury.routes.js:13-14` vs `src/app/(auth)/teamdetails/page.js:206`.

### 5.3 Invalidation Conditions
This report's findings would be invalidated if:
- The backend Prisma schema were altered to rename `inviteCode` to `code` and add `trackLocked Boolean`.
- The backend `submissions.controller.js` dropped the requirement for `url` on `POST /api/team/submission/pitch-deck`.
- The frontend pages in `src/app/` were significantly restructured.
