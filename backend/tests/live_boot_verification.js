/**
 * tests/live_boot_verification.js
 * Empirical Challenger verification script:
 * 1. Spawns src/server.js on test port 4006 with offline/unreachable DB
 * 2. Probes GET /health for 200 OK and graceful offline fallback payload
 * 3. Probes Socket.IO Engine.IO handshake
 * 4. Tests RateLimit headers and auth rate limiter trigger (HTTP 429)
 * 5. Verifies clean shutdown and port release
 */

const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");

const TEST_PORT = 4006;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const testEnv = {
  ...process.env,
  PORT: String(TEST_PORT),
  NODE_ENV: "test",
  CLIENT_ORIGIN: "http://localhost:3000",
  DATABASE_URL: "postgresql://mock_user:mock_pass@127.0.0.1:54329/mock_offline_db",
  DIRECT_URL: "postgresql://mock_user:mock_pass@127.0.0.1:54329/mock_offline_db",
  JWT_SECRET: "test-secret-min-32-chars-for-promptothon-testing",
  JWT_EXPIRES_IN: "7d",
  COOKIE_NAME: "promptothon_token",
  JURY_ALIAS_SALT: "test-jury-alias-salt-offline",
  STORAGE_PROVIDER: "disabled",
  GITHUB_API_VERIFICATION: "disabled",
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchUrl(url, options = {}) {
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
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            // non-json response
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json,
          });
        });
      }
    );
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function checkPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, "127.0.0.1");
  });
}

async function run() {
  console.log("=== EMPIRICAL CHALLENGER: SERVER BOOT & LIVE PROBE ===");
  console.log(`Target: node src/server.js on port ${TEST_PORT}`);
  console.log("Database target: 127.0.0.1:54329 (unreachable offline mock)");

  const portWasFreeInitially = await checkPortFree(TEST_PORT);
  console.log(`Port ${TEST_PORT} initially free: ${portWasFreeInitially}`);
  if (!portWasFreeInitially) {
    throw new Error(`Port ${TEST_PORT} is already in use before test start!`);
  }

  const serverProcess = spawn("node", ["src/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: testEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let serverOutput = "";
  let serverBooted = false;

  serverProcess.stdout.on("data", (data) => {
    const text = data.toString();
    serverOutput += text;
    process.stdout.write(`[SERVER STDOUT] ${text}`);
  });

  serverProcess.stderr.on("data", (data) => {
    const text = data.toString();
    serverOutput += text;
    process.stderr.write(`[SERVER STDERR] ${text}`);
  });

  // Wait for boot line or max 5 seconds
  const startTime = Date.now();
  while (Date.now() - startTime < 6000) {
    if (serverOutput.includes(`listening on :${TEST_PORT}`)) {
      serverBooted = true;
      break;
    }
    await wait(100);
  }

  if (!serverBooted) {
    serverProcess.kill();
    throw new Error(`Server failed to boot within 6s. Output:\n${serverOutput}`);
  }

  console.log("\n[TEST 1] Server boot confirmed!");

  // Probing GET /health
  console.log("\n[TEST 2] Probing GET /health...");
  const healthRes = await fetchUrl(`${BASE_URL}/health`);
  console.log(`Status Code: ${healthRes.status}`);
  console.log("Response JSON:", JSON.stringify(healthRes.json, null, 2));
  console.log("RateLimit Headers:", {
    limit: healthRes.headers["ratelimit-limit"],
    remaining: healthRes.headers["ratelimit-remaining"],
    reset: healthRes.headers["ratelimit-reset"],
  });

  if (healthRes.status !== 200) {
    throw new Error(`Expected HTTP 200 on /health, received ${healthRes.status}`);
  }
  if (!healthRes.json || healthRes.json.ok !== true) {
    throw new Error(`Expected { ok: true } in health response`);
  }
  if (!healthRes.json.database || healthRes.json.database.connected !== false || healthRes.json.database.error !== "unreachable") {
    throw new Error(`Expected database: { connected: false, error: "unreachable" }, got: ${JSON.stringify(healthRes.json.database)}`);
  }
  console.log("-> TEST 2 PASSED: GET /health returned 200 OK with graceful offline DB status!");

  // Probing Socket.IO endpoint
  console.log("\n[TEST 3] Probing Socket.IO Engine.IO handshake...");
  const socketRes = await fetchUrl(`${BASE_URL}/socket.io/?EIO=4&transport=polling`);
  console.log(`Socket Handshake Status: ${socketRes.status}`);
  console.log(`Socket Handshake Body: ${socketRes.body}`);

  if (socketRes.status !== 200 || !socketRes.body.startsWith("0{")) {
    throw new Error(`Expected Socket.io Engine.IO packet 0{...}, got: ${socketRes.body}`);
  }
  console.log("-> TEST 3 PASSED: Socket.IO initialized and accepted connection handshake!");

  // Testing Rate Limiter (authLimiter on /api/auth/login)
  console.log("\n[TEST 4] Testing Rate Limiting on /api/auth/login (limit: 20)...");
  let rateLimitHit = false;
  let attemptCount = 0;
  for (let i = 1; i <= 25; i++) {
    attemptCount = i;
    const res = await fetchUrl(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { email: "test@example.com", password: "wrongpassword" },
    });
    if (res.status === 429) {
      rateLimitHit = true;
      console.log(`Request #${i} hit Rate Limit (HTTP 429)! Body: ${res.body.trim()}`);
      console.log("RateLimit Headers on 429:", {
        limit: res.headers["ratelimit-limit"],
        remaining: res.headers["ratelimit-remaining"],
        retryAfter: res.headers["retry-after"],
      });
      break;
    }
  }

  if (!rateLimitHit) {
    throw new Error(`authLimiter did not trigger HTTP 429 after 25 requests!`);
  }
  console.log("-> TEST 4 PASSED: Rate limiter actively blocked excess requests with HTTP 429!");

  // Testing clean shutdown
  console.log("\n[TEST 5] Testing server shutdown & port release...");
  const exitPromise = new Promise((resolve) => {
    serverProcess.on("close", (code, signal) => {
      resolve({ code, signal });
    });
  });

  serverProcess.kill();
  const exitResult = await exitPromise;
  console.log(`Server process exited with code: ${exitResult.code}, signal: ${exitResult.signal}`);

  await wait(500);
  const portFreeAfter = await checkPortFree(TEST_PORT);
  console.log(`Port ${TEST_PORT} released and free after shutdown: ${portFreeAfter}`);

  if (!portFreeAfter) {
    throw new Error(`Port ${TEST_PORT} was NOT released after server shutdown!`);
  }
  console.log("-> TEST 5 PASSED: Server terminated cleanly and port freed!");

  console.log("\n=== ALL EMPIRICAL VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
}

run().catch((err) => {
  console.error("VERIFICATION FAILURE:", err);
  process.exit(1);
});
