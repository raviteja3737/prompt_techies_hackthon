# Handoff Report: Milestone 2 Authentication and Session Lifecycle Investigation

**Explorer**: `explorer_m2_1`  
**Milestone**: Milestone 2 — Authentication and Session Lifecycle  
**Working Directory**: `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m2_1`  
**Target Milestone Features**: Feature 6 (Registration), Feature 7 (Session & Login), Feature 8 (Logout & Re-login), Feature 12 (RBAC)

---

## 1. Observation

### 1.1 User Registration Contracts & Implementations
- **Backend Schema (`backend/src/modules/auth/auth.schema.js`, lines 3–37)**:
  ```javascript
  const baseProfile = {
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(100),
    college: z.string().max(120).optional(),
    skills: z.array(z.string().max(40)).max(20).optional(),
    githubUrl: z.string().url().optional(),
    linkedinUrl: z.string().url().optional(),
  };

  const createTeamSchema = z.object({
    ...baseProfile,
    intent: z.literal("create"),
    teamName: z.string().min(2).max(60),
  });

  const joinTeamSchema = z.object({
    ...baseProfile,
    intent: z.literal("join"),
    teamCode: z.string().min(4).max(20),
  });

  const soloSchema = z.object({
    ...baseProfile,
    intent: z.literal("solo"),
  });

  const registerSchema = z.discriminatedUnion("intent", [
    createTeamSchema,
    joinTeamSchema,
    soloSchema,
  ]);
  ```
- **Backend Registration Controller (`backend/src/modules/auth/auth.controller.js`, lines 34–115)**:
  - Line 35: `const input = registerSchema.parse(req.body);`
  - Line 37: `const existing = await prisma.user.findUnique({ where: { email: input.email } }); if (existing) throw new ApiError(409, "An account with this email already exists.");`
  - Line 42: `const passwordHash = await bcrypt.hash(input.password, 10);`
  - Line 51: `role: "PARTICIPANT"` is hardcoded for all registrations.
  - Lines 56–80: `if (input.intent === "create")`: creates user, generates team invite code with `generateTeamCode()`, ensures uniqueness (up to 5 attempts), creates `Team` with `leaderId`, creates `TeamMember` with `role: "LEADER"`.
  - Lines 81–103: `else if (input.intent === "join")`: looks up team by `inviteCode: input.teamCode` (404 if missing), reserves seat atomically with `tryReserveTeamSeat` (409 if full), creates user and `TeamMember` with `role: "MEMBER"`.
  - Lines 104–107: `else`: creates user with `isSolo: true`.
  - Line 111–114: `const token = signToken({ sub: user.id, role: user.role }); setSessionCookie(res, token); res.status(201).json({ user: publicUser(user), token });`
- **Frontend Registration Route (`src/app/(auth)/register/page.js`, lines 13–63)**:
  - Line 13: `const { user, isRegistered, loginDemoUser } = useAuth();`
  - Lines 22–25:
    ```javascript
    const handleBypass = () => {
      if (loginDemoUser) loginDemoUser();
      router.push("/teamdetails");
    };
    ```
    `loginDemoUser` is not defined anywhere in `AuthContext.js`.
  - Lines 55–62: Contains NO registration input form; only an informational banner explaining team rules and a `<Link href="/login">Proceed to Register / Login</Link>`.
- **Frontend Login & Sign-Up Form (`src/app/(auth)/login/page.js`, lines 14–78)**:
  - Lines 14–18:
    ```javascript
    const loginSchema = z.object({
      name: z.string().optional(),
      email: z.string().email({ message: "Please enter a valid email address" }),
      password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    });
    ```
    Frontend allows 6 characters for password, while backend schema requires 8 (`min(8)`).
  - Lines 57–64:
    ```javascript
    if (isSignUp) {
      await authRegister({
        intent: "solo",
        name: data.name?.trim() || data.email.split("@")[0],
        email: data.email.trim(),
        password: data.password,
      });
      toast.success("Account created successfully!");
      router.push("/teamdetails");
    }
    ```
    Hardcodes `intent: "solo"`. Users cannot choose `create` or `join`. If name is blank and email prefix is 1 character (e.g. `a@b.com`), `name` is `"a"`, failing backend `min(2)` validation.

---

### 1.2 Session Management, Cookies, and Bearer Fallback
- **Cookie Creation (`backend/src/modules/auth/auth.controller.js`, lines 11–21)**:
  ```javascript
  const COOKIE_NAME = process.env.COOKIE_NAME || "promptothon_token";
  const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  function setSessionCookie(res, token) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_MS,
    });
  }
  ```
- **Cookie Clearing on Logout (`backend/src/modules/auth/auth.controller.js`, lines 161–165)**:
  ```javascript
  /** POST /api/auth/logout */
  const logout = asyncHandler(async (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.status(204).send();
  });
  ```
  Note: Does not pass explicit path or sameSite/secure attributes to `res.clearCookie`.
- **Backend Auth Middleware & Bearer Fallback (`backend/src/middleware/auth.js`, lines 10–23)**:
  ```javascript
  async function requireAuth(req, res, next) {
    try {
      const cookieName = process.env.COOKIE_NAME || "promptothon_token";
      const bearer = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null;
      const token = req.cookies?.[cookieName] || bearer;

      if (!token) {
        throw new ApiError(401, "Authentication required.");
      }

      const payload = verifyToken(token);
  ```
  Backend supports both `promptothon_token` cookie and `Authorization: Bearer <token>` fallback.
- **Frontend Axios Instance (`src/lib/api.js`, lines 1–19)**:
  ```javascript
  import axios from "axios";

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });
  ```
  `withCredentials: true` is configured, but there is NO request interceptor or localStorage lookup for `Authorization: Bearer <token>`.

---

### 1.3 Session Restoration & Re-Login Lifecycle
- **Session Restoration in AuthContext (`src/utils/contexts/AuthContext.js`, lines 30–65)**:
  ```javascript
  const refreshUserData = useCallback(async () => {
    try {
      const meRes = await api.get("/api/auth/me");
      const currentUser = meRes.data?.user || null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const teamRes = await api.get("/api/team/me");
          const team = teamRes.data?.team || null;
          setTeamData(team);
          setIsRegistered(Boolean(team));
          setIsTeamLeader(teamRes.data?.myRole === "LEADER" || team?.leaderId === currentUser.id);
        } catch {
          setTeamData(null);
          setIsRegistered(false);
          setIsTeamLeader(false);
        }
      } else {
        setTeamData(null);
        setIsRegistered(false);
        setIsTeamLeader(false);
      }
    } catch {
      setUser(null);
      setTeamData(null);
      setIsRegistered(false);
      setIsTeamLeader(false);
    } finally {
      setLoading(false);
    }
  }, []);
  ```
- **Re-Login Cycle (`src/utils/contexts/AuthContext.js`, lines 67–90)**:
  ```javascript
  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    await refreshUserData();
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setTeamData(null);
      setIsRegistered(false);
      setIsTeamLeader(false);
    }
  };
  ```
- **Database Model Attributes (`backend/prisma/schema.prisma`, lines 58–96)**:
  ```prisma
  model User {
    id            String     @id @default(cuid())
    name          String
    email         String     @unique
    passwordHash  String
    role          GlobalRole @default(PARTICIPANT)
    college       String?
    skills        String[]   @default([])
    githubUrl     String?
    linkedinUrl   String?
    isSolo        Boolean    @default(false)
    checkedInAt   DateTime?
    createdAt     DateTime   @default(now())
    updatedAt     DateTime   @updatedAt
    ...
  }
  ```
  `User.email` has a standard `@unique` index.

---

### 1.4 Team Formation Contract Gap
- **Backend Team Routes (`backend/src/modules/team/team.routes.js`, lines 1–12)**:
  ```javascript
  const express = require("express");
  const { getMyTeam, joinTeam, lockTrack } = require("./team.controller");
  const { requireAuth, requireRole } = require("../../middleware/auth");

  const router = express.Router();

  router.get("/me", requireAuth, requireRole("PARTICIPANT"), getMyTeam);
  router.post("/join", requireAuth, requireRole("PARTICIPANT"), joinTeam);
  router.post("/track-lock", requireAuth, requireRole("PARTICIPANT"), lockTrack);

  module.exports = router;
  ```
  Notice: `POST /api/team` (or `/api/team/create`) does not exist on the router, despite `PROJECT.md` contract:
  `Team: POST /api/team (or creation route) accepts { name }, returns { team }`.
- **Frontend TeamDetails No-Team State (`src/app/(auth)/teamdetails/page.js`, lines 226–257)**:
  Only displays a "Join a Team" form accepting `joinCodeInput`. There is NO "Create a Team" UI for a user who does not belong to a team yet.

---

## 2. Logic Chain

1. **Password Length Inconsistency**:
   - Observation 1.1 shows backend schema `auth.schema.js` enforces `password: z.string().min(8).max(100)`, while frontend `login/page.js` validates `password: z.string().min(6)`.
   - If a user enters a 6- or 7-character password, the frontend form passes Zod validation, submits the request to `/api/auth/register`, but the backend responds with HTTP 422 ("Validation failed.").
   - Therefore, the client form validation rules must be aligned to `min(8)`.

2. **Name Fallback Failure**:
   - Observation 1.1 shows that when `name` is omitted, the frontend code defaults to `data.email.split("@")[0]`.
   - If the user's email is `a@domain.com`, `data.email.split("@")[0]` is `"a"`, which has length 1.
   - The backend schema requires `name: z.string().min(2).max(80)`.
   - Therefore, a 1-character prefix results in backend 422 rejection. The frontend must either require `name` with `min(2)` or ensure the fallback string meets the minimum length requirement.

3. **Registration UI Deadlock on Team Creation**:
   - Observation 1.1 shows `register/page.js` has no form and only forwards to `/login`.
   - In `login/page.js`, the registration handler hardcodes `intent: "solo"`.
   - Observation 1.4 shows that once registered as a solo user, `/teamdetails` only allows joining an existing team via invite code; there is no UI to create a team.
   - Observation 1.4 also shows `backend/src/modules/team/team.routes.js` lacks an independent `POST /api/team` creation route for existing users; team creation only occurs during registration when `intent === "create"`.
   - Thus, an end-user interacting purely through the frontend UI cannot create a team or become a team leader.

4. **Session Resilience via Bearer Token Fallback**:
   - Observation 1.2 shows backend `requireAuth` accepts both cookies and `Authorization: Bearer <token>`, and returns `token` in the registration and login responses.
   - Observation 1.2 shows `src/lib/api.js` only sends `withCredentials: true` without storing the token or attaching an Authorization header.
   - If browser privacy settings, cross-domain proxies, or iframe sandboxes drop third-party cookies, session authentication fails completely.
   - Adding a local token cache and an Axios request interceptor providing `Authorization: Bearer <token>` completes the fallback contract.

5. **Logout & Re-Login Robustness**:
   - Observation 1.2 shows `auth.controller.js` calls `res.clearCookie(COOKIE_NAME)` without specifying `path: "/"`, `sameSite: "lax"`, or `secure`.
   - Under production HTTPS, standard browser implementations may ignore a cookie clearance that does not match the original `path` and `secure` scope.
   - Updating `res.clearCookie` with explicit options ensures deterministic cookie invalidation.

6. **Email Casing Sensitivity**:
   - Observation 1.3 shows `User.email` is stored in PostgreSQL as a unique string.
   - Observation 1.1 shows `auth.schema.js` validates email format but does not normalize it via `.toLowerCase().trim()`.
   - If a participant registers with `User@Example.com` and subsequently logs in with `user@example.com`, PostgreSQL treats them as distinct strings, resulting in a 401 "Invalid email or password." error.
   - Normalizing email in the Zod schema eliminates case mismatch bugs.

---

## 3. Caveats

1. **Jury and Admin Provisioning**: Global roles `JURY` and `ADMIN` are not self-registerable via `/api/auth/register` by design; they are provisioned through `prisma/seed.js` or backend seeding. The login flow supports them seamlessly with identical credentials.
2. **Rate Limiting Window**: The `authLimiter` in `backend/src/middleware/rateLimiter.js` allows 20 attempts per 15 minutes per IP. During rapid automated testing against a live server on port 4000, rate limit exhaustion can occur if many requests run from the same IP address. E2E tests using Supertest directly instantiate the Express app and do not run into IP throttling issues.
3. **Third-Party Integrations**: Legacy Firebase environment variables in `.env.local` (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_BYPASS_AUTH`) are superseded by the custom PostgreSQL + Express JWT authentication system; removing or ignoring them is safe.

---

## 4. Conclusion

The core authentication architecture (bcrypt password hashing with salt factor 10, HMAC-SHA256 JWT generation with 7-day expiration, HTTP-only SameSite cookie transport, and database persistence) is fundamentally sound, fully tested in Tier 1 and Tier 2 test suites, and adheres to the architecture specified in `PROJECT.md`.

However, the following concrete gaps and bugs must be addressed in Milestone 2 by the Worker:
1. **Frontend Password Validation**: Increase minimum password length from 6 to 8 in `src/app/(auth)/login/page.js`.
2. **Registration Intent & Form**: Provide full registration capability on `/register` (or `/login`), allowing users to choose their registration mode:
   - **Leader**: creates team (`intent: "create"`, `teamName`).
   - **Member**: joins team (`intent: "join"`, `teamCode`).
   - **Solo**: matchmaking (`intent: "solo"`).
3. **Name Validation**: Require `name` with `min(2)` or ensure fallback guarantees at least 2 characters.
4. **Independent Team Creation**: Implement `POST /api/team` in `backend/src/modules/team/` and add a "Create Team" action in `src/app/(auth)/teamdetails/page.js` so solo participants can create a team post-registration.
5. **Axios Bearer Token Fallback**: Store token in `localStorage` in `AuthContext` and attach `Authorization: Bearer <token>` in `src/lib/api.js` request interceptor.
6. **Cookie Clearing Options**: Add explicit options `{ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" }` to `res.clearCookie` in `auth.controller.js`.
7. **Email Normalization**: Normalize emails to `.toLowerCase().trim()` in `backend/src/modules/auth/auth.schema.js`.
8. **Broken Developer Bypass**: Clean up or properly wire the developer bypass button in `src/app/(auth)/register/page.js`.

---

## 5. Verification Method

### 5.1 Automated Test Verification
Run the comprehensive Tier 1 and Tier 2 E2E test suites for authentication and session lifecycle:

```powershell
# Run Tier 1 Authentication & Session tests (Features 6, 7, 8)
node tests/e2e/runner.js --spec tests/e2e/tier1/02_auth.test.js

# Run Tier 2 Boundary Authentication tests
node tests/e2e/runner.js --spec tests/e2e/tier2/boundary_auth.test.js

# Run Tier 1 Team & Track tests (Feature 9, 10, 11)
node tests/e2e/runner.js --spec tests/e2e/tier1/03_team_track.test.js

# Run Tier 1 RBAC tests (Feature 12)
node tests/e2e/runner.js --spec tests/e2e/tier1/04_rbac.test.js

# Run backend unit & integration tests
cd backend && npm test
```

### 5.2 Manual Browser Verification Steps
1. **Registration**:
   - Navigate to `http://localhost:3000/register` (or `http://localhost:3000/login`).
   - Register a new account with email `test-leader@example.com`, password `Password123!`, name `Alex TeamLeader`.
   - Verify that the user is immediately authenticated, cookie `promptothon_token` is set in browser Application -> Cookies, and the browser navigates to `/teamdetails`.
2. **Session Persistence**:
   - Refresh the page (`F5`) on `/teamdetails`.
   - Verify `/api/auth/me` returns 200 and the user remains logged in without re-prompting.
3. **Logout & Re-Login**:
   - Click "Sign Out" / "Logout" in `/teamdetails` or the top navbar.
   - Verify cookie `promptothon_token` is cleared.
   - Verify page redirects to `/login`.
   - Attempt to access `http://localhost:3000/teamdetails` directly -> verify redirection back to `/login`.
   - Log back in with the exact same credentials `test-leader@example.com` and `Password123!`.
   - Verify login succeeds and dashboard loads immediately.

### 5.3 Invalidation Conditions
- Any test in `tests/e2e/tier1/02_auth.test.js` fails.
- Registration returns 422 on valid 8-character passwords or valid names.
- Logging out does not clear the `promptothon_token` cookie.
- Re-login with identical credentials fails or produces 401 Unauthorized.
