## 2026-09-14T06:57:20Z

You are teamwork_preview_worker_m3_1.
Your working directory is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_worker_m3_1
The workspace root is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon

CRITICAL INSTRUCTIONS:
- You MUST read c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\ORIGINAL_REQUEST.md before starting work.
- You MUST read c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\PROJECT.md and c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\TEST_READY.md.
- Review predecessor audit reports:
  - c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m3_1_rep\handoff.md
  - c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m3_2\handoff.md
  - c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m3_3_rep2\BRIEFING.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You have exclusive write ownership over:
- `src/app/HeroMod.js`
- `src/components/Tracks.js`
- `src/components/footer.js`
- `src/components/navbar.js`
- `src/app/(auth)/login/page.js`
- `src/app/(auth)/register/page.js`
- `backend/src/modules/team/team.controller.js`
- `src/app/(auth)/teamdetails/page.js`
- `src/app/submission/page.js`
- `src/app/leaderboard/page.js`
- `src/app/jury/page.js`
- `src/app/announcements/page.js`
- `src/app/admin/page.js`

YOUR MISSION — MILESTONE 3 IMPLEMENTATION:
Implement all audited UI fixes and harden all interactive controls across all 9 views:

1. View 1: `/` (Home/Landing Page):
   - `src/app/HeroMod.js`: Change unauthenticated "Register Now" CTA button href from external Google Form (`forms.gle`) to internal `/register`. Add secondary CTAs ("Learn More" -> `/#about`, "Join Community" -> `/networking`). Convert `<img>` to Next.js `<Image>`.
   - `src/components/Tracks.js`: Add category filter buttons (`All`, `Generative AI`, `Autonomous Agents`, `AI & ML`). Make cards clickable. Convert raw `<a href="/register">` to Next.js `<Link href="/register">`.
   - `src/components/footer.js`: Fix hash links so they navigate to `/#about`, `/#tracks`, `/#contact` from foreign pages. Replace dead `#programs` anchor with `/#tracks`. Add `rel="noopener noreferrer"` to external links.
   - `src/components/navbar.js`: Add unauthenticated "Register" CTA button next to "Login". Ensure non-hash links (`/leaderboard`, etc.) receive active styling.

2. View 2: `/login`:
   - `src/app/(auth)/login/page.js`: Add password visibility toggle (Eye/EyeOff icon). Add "Remember Me" checkbox. Add direct link "Don't have an account? Register here" to `/register`. Ensure role-based redirection works cleanly (`ADMIN` -> `/admin`, `JURY` -> `/jury`, `PARTICIPANT` -> `/teamdetails`).

3. View 3: `/register`:
   - `src/app/(auth)/register/page.js`: Implement the complete, genuine, interactive registration form matching `backend/src/modules/auth/auth.schema.js`:
     - Full Name (`name`, min 2)
     - Email Address (`email`)
     - Password (`password`, min 8) + Live strength bar
     - Confirm Password (`confirmPassword`, matching password)
     - Intent selection tabs/radios: "Solo Hacker" (`intent: "solo"`), "Create New Team" (`intent: "create"`, `teamName`), "Join Team" (`intent: "join"`, `teamCode`)
     - College / University (`college`, optional)
     - Terms & Conditions checkbox (required)
     - React Hook Form / Zod client validation
     - Submission handler calling `authRegister(...)` from AuthContext, with success toast and role redirect to `/teamdetails`
     - Link to `/login` ("Already have an account? Sign in")

4. View 4: `/teamdetails`:
   - `backend/src/modules/team/team.controller.js`: In `getMyTeam` and `joinTeam` Prisma select queries (lines 28 & 125), add `email: true` to `user: { select: { id: true, name: true, email: true, college: true, skills: true } }` so member emails render in the roster.
   - `src/app/(auth)/teamdetails/page.js`: Add a confirmation modal before locking track (`handleLockTrack`), warning that track selection is permanent and irreversible. Add a `.catch()` block to `copyTeamCode` to handle clipboard API rejections gracefully.

5. View 5: `/submission`:
   - `src/app/submission/page.js`:
     - If user uploads a pitch deck file before creating a draft, automatically create/upsert a draft first or provide clear feedback, preventing HTTP 409 from `submissions.controller.js:157`.
     - Add a direct Pitch Deck URL input field (for external Google Slides/Drive/Canva/PDF links) as a fallback if file storage is disabled or for external decks.
     - Add client-side URL validation for `videoUrl` and `liveUrl` (must begin with http:// or https://).
     - When pitch deck exists, display a view/download link using `/api/team/submission/pitch-deck-url`.
     - Add interactive tech stack tags/chips.

6. View 6: `/leaderboard`:
   - `src/app/leaderboard/page.js`:
     - Fix Review count: change `team.evaluationsCount || 0` to `team.juryCount ?? team.evaluationsCount ?? 0`.
     - Match header: Under "Average Score" column, display `team.averageScore?.toFixed(1) || "0.0"` (not `totalScore`).
     - In podium cards, display `team.averageScore?.toFixed(1)`.
     - For unranked teams (`juryCount === 0`), render `team.rank ? '#' + team.rank : '—'`.
     - Isolate track filter: When socket event `leaderboard:update` fires, only overwrite data if no track filter is selected, or refetch the current filtered track.
     - Add search input by team name and status column ("Evaluated", "Pending Review").

7. View 7: `/jury`:
   - `src/app/jury/page.js`:
     - Add confirmation modal before final locking evaluation (since locking is permanent and irreversible).
     - When evaluation is locked, visually indicate "Evaluation Locked" and disable sliders/textarea.
     - Add clickable links to view team's GitHub repository, demo video, and pitch deck.
     - Ensure state properly synchronizes when selecting different submissions in the evaluation queue.

8. View 8: `/announcements`:
   - `src/app/announcements/page.js`:
     - Add priority filter buttons/tabs (`All`, `URGENT`, `NORMAL`, `INFO`).
     - Add search input for announcements.
     - Display announcement author name.
     - In notifications tab, ensure `notif.body || notif.message` is handled correctly.
     - Listen to Socket.IO `announcement:new` to display live notification toast and append to the feed.

9. View 9: `/admin`:
   - `src/app/admin/page.js`:
     - Fix React crash: `dashboardStats.submissions` and `dashboardStats.evaluations` are objects (`{ total, pending, ... }`), extract `.total` or `.count` instead of rendering raw objects into JSX.
     - Fix participants count: lookup `dashboardStats.users?.participants || dashboardStats.participants || 0`.
     - Add Jury Assignment interface / tab to assign jury members to teams/tracks.
     - Add Announcement Creator form (title, content, priority: NORMAL/URGENT/INFO, publish button).
     - Add Track Edit / Add Track functionality.

VERIFICATION REQUIREMENTS:
1. Run `npm run build` — Next.js build must succeed with exit code 0.
2. Run `node tests/e2e/runner.js --smoke` — smoke tests must pass 100%.
3. Run `npm --prefix backend test` — backend unit and integration tests must pass 100%.
4. Document all changes and verification outputs in `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_worker_m3_1\handoff.md`.
5. Send completion message to parent.
