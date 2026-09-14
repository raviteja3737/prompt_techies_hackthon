# M5 Challenger Handoff — Tier-5 Dedicated Adversarial Probes

Date: 2026-09-14 · Window: serial-only · Target: live dev backend `http://localhost:4000` → DB `promptothon`
Script: `tests/tier5_probes.js` (ephemeral, kept in place, untracked-ok) · Run: `node tests/tier5_probes.js`

## 1. Observation

Pre-flight: `GET /health` → 200, `ok=true`, `database.connected=true`. All probes ran over HTTP
against the live backend; zero jest suites executed; zero writes to `promptothon_test`; all entities
unique (`tier5-<ts>-<rand>@test.dev`, `Tier5 Team <ts>*`); state verified via read-only GETs only.

| # | Probe | Expectation | Verbatim tally | Result |
|---|-------|-------------|----------------|--------|
| 1 | Team-cap race (3/4 → 5 concurrent joins) | 1× success + 4× 409, roster 4 | `pre=3 (got 3); join statuses=[409,200,409,409,409] success=1 (want 1) rejected409=4 (want 4); final roster=4 (want 4)` | PASS |
| 2 | Track-lock immutability | lock 200 → relock 409; no-track submit 409; finalize 200 → edit 409/403 | `lockA=200 (want 200); relockB=409 (want 409); noTrackSubmit=409 (want 409); finalize=200 (want 200); editAfterFinal=409 (want 409/403)` | PASS |
| 3 | RBAC matrix | PARTICIPANT→admin 403, →jury queue 403; JURY→unassigned 403; tampered JWT 401 | `PARTICIPANT->admin/dashboard=403 (want 403); PARTICIPANT->jury/queue=403 (want 403); JURY->evaluate-unassigned=403 (want 403); tamperedJWT->auth/me=401 (want 401)` | PASS |
| 4 | Leaderboard freeze | freeze on → `scoresFrozen:true`; off → `false`; original restored | `original=false; freezeOn=200 lb.scoresFrozen=true (want true); freezeOff=200 lb.scoresFrozen=false (want false); restore=200 final=false (want false)` | PASS |
| 5 | Pitch-deck contract | `{key}` w/o url → 422; `{key,url}` after draft → 200 | `attach{key-only}=422 (want 422); attach{key+url}=200 (want 200)` | PASS |

Raw runner footer: `OVERALL: ALL 5 PROBES PASS` (exit 0).

## 2. Logic Chain

1. **Serial-window compliance first**: no `test`/`test:integration`/`test:all` executed (avoids 40P01
   contention false-reds); live-backend health gate passed, so the in-process supertest fallback was
   not needed and not used.
2. **Race integrity (P1)**: roster built to exactly 3/4 through the real register API (leader-create +
   2 join-intent registers), then 5 pre-registered solo users fired `POST /api/team/join`
   concurrently via `Promise.all` — a true same-tick race against the atomic `tryReserveTeamSeat`
   transaction. Tally 1×200 + 4×409 with final `GET /api/team/me` roster of 4 proves the cap holds
   under contention and losers get 409 (not 500/duplicate rows).
3. **Immutability chain (P2)**: lock-A (200) then lock-B (409) proves one-way track lock; a *separate
   fresh team* submitting with no locked track (409) isolates the no-track guard from the lock guard;
   finalize (200) then edit (409) proves SUBMITTED immutability. Each guard independently 409s.
4. **RBAC (P3)**: participant denied on both admin dashboard and jury queue (403, not 404/500 —
   no resource oracle); jury evaluating a provably fresh, never-assigned team gets 403 from
   `submitEvaluation` (assignment check precedes scoring); last-char-flipped JWT gets 401 from
   `requireAuth` (signature verified, structure still parses — a real tamper, not a malformed token).
5. **Freeze (P4)**: original flag read via `GET /api/admin/score-status` (`false`), toggled on/off via
   `POST /api/admin/freeze-scores`, public unauthenticated `GET /api/leaderboard` observed
   `scoresFrozen` true→false, then original state restored and re-verified (`false`). No persistent
   side effects left behind.
6. **Pitch-deck (P5)**: draft-first ordering enforced — `{key}`-only attach → 422 (Zod-equivalent
   contract, both fields required), full `{key,url}` after a DRAFT exists → 200 with updated
   submission. Lock-before-submit prerequisite satisfied via track lock.
7. **R2/R5 acceptance mapping**: team creation/join-cap/track-lock (R2 team-track), role routing
   (R2 RBAC), submit→freeze→leaderboard (R5 regression workflows) — all green beyond the 316 E2E.

## 3. Caveats

- Probes hit the **shared dev `promptothon` DB** (by design); they create ~20 uniquely-prefixed
  users/teams (`tier5-*`, `Tier5 Team *`) that remain as benign seed-like rows. No cleanup attempted
  (deletes would be raw writes outside the API and risk touching others' rows).
- P1's "exactly 1 winner" depends on true concurrency; on a single pass the observed winner was
  request #2 (`[409,200,409,409,409]`) — timing-dependent *which* request wins, not *how many*.
- P4 asserts the `scoresFrozen` flag/semantics on the public leaderboard, not pixel-level score
  masking (the controller exposes frozen state; anonymized breakdowns are covered by E2E Tier-3/4).
- Auth rate limiter (`authLimiter`, 20/15 min/IP) was budgeted: ~14 register/login hits total, all
  sequential except the 5 join POSTs (general limiter, 300/15 min). A rerun within the same window
  could approach the auth ceiling if other traffic shares the IP — space reruns ≥15 min apart.
- Jury login reused seed account `jury1@promptothon.dev`; its pre-existing assignments were avoided
  by evaluating a freshly created team (guaranteed unassigned).
- No Prisma SELECTs were needed — GET endpoints sufficed for state verification; no DB client was
  opened by the probe script at all.

## 4. Conclusion + Verdict

All 5 dedicated Tier-5 adversarial probes PASS on first run against the live dev backend, extending
(never duplicating) the TEST_READY §5 guarantees with fresh unique entities and verbatim tallies.
No failures, no flakes on this pass, no residual state changes (freeze flag restored).

**Verdict: APPROVE** — last open gate (dedicated Tier-5) is closed.

## 5. Verification Method

```bash
# From repo root. Requires live backend on :4000 with dev DB connected.
# (Script self-aborts with exit 2 if GET /health is not 200 + database.connected.)
node tests/tier5_probes.js
# Expected: 5× "PROBE n [...]: PASS" lines + "OVERALL: ALL 5 PROBES PASS", exit 0.
```

Re-run safety: unique `tier5-<Date.now()>-<rand>` emails and `Tier5 Team <ts>` names per run —
reruns never collide with prior runs. To point at another host: `TIER5_BASE_URL=http://host:port
node tests/tier5_probes.js`.
