# DISPATCH: Survey Explorer 3 (Frontend Architecture & Contract Analysis)

## Role
You are Survey Explorer 3 (`teamwork_preview_explorer`).

## Objective
Investigate the frontend codebase at `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon` and analyze compatibility against the backend at `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend`.

## Instructions
1. Read `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\ORIGINAL_REQUEST.md`.
2. Map all user-facing workflows in the Next.js frontend:
   - Authentication (Firebase auth, Google sign-in, email/password)
   - Registration & User Profiles
   - Team Formation / Management
   - Leaderboard & Scoring
   - Submissions
   - Jury / Judge interfaces
3. Identify all Firebase/Firestore dependencies and code in the frontend (where `firebase`, `getFirestore`, `collection`, `onSnapshot`, `signInWithPopup`, etc. are used).
4. Identify contract discrepancies between frontend expectations (e.g. Firebase UID, Firestore documents, client-side writes) and backend API design (JWT cookies/bearer tokens, Express REST endpoints, Prisma relations, Socket.IO channels).
5. Identify missing UI features that backend supports (e.g., jury scoring endpoints, admin settings, live socket events).
6. Write your comprehensive analysis to `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_3\handoff.md`.
7. Report back to parent via `send_message`.

## 2026-09-13T19:13:51Z
Task:
Investigate the Next.js frontend codebase at c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon and compare against backend at C:\Users\ravit\Downloads\promptothon-backend-final-2\backend.
1. Map all frontend workflows (Auth, Registration, Team Formation, Leaderboard, Submissions, Jury).
2. Document all existing Firebase/Firestore usage in the frontend.
3. Document all contract discrepancies between frontend expectations and backend REST/Socket.IO APIs.
4. Outline what frontend code needs removal, what needs migration to JWT/REST, and what missing UI features need to be built.
5. Save your report in C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_3\handoff.md.
6. Notify parent via send_message when done.
