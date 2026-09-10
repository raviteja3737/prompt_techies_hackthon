# Prompt Techies - Frontend Modify Handoff

> SSOT = `prompt_techies_KNOWLEDGE_BASE.md` + `prompt_techies_DATA.json`
> Web check (prompttechies.in, /about, /programs) = MATCH, except 4 deltas below.
> Scope = Landing page only. Timer + Timeline = BLANK (skip).

## 0. Verification: KB vs Web

MATCH:
- Name: Prompt Techies / TROVO FI PRIVATE LIMITED / Hyderabad
- Address: Flat 304, Plot 155&156, Sai Lakshmi Residency, IDPL, Bachupally, Hyderabad 500090
- Phone: +91 8008087702 / Email: prompttechies@gmail.com / Site: prompttechies.in / IG: @prompt_techies
- Team 6: Saahil Zameer Shaik (CEO), Mohammad Suhana (Co-Founder), Amarnadh Reddy Nanubala (CTO), Meghana Thipanni (COO), Prabhas Banavath (CMO), Nomula Ananya Reddy (CBBO)
- Taglines: Built for developers who want more than just a degree / Dream. Develop. Deploy. / Where Skills Pay the Bills
- Programs 4 tracks + Startup Roadmap 5 steps + Mentors Google/Microsoft/Meta/Amazon etc.

DELTA (use KB version):
1. LinkedIn: KB `linkedin.com/company/prompt-techies/` vs Web footer `linkedin.com/in/prompt-techies-community-9a705a370` → use KB
2. Email: KB adds `contact@prompttechies.in` (primary) + `prompttechies@gmail.com` → use both
3. Stats: Web home `5000+ devs / 30+ sessions / 100+ projects` vs KB `50+ projects / 12+ ecosystems / 100+ builders` → use KB stats
4. Extra on Web not in KB: GitHub/Twitter not in footer, Products (Build-Your-Hype, AI Tools Directory, MindEase.AI), MCA logo → optional, skip unless needed

---

## 1. Ordered Changes (Old → New)

### 1. `src/components/navbar.js`
- Logo `logo_horizontal_black/beige.png (CBIT Hacktoberfest)` → `prompt_techies_logo.png / prompttechies.in/logo.jpg`
- Links `About / Preptember / Mentors / Timeline / Contact Us` → `Our Story (#about) / Innovation Programs (#programs) / Mentors (#mentors) / Timeline (#timeline-blank) / Get in Touch (#contact)`
- sr-only `HactoberFest 2024` → `Prompt Techies`

### 2. `src/app/HeroMod.js`
- Images `cosc-green.svg + chfest.svg` → `Prompt Techies logo`
- Title `CBIT Hacktoberfest Hackathon'24` → `Built for developers who want more than just a degree`
- Sub `The Biggest Celebration of Open Source!` → `Dream. Develop. Deploy. ⚡ | DPIIT Recognized Startup`
- Buttons `Login / Registrations are now closed` → `Start Your Journey → https://forms.gle/L2rvjg4DvLUY6PR26`

### 3. `src/components/about.js` (3 boxes)
- Box1 `What is Hacktoberfest? DigitalOcean...` → `Who Are We? AI-first company, TROVO FI PRIVATE LIMITED, DPIIT + MSME`
- Box2 `Why We're Thrilled? 24-hr hackathon...` → `Our Mission: Build Future Innovators, Not Just Graduates. Learn → Upskill → Build → Compete → Connect → Achieve → Innovate`
- Box3 `Who Are We? COSC CBIT...` → `5 Tenets: Execution>Theory, Speed>Planning, Real Users>Assumptions, Building>Pitching, Ecosystem>Isolation`

### 4. `src/components/preptember.js` → replace content with Programs CTA (keep filename for now)
- Heading `Preptember` → `Innovation Programs`
- Text `Prepare for Hacktoberfest with COSC...` → `4 tracks: AI & Emerging Tech Bootcamps / Full-Stack AI Engineering / Hackathons & Sprints / Career Readiness & Portfolio`
- Button `Join Preptember Today → /preptember` → `Explore Programs → #programs / https://prompttechies.in/programs`

### 5. `src/components/mentors.js` (10 → 6)
- `Sai Kiran - President` → `Saahil Zameer Shaik - Founder & CEO`
- `Akil Krishna - VP` → `Mohammad Suhana - Co-Founder`
- `G Harshith / Nithin Konda / G Ritesh - General Secretary` → `Amarnadh Reddy Nanubala - CTO`
- `Sameekruth / Mahathi / Guru / Adhit - Joint Secretary` → `Meghana Thipanni - COO` + `Prabhas Banavath - CMO`
- `Kousik Reddy - Head External Affairs` → `Nomula Ananya Reddy - CBBO`
- Title `Mentors` → `OUR TEAM` (keep grid, 6 cards, drop Github → LinkedIn/Instagram)
- Photos (optional): `/about` images `saahil.jpg, suhana.jpg, amarnadh.jpg, meghana.jpg, prabhas.jpg, ananya.jpg`

### 6. Timer + Timeline = SKIP
- `src/components/Timer.js` + `src/app/TimelineOld.js` → leave blank, no edit

### 7. `src/components/contactUs.js`
- `Location: CBIT, Gandipet` → `Bachupally address above`
- `Email: cosc@cbit.ac.in` → `contact@prompttechies.in / prompttechies@gmail.com`
- `Phone Meghana/Srilekha` → `+91 8008087702`

### 8. `src/components/footer.js`
- Logo + `Hacktoberfest 2024 / CBIT Open Source Community` → `PROMPT TECHIES / Building the AI Infrastructure of Tomorrow / DPIIT + MSME`
- `What We Do? hackathons, bootcamps...` → `AI Workshops, Hackathons, Bootcamps, Startup Incubation`
- Socials → `IG @prompt_techies, LinkedIn (KB link), YT, contact@prompttechies.in`
- Links `Hacktoberfest / CBIT OSC / CoC` → `Our Story / Programs / Campus Chapters / Events`

### 9. `src/utils/socialLinks.js` + `.env.local`
- `facebook.com/cbitosc, twitter.com/cbitosc, instagram.com/cbitosc, linkedin.com/company/cbitosc, github.com/cbitosc, cbitosc.github.io, hacktoberfest.com, google.com sponsors, cosc@cbit.ac.in, +91628..., +91741...` →
- `IG https://www.instagram.com/prompt_techies, LinkedIn https://www.linkedin.com/company/prompt-techies/, Twitter https://twitter.com/prompttechies, GitHub https://github.com/prompttechies-del, Site https://prompttechies.in, Form https://forms.gle/L2rvjg4DvLUY6PR26, Email contact@prompttechies.in, Phone +918008087702`

### 10. `src/components/Sponsor.js` (currently unused in `page.js`)
- `Our Title/Co Sponser - google.png` → `Mentors from Google, Microsoft, Meta, Amazon, Uber, Nvidia, Netflix, Apple, Tesla` OR hide until needed

### 11. `src/components/chatbot.js` (if touched)
- `ASK COSC + hacktoberfestContext` → `Ask Prompt Techies + promptTechiesContext` (copy payload from KB §9)
