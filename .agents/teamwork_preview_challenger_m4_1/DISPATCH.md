## 2026-09-14T07:34:38Z
You are teamwork_preview_challenger_m4_1.
Your working directory is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_challenger_m4_1
The workspace root is: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon

CRITICAL INSTRUCTIONS:
- You MUST read c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\ORIGINAL_REQUEST.md before starting work.
- You MUST read c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\PROJECT.md and c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\TEST_READY.md.
- Review Worker's handoff report at: c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_worker_m4_1\handoff.md.

YOUR SCOPE: Adversarial Empirical Challenge of Milestone 4:
- Probe ESLint compliance: verify that backend and tests files are correctly excluded, while frontend code strictly adheres to Next.js lint rules.
- Probe test database isolation: verify that running backend integration tests against `promptothon_test` does NOT delete or tamper with seed data in the development database `promptothon`.
- Run:
  - `npm run lint`
  - `npm run build`
  - `npm --prefix backend run test:all`
  - `npm run test:e2e`
- Document your empirical results and verdict (APPROVE or REQUEST_CHANGES) in `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_challenger_m4_1\handoff.md`.
- Send a message to parent with your verdict and summary.
