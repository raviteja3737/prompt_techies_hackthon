# Implementation Plan: Prompt Techies Frontend Redesign

> **Status:** Updated with all data from [modify_handoff.md](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/prompt_techies_data/modify_handoff.md), [KNOWLEDGE_BASE.md](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/prompt_techies_data/prompt_techies_KNOWLEDGE_BASE.md), and [DATA.json](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/prompt_techies_data/prompt_techies_DATA.json).
> **Scope:** Full frontend reskin — same page flow, same animation types, new brand colors + content.

---

## Summary

Reskin the CBIT Hacktoberfest site to **Prompt Techies** by:
1. Replacing the entire color system (green/pink/beige → cobalt blue/cyan/white)
2. Swapping font from `sg.woff2` to **Geist**
3. Converting ALL existing animations to the new color palette (keep the motion, change the paint)
4. Replacing all COSC content with Prompt Techies content from the knowledge base
5. Timer set to **September 26, 2026**

The page flow stays **exactly the same**: Hero → About → Timer → Programs (was Preptember) → Mentors/Team → Timeline → Contact.

---

## Open Questions (4 remaining)

> [!IMPORTANT]
> **Q1: Team member photos.** The handoff mentions optional photos (`saahil.jpg, suhana.jpg`, etc.) from `/about` on prompttechies.in. Do you have these image files locally, or should I download them from the website, or use placeholder initials/avatars?

> [!IMPORTANT]
> **Q2: Geist font files.** The design requires the Geist sans-serif font. Options:
> - **(a)** Use `next/font/google` (if Geist is available on Google Fonts)
> - **(b)** Download Geist .woff2 from [Vercel's GitHub](https://github.com/vercel/geist-font) and load locally
> - **(c)** You have Geist font files already — tell me where

> [!NOTE]
> **Q3: Dark mode.** DESIGN.md only specifies light mode. The current site has a `SimulatedDarkModeDetection` context. Should I remove dark mode support entirely, or keep the context and just reskin both modes?

> [!NOTE]
> **Q4: Firebase auth pages.** The handoff says Timer + Timeline = SKIP (leave blank). What about `/login`, `/register`, `/teamdetails` auth pages? Keep them as-is, reskin them, or remove them?

---

## Proposed Changes

### Phase 1: Design System Foundation

---

#### [MODIFY] [tailwind.config.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/tailwind.config.js)

Complete color replacement + new design tokens from DESIGN.md:

| Old Token | Old Value | New Token | New Value |
|---|---|---|---|
| `darkgreen` | `#183717` | `primary` | `#004bff` |
| `beige` | `#F3F0E0` | `surface` | `#ffffff` |
| `pink` | `#FF8BFF` | `secondary` | `#00c8ff` |
| `deeppink` | `#C401C4` | `primary-container` | `#003cb3` |
| `lightpink` | `#FFDBFF` | `secondary-container` | `#00b0e0` |
| `green` | `#50DA4C` | `tertiary` | `#ffe07d` |
| `lightgreen` | `#D8FFD8` | `tertiary-container` | `#f5af19` |
| `darkgrey` | `#1C1C1C` | `on-surface` | `#171717` |
| `light` | `#FEFDF8` | `inverse-on-surface` | `#ffffff` |
| — | — | `outline` | `#99a1af` |
| — | — | `outline-variant` | `#d1d5dc` |

Add new spacing scale, border-radius tokens, elevation shadows, container max-width `1400px`, and typography classes matching DESIGN.md.

---

#### [MODIFY] [globals.css](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/app/globals.css)

- CSS variables: `--background: #ffffff`, `--foreground: #171717`
- Selection color: `#b4ff38` → `rgba(0, 75, 255, 0.15)` bg, `#004bff` text
- `font-family: var(--font-geist)` instead of `var(--font-sg)`
- Chatbot button gradient: `#c401c4 → #1c8818` → `#004bff → #00c8ff`
- Chatbot popup: `#fefdf8` → `#ffffff`, close button `#c401c4` → `#004bff`
- Remove `.dg-green-sv-bg` repeating background animation (Hacktoberfest-specific)

---

#### [MODIFY] [layout.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/app/layout.js)

- Font: Replace `sg.woff2` import with Geist sans-serif
- Body classes: `text-darkgrey bg-beige` → `text-on-surface bg-surface`
- Metadata title: `"Hacktoberfest 2024 - CBIT Open Source Community"` → `"Prompt Techies — Built for developers who want more than just a degree"`
- Metadata description: Replace with Prompt Techies mission statement
- Metadata keywords: Replace COSC/Hacktoberfest keywords with `AI, workshops, hackathons, bootcamps, startup, DPIIT, prompt techies`
- Favicon: Update to Prompt Techies logo
- metadataBase: `cbit-hacktoberfest24.vercel.app` → `prompttechies.in`

---

### Phase 2: Component Reskin (Same Structure, New Colors + Content)

---

#### [MODIFY] [navbar.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/navbar.js)

**Content changes:**
- Logo: `logo_horizontal_black/beige.png` → `prompt_techies_logo.png` (from `prompt_techies_data/`)
- sr-only text: `"HactoberFest 2024"` → `"Prompt Techies"`
- Nav items: `About / Preptember / Mentors / Timeline / Contact Us` → `Our Story / Innovation Programs / Mentors / Timeline / Get in Touch`
- Nav hrefs: `#about / #preptember / #mentors / #timeline / #contact` → `#about / #programs / #mentors / #timeline / #contact`

**Color conversions (animations preserved):**
| Element | Old | New |
|---|---|---|
| Transparent bg | `bg-darkgrey/20` | `bg-on-surface/20` |
| Solid bg (light) | `bg-beige`, `bg-beige/80` | `bg-surface`, `bg-surface/80` |
| Solid bg (dark/scroll) | `bg-darkgreen`, `bg-darkgrey/80` | `bg-primary`, `bg-primary/80` |
| Link text | `text-beige`, `text-green` | `text-inverse-on-surface`, `text-secondary` |
| Active link border | `border-green`, `border-darkgreen` | `border-secondary`, `border-primary` |
| Hover text | `hover:text-green`, `hover:text-deeppink` | `hover:text-secondary`, `hover:text-primary` |
| Login button bg | `bg-lightgreen`, `bg-green` | `bg-primary`, `bg-primary-container` |
| Login button text | `text-darkgreen` | `text-on-primary` |
| Mobile menu bg | `bg-white` | `bg-surface` |

**Animations kept:** Scroll transparency transition (500ms), hover color transitions (300ms), mobile slide-in panel.

---

#### [MODIFY] [HeroMod.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/app/HeroMod.js)

**Content changes:**
- Images: `cosc-green.svg` + `chfest.svg` → Prompt Techies logo
- Title (TypingEffect2): `"CBIT Hacktoberfest Hackathon'24"` → `"Built for developers who want more than just a degree"`
- Subtitle: `"> The Biggest Celebration of Open Source!"` → `"Dream. Develop. Deploy. ⚡ | DPIIT Recognized Startup"`
- Button: `Login / Registrations are now closed` → `"Start Your Journey →"` linking to `https://forms.gle/L2rvjg4DvLUY6PR26`

**Color conversions:**
| Element | Old | New |
|---|---|---|
| Background | `#183717` (dark green) | `#0a0a0a` (near-black, per DESIGN.md hero) |
| Grid border (Boxes) | `#50da4c` (green) | `#004bff` (cobalt blue) with `opacity: 0.3` |
| Grid hover fill | `#50da4c` | `#00c8ff` (cyan) |
| Mask gradient | `radial-gradient(transparent, white)` on `#183717` | Same mask on `#0a0a0a` |
| Title text | `#f3f0e0` (beige) | `#ffffff` (white) |
| Subtitle text | `#ffb8ff` (light pink) | `#00c8ff` (cyan) |
| Subtitle accent | `text-beige` spans | `text-white` spans |
| Button bg | `#183717` | `#004bff` (primary) |
| Button border | `#50da4c` 2px | `#00c8ff` 2px |
| Button text | `#50da4c` | `#ffffff` |
| Button hover bg | `#50da4c` | `#003cb3` (primary-container) |
| Button hover text | `#183717` | `#ffffff` |

**Animations kept:** Background Boxes grid (skewed perspective, hover-to-fill cells), TypingEffect2 typewriter, hover transitions (300ms).

---

#### [MODIFY] [background-boxes.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/ui/background-boxes.js)

- Grid colors array: `["#50da4c"]` → `["#004bff", "#00c8ff"]` (blue + cyan neon)
- Border color: `border-[#50da4c]` → `border-[#004bff]/30` (subtle blue grid lines)
- Hover fill: `backgroundColor: "#50da4c"` → `backgroundColor: "#00c8ff"` (cyan glow on hover)
- Cross markers: Keep `stroke="currentColor"` (inherits from parent)

---

#### [MODIFY] [about.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/about.js)

**Content changes (3 boxes):**
| Box | Old Title | Old Content | New Title | New Content |
|---|---|---|---|---|
| 1 | What is Hacktoberfest? | DigitalOcean, Cloudflare... | Who Are We? | AI-first company, TROVO FI PRIVATE LIMITED, DPIIT + MSME recognized |
| 2 | Why We're Thrilled? | 24-hr hackathon... | Our Mission | Build Future Innovators, Not Just Graduates. Learn → Upskill → Build → Compete → Connect → Achieve → Innovate |
| 3 | Who Are We? | COSC, CBIT... | Our 5 Tenets | Execution>Theory, Speed>Planning, Real Users>Assumptions, Building>Pitching, Ecosystem>Isolation |

**Heading:** StackedText `"About"` → Replace StackedText with clean Geist heading styled `"Our Story"`, using DESIGN.md `headline-lg` (40px, 600 weight). But keep equivalent layered effect using blue/cyan/white instead of pink/green/white.

**Color conversions:**
| Element | Old | New |
|---|---|---|
| Section bg (`.about`) | `#50da4c` (green) | `#ffffff` (white surface) with subtle gradient |
| Card bg | `bg-darkgreen bg-opacity-80` | `bg-surface` with `border: 1px solid {outline-variant}` and `box-shadow: {elevation.md}` |
| Card shadow | `custom-pink-shadow` (pink 2px solid) | `0 4px 12px rgba(0, 0, 0, 0.08)` |
| Card hover | — | `bg-surface-container-low`, `box-shadow: {elevation.lg}` |
| Text color | `text-white` | `text-on-surface` (#171717) |
| Heading color | White on green | `text-primary` (#004bff) |

**Animations kept:** Framer Motion staggerChildren (0.2s delay), boxVariants slide-in from left (`x: -100 → 0`, 0.8s easeOut), IntersectionObserver trigger.

---

#### [MODIFY] [about.css](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/styles/about.css)

- `.about` bg: `#50da4c` → `#ffffff`
- `.contact-bg` bg-image: Keep pattern but tint blue, or replace with clean gradient
- `.custom-pink-shadow`: `rgba(255, 139, 255, 0.8)` → `rgba(0, 75, 255, 0.15)` (subtle blue shadow)

---

#### [MODIFY] [Timer.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/Timer.js)

**Content changes:**
- `launchDate` (set in page.js): `"2024-10-26T16:00:00"` → `"2026-09-26T16:00:00"` (Sep 26 this month)
- Heading: StackedText `"When???"` → Clean heading `"Coming Soon"` in headline-lg
- Subheading: `"Hackathon Starts In.."` → `"Next Event Begins In.."`

**Color conversions:**
| Element | Old | New |
|---|---|---|
| Timer card bg | `bg-green` | `bg-primary` (#004bff) |
| Timer card text | `text-black` | `text-on-primary` (#ffffff) |
| Label text | `text-darkgreen` | `text-primary-container` (#003cb3) |
| Section bg | `.bg-repeaat` (Hacktoberfest pattern) | Clean `bg-surface-container-low` (#f0f0f0) or subtle dot pattern |

**Animations kept:** Framer Motion containerVariants (staggerChildren 0.1s), itemVariants (spring, stiffness 100, damping 15, y: 100 → 0), `requestAnimationFrame` live countdown.

---

#### [MODIFY] [timer.css](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/styles/timer.css)

- Remove `.bg-repeaat` with Hacktoberfest repeating background
- Replace with clean background or subtle animated gradient using `#004bff` / `#00c8ff`

---

#### [MODIFY] [preptember.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/preptember.js) → **Innovation Programs CTA**

**Content changes:**
- Heading: StackedTextDark `"Preptember"` → `"Innovation Programs"` (headline-lg, primary color)
- Text: `"Prepare for Hacktoberfest with COSC..."` → `"4 tracks: AI & Emerging Tech Bootcamps / Full-Stack AI Engineering / Hackathons & Sprints / Career Readiness & Portfolio"`
- Button: `"Join Preptember Today" → /preptember` → `"Explore Programs →"` → `https://prompttechies.in/programs`
- Image: `loveascii.png` → Remove or replace with a relevant icon/illustration

**Color conversions:**
| Element | Old | New |
|---|---|---|
| Section bg | `bg-beige` | `bg-surface-container-low` (#f0f0f0) |
| Heading | StackedTextDark (darkgreen/green/pink layers) | Clean `text-primary` (#004bff) |
| Text | `text-darkgrey` | `text-on-surface` (#171717) |
| Button bg | `bg-deeppink` (#C401C4) | `bg-primary` (#004bff) |
| Button text | `text-white` | `text-on-primary` (#ffffff) |
| Button hover bg | `bg-pink` → `text-black` | `bg-primary-container` (#003cb3) → `text-on-primary` |

---

#### [MODIFY] [mentors.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/mentors.js)

**Content changes (10 → 6 team members):**

| # | Old Name | Old Role | New Name | New Role |
|---|---|---|---|---|
| 1 | Sai Kiran | President | Saahil Zameer Shaik | Founder & CEO |
| 2 | Akil Krishna | Vice President | Mohammad Suhana | Co-Founder |
| 3 | G Harshith | General Secretary | Amarnadh Reddy Nanubala | CTO |
| 4 | Nithin Konda | General Secretary | Meghana Thipanni | COO |
| 5 | G Ritesh | General Secretary | Prabhas Banavath | CMO |
| 6 | Sameekruth+ | Joint Secretary | Nomula Ananya Reddy | CBBO |

- Title: `"Mentors"` → `"OUR TEAM"`
- Social links: Drop GitHub → keep LinkedIn + add Instagram
- Card layout: 2 rows of 5 → 2 rows of 3 (or 1 row of 6 on desktop)

**Color conversions:**
| Element | Old | New |
|---|---|---|
| Wrapper bg | `bg-darkgrey` (#1C1C1C) | `bg-on-surface` (#171717) or `bg-surface` (#ffffff) |
| Card border | `1px solid #50DA4C` | `1px solid #004bff` |
| Card gradient overlay | `linear-gradient(to top, #183717, transparent)` | `linear-gradient(to top, #0a0a0a, transparent)` |
| Name prefix | `text-deeppink` (`>`) | `text-secondary` (#00c8ff) |
| Role text color | `#C401C4` | `#00c8ff` (secondary) |
| Social link color | `#50DA4C` | `#004bff` (primary) |
| Social hover color | `#C401C4` | `#00c8ff` (secondary) |
| Card hover shadow | `rgba(0,0,0,0.8)` | `rgba(0, 75, 255, 0.3)` (blue tint) |

**Animations kept:** Card up/down stagger (`translateY(-20px / +20px)`), row hover shrink (flex 0.8), card hover expand (flex 1.2, scale 1.05), card-content slide-up reveal (`translateY(100% → 0)`), 0.6s cubic-bezier transition.

---

#### [MODIFY] [mentors.css](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/styles/mentors.css)

- All color values converted as per table above
- Background SVG image: Remove `Gold COSC (4).svg` → replace with subtle geometric pattern or clean background
- Remove old mentor ID selectors (`#sai-kiran`, `#akil`, etc.) → add new team member ID selectors
- Card background-images: Update to new team member photos (pending Q1)

---

#### [MODIFY] [contactUs.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/contactUs.js)

**Content changes:**
| Field | Old | New |
|---|---|---|
| Location | CBIT, Gandipet, Hyderabad | Flat 304, Plot 155&156, Sai Lakshmi Residency, IDPL, Bachupally, Hyderabad 500090 |
| Email | cosc@cbit.ac.in | contact@prompttechies.in / prompttechies@gmail.com |
| Phone | Meghana +916281657674, Srilekha +917416939873 | +91 8008087702 |

**Color conversions:**
| Element | Old | New |
|---|---|---|
| Section bg | `.contact-bg` (green flurry SVG) | `bg-surface-container-low` or subtle blue gradient |
| Card bg | `bg-darkgreen` | `bg-surface` with `{elevation.md}` shadow + `{outline-variant}` border |
| Text | `text-white` | `text-on-surface` (#171717) |
| Link color | `text-green` | `text-primary` (#004bff) |
| Link hover | `text-pink` | `text-secondary` (#00c8ff) |
| Heading | StackedText "Contact" | Clean `"Get in Touch"`, headline-lg style |

**Animations kept:** Framer Motion staggerChildren (0.2s), itemVariants slide-up (`y: 50 → 0`, 0.8s easeOut), IntersectionObserver trigger.

---

#### [MODIFY] [footer.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/footer.js)

**Content changes:**
| Field | Old | New |
|---|---|---|
| Logo | `logo_horizontal_beige.png` (COSC) | Prompt Techies logo (white/light variant) |
| Brand text | `Hacktoberfest 2024 / CBIT Open Source Community` | `PROMPT TECHIES / Building the AI Infrastructure of Tomorrow / DPIIT + MSME` |
| What We Do | `hackathons, bootcamps, workshops...` for COSC | `AI Workshops, Hackathons, Bootcamps, Startup Incubation` |
| Join Us text | Hacktoberfest isn't just an event... | Updated Prompt Techies mission pitch |
| Social links | Facebook/Twitter/Instagram/LinkedIn (COSC) | Instagram @prompt_techies, LinkedIn (KB), Twitter @prompttechies, YouTube |
| Bottom links | Hacktoberfest / CBIT OSC / Code of Conduct | Our Story / Programs / Campus Chapters / Events |

**Color conversions:**
| Element | Old | New |
|---|---|---|
| Footer bg | `bg-darkgreen` (#183717) | `bg-on-surface` (#171717) or `bg-primary` (#004bff) |
| Text | `text-beige` | `text-inverse-on-surface` (#ffffff) |
| `>` prefix | `text-pink` | `text-secondary` (#00c8ff) |
| Social icon color | `text-beige` | `text-inverse-on-surface` |
| Social hover | `hover:text-blue-400`, `hover:text-pink` | `hover:text-secondary` (#00c8ff) |
| Bottom links | `text-beige/60`, `border-beige/70` | `text-inverse-on-surface/60`, `border-inverse-on-surface/30` |

---

#### [MODIFY] [chatbot.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/chatbot.js)

- Replace `hacktoberfestContext` with `promptTechiesContext` from [KNOWLEDGE_BASE.md §9](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/prompt_techies_data/prompt_techies_KNOWLEDGE_BASE.md)
- Bot name: `"ASK COSC"` → `"Ask Prompt Techies"`
- All color references in chatbot CSS → blue/cyan theme

---

#### [MODIFY] [StackedText.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/StackedText.js) + [StackedTextdark.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/StackedTextdark.js)

Convert the 3-layer stacked text effect to new colors:

**StackedText (on dark backgrounds):**
- Layer 1 (deepest): `#C401C4` (deep pink) → `#003cb3` (primary-container / dark blue)
- Layer 2 (middle): `#50DA4C` (green) → `#00c8ff` (cyan)
- Layer 3 (top): `#FEFDF8` (off-white) → `#ffffff` (white)

**StackedTextDark (on light backgrounds):**
- Layer 1 (deepest): `#183717` (dark green) → `#003cb3` (dark blue)
- Layer 2 (middle): `#50DA4C` (green) → `#00c8ff` (cyan)
- Layer 3 (top): `#C401C4` (pink) → `#004bff` (primary blue)

**Animations kept:** Hover convergence effect (layers shift from offset to aligned, 0.3s ease).

---

### Phase 3: Page Assembly & Section Dividers

---

#### [MODIFY] [page.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/app/page.js)

- **Remove ALL SVG pixel-art section dividers** (the blocky green/beige/grey SVG `<path>` elements)
- Replace with clean section separators: either simple spacing (40px gap per DESIGN.md), or subtle gradient dividers using `#004bff` → `#00c8ff` at low opacity
- Timer `launchDate`: `"2024-10-26T16:00:00"` → `"2026-09-26T16:00:00"`
- Section IDs: `#preptember` → `#programs`
- SVG section dividers with `bg-darkgreen`, `bg-darkgrey`, `fill="#F3F0E0"`, `fill="#50DA4C"` → all removed
- Keep the ChatProvider wrapper and RootLayoutClient structure

---

#### [MODIFY] [RootLayoutClient.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/components/RootLayoutClient.js)

- Chatbot button text: `"Ask COSC!"` → `"Ask Prompt Techies"`
- Color classes already handled via globals.css chatbot-button gradient update

---

### Phase 4: Timeline (SKIP per handoff)

#### [NO CHANGE] [TimelineOld.js](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/src/app/TimelineOld.js)
Leave as-is. The handoff explicitly says Timer + Timeline = SKIP (leave blank, no edit).

> [!NOTE]
> Timeline will still render with old COSC content/colors. If you want me to at least convert the colors while keeping the placeholder content, let me know.

---

### Phase 5: Asset & Config Updates

---

#### [MODIFY] [.env.local](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/.env.local)
- Update `NEXT_PUBLIC_SITE_URL` to `https://prompttechies.in`

#### [MODIFY] [next.config.mjs](file:///c:/Users/ravit/OneDrive/Desktop/prompt%20techies%20hackthon/next.config.mjs)
- Add `prompttechies.in` to image domains if needed for logo loading

#### [NEW] Copy `prompt_techies_logo.png` → `public/assets/prompt_techies_logo.png`
- Logo file from `prompt_techies_data/` directory

---

## Animation Color Conversion Master Reference

Every animation effect in the codebase with its color conversion:

| Animation | Component | Old Colors | New Colors | Motion Type |
|---|---|---|---|---|
| Background grid boxes | `background-boxes.js` | `#50da4c` borders + hover fill | `#004bff/30` borders, `#00c8ff` hover fill | Framer Motion `whileHover` |
| StackedText hover layers | `StackedText.js` | Pink/Green/White layers converge | DarkBlue/Cyan/White layers converge | CSS transition 0.3s |
| StackedTextDark hover | `StackedTextdark.js` | DarkGreen/Green/Pink layers | DarkBlue/Cyan/Primary layers | CSS transition 0.3s |
| About cards slide-in | `about.js` | Cards from x:-100, green bg | Cards from x:-100, white bg + blue shadow | Framer Motion stagger 0.2s |
| Timer spring bounce | `Timer.js` | Green cards, spring stiffness 100 | Blue cards, spring stiffness 100 | Framer Motion spring |
| Contact cards slide-up | `contactUs.js` | Cards from y:50, green bg | Cards from y:50, white bg + shadow | Framer Motion stagger 0.2s |
| Mentor card expand | `mentors.css` | Green border, pink text reveal | Blue border, cyan text reveal | CSS cubic-bezier 0.6s |
| Mentor card-content slide | `mentors.css` | Dark green gradient overlay | Dark black gradient overlay | CSS transition 0.3s |
| Navbar scroll transparency | `navbar.js` | Green/beige transitions | Blue/white transitions | CSS transition 500ms |
| Chatbot button gradient | `globals.css` | Pink→Green gradient shift | Blue→Cyan gradient shift | CSS bg-position 0.3s |
| Timeline scroll progress | `TimelineOld.js` | Green line, green dots | (SKIP - no change) | Framer Motion `useScroll` |
| Typing effect | `TypingEffect2.js` | Beige text on dark green | White text on near-black | JS interval animation |
| Blinking underscore | `globals.css` | — (color inherited) | — (color inherited) | CSS `@keyframes blink` |
| Timer bg scroll | `timer.css` | Hacktoberfest pattern scroll-left | Remove or replace | CSS `@keyframes scroll-left` |

---

## Verification Plan

### Automated Tests
```bash
npm run build    # Verify no build errors
npm run lint     # Verify no lint warnings
```

### Manual Verification
- Every component renders with correct Prompt Techies colors
- All hover/scroll/intersection animations work with new palette
- Background-boxes hero grid uses blue/cyan instead of green
- StackedText layers use blue/cyan/white instead of pink/green/white
- Timer counts down to Sep 26, 2026
- All links point to Prompt Techies URLs
- Chatbot context returns Prompt Techies information
- Responsive check at 375px, 768px, 1440px
- No old COSC/Hacktoberfest colors visible anywhere
