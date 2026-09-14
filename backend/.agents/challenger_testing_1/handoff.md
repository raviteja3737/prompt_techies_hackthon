# Challenger 1 Handoff Report: Adversarial Offline Test Harness & Error Handler Stress Testing

## 1. Observation

### 1.1 Offline Test Harness & Prisma Mocking Execution
- **Command executed**: `npm test` (which triggers `jest tests/unit --runInBand`).
- **Initial Baseline Execution**:
  - 4 test suites: `health.test.js`, `middleware.test.js`, `routes.test.js`, `validation.test.js`.
  - 35 passed, 0 failed in 1.968s.
- **After Adding Adversarial Stress Suite (`tests/unit/adversarial.test.js`)**:
  - 5 test suites: `adversarial.test.js`, `health.test.js`, `middleware.test.js`, `routes.test.js`, `validation.test.js`.
  - 55 passed, 0 failed in 2.421s.
- **Mock Verification**:
  - `tests/mocks/prisma.js` and `src/config/__mocks__/prisma.js` expose mock objects for all 13 Prisma schema models: `user`, `team`, `teamMember`, `track`, `submission`, `juryAssignment`, `evaluation`, `systemSetting`, `auditLog`, `announcement`, `notification`, `connection`, `magicLinkToken`.
  - Transaction handler `$transaction` supports both async callback functions `prisma.$transaction(async (tx) => ...)` and array of promises `prisma.$transaction([ ... ])`.
  - Offline isolation is 100% complete for `tests/unit/`: no outbound sockets, no database ports (`5432`/`6543`), and mock resets operate cleanly across runs via `prisma.resetAll()`.
  - Note: Integration tests in `tests/*.test.js` (`test:integration`) depend on `tests/helpers.js` and attempt direct Postgres connections (`TRUNCATE TABLE ...`), failing immediately without a live PostgreSQL instance.

---

### 1.2 Express Error Handler Defect on Upstream HTTP / Middleware Errors
- **Location**: `src/middleware/errorHandler.js:9-33`
- **Code**:
```javascript
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Validation failed.",
      details: err.flatten(),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Prisma unique constraint violation, etc.
  if (err.code === "P2002") {
    return res.status(409).json({
      error: `A record with this ${err.meta?.target?.join(", ") || "value"} already exists.`,
    });
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
}
```

- **Observed Behavior with Malformed JSON**:
  - **Probe**: `POST /api/auth/login` with `Content-Type: application/json` and body `{"email": "broken-json", "password":`.
  - **Body-parser output**:
    ```
    SyntaxError: Expected property name or '}' in JSON at position 2 (line 1 column 3)
      statusCode: 400,
      status: 400,
      expose: true,
      type: 'entity.parse.failed'
    ```
  - **Response Status**: `500` (Expected: `400`).
  - **Response Body**: `{ error: "Something went wrong on our end." }`.
  - **Console**: Dumps full stack trace via `console.error(err)`.

- **Observed Behavior with Oversized Payloads**:
  - **Probe**: `POST /api/auth/login` with `Content-Type: application/json` and body > 100kb.
  - **Body-parser output**: `PayloadTooLargeError: request entity too large` (`status: 413, statusCode: 413`).
  - **Response Status**: `500` (Expected: `413`).
  - **Response Body**: `{ error: "Something went wrong on our end." }`.

- **Observed Behavior with Malformed URI**:
  - **Probe**: `GET /api/tracks/%E0%A4%A`.
  - **Router output**: `URIError: Failed to decode param '%E0%A4%A'` (`status: 400, statusCode: 400`).
  - **Response Status**: `500` (Expected: `400`).

---

### 1.3 Database Outage Masked as 401 in `requireAuth`
- **Location**: `src/middleware/auth.js:10-35`
- **Code**:
```javascript
async function requireAuth(req, res, next) {
  try {
    ...
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new ApiError(401, "Session is no longer valid.");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, "Invalid or expired session."));
  }
}
```
- **Observed Behavior**:
  - When `prisma.user.findUnique` rejects with `new Error("Connection to postgresql pool failed: connection refused")`, `err instanceof ApiError` is `false`.
  - Line 33 converts the database failure into `new ApiError(401, "Invalid or expired session.")`.
  - The client receives HTTP 401 instead of HTTP 500 or 503.

---

### 1.4 `GET /health` Probe Under Database Failure
- **Location**: `src/app.js:48-64`
- **Code**:
```javascript
app.get("/health", async (req, res) => {
  let database = { connected: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { connected: true };
  } catch (err) {
    database = { connected: false, error: "unreachable" };
  }

  res.json({
    ok: true,
    uptimeSeconds: Math.round(process.uptime()),
    database,
    storage: getStorageStatus(),
    redis: { configured: Boolean(process.env.REDIS_URL) },
  });
});
```
- **Observed Behavior**:
  - When `prisma.$queryRaw` succeeds: Returns HTTP 200 with `{ ok: true, database: { connected: true } }`.
  - When `prisma.$queryRaw` rejects with an Error, timeout, or string: The exception is safely caught by `catch (err)`. Process does not crash.
  - **Architectural observation**: Returns HTTP 200 with `{ ok: true, database: { connected: false, error: "unreachable" } }`. HTTP status remains 200 OK even when database is disconnected.

---

## 2. Logic Chain

1. **Premise**: RFC 7231 / HTTP standards specify that client-side formatting errors (e.g. malformed JSON, invalid URI decoding, oversized request bodies) must return 4xx status codes (400 Bad Request, 413 Payload Too Large).
2. **Observation**: `body-parser` and Express router attach `status: 400` / `status: 413` to `SyntaxError`, `PayloadTooLargeError`, and `URIError`.
3. **Observation**: `src/middleware/errorHandler.js` only checks `instanceof ZodError`, `instanceof ApiError`, and `err.code === "P2002"`. All other errors default to `res.status(500)` and trigger `console.error(err)`.
4. **Inference**: Any malformed JSON request causes an internal server error response and floods the server logs with stack traces. An external client or automated scanner can generate high log volume by repeatedly sending invalid JSON bytes.
5. **Premise**: Authentication middleware should report 401 when tokens or credentials are invalid, and 5xx when the authentication infrastructure (the database) is unavailable.
6. **Observation**: `src/middleware/auth.js` catches all exceptions during token validation and user lookup in a single catch block, translating any non-ApiError into `401 Invalid or expired session.`.
7. **Inference**: A transient database connection drop causes all active users to be rejected with 401, triggering frontend logout hooks and cookie clearing when the session is actually valid.
8. **Premise**: Infrastructure health probes for container orchestration (Kubernetes readiness probes) rely on HTTP status codes to determine whether a service replica should receive traffic.
9. **Observation**: `/health` returns status code 200 even when `database.connected` is `false`.
10. **Inference**: A container whose database connection is broken will continue to pass HTTP 200 readiness checks and receive traffic, resulting in 500 errors across all user-facing endpoints.

---

## 3. Caveats

- **Live Redis Failover**: The tests ran without a live Redis server (`REDIS_URL` not set). In-memory fallbacks were used for rate limiting and session tracking. Behavior under Redis connection loss in production was not tested.
- **Socket.IO Real-time Events**: Socket connection authentication was checked against JWT logic, but cluster adapter failovers were not exercised.
- **Prisma Client Generation**: The tests run against the generated Prisma client in `node_modules/@prisma/client`. If `npx prisma generate` is not run after a schema change, mock behavior will not match updated schema types.

---

## 4. Conclusion & Challenge Report

### Challenge Summary
**Overall risk assessment**: MEDIUM

### Challenges

#### [High] Challenge 1: Unhandled Middleware 4xx Errors Return HTTP 500 and Trigger Log Flooding
- **Assumption challenged**: That `errorHandler.js` appropriately routes all client errors to 4xx status codes.
- **Attack scenario**: An attacker transmits invalid JSON payloads (e.g. `{"key":`) or oversized payloads (>100kb) in rapid succession.
- **Blast radius**: Converts client errors to 500 Internal Server Errors, flooding server console logs with stack traces and triggering false alerts in monitoring systems (Sentry/Datadog).
- **Mitigation**: Update `errorHandler.js` to inspect `err.status || err.statusCode`. If within the 400-499 range, return that status code and message without calling `console.error`.

#### [Medium] Challenge 2: Database Failure in `requireAuth` Masked as 401 Session Invalidation
- **Assumption challenged**: That `requireAuth` accurately diagnoses session validity.
- **Attack scenario**: Under heavy database connection pool pressure or transient Postgres network partitions, user queries to `prisma.user.findUnique` fail.
- **Blast radius**: Authenticated participants receive 401 responses, prompting client frontends to delete valid JWT auth cookies and force unnecessary re-logins.
- **Mitigation**: In `src/middleware/auth.js`, isolate JWT verification errors (`JsonWebTokenError`, `TokenExpiredError`) from database queries. Forward DB errors via `next(err)` to the global error handler.

#### [Medium] Challenge 3: `GET /health` Returns 200 OK When Database Is Down
- **Assumption challenged**: That `GET /health` status code accurately reflects service readiness.
- **Attack scenario**: Postgres service crashes or credentials rotate; `GET /health` responds 200 OK with `database.connected: false`.
- **Blast radius**: Kubernetes / AWS ALB readiness probes keep routing user traffic to the broken pod instead of taking it out of rotation.
- **Mitigation**: Return HTTP 503 Service Unavailable when `!database.connected`, or split into `/health/live` (200 always) and `/health/ready` (503 on DB disconnect).

---

## 5. Verification Method

### Test Suite Execution
Run the unit test suite from the backend directory:
```bash
npm test
```
**Expected Output**:
- 5 passed test suites (`adversarial.test.js`, `health.test.js`, `middleware.test.js`, `routes.test.js`, `validation.test.js`).
- 55 total tests passing cleanly in offline isolation.

### Direct Inspection Points
1. Inspect `tests/unit/adversarial.test.js` to verify test probes for all failure modes.
2. Inspect `src/middleware/errorHandler.js:9-33` to verify the lack of `err.status`/`err.statusCode` inspection.
3. Inspect `src/middleware/auth.js:31-34` to verify generic catch-all conversion to 401.
4. Inspect `src/app.js:48-64` to verify 200 response with `database: { connected: false }`.
