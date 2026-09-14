# DISPATCH: Challenger 2 Gen 2 (Server Boot & Health Probe Live Verification)

## Role
You are Challenger 2 Gen 2 (`teamwork_preview_challenger`).

## Objective
Empirically verify server boot behavior, port binding, and live HTTP health probe execution in `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend`.

## Important Execution Guidance
Do NOT run `node src/server.js` as a blocking long-lived foreground command in PowerShell, as it will block your turn. Instead:
Run an ephemeral Node verification script that:
1. Starts the server (e.g. `const app = require('./src/app'); const server = app.listen(4008, ...)`).
2. Performs an HTTP GET request to `http://localhost:4008/health`.
3. Verifies HTTP status 200 and response payload `{ ok: true, database: { connected: false, error: "unreachable" } }`.
4. Closes the server (`server.close()`) and exits cleanly (`process.exit(0)`).
5. Also test Supertest requests against `src/app.js` directly.
6. Record exact empirical outputs in `C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\challenger_testing_2_gen2\handoff.md`.
7. Report to parent via `send_message`.

## 2026-09-13T19:30:27Z
You are Challenger 2 Gen 2 (teamwork_preview_challenger).
Your working directory is C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\challenger_testing_2_gen2.
Read your dispatch instructions in C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\challenger_testing_2_gen2\DISPATCH.md and C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\ORIGINAL_REQUEST.md.

Task:
Empirically verify server boot behavior, port binding, and live HTTP health probe execution in C:\Users\ravit\Downloads\promptothon-backend-final-2\backend.
Do NOT run long-lived blocking commands in PowerShell. Instead run an ephemeral Node script or Supertest probe that boots src/app.js on a test port (e.g. 4009), sends GET /health, asserts 200 OK and graceful offline DB unreachable payload, closes server, and exits cleanly.
Save your empirical evidence and report in C:\Users\ravit\Downloads\promptothon-backend-final-2\backend\.agents\challenger_testing_2_gen2\handoff.md.
Send message to parent when complete.
