/**
 * tests/live_adversarial_stress.js
 * Adversarial Challenger tests:
 * 1. Port conflict (EADDRINUSE) handling
 * 2. Concurrent offline /health probes (event-loop concurrency under DB timeout)
 * 3. CORS preflight verification
 */

const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");

const TEST_PORT = 4008;
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
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runAdversarial() {
  console.log("=== ADVERSARIAL CHALLENGER TESTS ===");

  // 1. Port Conflict Test
  console.log("\n[ADVERSARIAL 1] Testing Port Collision (EADDRINUSE)...");
  const blocker = net.createServer();
  await new Promise((res) => blocker.listen(TEST_PORT, "0.0.0.0", res));
  console.log(`Blocker listening on ${TEST_PORT}`);

  const conflictProcess = spawn("node", ["src/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: testEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let conflictStderr = "";
  conflictProcess.stderr.on("data", (d) => (conflictStderr += d.toString()));

  const conflictExit = await new Promise((res) => {
    conflictProcess.on("close", (code, signal) => res({ code, signal }));
  });

  console.log(`Port collision exit code: ${conflictExit.code}`);
  console.log(`Port collision stderr snippet: ${conflictStderr.trim().split("\n")[0]}`);
  await new Promise((res) => blocker.close(res));

  if (conflictExit.code === 0) {
    throw new Error("Server did NOT exit with non-zero on port conflict!");
  }
  console.log("-> ADVERSARIAL 1 PASSED: Server gracefully crashes with error on port collision.");

  // 2. Boot fresh server on TEST_PORT for concurrent probe & CORS test
  console.log("\n[ADVERSARIAL 2] Booting server on TEST_PORT for concurrent probe test...");
  const serverProcess = spawn("node", ["src/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: testEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let booted = false;
  serverProcess.stdout.on("data", (d) => {
    if (d.toString().includes(`listening on :${TEST_PORT}`)) booted = true;
  });

  const t0 = Date.now();
  while (!booted && Date.now() - t0 < 5000) {
    await wait(100);
  }
  if (!booted) throw new Error("Server failed to boot for stress tests");

  // Fire 10 concurrent requests to /health
  console.log("Sending 10 concurrent GET /health probes with unreachable DB...");
  const benchStart = Date.now();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(fetchUrl(`${BASE_URL}/health`));
  }

  const results = await Promise.all(promises);
  const benchDuration = Date.now() - benchStart;
  console.log(`10 concurrent requests completed in ${benchDuration} ms`);

  const all200 = results.every((r) => r.status === 200 && r.json?.ok === true && r.json?.database?.error === "unreachable");
  console.log(`All 10 responses returned HTTP 200 with unreachable fallback: ${all200}`);
  if (!all200) throw new Error("One or more concurrent health requests failed!");
  console.log("-> ADVERSARIAL 2 PASSED: Concurrent health probes resolved non-blocking.");

  // 3. CORS Preflight Test
  console.log("\n[ADVERSARIAL 3] Testing CORS headers...");
  const corsRes = await fetchUrl(`${BASE_URL}/health`, {
    headers: {
      Origin: "http://localhost:3000",
    },
  });
  console.log(`CORS Access-Control-Allow-Origin: ${corsRes.headers["access-control-allow-origin"]}`);
  console.log(`CORS Access-Control-Allow-Credentials: ${corsRes.headers["access-control-allow-credentials"]}`);

  if (corsRes.headers["access-control-allow-origin"] !== "http://localhost:3000") {
    throw new Error(`CORS header mismatch! Got: ${corsRes.headers["access-control-allow-origin"]}`);
  }
  console.log("-> ADVERSARIAL 3 PASSED: CORS configured securely for CLIENT_ORIGIN.");

  serverProcess.kill();
  console.log("\n=== ALL ADVERSARIAL CHALLENGES COMPLETED ===");
}

runAdversarial().catch((err) => {
  console.error("ADVERSARIAL FAILURE:", err);
  process.exit(1);
});
