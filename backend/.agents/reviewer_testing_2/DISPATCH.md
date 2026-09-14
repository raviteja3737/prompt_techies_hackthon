# DISPATCH: Reviewer 2 (Frontend Compatibility & Contract Verification)

## Role
You are Reviewer 2 (`teamwork_preview_reviewer`).

## Objective
Independently review the frontend compatibility mapping and migration architecture between Next.js frontend (`c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon`) and Express/Prisma backend (`C:\Users\ravit\Downloads\promptothon-backend-final-2\backend`).

## Instructions
1. Read `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\ORIGINAL_REQUEST.md`.
2. Read Survey Explorer 3's handoff report at `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_3\handoff.md`.
3. Verify that all 10 frontend files with Firebase references are correctly identified.
4. Verify all contract differences: Auth tokens/cookies vs Firebase Auth, User ID cuid vs Firebase UID, team invite codes vs Firestore `teams/{uid}` document writes, track locking, real-time leaderboard Socket.IO events, jury rubric scoring.
5. Verify the proposed migration blueprint steps.
6. Write your verdict (`APPROVE` or `REQUEST_CHANGES`) with full rationale to `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\reviewer_testing_2\handoff.md`.
7. Report to parent via `send_message`.

## 2026-09-13T19:23:34Z
You are Reviewer 2 (teamwork_preview_reviewer).
Your working directory is C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\reviewer_testing_2.
Read your dispatch instructions in C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\reviewer_testing_2\DISPATCH.md and C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\ORIGINAL_REQUEST.md.
Also read Explorer 3's report at C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\explorer_survey_3\handoff.md.

Task:
Independently review the frontend compatibility mapping and migration architecture between Next.js frontend and Express/Prisma backend. Verify the 10 Firebase files, 12 contract discrepancies, and migration blueprint. Deliver an explicit APPROVE or REQUEST_CHANGES verdict in your handoff.md. Report to parent when complete.
