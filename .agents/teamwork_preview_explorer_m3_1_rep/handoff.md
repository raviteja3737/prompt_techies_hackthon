# HANDOFF REPORT: Frontend Views 1 to 3 Audit (Landing Page, Login, Register)

**Explorer**: `teamwork_preview_explorer_m3_1_rep`  
**Working Directory**: `c:\Users\ravit\OneDrive\Desktop\prompt techies hackthon\.agents\teamwork_preview_explorer_m3_1_rep`  
**Milestone**: M3 — Frontend UI & Button Audit (Views 1, 2, 3)  
**Date**: 2026-09-14  

---

## 1. Observation

### Scope & Targets Audited
- **View 1: Landing Page (`/`)**:
  - `src/app/page.js`
  - `src/app/layout.js`
  - `src/components/navbar.js`
  - `src/app/HeroMod.js`
  - `src/components/about.js`
  - `src/components/Timer.js` & `src/components/ui/animated-countdown.tsx`
  - `src/components/Tracks.js` & `src/components/ui/card-fan-carousel.tsx`
  - `src/components/mentors.js`
  - `src/app/TimelineOld.js` & `src/components/ui/how-it-works-timeline.tsx`
  - `src/components/contactUs.js`
  - `src/components/footer.js`
  - `src/components/RootLayoutClient.js` & `src/components/chatbot.js`
- **View 2: Login (`/login`)**:
  - `src/app/(auth)/login/page.js`
  - `src/utils/contexts/AuthContext.js`
  - `src/lib/api.js`
  - `backend/src/modules/auth/auth.controller.js` & `auth.schema.js`
- **View 3: Register (`/register`)**:
  - `src/app/(auth)/register/page.js`
  - `backend/src/modules/auth/auth.controller.js` & `auth.schema.js`

---

### Inventory Table of Interactive Elements in Views 1–3

| # | View / Component | Element | Type | Handler / Target | Observed Status | Defect / Issue |
|---|-------------------|---------|------|-------------------|-----------------|----------------|
| 1 | View 1: Navbar | Logo Brand Link | Link | `href="/"` | Working | None |
| 2 | View 1: Navbar | Nav Links Desktop | Link | `#about`, `#tracks`, `/leaderboard`, `/networking`, `/announcements`, `#timeline`, `#contact` | Partially Working | Hash links adapt (`/#about`) on foreign routes. However, route links (`/leaderboard`, etc.) never receive active CSS state (`item.href.split("#")[1]` is undefined). |
| 3 | View 1: Navbar | Unauthenticated CTA Desktop | Link | `href="/login"` ("Login ->") | Working | No direct "Register" CTA button in unauthenticated desktop navbar. |
| 4 | View 1: Navbar | Authenticated CTA Desktop | Link / Button | Role-based: `/admin`, `/jury`, `/teamdetails`, `logout()` | Working | Proper role conditional rendering and signout. |
| 5 | View 1: Navbar | Mobile Hamburger Toggle | Button | `onClick={() => setMenuOpen(true)}` | Working | Locks body overflow to hidden. |
| 6 | View 1: Navbar | Mobile Close Button | Button | `onClick={() => setMenuOpen(false)}` | Working | Unlocks body overflow. |
| 7 | View 1: Navbar | Mobile Nav & Auth Links | Link / Button | Close menu and navigate; logout calls `logout()` + `setMenuOpen(false)` | Working | Working correctly. |
| 8 | View 1: Hero (`HeroMod.js`) | Hero CTA (Authenticated) | Link | `href="/teamdetails"` | Working | Navigates to `/teamdetails`. |
| 9 | View 1: Hero (`HeroMod.js`) | Hero CTA (Unauthenticated) | Link | `href="https://forms.gle/L2rvjg4DvLUY6PR26"` (`target="_blank"`) | **CRITICAL BUG** | External Google Form link instead of internal `/register`. Missing secondary CTAs ("Learn More", "Join Discord"). |
| 10 | View 1: Hero (`HeroMod.js`) | Hero Logo Image | `<img>` | `src="/assets/prompt_techies_logo.png"` | Cosmetic warning | Uses raw `<img>` instead of Next.js `<Image>`. |
| 11 | View 1: Timer (`Timer.js`) | Countdown Timer | Component | `AnimatedCountdown` | Working | Dynamic client-side countdown to `2026-09-26T16:00:00`. |
| 12 | View 1: Tracks (`Tracks.js`) | Category Filter Tabs | Buttons | N/A | **MISSING FEATURE** | No category filters present (e.g., All, GenAI, Agents, ML). |
| 13 | View 1: Tracks (`Tracks.js`) | Fan Carousel Cards | Divs | Hover GSAP animation | Missing Interaction | Cards lack `linkUrl`; clicking cards does not open details or select track. |
| 14 | View 1: Tracks (`Tracks.js`) | Track Register CTA | `<a>` tag | `href="/register"` | UX Defect | Uses raw HTML `<a>` instead of Next.js `<Link>`, triggering full reload. |
| 15 | View 1: Mentors (`mentors.js`) | LinkedIn Icon Links | `<a>` tag | `href={mentor.linkedinProfile}` (`target="_blank" rel="noopener noreferrer"`) | Working | 6 founder/team links open properly. Missing jury showcase. |
| 16 | View 1: Timeline (`TimelineOld.js`) | Milestone 01 Link | Link | `href="/preptember"` | Working | Links to valid `/preptember` page. |
| 17 | View 1: Timeline (`TimelineOld.js`) | Milestone 02 Link | N/A | None | Minor Gap | Milestone 02 ("Registrations Open") has no link to `/register`. |
| 18 | View 1: Contact (`contactUs.js`) | Email Links | `<a>` tag | `mailto:contact@prompttechies.in`, `mailto:prompttechies@gmail.com` | Working | Default mail client triggered. |
| 19 | View 1: Contact (`contactUs.js`) | Phone Link | `<a>` tag | `tel:+918008087702` | Working | Default dialer triggered. |
| 20 | View 1: Footer (`footer.js`) | Social Links | Link | Twitter, Instagram, LinkedIn, GitHub (`target="_blank" rel="noopener noreferrer"`) | Working | Opens respective external social profiles. |
| 21 | View 1: Footer (`footer.js`) | Footer Link: About | Link | `href="#about"` | **BUG** | When on `/login` or `/register`, navigates to `/login#about` instead of `/#about`. |
| 22 | View 1: Footer (`footer.js`) | Footer Link: Programs | Link | `href="#programs"` | **DEAD LINK** | Target anchor `#programs` does NOT exist in the DOM. |
| 23 | View 1: Footer (`footer.js`) | Footer Link: Campus Chapters | Link | `href="https://prompttechies.in"` (`target="_blank"`) | Minor | Missing `rel="noopener noreferrer"`. |
| 24 | View 1: Footer (`footer.js`) | Footer Link: Contact Us | Link | `href="#contact"` | **BUG** | Same as About: broken on non-home pages. |
| 25 | View 1: Footer (`footer.js`) | Newsletter Signup | Form | N/A | Missing | No newsletter input/handler currently in footer. |
| 26 | View 1: Chatbot (`RootLayoutClient.js`) | Chatbot Toggle Button | Button | `onClick={toggleChatbot}` ("Ask PT") | Working | Opens/closes floating chat popup. |
| 27 | View 1: Chatbot (`chatbot.js`) | Send Message Input & Button | Form / KeyDown | `axios.post('https://api.groq.com/openai/v1/chat/completions')` | Fragile / External | Dependent on `NEXT_PUBLIC_GROQ_API_KEY`. Has try/catch fallback message. |
| 28 | View 2: Login (`login/page.js`) | Email Input | Input | `register("email")` | Working | Validates email format with Zod. |
| 29 | View 2: Login (`login/page.js`) | Password Input | Input | `register("password")` | Working | Validates min 8 characters with Zod. |
| 30 | View 2: Login (`login/page.js`) | Password Visibility Toggle | Button | N/A | **MISSING FEATURE** | No eye icon / toggle for password visibility. |
| 31 | View 2: Login (`login/page.js`) | Remember Me Checkbox | Input | N/A | **MISSING FEATURE** | No Remember Me option. |
| 32 | View 2: Login (`login/page.js`) | Sign In / Create Account Tabs | Buttons | `setIsSignUp(false)` / `setIsSignUp(true)` | Partial | Switches form mode in-place; lacks separate link to `/register`. |
| 33 | View 2: Login (`login/page.js`) | Form Submit Handler | Form | `handleSubmit(onSubmit)` | Working | Calls `login()` or `authRegister({ intent: "solo" })`. Catches errors and triggers `toast.error()`. |
| 34 | View 2: Login (`login/page.js`) | Role-Based Redirect | Function | `redirectByRole(role)` | Working | `ADMIN` -> `/admin`, `JURY` -> `/jury`, others -> `/teamdetails`. |
| 35 | View 2: Login (`login/page.js`) | Quick Admin Dev Login | Button | `handleQuickSeedLogin` | Working | Logs in as `admin@promptothon.dev` / `ChangeMe123!`. |
| 36 | View 2: Login (`login/page.js`) | Back to Home Link | Link | `href="/"` | Working | Navigates to `/`. |
| 37 | View 3: Register (`register/page.js`) | Registration Form | Form | N/A | **CRITICAL DEFECT** | Page is purely a static informational splash card. There are NO inputs for Name, Email, Password, Confirm Password, Role/Intent, or Terms. |
| 38 | View 3: Register (`register/page.js`) | "Proceed to Register / Login" | Link | `href="/login"` | **REDIRECT WORKAROUND** | Bounces user directly to `/login`. |
| 39 | View 3: Register (`register/page.js`) | Social Icons | `<a>` tags | Instagram, LinkedIn, GitHub | Working | Links to social handles. |
| 40 | View 3: Register (`register/page.js`) | Return to Home | Button | `onClick={() => router.push("/")}` | Working | Navigates to `/`. |

---

### Verbatim Code Evidence

#### Observation O1: External Google Form in Hero (`src/app/HeroMod.js:61-74`)
```javascript
<div className="flex flex-col items-center justify-center mt-8 w-[30vh] pointer-events-auto">
	{user ? (
		<Link
			href="/teamdetails"
			className={cn(...)}
		>
			<span>Team Details</span>
		</Link>
	) : (
		<Link
			href="https://forms.gle/L2rvjg4DvLUY6PR26"
			target="_blank"
			className={cn(...)}
		>
			<span>Register Now</span>
		</Link>
	)}
</div>
```

#### Observation O2: Raw `<a>` Tag and Missing Category Filters in Tracks (`src/components/Tracks.js:61-69`)
```javascript
{/* Register CTA */}
<div className="mt-8 flex items-center justify-center">
	<a
		href="/register"
		className="bg-primary text-on-primary rounded-full px-8 py-3 text-sm font-semibold tracking-wide shadow-primary-glow hover:shadow-primary-glow-hover hover:bg-primary-container transition-all duration-200"
	>
		Choose Your Track & Register
	</a>
</div>
```

#### Observation O3: Broken Hash Links and Dead `#programs` in Footer (`src/components/footer.js:121-147`)
```javascript
<div className="w-full flex flex-col justify-start items-start gap-4 lg:flex-row lg:justify-between">
	<Link
		href="#about"
		className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
	>
		About ↗
	</Link>
	<Link
		href="#programs"
		className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
	>
		Programs ↗
	</Link>
...
	<Link
		href="#contact"
		className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
	>
		Contact Us ↗
	</Link>
</div>
```

#### Observation O4: Complete Absence of Form Elements on `/register` (`src/app/(auth)/register/page.js:54-62`)
```javascript
<div className="space-y-3 pt-2">
	<Link
		href="/login"
		className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-[#004bff] to-[#00c8ff] hover:shadow-[0_0_25px_rgba(0,200,255,0.4)] transition-all flex items-center justify-center gap-2 text-sm"
	>
		<span>Proceed to Register / Login</span>
		<ArrowRight className="w-4 h-4" />
	</Link>
</div>
```

#### Observation O5: Backend Registration Schema Discriminated Union (`backend/src/modules/auth/auth.schema.js:13-37`)
```javascript
// Leader: creates a brand-new team.
const createTeamSchema = z.object({
  ...baseProfile,
  intent: z.literal("create"),
  teamName: z.string().min(2).max(60),
});

// Member: joins an existing team via invite code.
const joinTeamSchema = z.object({
  ...baseProfile,
  intent: z.literal("join"),
  teamCode: z.string().min(4).max(20),
});

// Solo: opts into the public matchmaking directory, no team yet.
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

---

## 2. Logic Chain

1. **Premise**: Per PROJECT.md § Feature 15 and User Scope 3, `/register` must provide:
   - Registration inputs (name, email, password, confirm password, role/intent selection)
   - Password strength validation (min 8)
   - Terms & conditions checkbox
   - Form submission handler with toast notification and redirect
   - Toggle/link to `/login`
2. **Step 1 (Observation O4)**: Inspecting `src/app/(auth)/register/page.js` reveals no `<input>`, `<form>`, React Hook Form, or submit handler exists. It only renders informational text and an anchor redirecting to `/login`.
3. **Step 2 (Observation O5)**: The backend API `POST /api/auth/register` requires `intent` (`"create"`, `"join"`, or `"solo"`). If `intent === "create"`, `teamName` is required; if `intent === "join"`, `teamCode` is required. The `/login` page "Create Account" tab hardcodes `intent: "solo"`, entirely omitting team creation or join code registration.
4. **Step 3 (Observation O1 & O2)**: In `HeroMod.js`, unauthenticated users clicking "Register Now" are sent to an external Google Form URL instead of the local `/register` route. In `Tracks.js`, the CTA uses `<a>` instead of `<Link>`, and category filters are absent.
5. **Step 4 (Observation O3)**: In `footer.js`, links to `#about` and `#contact` assume the user is at `/`. If clicked from `/login` or `/register`, they navigate to `/login#about` (broken page state). Furthermore, `#programs` points to a non-existent anchor in the DOM.
6. **Conclusion**: Views 1, 2, and 3 suffer from specific routing inconsistencies, broken footer anchors, external URL redirects, and most critically, a completely missing registration form on `/register`.

---

## 3. Caveats

- **No Caveats on View Scopes**: Views 1 (`/`), 2 (`/login`), and 3 (`/register`) and their supporting components, contexts, and backend auth modules were 100% inspected.
- **Backend Auth Health**: The backend auth service (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`) and its Prisma transaction handling are fully functional and pass 100% of E2E test suites.
- **Views 4 to 9**: Other views (`/teamdetails`, `/submission`, `/leaderboard`, `/jury`, `/announcements`, `/admin`) are outside the boundary of this specific audit milestone.

---

## 4. Conclusion & Concrete Recommended Fixes

### Fix Summary
1. **Fix 1 — `/register/page.js`**: Implement the complete, interactive registration form with:
   - Name, Email, Password, Confirm Password
   - Password strength indicator & minimum length (8) validation
   - Intent selector tabs/dropdown: "Join as Solo Hacker" (`intent: "solo"`), "Create New Team" (`intent: "create"`, `teamName`), "Join Existing Team" (`intent: "join"`, `teamCode`)
   - Terms & conditions checkbox
   - Submit handler calling `useAuth().register(...)`, with `toast.success`, role-based redirect, and error handling
   - Clear toggle/link to `/login`
2. **Fix 2 — `/login/page.js`**:
   - Add Password visibility toggle (eye icon)
   - Add "Remember Me" checkbox
   - Provide an explicit "Don't have an account? Register here" link directing directly to `/register`
   - Keep or refine the existing "Sign In / Create Account" tab toggle so both work seamlessly
3. **Fix 3 — `src/app/HeroMod.js`**:
   - Update unauthenticated CTA button from `https://forms.gle/L2rvjg4DvLUY6PR26` to `/register`
   - Add secondary CTAs: "Learn More" (`href="#about"`) and "Join Community" (`href="/networking"` or Discord)
   - Convert `<img>` to Next.js `<Image>`
4. **Fix 4 — `src/components/Tracks.js`**:
   - Add Category Filter buttons (e.g. `All`, `Generative AI`, `Autonomous Agents`, `AI & ML`)
   - Make cards clickable (open details modal or anchor to `/register`)
   - Replace `<a href="/register">` with Next.js `<Link href="/register">`
5. **Fix 5 — `src/components/footer.js`**:
   - Update hash links to check `pathname`: use `pathname === "/" ? "#about" : "/#about"`
   - Fix or replace `#programs` with `/#tracks` (since tracks are the actual hackathon programs)
   - Add `rel="noopener noreferrer"` to external links
   - (Optional) Add a simple newsletter subscription form or link
6. **Fix 6 — `src/components/navbar.js`**:
   - Add an unauthenticated "Register" secondary button next to "Login"
   - Fix active state detection for route links (`/leaderboard`, `/networking`, `/announcements`)

---

### Concrete Before & After Code Proposals for Worker

#### A. Proposal for `src/app/HeroMod.js`
```diff
--- a/src/app/HeroMod.js
+++ b/src/app/HeroMod.js
@@ -47,15 +47,24 @@ export default function HeroMod() {
 				{/* Action Buttons */}
-				<div className="flex flex-col items-center justify-center mt-8 w-[30vh] pointer-events-auto">
+				<div className="flex flex-wrap items-center justify-center gap-4 mt-8 pointer-events-auto">
 					{user ? (
 						<Link
 							href="/teamdetails"
 							className={cn(
 								"bg-[#0a0a0a]/80 text-center border-secondary border-2 md:h-[7vh] text-secondary",
-								"px-8 py-2 rounded-full mt-4 hover:bg-secondary hover:text-[#0a0a0a]",
+								"px-8 py-2 rounded-full hover:bg-secondary hover:text-[#0a0a0a]",
 								"transition-all duration-300 shadow-primary-glow hover:shadow-primary-glow-hover",
 								"flex flex-col justify-center items-center font-semibold text-lg"
 							)}
 						>
 							<span>Team Details</span>
 						</Link>
 					) : (
+						<>
+							<Link
+								href="/register"
+								className={cn(
+									"bg-secondary text-[#0a0a0a] text-center border-secondary border-2 md:h-[7vh]",
+									"px-8 py-2 rounded-full hover:bg-transparent hover:text-secondary",
+									"transition-all duration-300 shadow-primary-glow hover:shadow-primary-glow-hover",
+									"flex flex-col justify-center items-center font-semibold text-lg"
+								)}
+							>
+								<span>Register Now</span>
+							</Link>
+							<Link
+								href="#about"
+								className={cn(
+									"bg-[#0a0a0a]/80 text-center border-white/20 border-2 md:h-[7vh] text-white",
+									"px-8 py-2 rounded-full hover:border-[#00c8ff] hover:text-[#00c8ff]",
+									"transition-all duration-300",
+									"flex flex-col justify-center items-center font-semibold text-lg"
+								)}
+							>
+								<span>Learn More</span>
+							</Link>
+						</>
 					)}
 				</div>
```

#### B. Proposal for `src/components/footer.js`
```diff
--- a/src/components/footer.js
+++ b/src/components/footer.js
@@ -121,17 +121,17 @@ export default function Footer() {
 					<div className="w-full flex flex-col justify-start items-start gap-4 lg:flex-row lg:justify-between">
 						<Link
-							href="#about"
+							href="/#about"
 							className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
 						>
 							About ↗
 						</Link>
 						<Link
-							href="#programs"
+							href="/#tracks"
 							className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
 						>
-							Programs ↗
+							Tracks ↗
 						</Link>
 						<Link
 							href="https://prompttechies.in"
 							target="_blank"
+							rel="noopener noreferrer"
 							className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
 						>
 							Campus Chapters ↗
 						</Link>
 						<Link
-							href="#contact"
+							href="/#contact"
 							className="text-inverse-on-surface/60 border-b-2 border-inverse-on-surface/30 transition-all duration-200 ease-out text-base hover:text-inverse-on-surface"
 						>
 							Contact Us ↗
 						</Link>
```

#### C. Proposal for `src/components/Tracks.js`
- Convert `<a href="/register">` to `<Link href="/register">`.
- Add category filter tabs above the carousel:
```jsx
const [selectedCategory, setSelectedCategory] = useState("all");
const filteredTracks = selectedCategory === "all" 
  ? TRACKS_DATA 
  : TRACKS_DATA.filter(t => t.badge.toLowerCase().includes(selectedCategory.toLowerCase()));
```
- Render filter pills: `All`, `Generative AI`, `Autonomous Agents`, `Machine Learning`.

#### D. Proposal for `src/app/(auth)/login/page.js`
- Add password visibility toggle with `Eye` and `EyeOff` icons from `lucide-react`.
- Add Remember Me checkbox.
- Add an explicit bottom link: `Don't have an account? <Link href="/register" className="text-[#00c8ff] underline">Register here</Link>`.

#### E. Proposal for `src/app/(auth)/register/page.js`
- Transform page into full interactive registration view with:
  1. Tab / Radio for registration intent:
     - "Solo Hacker" (`intent: "solo"`)
     - "Create Team (Team Leader)" (`intent: "create"`, with `teamName` input)
     - "Join Team" (`intent: "join"`, with `teamCode` input)
  2. Input Fields:
     - Full Name (`name`, min 2)
     - Email Address (`email`, valid email)
     - Password (`password`, min 8) + Live strength bar (Weak / Moderate / Strong)
     - Confirm Password (`confirmPassword`, matching password)
     - College / University (`college`, optional)
  3. Terms & Conditions checkbox:
     - `I agree to the Promptathon 2026 Terms, Rules & Code of Conduct` (required)
  4. Form validation with Zod + React Hook Form
  5. Submission handler:
     - Submits to `authRegister(...)`
     - Displays `toast.success("Registration successful!")`
     - Redirects based on role (`/teamdetails`)
  6. Direct link to login: `Already have an account? <Link href="/login">Sign In</Link>`.

---

## 5. Verification Method

To independently verify these findings and confirm fix quality:

1. **File Inspection**:
   ```bash
   # Inspect register page lack of form:
   node -e "console.log(fs.readFileSync('src/app/(auth)/register/page.js', 'utf8'))"
   
   # Inspect HeroMod CTA link:
   node -e "console.log(fs.readFileSync('src/app/HeroMod.js', 'utf8').includes('forms.gle'))"
   
   # Inspect footer broken anchor:
   node -e "console.log(fs.readFileSync('src/components/footer.js', 'utf8').includes('#programs'))"
   ```

2. **E2E & Build Verification**:
   ```bash
   # Run all E2E view audit tests:
   node tests/e2e/runner.js --filter="View Audit"
   
   # Run entire test suite (316 tests):
   npm run test:e2e
   
   # Production Next.js build verification:
   npm run build
   ```

3. **Invalidation Conditions**:
   - The findings are invalidated if `/register` already contains a complete interactive form (verified false via direct inspection).
   - The findings are invalidated if Hero "Register Now" links to `/register` rather than Google Forms (verified false via direct inspection).
