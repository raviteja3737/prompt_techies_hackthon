# Plan — orchestrator_4

## Objective
Deliver Milestone 3 (Frontend UI & Button Audit across 9 views), Milestone 4 (Error Triaging & Production Hardening), and Milestone 5 (Final Regression & Certification), concluding with a full victory report to Sentinel.

## Roadmap & Milestones

### Milestone 3: Comprehensive Frontend UI & Button Audit across 9 Views
- **Scope**:
  - View 1: `/` (Home/Landing, Hero CTA, track list/carousel, timeline, mentors, navbar, footer, mobile navigation)
  - View 2: `/login` (Login form, error handling, role redirection to `/teamdetails`, `/jury`, `/admin`)
  - View 3: `/register` (Registration form, client/server validation, role selection, terms)
  - View 4: `/teamdetails` (Team info, invite code copy, dual Join/Create tabs, track select & lock)
  - View 5: `/submission` (Repo URL, video URL, tags, pitch deck payload { key, url }, submission lock)
  - View 6: `/leaderboard` (Public track filter, rankings table, real-time Socket.IO updates, frozen banner)
  - View 7: `/jury` (Evaluation queue, rubric sliders 0-25, draft save, evaluation lock)
  - View 8: `/announcements` (Feed view, priority tags, real-time notification toasts)
  - View 9: `/admin` (Metrics, score freeze toggle, jury assignment, announcements manager)
- **Phase 3A**: 3 Explorers in parallel:
  - `explorer_m3_1` -> Views 1-3
  - `explorer_m3_2` -> Views 4-6
  - `explorer_m3_3` -> Views 7-9
- **Phase 3B**: Synthesize findings and dispatch Worker (`worker_m3_1`) to implement all UI fixes, event handler protections, and prop bindings.
- **Phase 3C**: Dispatch 2 Reviewers (`reviewer_m3_1`, `reviewer_m3_2`) and 2 Challengers (`challenger_m3_1`, `challenger_m3_2`).
- **Phase 3D**: Dispatch Forensic Auditor (`auditor_m3_1`) for anti-cheat verification.
- **Phase 3E**: Evaluate Gate and record in `GATE_STATUS.md`.

### Milestone 4: Error Triaging, Resolution & Production Hardening
- **Scope**:
  - Backend integration and unit test suite verification (`npm run test:unit`, `backend/tests`).
  - Next.js production build verification (`npm run build` cleanly without warnings/errors).
  - Code hygiene, error boundaries, resilient fetch/API clients, and type/lint consistency.
- **Cycle**: Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.

### Milestone 5: Final Multi-Feature Regression & Certification
- **Scope**:
  - Full E2E test suite execution across all 4 tiers (`npm run test:e2e` -> 316/316).
  - Tier 5 adversarial stress testing and coverage hardening.
  - Final Forensic Audit certification.
  - Comprehensive Victory Report to Sentinel.
