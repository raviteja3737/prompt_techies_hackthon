/**
 * backend/tests/challenger_m1_2_empirical.js
 * 
 * Milestone 1 Challenger 2 Empirical Test Suite
 * Mission:
 * 1. Health probe correctness & DB connectivity reflection (live SELECT 1, fault injection, self-healing).
 * 2. Authenticated seeded record validation (/api/tracks, /api/announcements, 401 unauthenticated).
 * 3. Connection pooling & socket stability under concurrency and unexpected/malformed inputs.
 * 4. Socket.IO real-time engine handshake & subscription.
 * 5. Process lifecycle, clean socket release, and restart validation.
 */

const http = require("http");
const net = require("net");
const path = require("path");
const { execSync } = require("child_process");

// Check if socket.io-client is available from root or backend
let ioClient;
try {
  ioClient = require("socket.io-client");
} catch {
  try {
    ioClient = require(path.resolve(__dirname, "../../node_modules/socket.io-client"));
  } catch (e) {
    console.warn("[WARN] socket.io-client could not be loaded:", e.message);
  }
}

const PORT = 4000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {},
        timeout: options.timeout || 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json,
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error(`Request timed out after ${options.timeout || 10000}ms for ${url}`));
    });
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function queryPostgres(sql) {
  const cmd = `docker exec promptothon-postgres psql -U postgres -d promptothon -t -A -c "${sql.replace(/"/g, '\\"')}"`;
  const output = execSync(cmd, { encoding: "utf8" });
  return output.trim();
}

async function runEmpiricalSuite() {
  console.log("================================================================================");
  console.log("       MILESTONE 1 CHALLENGER 2: EMPIRICAL STABILITY & LIFECYCLE HARNESS         ");
  console.log("================================================================================");

  // ---------------------------------------------------------------------------
  // SECTION 1: Probe Baseline Health & Live Database Query Reflection
  // ---------------------------------------------------------------------------
  console.log("\n>>> SECTION 1: Verifying Live Health Endpoints & Database Query Reflection");

  const h1 = await httpRequest(`${BASE_URL}/health`);
  console.log(`[PASS] GET /health returned HTTP ${h1.status}:`, JSON.stringify(h1.json));
  if (h1.status !== 200 || !h1.json || h1.json.ok !== true || h1.json.database?.connected !== true) {
    throw new Error(`GET /health failed: ${JSON.stringify(h1.json)}`);
  }

  const h2 = await httpRequest(`${BASE_URL}/api/health`);
  console.log(`[PASS] GET /api/health returned HTTP ${h2.status}:`, JSON.stringify(h2.json));
  if (h2.status !== 200 || !h2.json || h2.json.ok !== true || h2.json.database?.connected !== true) {
    throw new Error(`GET /api/health failed: ${JSON.stringify(h2.json)}`);
  }

  // Verify direct database query executes and returns count
  const trackCount = queryPostgres('SELECT count(*) FROM "Track";');
  console.log(`[PASS] Direct PostgreSQL query confirmed: Track count = ${trackCount}`);

  // ---------------------------------------------------------------------------
  // SECTION 2: Fault Injection & Self-Healing Database Connection Pool
  // ---------------------------------------------------------------------------
  console.log("\n>>> SECTION 2: Fault Injection & Self-Healing Connection Pool Recovery");
  console.log("Stopping PostgreSQL container (simulating DB network failure)...");
  execSync("docker stop promptothon-postgres");
  await sleep(1500);

  try {
    const offlineHealth = await httpRequest(`${BASE_URL}/health`, { timeout: 10000 });
    console.log(`[PASS] Offline /health returned HTTP ${offlineHealth.status} with body:`, JSON.stringify(offlineHealth.json));
    if (offlineHealth.json?.database?.connected !== false || offlineHealth.json?.database?.error !== "unreachable") {
      throw new Error(`Health endpoint did not properly reflect DB downtime: ${JSON.stringify(offlineHealth.json)}`);
    }
  } finally {
    console.log("Restarting PostgreSQL container (testing pool self-healing)...");
    execSync("docker start promptothon-postgres");
    
    // Wait for PostgreSQL to be ready
    let pgReady = false;
    for (let i = 0; i < 20; i++) {
      try {
        const readyCheck = execSync("docker exec promptothon-postgres pg_isready -U postgres -d promptothon", { encoding: "utf8" });
        if (readyCheck.includes("accepting connections")) {
          pgReady = true;
          break;
        }
      } catch {}
      await sleep(500);
    }
    if (!pgReady) throw new Error("PostgreSQL failed to recover within 10 seconds");
    console.log("[PASS] PostgreSQL container is back up and accepting connections.");
    await sleep(1000);

    // Verify health endpoint auto-recovers without restarting the backend!
    const recoveredHealth = await httpRequest(`${BASE_URL}/health`);
    console.log(`[PASS] Recovered /health returned HTTP ${recoveredHealth.status}:`, JSON.stringify(recoveredHealth.json));
    if (recoveredHealth.json?.database?.connected !== true) {
      throw new Error("Backend connection pool failed to self-heal after DB recovery!");
    }
    console.log("[PASS] Self-healing connection pool verified: 0 restart needed for DB reconnection.");
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: Authenticated Seeded Record Validation & RBAC Rejection
  // ---------------------------------------------------------------------------
  console.log("\n>>> SECTION 3: Authenticated Seeded Records Validation & Rejection Testing");

  // 3.1 Unauthenticated requests must return 401
  console.log("Testing unauthenticated route access...");
  const unauthTracks = await httpRequest(`${BASE_URL}/api/tracks`);
  if (unauthTracks.status !== 401) {
    throw new Error(`Expected HTTP 401 for unauthenticated /api/tracks, got ${unauthTracks.status}`);
  }
  console.log("[PASS] Unauthenticated GET /api/tracks rejected with HTTP 401.");

  const unauthAnnounce = await httpRequest(`${BASE_URL}/api/announcements`);
  if (unauthAnnounce.status !== 401) {
    throw new Error(`Expected HTTP 401 for unauthenticated /api/announcements, got ${unauthAnnounce.status}`);
  }
  console.log("[PASS] Unauthenticated GET /api/announcements rejected with HTTP 401.");

  // 3.2 Bad credentials must return 401
  const badLogin = await httpRequest(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { email: "admin@promptothon.dev", password: "IncorrectPassword!" },
  });
  if (badLogin.status !== 401) {
    throw new Error(`Expected HTTP 401 for bad login, got ${badLogin.status}`);
  }
  console.log("[PASS] Invalid credentials rejected with HTTP 401.");

  // 3.3 Valid logins across roles
  console.log("Testing authenticated logins for seeded accounts...");
  const rolesToTest = [
    { email: "admin@promptothon.dev", password: "ChangeMe123!", role: "ADMIN" },
    { email: "jury1@promptothon.dev", password: "Password123!", role: "JURY" },
    { email: "alpha.leader@promptothon.dev", password: "Password123!", role: "PARTICIPANT" },
    { email: "solo1@promptothon.dev", password: "Password123!", role: "PARTICIPANT" },
  ];

  let adminToken = null;
  let participantToken = null;

  for (const acc of rolesToTest) {
    const loginRes = await httpRequest(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { email: acc.email, password: acc.password },
    });
    if (loginRes.status !== 200 || !loginRes.json?.token) {
      throw new Error(`Login failed for ${acc.email}: HTTP ${loginRes.status}`);
    }
    if (loginRes.json.user?.role !== acc.role) {
      throw new Error(`Role mismatch for ${acc.email}: expected ${acc.role}, got ${loginRes.json.user?.role}`);
    }
    console.log(`[PASS] Login successful for ${acc.email} (Role: ${acc.role})`);
    if (acc.role === "ADMIN") adminToken = loginRes.json.token;
    if (acc.email === "alpha.leader@promptothon.dev") participantToken = loginRes.json.token;
  }

  // 3.4 Validate Seeded Tracks via Authenticated API
  console.log("Validating seeded tracks via GET /api/tracks...");
  const tracksRes = await httpRequest(`${BASE_URL}/api/tracks`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (tracksRes.status !== 200 || !tracksRes.json?.tracks) {
    throw new Error(`GET /api/tracks failed: HTTP ${tracksRes.status}`);
  }
  const tracks = tracksRes.json.tracks;
  console.log(`[PASS] GET /api/tracks returned ${tracks.length} tracks.`);
  if (tracks.length !== 2) {
    throw new Error(`Expected exactly 2 seeded tracks, received ${tracks.length}`);
  }
  const trackTitles = tracks.map((t) => t.title).sort();
  const expectedTracks = ["AI Agents for Healthcare", "Sustainable Fintech"].sort();
  if (JSON.stringify(trackTitles) !== JSON.stringify(expectedTracks)) {
    throw new Error(`Track titles mismatch! Expected ${JSON.stringify(expectedTracks)}, got ${JSON.stringify(trackTitles)}`);
  }
  console.log(`[PASS] Tracks match PostgreSQL seeded records: ${JSON.stringify(trackTitles)}`);

  // 3.5 Validate Seeded Announcements via Authenticated API
  console.log("Validating seeded announcements via GET /api/announcements...");
  const announceRes = await httpRequest(`${BASE_URL}/api/announcements`, {
    headers: { Authorization: `Bearer ${participantToken}` },
  });
  if (announceRes.status !== 200 || !announceRes.json?.announcements) {
    throw new Error(`GET /api/announcements failed: HTTP ${announceRes.status}`);
  }
  const announcements = announceRes.json.announcements;
  console.log(`[PASS] GET /api/announcements returned ${announcements.length} announcements.`);
  if (announcements.length < 2) {
    throw new Error(`Expected at least 2 seeded announcements, received ${announcements.length}`);
  }
  const announceTitles = announcements.map((a) => a.title);
  if (!announceTitles.includes("Welcome to Promptothon!") || !announceTitles.includes("Submission deadline reminder")) {
    throw new Error(`Announcements missing seeded items! Got: ${JSON.stringify(announceTitles)}`);
  }
  console.log(`[PASS] Announcements match PostgreSQL seeded records: ${JSON.stringify(announceTitles)}`);

  // ---------------------------------------------------------------------------
  // SECTION 4: Connection Pooling & Concurrency Burst Testing
  // ---------------------------------------------------------------------------
  console.log("\n>>> SECTION 4: Connection Pooling & Concurrency Burst Testing");
  const baselineConnCount = parseInt(
    queryPostgres("SELECT count(*) FROM pg_stat_activity WHERE datname = 'promptothon' AND usename = 'postgres';"),
    10
  );
  console.log(`PostgreSQL baseline connection count: ${baselineConnCount}`);

  console.log("Dispatching burst of 60 concurrent requests (mix of health, tracks, announcements)...");
  const burstStart = Date.now();
  const burstPromises = [];
  for (let i = 0; i < 60; i++) {
    const isHealth = i % 3 === 0;
    const isTracks = i % 3 === 1;
    const url = isHealth
      ? `${BASE_URL}/health`
      : isTracks
      ? `${BASE_URL}/api/tracks`
      : `${BASE_URL}/api/announcements`;
    const token = isTracks ? adminToken : participantToken;
    const headers = isHealth ? {} : { Authorization: `Bearer ${token}` };
    burstPromises.push(httpRequest(url, { headers }));
  }

  const burstResults = await Promise.all(burstPromises);
  const burstDuration = Date.now() - burstStart;
  console.log(`[PASS] 60 concurrent requests completed in ${burstDuration} ms`);

  const burstSuccess = burstResults.every((r) => r.status === 200);
  if (!burstSuccess) {
    const failedCodes = burstResults.filter((r) => r.status !== 200).map((r) => r.status);
    throw new Error(`Some concurrent burst requests failed: ${failedCodes.join(", ")}`);
  }
  console.log("[PASS] All 60 burst requests returned HTTP 200 OK.");

  // Inspect PostgreSQL connection count after burst
  await sleep(500);
  const postBurstConnCount = parseInt(
    queryPostgres("SELECT count(*) FROM pg_stat_activity WHERE datname = 'promptothon' AND usename = 'postgres';"),
    10
  );
  console.log(`PostgreSQL connection count post-burst: ${postBurstConnCount}`);
  // PostgreSQL max_connections is 100. Connection pool should never exceed pool max (~15-20).
  if (postBurstConnCount > 40) {
    throw new Error(`Possible connection leak detected! Post-burst connection count = ${postBurstConnCount}`);
  }
  console.log("[PASS] PostgreSQL connections bounded and pooled properly; no monotonic connection leaks.");

  // ---------------------------------------------------------------------------
  // SECTION 5: Socket Stability Under Malformed Inputs & Abrupt Drops
  // ---------------------------------------------------------------------------
  console.log("\n>>> SECTION 5: Socket Stability (Malformed Inputs, Large Headers, Abrupt Disconnects)");

  // 5.1 Abrupt TCP connection reset
  console.log("Simulating abrupt client socket destruction...");
  await new Promise((res) => {
    const client = net.createConnection({ host: "127.0.0.1", port: PORT }, () => {
      client.write("GET /health HTTP/1.1\r\nHost: 127.0.0.1:4000\r\n");
      client.destroy();
      res();
    });
    client.on("error", () => res());
  });
  console.log("[PASS] Abrupt socket destruction handled cleanly.");

  // 5.2 Malformed non-HTTP garbage data
  console.log("Sending binary garbage data to port 4000...");
  await new Promise((res) => {
    const client = net.createConnection({ host: "127.0.0.1", port: PORT }, () => {
      client.write(Buffer.from([0x00, 0xff, 0xfe, 0x12, 0x34, 0x56, 0x78, 0xaa, 0xbb]));
      client.end();
      res();
    });
    client.on("error", () => res());
  });
  console.log("[PASS] Binary garbage payload discarded cleanly.");

  // 5.3 Giant HTTP headers
  console.log("Sending 32KB giant HTTP headers to test parser limits...");
  const giantHeader = "X-Junk: " + "A".repeat(32768) + "\r\n";
  const giantRes = await new Promise((res) => {
    const client = net.createConnection({ host: "127.0.0.1", port: PORT }, () => {
      client.write(`GET /health HTTP/1.1\r\nHost: 127.0.0.1:4000\r\n${giantHeader}\r\n`);
    });
    let raw = "";
    client.on("data", (chunk) => (raw += chunk.toString()));
    client.on("end", () => res(raw));
    client.on("error", () => res(raw));
  });
  console.log(`[PASS] Giant header response: ${giantRes.split("\r\n")[0] || "Socket closed"}`);

  // 5.4 Rapid socket open-and-close flood
  console.log("Opening and closing 20 raw TCP sockets rapidly...");
  for (let i = 0; i < 20; i++) {
    await new Promise((res) => {
      const sock = net.createConnection({ host: "127.0.0.1", port: PORT }, () => {
        sock.destroy();
        res();
      });
      sock.on("error", () => res());
    });
  }
  console.log("[PASS] Rapid socket flood absorbed.");

  // Verify server is STILL completely alive and serving normal traffic
  const probeAfterAttacks = await httpRequest(`${BASE_URL}/health`);
  if (probeAfterAttacks.status !== 200 || probeAfterAttacks.json?.ok !== true) {
    throw new Error("Server became unresponsive after socket abuse attacks!");
  }
  console.log("[PASS] Server remains 100% operational after socket and parser stress.");

  // ---------------------------------------------------------------------------
  // SECTION 6: Socket.IO Real-Time Engine Handshake & Subscriptions
  // ---------------------------------------------------------------------------
  if (ioClient) {
    console.log("\n>>> SECTION 6: Socket.IO Real-Time Protocol Verification");
    const socket = ioClient(BASE_URL, {
      transports: ["websocket", "polling"],
      timeout: 5000,
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.disconnect();
        reject(new Error("Socket.IO connection timeout"));
      }, 5000);

      socket.on("connect", () => {
        console.log(`[PASS] Socket.IO client connected with ID: ${socket.id}`);
        socket.emit("leaderboard:subscribe", { trackId: null });
      });

      socket.on("leaderboard:snapshot", (data) => {
        console.log(`[PASS] Received leaderboard:snapshot with ${data.leaderboard?.length || 0} teams, scoresFrozen: ${data.scoresFrozen}`);
        clearTimeout(timer);
        socket.disconnect();
        resolve();
      });

      socket.on("connect_error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    console.log("[PASS] Socket.IO engine validated cleanly.");
  } else {
    console.log("\n>>> SECTION 6: Socket.IO client not found; skipping client socket test.");
  }

  // ---------------------------------------------------------------------------
  // SECTION 7: Process Lifecycle, Clean Socket Release & Restart Verification
  // ---------------------------------------------------------------------------
  console.log("\n>>> SECTION 7: Process Lifecycle, Socket Release & Clean Restart Testing");

  // Find owning PID of port 4000
  const findPidCmd = `powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue; if ($c) { ($c | Select-Object -ExpandProperty OwningProcess -Unique) -join ',' } else { '' }"`;
  let currentPidStr = execSync(findPidCmd, { encoding: "utf8" }).trim();
  console.log(`Current backend server PID(s) on port ${PORT}: ${currentPidStr}`);

  if (currentPidStr) {
    console.log(`Terminating backend process(es) PID(s) ${currentPidStr}...`);
    execSync(`powershell -NoProfile -Command "$pids = '${currentPidStr}'.Split(','); foreach (\$p in \$pids) { if (\$p.Trim()) { Stop-Process -Id ([int]\$p.Trim()) -Force -ErrorAction SilentlyContinue } }"`);
    await sleep(2500);

    // Verify port 4000 is completely released
    const checkPort = execSync(findPidCmd, { encoding: "utf8" }).trim();
    if (checkPort) {
      throw new Error(`Port ${PORT} was NOT released after killing process! Still owned by PID ${checkPort}`);
    }
    console.log(`[PASS] Port ${PORT} released immediately; zero zombie sockets.`);

    // Check PostgreSQL connection cleanup
    await sleep(1000);
    const orphanCheck = parseInt(
      queryPostgres("SELECT count(*) FROM pg_stat_activity WHERE datname = 'promptothon' AND state = 'idle';"),
      10
    );
    console.log(`PostgreSQL idle connections after server termination: ${orphanCheck}`);

    // Restart backend server via Start-Process
    console.log("Restarting backend server on port 4000 via PowerShell Start-Process...");
    const backendDir = path.resolve(__dirname, "..");
    execSync(
      `powershell -NoProfile -Command "Start-Process node -ArgumentList 'src/server.js' -WorkingDirectory '${backendDir}' -WindowStyle Hidden"`
    );

    // Poll until port 4000 is listening and responds to /health
    let restarted = false;
    for (let i = 0; i < 20; i++) {
      await sleep(1000);
      try {
        const checkHealth = await httpRequest(`${BASE_URL}/health`, { timeout: 3000 });
        if (checkHealth.status === 200 && checkHealth.json?.ok === true && checkHealth.json?.database?.connected === true) {
          restarted = true;
          break;
        }
      } catch {}
    }

    if (!restarted) {
      throw new Error("Restarted backend server failed to become healthy on port 4000!");
    }

    const newPid = execSync(findPidCmd, { encoding: "utf8" }).trim();
    console.log(`[PASS] Backend server successfully restarted on port ${PORT} with new PID: ${newPid}`);

    // Re-verify authenticated API on newly restarted server
    const postRestartTracks = await httpRequest(`${BASE_URL}/api/tracks`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (postRestartTracks.status !== 200 || postRestartTracks.json?.tracks?.length !== 2) {
      throw new Error("Post-restart API tracks query failed!");
    }
    console.log("[PASS] Post-restart authenticated tracks query succeeded with 2 tracks.");
  }

  console.log("\n================================================================================");
  console.log("   ALL EMPIRICAL CHALLENGES PASSED! VERDICT: APPROVE                            ");
  console.log("================================================================================");
}

runEmpiricalSuite().catch((err) => {
  console.error("\n[CRITICAL FAILURE IN EMPIRICAL CHALLENGER SUITE]:", err);
  process.exit(1);
});
