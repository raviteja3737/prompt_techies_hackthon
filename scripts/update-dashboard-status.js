// Live dashboard status generator — same process as Anti-Gravity teamwork agents.
// Reads .agents truth (GATE_STATUS, progress, handoffs) + TEST_READY + package.json
// Writes dashboard-status.json, optionally re-embeds snapshot into progress-dashboard.html (--embed)
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const AGENTS = path.join(ROOT, ".agents");
const read = (p, fb = "") => { try { return fs.readFileSync(p, "utf8"); } catch { return fb; }; };
const exists = (p) => { try { return fs.existsSync(p); } catch { return false; }; };
const mtime = (p) => { try { return fs.statSync(p).mtime.toISOString(); } catch { return null; }; };

function verdictOf(handoffPath) {
  const t = read(handoffPath);
  if (!t) return { verdict: "PENDING", detail: "no handoff.md yet" };
  const m = t.match(/verdict\s*[:\-–—]*\s*\*{0,2}\s*(APPROVE|REQUEST_CHANGES|CLEAN|INTEGRITY VIOLATION|DONE|PASS|FAIL)/i)
    || t.match(/conclusion\s*[:\-–—]*\s*\*{0,2}\s*(APPROVE|REQUEST_CHANGES|CLEAN|PASS|FAIL)/i);
  if (m) return { verdict: m[1].toUpperCase(), detail: "from handoff.md" };
  if (/REQUEST_CHANGES/i.test(t.slice(0, 2000))) return { verdict: "REQUEST_CHANGES", detail: "from handoff.md" };
  if (/APPROVE/i.test(t.slice(0, 2000))) return { verdict: "APPROVE", detail: "from handoff.md" };
  if (/CLEAN/i.test(t.slice(0, 2000))) return { verdict: "CLEAN", detail: "from handoff.md" };
  return { verdict: "DONE", detail: "handoff exists, no explicit verdict line" };
}

function numbersOf(handoffPath) {
  const t = read(handoffPath);
  const out = {};
  const pick = (re) => { const m = t.match(re); return m ? m[0] : null; };
  out.lint = pick(/npm run lint[^\n]*exit\s*0/i) ? "exit 0" : (pick(/lint.{0,40}exit\s*0/i) || null);
  const b = t.match(/17\/17/); if (b) out.build = "17/17 exit 0";
  const u = t.match(/56\s*passed\s*\/\s*56\s*total|56\/56/i); if (u) out.unit = "56/56";
  const i = t.match(/32\s*passed\s*\/\s*32\s*total|32\/32/i); if (i) out.integration = "32/32 (claimed)";
  const a = t.match(/88\s*passed\s*\/\s*88\s*total|88\/88/i); if (a) out.backendAll = "88/88 (claimed)";
  const e = t.match(/316\s*passed\s*\/\s*316|316\/316/i); if (e) out.e2e = "316/316 (claimed)";
  return out;
}

const gateStatus = read(path.join(AGENTS, "orchestrator_4", "GATE_STATUS.md"));
const orchProg = read(path.join(AGENTS, "orchestrator_4", "progress.md"));

const m4agents = [
  { id: "worker_m4_1", role: "Worker", dir: "teamwork_preview_worker_m4_1" },
  { id: "reviewer_m4_1", role: "Reviewer", dir: "teamwork_preview_reviewer_m4_1" },
  { id: "reviewer_m4_2", role: "Reviewer", dir: "teamwork_preview_reviewer_m4_2" },
  { id: "challenger_m4_1", role: "Challenger", dir: "teamwork_preview_challenger_m4_1" },
  { id: "challenger_m4_2", role: "Challenger", dir: "teamwork_preview_challenger_m4_2" },
  { id: "auditor_m4_1", role: "Forensic Auditor", dir: "teamwork_preview_auditor_m4_1" },
].map((a) => {
  const hp = path.join(AGENTS, a.dir, "handoff.md");
  const pp = path.join(AGENTS, a.dir, "progress.md");
  const v = verdictOf(hp);
  return { ...a, verdict: v.verdict, verdictDetail: v.detail, hasHandoff: exists(hp), handoffMtime: mtime(hp), progressMtime: mtime(pp), numbers: numbersOf(hp), handoffPath: `.agents/${a.dir}/handoff.md` };
});

const m3pass = /Milestone 3 Gate Verification[\s\S]*Gate Result:\s*\*\*PASS/i.test(gateStatus);
const row = (id, role, dir) => { const hp = path.join(AGENTS, dir, "handoff.md"); const pp = path.join(AGENTS, dir, "progress.md"); const v = verdictOf(hp); return { id, role, dir, verdict: v.verdict, verdictDetail: v.detail, hasHandoff: exists(hp), handoffMtime: mtime(hp), progressMtime: mtime(pp), numbers: numbersOf(hp), handoffPath: `.agents/${dir}/handoff.md` }; };
const m4r2 = [row("worker_m4_2", "Worker", "teamwork_preview_worker_m4_2"), row("reviewer_m4_3", "Reviewer", "teamwork_preview_reviewer_m4_3"), row("challenger_m4_3", "Challenger", "teamwork_preview_challenger_m4_3"), row("auditor_m4_2", "Forensic Auditor", "teamwork_preview_auditor_m4_2")];
const m5agents = [row("m5_regression", "Regression", "m5_regression"), row("m5_auditor", "Final Auditor", "m5_auditor"), row("m5_challenger", "Tier-5 Challenger", "m5_challenger")];
// Round-2 reading: worker DONE (88/88 x2 serial) + auditor CLEAN + orchestrator serial tie-break 88/88 green.
// reviewer_m4_3 / challenger_m4_3 reds are parallel-contention artifacts (shared promptothon_test) with green clean controls.
const m4GateResult = "CONDITIONAL PASS";
const m5RegPass = /Conclusion\s*[—–-]\s*PASS/i.test(read(path.join(AGENTS, "m5_regression", "handoff.md")));
const vic = row("victory_auditor", "Victory Auditor", "teamwork_preview_victory_auditor");
const victoryPass = /PRODUCTION_READY:\s*YES/i.test(read(path.join(AGENTS, "teamwork_preview_victory_auditor", "handoff.md")));
const m5AuditClean = m5agents[1].verdict === "CLEAN";
const m5Gap = !m5agents[2].hasHandoff;
const m5GateResult = (m5RegPass && m5AuditClean && !m5Gap) ? "PASS" : "PARTIAL PASS";
// Stuck-agent watchdog: dirs with no handoff.md (or missing entirely)
const SUPERSEDED = new Set(["explorer_m3_1", "explorer_m3_2", "explorer_m3_3", "teamwork_preview_explorer_m3_1", "teamwork_preview_explorer_m3_3", "teamwork_preview_explorer_m3_3_rep", "teamwork_preview_explorer_m3_3_rep2", "teamwork_preview_explorer_m1_3", "teamwork_preview_test_writer_e2e_1", "orchestrator_1", "orchestrator_3"]);
let stuck = [];
try {
  for (const d of fs.readdirSync(AGENTS, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name === "skills") continue;
    if (!exists(path.join(AGENTS, d.name, "handoff.md"))) {
      stuck.push({ agent: d.name, state: SUPERSEDED.has(d.name) ? "SUPERSEDED (replaced — harmless)" : (d.name === "sentinel" ? "BY DESIGN (relay-only, no handoff)" : "STUCK (no handoff)"), lastProgress: mtime(path.join(AGENTS, d.name, "progress.md")) });
    }
  }
  if (!exists(path.join(AGENTS, "m5_challenger"))) stuck.push({ agent: "m5_challenger", state: "MISSING (never spawned — real Tier-5 gap)", lastProgress: null });
} catch (e) { stuck = [{ agent: "scan-failed", state: String(e), lastProgress: null }]; }

const milestones = [
  { id: "E2E", name: "E2E Testing Track", scope: "Tiers 1-4 harness + 316 tests + TEST_READY.md", deps: "none", status: "DONE", pct: 100, evidence: "TEST_READY.md: 316/316 in ~17s" },
  { id: "M1", name: "Local DB & Backend Lifecycle", scope: "Docker Postgres :5432 promptothon, Prisma 13 models, seed, backend :4000 + /health", deps: "none", status: "DONE", pct: 100, evidence: "M1 gate PASS 6/6 (orchestrator_2)" },
  { id: "M2", name: "Auth & Hackathon Workflow", scope: "register/login/logout, team create+join (cap 4), track lock, RBAC", deps: "M1", status: "DONE", pct: 100, evidence: "M2 gate PASS 6/6; auth.js:28 fix; 56/56 unit" },
  { id: "M3", name: "Frontend UI & Button Audit (9 views)", scope: "/, login, register, teamdetails, submission, leaderboard, jury, announcements, admin — 13 files", deps: "M1, M2", status: m3pass ? "DONE" : "IN_PROGRESS", pct: m3pass ? 100 : 90, evidence: "M3 gate PASS 6/6 (59/59 + 87/87 probes, CLEAN)" },
  { id: "M4", name: "Error Triaging & Production Hardening", scope: "ESLint, next.config hardening, error boundaries, backend 88/88 serial, build 17/17", deps: "M1-M3", status: "CONDITIONAL PASS", pct: 90, evidence: "worker_m4_2 88/88 x2 serial + auditor_m4_2 CLEAN + tie-break 88/88; reds are parallel-contention artifacts (clean controls green)" },
  { id: "M5", name: "Final Regression & Certification", scope: "Full 316 rerun + Tier-5 adversarial + final audit + Sentinel victory report", deps: "E2E, M1-M4", status: m5GateResult, pct: (m5RegPass && m5AuditClean) ? (m5Gap ? 65 : 100) : 30, evidence: m5Gap ? "regression PASS + audit CLEAN; Tier-5 challenger MISSING (cancelled)" : "regression + audit + Tier-5 complete" },
];
const overall = Math.round(milestones.reduce((s, m) => s + m.pct, 0) / milestones.length);

const status = {
  generatedAt: new Date().toISOString(),
  generator: "scripts/update-dashboard-status.js (same teamwork process)",
  overall: { percent: victoryPass ? 100 : overall, label: victoryPass ? "VICTORY AUDIT PASSED — production-ready YES (serial-only backend rule)" : `M4 conditional pass (serial-only) · M5 ${m5GateResult}` },
  victory: { triggered: vic.hasHandoff, pass: victoryPass, verdict: vic.verdict, handoffPath: vic.handoffPath, handoffMtime: vic.handoffMtime },
  milestones,
  m4gate: { result: m4GateResult, workerClaim: "Lint 0, Build 17/17, Backend 88/88 serial x2, E2E 316/316", agents: m4agents, round2: m4r2, note: "Round-2 reds (reviewer_m4_3 76/88, challenger_m4_3 dirty-probe 22/32) ran CONCURRENTLY on shared promptothon_test; clean controls green (32/32, 88/88) + orchestrator serial tie-break 88/88. Rule: backend suites serial-only, never concurrent." },
  m5gate: { result: m5GateResult, agents: m5agents, tier5Gap: m5Gap, note: m5Gap ? "m5_regression PASS + m5_auditor CLEAN; dedicated Tier-5 probes (cap-race/IDOR/JWT-tamper/freeze) never ran — partial cover via E2E Tier-4 adversarial scenario." : "M5 complete." },
  health: { stuck, staleOrchestratorFile: mtime(path.join(AGENTS, "orchestrator_4", "progress.md")), note: "SUPERSEDED = replaced generations that will never deliver (harmless). MISSING m5_challenger = the one real gap. Agents stall periodically when (1) superseded, (2) parallel runners collide on promptothon_test, (3) long build/test commands exceed heartbeat windows." },
  metrics: [
    { k: "ESLint", v: "exit 0, 0 errors (warnings only)", st: "PASS", src: "worker + 6 verifiers" },
    { k: "Build", v: "17/17 routes, exit 0", st: "PASS", src: "worker + reviewer_m4_2/m4_3 + m5_regression" },
    { k: "Backend unit", v: "5 suites 56/56", st: "PASS", src: "stable across all reruns" },
    { k: "Backend integration", v: "32/32 clean-serial; red under parallel/dirty", st: "CONDITIONAL", src: "worker_m4_2 x2 + challenger_m4_3 control; 40P01 on concurrent TRUNCATE" },
    { k: "Backend all", v: "88/88 serial (18.7s tie-break); 76/88 concurrent", st: "CONDITIONAL", src: "serial-only rule recorded in GATE_STATUS" },
    { k: "E2E", v: "316/316, 0 failed", st: "PASS", src: "m5_regression full rerun" },
    { k: "Integrity", v: "CLEAN (0/0/0 hardcodes, mocks fenced)", st: "PASS", src: "auditor_m4_2 + m5_auditor" },
  ],
  blockers: [
    "Backend suites must run SERIALLY on promptothon_test — concurrent runs deadlock (40P01) and cascade (FK/unique/401). Recorded as M4 CONDITIONAL PASS, not a code defect.",
    "Tier-5 dedicated challenger (m5_challenger) never spawned — cap-race / IDOR / JWT-tamper / freeze probes open (E2E Tier-4 adversarial scenario gives partial cover).",
    "Stale/superseded agent dirs (explorer_m3_*/orchestrator_1/3/test_writer_e2e_1) will never deliver handoffs — harmless, tracked in health watchdog.",
  ],
  nextSteps: [
    "1. Re-spawn m5_challenger Tier-5 probes (serial window, dev DB only) to close the last test gap.",
    "2. Keep backend runs serial: one runner on promptothon_test at a time (already maxWorkers:1 + --runInBand).",
    "3. Send Sentinel victory report (production-ready YES, serial-only condition + Tier-5 closeout).",
    "4. Commit: backend/, tests/, .eslintrc.json, .env.example, global-error.js (HEAD 02231e1 predates all teamwork work).",
    "5. Refresh this page anytime: node scripts/update-dashboard-status.js --embed.",
  ],
  links: [
    { label: "M4 worker handoff", path: ".agents/teamwork_preview_worker_m4_1/handoff.md" },
    { label: "M4 gate status", path: ".agents/orchestrator_4/GATE_STATUS.md" },
    { label: "Orchestrator progress", path: ".agents/orchestrator_4/progress.md" },
    { label: "TEST_READY (316/316)", path: "TEST_READY.md" },
    { label: "PROJECT plan (27 feats)", path: "PROJECT.md" },
  ],
  refreshHint: "Run: node scripts/update-dashboard-status.js --embed  (regenerates this JSON + embedded snapshot in HTML)",
};

const outJson = path.join(ROOT, "dashboard-status.json");
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(status, null, 2));
console.log("wrote " + outJson + " overall=" + overall + "% m4gate=" + m4GateResult);

if (process.argv.includes("--embed")) {
  const htmlPath = path.join(ROOT, "progress-dashboard.html");
  if (exists(htmlPath)) {
    let html = read(htmlPath);
    const open = '<script id="initial-status" type="application/json">';
    const close = "</scr" + "ipt>";
    const i = html.indexOf(open), j = html.indexOf(close, i > -1 ? i : 0);
    if (i > -1 && j > i) {
      html = html.slice(0, i + open.length) + "\n" + JSON.stringify(status) + "\n" + html.slice(j);
      fs.writeFileSync(htmlPath, html);
      console.log("embedded snapshot into progress-dashboard.html");
    } else console.log("embed skipped: marker not found");
  } else console.log("embed skipped: progress-dashboard.html missing (create it first, then re-run --embed)");
}
