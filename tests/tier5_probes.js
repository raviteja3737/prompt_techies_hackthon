/**
 * tests/tier5_probes.js — Tier-5 dedicated adversarial probes (m5_challenger).
 *
 * Serial-window rules: NO jest suites, NO writes to promptothon_test.
 * Probes the dev `promptothon` DB via HTTP against the live backend
 * (http://localhost:4000, verified healthy with database.connected=true).
 * Unique entities only: tier5-<ts>-<rand>@test.dev / "Tier5 Team <ts>".
 * Read-only state verification via GET endpoints only (no Prisma writes).
 *
 * Run: node tests/tier5_probes.js
 * Each probe prints PASS/FAIL with verbatim tallies.
 */
"use strict";

const BASE = process.env.TIER5_BASE_URL || "http://localhost:4000";
const ts = Date.now();
const rand = () => Math.random().toString(36).slice(2, 7);
const email = (p) => `tier5-${ts}-${rand()}-${p}@test.dev`;
const PASS = "SecurePass123!";

let failures = 0;

async function req(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let parsed = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

async function register(payload) {
  return req("POST", "/api/auth/register", { body: payload });
}

async function login(emailAddr, password) {
  return req("POST", "/api/auth/login", { body: { email: emailAddr, password } });
}

function report(n, name, ok, detail) {
  console.log(`PROBE ${n} [${name}]: ${ok ? "PASS" : "FAIL"} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

function flipLastChar(token) {
  const last = token.slice(-1);
  // Stay inside the base64url alphabet so structure parses but signature breaks.
  const alt = last === "A" ? "B" : "A";
  return token.slice(0, -1) + alt;
}

async function main() {
  // Sanity: live backend healthy on dev DB.
  const health = await req("GET", "/health");
  console.log(
    `HEALTH: status=${health.status} ok=${health.body && health.body.ok} ` +
      `dbConnected=${health.body && health.body.database && health.body.database.connected}`
  );
  if (health.status !== 200 || !(health.body && health.body.database && health.body.database.connected)) {
    console.log("ABORT: live backend unhealthy — refusing to run (no fallback writes permitted).");
    process.exit(2);
  }

  // ---------------------------------------------------------------- Probe 1
  // Team-cap race: leader + fill to 3/4, 5 concurrent joins for last seat.
  let p1ok = false;
  let p1detail = "";
  try {
    const teamName = `Tier5 Team Race ${ts}`;
    const lead = await register({ name: "T5 Race Lead", email: email("lead"), password: PASS, intent: "create", teamName });
    if (lead.status !== 201) throw new Error(`leader register status=${lead.status}`);
    const leadToken = lead.body.token;
    const me = await req("GET", "/api/team/me", { token: leadToken });
    const inviteCode = me.body && me.body.team && (me.body.team.inviteCode || me.body.team.code);
    if (!inviteCode) throw new Error("no inviteCode returned");

    for (const who of ["m2", "m3"]) {
      const r = await register({ name: `T5 Race ${who}`, email: email(who), password: PASS, intent: "join", teamCode: inviteCode });
      if (r.status !== 201) throw new Error(`fill ${who} status=${r.status}`);
    }
    const pre = await req("GET", "/api/team/me", { token: leadToken });
    const preCount = pre.body.team.members.length;

    const solos = [];
    for (let i = 1; i <= 5; i += 1) {
      const s = await register({ name: `T5 Comp ${i}`, email: email(`comp${i}`), password: PASS, intent: "solo" });
      if (s.status !== 201) throw new Error(`solo ${i} status=${s.status}`);
      solos.push(s.body.token);
    }
    const results = await Promise.all(
      solos.map((t) => req("POST", "/api/team/join", { token: t, body: { teamCode: inviteCode } }))
    );
    const okCount = results.filter((r) => r.status === 200 || r.status === 201).length;
    const rejCount = results.filter((r) => r.status === 409).length;
    const statuses = results.map((r) => r.status).join(",");
    const fin = await req("GET", "/api/team/me", { token: leadToken });
    const finalCount = fin.body.team.members.length;
    p1ok = preCount === 3 && okCount === 1 && rejCount === 4 && finalCount === 4;
    p1detail = `pre=3 (got ${preCount}); join statuses=[${statuses}] success=${okCount} (want 1) rejected409=${rejCount} (want 4); final roster=${finalCount} (want 4)`;
  } catch (e) {
    p1detail = `error: ${e.message}`;
  }
  report(1, "team-cap-race", p1ok, p1detail);

  // ---------------------------------------------------------------- Probe 2
  // Track-lock immutability + submission guards.
  let p2ok = false;
  let p2detail = "";
  try {
    const tracks = await req("GET", "/api/tracks");
    const list = (tracks.body && (tracks.body.tracks || tracks.body)) || [];
    if (!Array.isArray(list) || list.length < 2) throw new Error("need >=2 tracks");
    const [trackA, trackB] = list;

    const leadA = await register({ name: "T5 Lock Lead", email: email("lock"), password: PASS, intent: "create", teamName: `Tier5 Team Lock ${ts}` });
    if (leadA.status !== 201) throw new Error(`leadA register status=${leadA.status}`);
    const tokA = leadA.body.token;

    const lockA = await req("POST", "/api/team/track-lock", { token: tokA, body: { trackId: trackA.id } });
    const relock = await req("POST", "/api/team/track-lock", { token: tokA, body: { trackId: trackB.id } });

    const leadB = await register({ name: "T5 Fresh Lead", email: email("fresh"), password: PASS, intent: "create", teamName: `Tier5 Team Fresh ${ts}` });
    if (leadB.status !== 201) throw new Error(`leadB register status=${leadB.status}`);
    const tokB = leadB.body.token;
    const noTrackSub = await req("POST", "/api/team/submission", {
      token: tokB,
      body: { submit: false, repoUrl: "https://github.com/tier5-probe/fresh-proj" },
    });

    const fin = await req("POST", "/api/team/submission", {
      token: tokA,
      body: { submit: true, repoUrl: "https://github.com/tier5-probe/locked-proj" },
    });
    const edit = await req("POST", "/api/team/submission", {
      token: tokA,
      body: { submit: false, repoUrl: "https://github.com/tier5-probe/locked-proj-v2" },
    });

    const c1 = lockA.status === 200;
    const c2 = relock.status === 409;
    const c3 = noTrackSub.status === 409;
    const c4 = fin.status === 200 && (edit.status === 409 || edit.status === 403);
    p2ok = c1 && c2 && c3 && c4;
    p2detail =
      `lockA=${lockA.status} (want 200); relockB=${relock.status} (want 409); ` +
      `noTrackSubmit=${noTrackSub.status} (want 409); finalize=${fin.status} (want 200); ` +
      `editAfterFinal=${edit.status} (want 409/403)`;
  } catch (e) {
    p2detail = `error: ${e.message}`;
  }
  report(2, "track-lock-immutability", p2ok, p2detail);

  // ---------------------------------------------------------------- Probe 3
  // RBAC matrix.
  let p3ok = false;
  let p3detail = "";
  try {
    const part = await register({ name: "T5 Part", email: email("part"), password: PASS, intent: "solo" });
    if (part.status !== 201) throw new Error(`participant register status=${part.status}`);
    const partToken = part.body.token;

    const adminAsPart = await req("GET", "/api/admin/dashboard", { token: partToken });
    const juryAsPart = await req("GET", "/api/jury/queue", { token: partToken });

    const juryLogin = await login("jury1@promptothon.dev", "Password123!");
    if (juryLogin.status !== 200) throw new Error(`jury login status=${juryLogin.status}`);
    const juryToken = juryLogin.body.token;

    // Unassigned team: fresh team from probe 2 (never jury-assigned). Re-fetch its id via its leader.
    // Reuse: create a brand-new team here so assignment state is guaranteed fresh.
    const leadU = await register({ name: "T5 Unassigned", email: email("unas"), password: PASS, intent: "create", teamName: `Tier5 Team Unas ${ts}` });
    if (leadU.status !== 201) throw new Error(`unas register status=${leadU.status}`);
    const meU = await req("GET", "/api/team/me", { token: leadU.body.token });
    const unasTeamId = meU.body.team.id;
    const evalUnas = await req("POST", "/api/jury/evaluate", {
      token: juryToken,
      body: { teamId: unasTeamId, innovation: 15, technical: 15, design: 15, viability: 15, feedback: "tier5 probe" },
    });

    const tampered = flipLastChar(partToken);
    const tamperedRes = await req("GET", "/api/auth/me", { token: tampered });

    const c1 = adminAsPart.status === 403;
    const c2 = juryAsPart.status === 403;
    const c3 = evalUnas.status === 403;
    const c4 = tamperedRes.status === 401;
    p3ok = c1 && c2 && c3 && c4;
    p3detail =
      `PARTICIPANT->admin/dashboard=${adminAsPart.status} (want 403); ` +
      `PARTICIPANT->jury/queue=${juryAsPart.status} (want 403); ` +
      `JURY->evaluate-unassigned=${evalUnas.status} (want 403); ` +
      `tamperedJWT->auth/me=${tamperedRes.status} (want 401)`;
  } catch (e) {
    p3detail = `error: ${e.message}`;
  }
  report(3, "rbac-matrix", p3ok, p3detail);

  // ---------------------------------------------------------------- Probe 4
  // Leaderboard freeze.
  let p4ok = false;
  let p4detail = "";
  try {
    const adminLogin = await login("admin@promptothon.dev", "ChangeMe123!");
    if (adminLogin.status !== 200) throw new Error(`admin login status=${adminLogin.status}`);
    const adminToken = adminLogin.body.token;

    const statusBefore = await req("GET", "/api/admin/score-status", { token: adminToken });
    const original = Boolean(statusBefore.body && statusBefore.body.scoresFrozen);

    const fOn = await req("POST", "/api/admin/freeze-scores", { token: adminToken, body: { frozen: true } });
    const lbFrozen = await req("GET", "/api/leaderboard");
    const frozenFlag = lbFrozen.body && (lbFrozen.body.scoresFrozen !== undefined ? lbFrozen.body.scoresFrozen : lbFrozen.body.isFrozen);

    const fOff = await req("POST", "/api/admin/freeze-scores", { token: adminToken, body: { frozen: false } });
    const lbLive = await req("GET", "/api/leaderboard");
    const liveFlag = lbLive.body && (lbLive.body.scoresFrozen !== undefined ? lbLive.body.scoresFrozen : lbLive.body.isFrozen);

    const restore = await req("POST", "/api/admin/freeze-scores", { token: adminToken, body: { frozen: original } });
    const statusAfter = await req("GET", "/api/admin/score-status", { token: adminToken });
    const restored = Boolean(statusAfter.body && statusAfter.body.scoresFrozen) === original;

    p4ok =
      fOn.status === 200 && frozenFlag === true &&
      fOff.status === 200 && liveFlag === false &&
      restore.status === 200 && restored;
    p4detail =
      `original=${original}; freezeOn=${fOn.status} lb.scoresFrozen=${frozenFlag} (want true); ` +
      `freezeOff=${fOff.status} lb.scoresFrozen=${liveFlag} (want false); ` +
      `restore=${restore.status} final=${statusAfter.body && statusAfter.body.scoresFrozen} (want ${original})`;
  } catch (e) {
    p4detail = `error: ${e.message}`;
  }
  report(4, "leaderboard-freeze", p4ok, p4detail);

  // ---------------------------------------------------------------- Probe 5
  // Pitch-deck contract.
  let p5ok = false;
  let p5detail = "";
  try {
    const tracks = await req("GET", "/api/tracks");
    const list = (tracks.body && (tracks.body.tracks || tracks.body)) || [];
    if (!Array.isArray(list) || list.length < 1) throw new Error("need >=1 track");
    const leadD = await register({ name: "T5 Deck Lead", email: email("deck"), password: PASS, intent: "create", teamName: `Tier5 Team Deck ${ts}` });
    if (leadD.status !== 201) throw new Error(`deck register status=${leadD.status}`);
    const tokD = leadD.body.token;
    const lock = await req("POST", "/api/team/track-lock", { token: tokD, body: { trackId: list[0].id } });
    if (lock.status !== 200) throw new Error(`deck lock status=${lock.status}`);
    const draft = await req("POST", "/api/team/submission", {
      token: tokD,
      body: { submit: false, repoUrl: "https://github.com/tier5-probe/deck-proj" },
    });
    if (draft.status !== 200) throw new Error(`draft status=${draft.status}`);

    const keyOnly = await req("POST", "/api/team/submission/pitch-deck", {
      token: tokD,
      body: { key: `tier5/${ts}/deck.pdf` },
    });
    const full = await req("POST", "/api/team/submission/pitch-deck", {
      token: tokD,
      body: { key: `tier5/${ts}/deck.pdf`, url: `https://cdn.example.com/tier5/${ts}/deck.pdf` },
    });

    p5ok = keyOnly.status === 422 && full.status === 200;
    p5detail = `attach{key-only}=${keyOnly.status} (want 422); attach{key+url}=${full.status} (want 200)`;
  } catch (e) {
    p5detail = `error: ${e.message}`;
  }
  report(5, "pitch-deck-contract", p5ok, p5detail);

  console.log(failures === 0 ? "OVERALL: ALL 5 PROBES PASS" : `OVERALL: ${failures} PROBE(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.log(`FATAL: ${e && e.message}`);
  process.exit(1);
});
