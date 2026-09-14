# Frontend Architecture, Firebase Audit & Backend Contract Compatibility Report

**Working Directory**: `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_3`  
**Target File**: `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_3\handoff.md`  
**Date**: 2026-09-14  
**Investigator**: Survey Explorer 3 (`teamwork_preview_explorer`)  
**Frontend Codebase**: `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon` (Next.js 14.2 App Router)  
**Backend Codebase**: `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend` (Express.js, Prisma ORM, PostgreSQL, Socket.IO)  

---

## 1. Observation

### 1.1 Frontend Codebase Inventory & Technology Stack
Direct inspection of `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\package.json` reveals:
- **Framework**: Next.js `^14.2.15` (React 18, App Router in `src/app`).
- **Dependencies**:
  - `firebase`: `^10.14.0` (Line 17)
  - `firebase-admin`: `^12.6.0` (Line 18)
  - `react-firebase-hooks`: `^5.1.1` (Line 29)
  - `axios`: `^1.7.7` (Line 15)
  - `zod`: `^3.23.8` (Line 44)
  - `@hookform/resolvers`: `^3.9.0` (Line 12)
  - `framer-motion`: `^11.9.0` (Line 19)
  - `lucide-react`: `^0.445.0` (Line 24)
  - `react-hot-toast`: `^2.4.1` (Line 31)

### 1.2 Route & Page Inventory
Scanning all `page.js` files under `src/app/` identified only 6 routes:
1. `src/app/page.js`: Landing page with Hero (`HeroMod.js`), About, Tracks, Mentors, Timer, and Contact sections.
2. `src/app/(auth)/login/page.js`: Dual Login / Sign-up form with Firebase auth and local developer bypass.
3. `src/app/(auth)/register/page.js`: Informational landing card explaining 3-member team requirements with redirect buttons to `/login`.
4. `src/app/(auth)/teamdetails/page.js`: Dashboard showing 3-member team roster, reading/writing to Firestore `teams/{uid}`.
5. `src/app/preptember/page.js`: Legacy video listing page querying Firestore collection `"videos"`.
6. `src/app/preptember/videos/[id]/page.js`: Legacy video detail page querying Firestore doc `"videos"/{id}`.

**Critical Finding**: There are **zero** pages or components for:
- Leaderboard (`/leaderboard`) — Grep search across the frontend returned 0 matches for "leaderboard".
- Submissions (`/submission`) — Grep search returned 0 matches for submission forms/logic.
- Jury / Judging (`/jury` or `/judge`) — Grep search returned 0 matches for jury evaluation UI.
- Networking / Attendee Matchmaking (`/networking`) — 0 matches.
- Announcements / Notifications — 0 matches.
- Admin Panel (`/admin`) — 0 matches.

### 1.3 Complete Firebase / Firestore Reference Audit
Every single Firebase import, SDK call, configuration, and environment variable in the frontend was traced:

| File Path | Lines | Firebase APIs / Calls Observed | Impact & Role |
| :--- | :--- | :--- | :--- |
| `src/app/firebase.js` | 1–23 | `initializeApp`, `getFirestore`, `getAuth`, `collection`, `getDocs` | Client-side Firebase/Firestore initialization using 7 `NEXT_PUBLIC_FIREBASE_*` env vars. |
| `src/lib/firebase-admin-config.js` | 1–31 | `initializeApp`, `getApps`, `cert` from `firebase-admin/app`, `getFirestore` from `firebase-admin/firestore` | Server-side Firebase Admin SDK config with service account credentials. Unused by Next.js App Router. |
| `src/utils/contexts/AuthContext.js` | 2–11, 46–83, 87–144, 162 | `onAuthStateChanged`, `signOut` from `firebase/auth`; `getDoc`, `doc`, `query`, `getDocs`, `collection`, `where` from `firebase/firestore` | Global auth context listener subscribing to Firebase auth state; executes direct Firestore queries to `teams/{uid}` and `participants` collection. |
| `src/app/(auth)/login/page.js` | 10–18, 77–86, 90–102, 109–114, 150 | `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `updateProfile`, `sendPasswordResetEmail` from `firebase/auth`; `doc`, `getDoc`, `setDoc` from `firebase/firestore` | Authenticates with Firebase; upon sign-up, directly auto-seeds a hardcoded 3-member team into Firestore `teams/{user.uid}`. |
| `src/app/(auth)/teamdetails/page.js` | 4–14, 72, 148–180, 236 | `useAuthState` from `react-firebase-hooks/auth`; `doc`, `getDoc`, `setDoc`, `collection`, `query`, `where`, `getDocs` from `firebase/firestore` | Reads team directly from `teams/{user.uid}`; looks up `participants` collection where `email == user.email`; saves 3-member team via `setDoc(doc(db, "teams", user.uid), newTeam)`. |
| `src/app/sitemap.js` | 1–2, 11–13 | `getDocs`, `query`, `collection`, `orderBy` from `firebase/firestore` | Queries Firestore collection `"videos"` to generate dynamic XML sitemap URLs. |
| `src/app/preptember/page.js` | 10–14, 30–35 | `collection`, `getDocs`, `orderBy`, `query` from `firebase/firestore` | Client-side query to Firestore collection `"videos"` ordered by `releaseDate`. |
| `src/app/preptember/videos/[id]/page.js` | 1–3, 6 | `doc`, `getDoc` from `firebase/firestore` | Server component fetches metadata and video doc from `videos/{id}`. |
| `src/app/preptember/videos/[id]/VideoDetailPage.js` | 4–5, 19–21 | `doc`, `getDoc` from `firebase/firestore` | Client component fetches video playback details from `videos/{id}`. |
| `src/app/preptember/videos/[id]/opengraph-image.js` | 1–2 | `doc`, `getDoc` from `firebase/firestore` | Generates OG preview image by reading Firestore `videos/{id}`. |
| `src/utils/bypassAuth.js` | 1–68 | `BYPASS_AUTH`, `MOCK_USER`, `createDefault3MemberTeam`, `MOCK_TEAM_DATA` | Mock data layer created to bypass missing live Firebase credentials during development. |
| `.env.local` | 1–7, 11 | `NEXT_PUBLIC_FIREBASE_*` (API_KEY, AUTH_DOMAIN, PROJECT_ID, etc.) | Placeholder mock Firebase keys and `NEXT_PUBLIC_BYPASS_AUTH=true`. |

### 1.4 Backend Architecture & Contracts Inventory
Direct inspection of `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend`:
- **Server Entry**: `src/server.js` starts HTTP server on `PORT 4000` and initializes Socket.IO via `src/sockets/index.js`.
- **Application Middleware**: `src/app.js` configures `helmet`, `cors({ origin: CLIENT_ORIGIN || "http://localhost:3000", credentials: true })`, `cookieParser()`, `express.json()`, and `generalLimiter`.
- **Database Schema**: `prisma/schema.prisma` defines 12 models:
  `User`, `Team`, `TeamMember`, `Track`, `Submission`, `JuryAssignment`, `Evaluation`, `SystemSetting`, `AuditLog`, `Announcement`, `Notification`, `Connection`, `MagicLinkToken`.
- **Auth & Session Model**:
  - JWT signed with HMAC-SHA256 (`src/utils/jwt.js`).
  - Delivered via HTTP-only cookie `promptothon_token` (and accepted as `Authorization: Bearer <token>`).
  - Verified by `src/middleware/auth.js: requireAuth`, with role enforcement via `requireRole("PARTICIPANT" | "JURY" | "ADMIN")`.
- **Socket.IO Real-Time Channels**:
  - Room: `leaderboard:public` and `leaderboard:track:<trackId>`.
  - Client events: `leaderboard:subscribe { trackId? }`.
  - Server events: `leaderboard:snapshot`, `leaderboard:update`, `leaderboard:freeze-changed`, `leaderboard:error`.

---

## 2. Logic Chain

### 2.1 Mapping Frontend Workflows vs Backend Design

#### Workflow 1: Authentication & Session Management
- **Observation**: Frontend `src/app/(auth)/login/page.js` uses `createUserWithEmailAndPassword(auth, email, password)` and `signInWithEmailAndPassword(auth, email, password)`, storing user state in Firebase Client Auth.
- **Backend Reality**: Backend implements REST routes:
  - `POST /api/auth/register`: Discriminated union on `intent` (`create` | `join` | `solo`).
  - `POST /api/auth/login`: `{ email, password }` -> returns `{ user, token }` and sets HTTP-only cookie `promptothon_token`.
  - `POST /api/auth/logout`: Clears cookie, returns HTTP 204.
  - `GET /api/auth/me`: Validates session cookie/bearer token, returns sanitized `{ user }`.
- **Discrepancy**:
  1. Frontend currently expects Firebase `User.uid`. Backend returns `User.id` (cuid string).
  2. Frontend validates password with `z.string().min(6)`. Backend strictly requires `z.string().min(8)`.
  3. Frontend has no concept of registration `intent` or profile fields (college, skills, githubUrl, linkedinUrl).
  4. Frontend has a "Forgot Password" UI triggering `sendPasswordResetEmail(auth)`. Backend does not provide client-initiated password reset via Firebase; it uses bcrypt-hashed passwords.

#### Workflow 2: Registration & Profiles
- **Observation**: `src/app/(auth)/register/page.js` has no form fields; it is a static informational view linking to `/login`.
- **Backend Reality**:
  - `POST /api/auth/register` requires:
    - Leader intent: `{ intent: "create", name, email, password, teamName, college?, skills?, githubUrl?, linkedinUrl? }`.
    - Member intent: `{ intent: "join", name, email, password, teamCode, college?, skills?, githubUrl?, linkedinUrl? }`.
    - Solo intent: `{ intent: "solo", name, email, password, college?, skills?, githubUrl?, linkedinUrl? }`.
  - `GET /api/profile` and `PATCH /api/profile` manage participant profile data (`name`, `college`, `skills`, `githubUrl`, `linkedinUrl`, `isSolo`).
- **Discrepancy**: The frontend lacks an interactive registration wizard supporting the 3 distinct entry intents, and lacks any profile management page.

#### Workflow 3: Team Formation & Management
- **Observation**: `src/app/(auth)/teamdetails/page.js` (lines 148–180, 236) assumes the team ID is the user's Firebase UID (`teams/{user.uid}`) and saves an embedded JSON array `participants: [ { name, email, phone, rollNo, institution, branch, yearOfStudy, section, isTeamLeader } ]`. It strictly enforces a 3-member structure.
- **Backend Reality**:
  - Relational schema: `Team` table has `id`, `name`, `inviteCode`, `leaderId`, `capacityMax` (default 4, not 3), `memberCount`, `trackId`, `trackLockedAt`.
  - Membership is managed in `TeamMember` (`userId`, `teamId`, `role: LEADER | MEMBER`).
  - Users are individual accounts; a leader does NOT manually type in member credentials or roll numbers. Instead, teammates register or join using the team's unique `inviteCode` via `POST /api/team/join`.
  - Team dashboard is retrieved via `GET /api/team/me`.
  - Track selection and locking is performed via `POST /api/team/track-lock` (`{ trackId }`), which is leader-only, one-way, and deadline-checked.
- **Discrepancy**:
  1. Storage model mismatch: Flat denormalized Firestore JSON doc vs Relational normalized Prisma schema.
  2. Team Join Mechanism: In frontend, leader types all 3 members into inputs. In backend, leader gets an `inviteCode` (e.g. `P9X2-LK4M`), and other users join with their own accounts.
  3. Team Capacity: Frontend hardcodes 3 members; backend supports up to 4 members (`capacityMax`).
  4. Track Selection & Locking: Completely absent from frontend UI.

#### Workflow 4: Leaderboard & Scoring
- **Observation**: Zero leaderboard components or routes exist in `prompt techies hackthon`.
- **Backend Reality**:
  - Endpoint `GET /api/leaderboard`: Public/Participant view with optional `?trackId=` filter.
  - Returns ranking, aggregate scores, jury count, score normalization status, and per-jury anonymized breakdown (`Jury #1`, `Jury #2`, etc.).
  - Respects admin score freeze (`scoresFrozen: true`).
  - Real-time Socket.IO synchronization: Emits `leaderboard:update`, `leaderboard:snapshot`, `leaderboard:freeze-changed`.
- **Discrepancy**: 100% missing frontend implementation.

#### Workflow 5: Submissions
- **Observation**: No submission page or form exists in the frontend.
- **Backend Reality**:
  - Endpoints under `/api/team/submission`:
    - `GET /api/team/submission`: Returns draft or finalized submission.
    - `POST /api/team/submission`: Leader submits `{ repoUrl, liveUrl, videoUrl, techTags, submit: boolean }`. Validates GitHub repo existence via GitHub API regex. Requires track to be locked first.
    - `POST /api/team/submission/upload-url`: Returns presigned direct-upload URL for pitch deck PDF.
    - `POST /api/team/submission/pitch-deck`: Confirms uploaded storage key and public URL.
    - `GET /api/team/submission/pitch-deck-url`: Generates signed download URL for team/jury/admin.
- **Discrepancy**: 100% missing frontend implementation.

#### Workflow 6: Jury & Judge Interface
- **Observation**: Zero jury components exist in the frontend.
- **Backend Reality**:
  - Passwordless Magic Link Auth: `POST /api/jury/magic-link/request` and `POST /api/jury/magic-link/verify`.
  - Queue management: `GET /api/jury/queue` (returns assigned teams and submission details).
  - Scoring endpoint: `POST /api/jury/evaluate` (`{ teamId, innovation: 0-25, technical: 0-25, design: 0-25, viability: 0-25, feedback, lock: boolean }`).
  - Evaluation viewing: `GET /api/jury/evaluations/:teamId`.
- **Discrepancy**: 100% missing frontend implementation.

---

### 2.2 Summary of Contract Discrepancies

| Area | Frontend Expectation | Backend Express/Prisma API Contract | Architectural Delta |
| :--- | :--- | :--- | :--- |
| **Auth Protocol** | Firebase Client SDK (`onAuthStateChanged`, `signInWithEmailAndPassword`) | REST `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me` | Shift from Firebase stateful SDK to HTTP-only cookie JWT (`promptothon_token`) + REST context |
| **User ID & Identifiers** | `user.uid` (Firebase alphanumeric string, e.g. 28 chars) | `user.id` (cuid string, e.g. `cl...`) | Rename all `uid` references to `id` |
| **Password Rule** | `min(6)` | `min(8)` (enforced by Zod schema) | Update frontend validation schema to >= 8 chars |
| **Registration Intent** | Single form creates user + auto-seeds 3 dummy team members | Discriminated union on `intent`: `"create"`, `"join"`, `"solo"` | Build 3-path registration wizard |
| **Team Storage** | Direct Firestore `setDoc(doc(db, "teams", uid), data)` | Prisma ORM PostgreSQL tables `Team` + `TeamMember` | Eliminate Firestore client writes; use REST endpoints |
| **Team Formation** | Leader inputs all 3 members manually in a single form | Leader creates team -> gets unique `inviteCode` -> members join individually via `POST /api/team/join` | Add Invite Code sharing UI & "Join Team" modal |
| **Team Size** | Strictly 3 members hardcoded | Configurable up to 4 members (`capacityMax = 4`) | Allow 1 to 4 members dynamically |
| **Track Selection** | None (static tracks section on home page) | `GET /api/tracks`, `POST /api/team/track-lock` | Add track selector dropdown & one-way lock button |
| **Project Submission** | None | `POST /api/team/submission`, `POST /api/team/submission/upload-url`, `POST /api/team/submission/pitch-deck` | Build full submission portal with pitch deck upload |
| **Leaderboard** | None | `GET /api/leaderboard` + Socket.IO (`leaderboard:subscribe`, `leaderboard:update`, `leaderboard:freeze-changed`) | Build live real-time Leaderboard with Socket.IO client |
| **Jury Evaluation** | None | Magic Link Auth + `GET /api/jury/queue` + `POST /api/jury/evaluate` (4x25 rubric) | Build dedicated Jury Evaluation Portal |
| **Networking & Matchmaking**| None | `POST /api/networking/check-in`, `GET /api/networking/attendees`, `POST /api/networking/connect` | Build Matchmaking Directory |
| **Announcements** | None | `GET /api/announcements` with priority levels | Build banner/feed component |

---

## 3. Caveats

1. **Preptember Legacy Content**: `src/app/preptember/page.js` and `src/app/preptember/videos/[id]` fetch from Firestore collection `"videos"`. The backend Express/Prisma schema has no `Video` model. These videos can either be served from a static JSON file (`prompt_techies_DATA.json`) or converted into static marketing pages.
2. **AI Chatbot**: `src/components/chatbot.js` talks directly to Groq Cloud API (`https://api.groq.com/openai/v1/chat/completions`) using client-side API key `NEXT_PUBLIC_GROQ_API_KEY`, while `chatbot2.js` sends requests to `http://localhost:3001/chat`. The backend does not implement a `/chat` endpoint.
3. **CORS & Cookies**: In development, Next.js runs on port `3000` and Express on port `4000`. Cross-origin cookie exchange requires `credentials: true` in Axios/Fetch and `CLIENT_ORIGIN=http://localhost:3000` on the backend.
4. **Third-Party OAuth**: The original design planned for Google Sign-In via Firebase. The standalone Express backend currently implements email/password and magic-link authentication; social OAuth is not currently built into the Express server.

---

## 4. Conclusion & Actionable Frontend Blueprint

The Next.js frontend is fundamentally decoupled from the Express backend: it operates entirely on client-side Firebase Auth and Firestore document writes, with dummy keys and mock bypass enabled. To make the frontend production-ready with the Express/Prisma backend, the following 4-phase transformation must be executed:

### Phase A: Firebase & Mock Code Deprecation
1. **Remove NPM Packages**:
   ```bash
   npm uninstall firebase firebase-admin react-firebase-hooks
   ```
2. **Delete Redundant Files**:
   - `src/app/firebase.js` (Delete)
   - `src/lib/firebase-admin-config.js` (Delete)
   - `src/utils/bypassAuth.js` (Delete after migrating mock data to backend seed)
3. **Clean Environment Variables (`.env.local`)**:
   - Delete all `NEXT_PUBLIC_FIREBASE_*` variables.
   - Delete `NEXT_PUBLIC_BYPASS_AUTH`.
   - Add:
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:4000
     NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
     ```

### Phase B: HTTP Client & JWT Authentication Migration
1. **Install Socket.IO Client**:
   ```bash
   npm install socket.io-client
   ```
2. **Create Centralized Axios Client (`src/lib/api.js`)**:
   - Configure base URL (`http://localhost:4000`).
   - Set `withCredentials: true` to automatically forward the `promptothon_token` HTTP-only cookie.
   - Attach response interceptor to redirect to `/login` on 401 unauthenticated errors.
3. **Rewrite `src/utils/contexts/AuthContext.js`**:
   - On initial mount: call `GET /api/auth/me`. If successful, set `user` and `role`. If 401, set `user: null`.
   - Implement `login(email, password)`: calls `POST /api/auth/login`.
   - Implement `register(payload)`: calls `POST /api/auth/register`.
   - Implement `logout()`: calls `POST /api/auth/logout` and resets state.
   - Expose: `{ user, role, loading, isAuthenticated, login, register, logout }`.
4. **Update `src/app/(auth)/login/page.js`**:
   - Replace Firebase `signInWithEmailAndPassword` with `auth.login()`.
   - Remove `createDefault3MemberTeam` and Firestore `setDoc`.
   - Remove "Forgot Password" Firebase call; replace with instructions or admin support link.
   - Remove Developer Bypass button.

### Phase C: Team Formation & Track Locking Refactor
1. **Redesign `src/app/(auth)/register/page.js`**:
   - Implement a 3-tab registration view matching backend intents:
     - **Tab 1: Create Team (Leader)**: Inputs: Full Name, Email, Password (>= 8 chars), Team Name, College, Skills, GitHub, LinkedIn.
     - **Tab 2: Join Team (Member)**: Inputs: Full Name, Email, Password, Invite Code, College, Skills.
     - **Tab 3: Solo Participant**: Inputs: Full Name, Email, Password, College, Skills.
2. **Rewrite `src/app/(auth)/teamdetails/page.js`**:
   - On load: call `GET /api/team/me`.
   - If user has no team (solo or unassigned): show "Join Team" input (`POST /api/team/join`) with Invite Code input.
   - If user is in a team:
     - Display Team Name, Team Leader indicator, and unique `inviteCode` with a "Copy Invite Code" button.
     - Display member count (`${team.members.length} / ${team.capacityMax}`).
     - Display member cards mapped from `team.members` (name, college, skills, role).
     - **Track Selection Section**:
       - If track unlocked: Show dropdown fetching `GET /api/tracks`. If user is Leader, provide "Lock Selection" button calling `POST /api/team/track-lock`.
       - If track locked: Display locked track title, guidelines, and dataset link with "Track Locked" badge.

### Phase D: Build Missing Core Features
1. **Build Real-Time Leaderboard (`src/app/leaderboard/page.js`)**:
   - Initial load: fetch `GET /api/leaderboard`.
   - Connect Socket.IO: `const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, { withCredentials: true })`.
   - Listen for `leaderboard:update`, `leaderboard:freeze-changed`, and `leaderboard:snapshot`.
   - UI Components:
     - Top 3 Podium (Gold, Silver, Bronze cards with neon glow).
     - Filter bar: Track selector dropdown (`All Tracks` vs specific track).
     - Rankings Table: Rank, Team Name, Track, Members, Jury Count, Average Score.
     - Expandable Accordion: Anonymized breakdown (`Jury #1`, `Jury #2`) with Innovation, Technical, Design, Viability, and Feedback.
     - "Scores Frozen" Banner: When `scoresFrozen === true`, show "Live scoring suspended for final deliberations".
2. **Build Project Submission Portal (`src/app/submission/page.js` or tab in `/teamdetails`)**:
   - Prerequisites check: Warn user if track is not yet locked.
   - Form fields:
     - GitHub Repository URL (validates format, shows verification badge).
     - Live Deployment URL.
     - Video Walkthrough URL (YouTube/Loom).
     - Tech Stack Tags (interactive tag input).
     - Pitch Deck PDF Uploader: Calls `POST /api/team/submission/upload-url`, uploads file directly to presigned URL, then calls `POST /api/team/submission/pitch-deck`.
   - Action buttons: "Save Draft" vs "Finalize Submission" (with confirmation modal).
3. **Build Jury Evaluation Portal (`src/app/jury/page.js`)**:
   - Magic link login handler: `/jury/login` requests link; `/jury/verify?token=...` calls `POST /api/jury/magic-link/verify`.
   - Jury Queue: Displays assigned teams (`GET /api/jury/queue`) with review status.
   - Evaluation Drawer / Modal:
     - Embedded Pitch Deck viewer & GitHub/Live links.
     - 4 Rubric Sliders (0–25 each): Innovation, Technical Execution, UI/UX Design, Commercial Viability.
     - Live Score Tally (Total out of 100).
     - Constructive Feedback textarea (up to 4000 chars).
     - "Save Draft" and "Lock Final Evaluation" buttons.
4. **Build Networking / Matchmaking Directory (`src/app/networking/page.js`)**:
   - Check-in button calling `POST /api/networking/check-in`.
   - Attendee list (`GET /api/networking/attendees`) with search by skill and college.
   - 1-click "Connect" button (`POST /api/networking/connect`).
5. **Add Announcements & Notifications**:
   - Global announcement banner on top of layout (`GET /api/announcements`).
   - Notification bell in Navbar with unread badge (`GET /api/notifications`).

---

## 5. Verification Method

To verify this report independently:
1. **Verify Frontend Code Cleanliness & Firebase Inventory**:
   Run ripgrep in the frontend directory:
   ```bash
   rg "firebase" "c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\src"
   ```
   Confirm occurrences match the 10 files documented in Section 1.3.
2. **Verify Absence of Missing Frontend Features**:
   Run ripgrep in the frontend directory:
   ```bash
   rg "leaderboard" "c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon"
   rg "submissions" "c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon"
   ```
   Confirm 0 results returned.
3. **Verify Backend Contracts & Test Health**:
   In the backend directory:
   ```bash
   cd C:\Users\ravit\Downloads\promptothon-backend-final-2\backend
   npm test
   ```
   Verify that all 9 test suites (`auth.test.js`, `team.test.js`, `submissions.test.js`, `leaderboard.test.js`, `jury.test.js`, `admin.test.js`, `anonymization.test.js`, etc.) validate the exact contracts documented in this report.
4. **Invalidation Conditions**:
   This report will be invalidated if:
   - The backend modifies its route structure (e.g. changes `/api/team/submission` or `/api/auth/login`).
   - New database models are introduced in `schema.prisma`.
   - The frontend adopts a different state management library instead of React Context.
