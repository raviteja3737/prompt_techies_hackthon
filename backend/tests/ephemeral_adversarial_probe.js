/**
 * tests/ephemeral_adversarial_probe.js
 * 
 * Challenger 2 Gen 2: Adversarial Stress & Security Probe
 * 1. Rapid concurrent requests to GET /health under offline DB conditions
 * 2. Secret & credential leak audit on /health payload
 * 3. CORS behavior with trusted vs untrusted origins
 * 4. 404 not-found handling and error schema format
 */

const http = require("http");
const assert = require("assert");

process.env.NODE_ENV = "test";
process.env.CLIENT_ORIGIN = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://mock_user:secret_password_must_not_leak@127.0.0.1:54329/mock_offline_db";
process.env.JWT_SECRET = "super-secret-jwt-key-must-not-leak";

const request = require("supertest");
const app = require("../src/app");

function fetchHttp(url, options = {}) {
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
          } catch (e) {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            json,
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function runAdversarial() {
  console.log("=================================================================");
  console.log("CHALLENGER 2 GEN 2: ADVERSARIAL STRESS & SECURITY HARNESS");
  console.log("=================================================================\n");

  const adversarialResults = {};

  // --------------------------------------------------------------------------
  // STRESS TEST 1: Secret Leak Audit on /health
  // --------------------------------------------------------------------------
  console.log("[ADVERSARIAL 1] Checking /health for secret/credential leakage...");
  const healthRes = await request(app).get("/health");
  const rawResponseString = JSON.stringify(healthRes.body);

  const containsDbPassword = rawResponseString.includes("secret_password_must_not_leak");
  const containsJwtSecret = rawResponseString.includes("super-secret-jwt-key-must-not-leak");
  const containsDbUrl = rawResponseString.includes("postgresql://");

  console.log(`  Contains DB password: ${containsDbPassword}`);
  console.log(`  Contains JWT secret: ${containsJwtSecret}`);
  console.log(`  Contains DB URL: ${containsDbUrl}`);

  assert.strictEqual(containsDbPassword, false, "DB password leaked in /health response!");
  assert.strictEqual(containsJwtSecret, false, "JWT secret leaked in /health response!");
  assert.strictEqual(containsDbUrl, false, "DATABASE_URL leaked in /health response!");

  // Verify only allowed keys
  const allowedTopKeys = ["ok", "uptimeSeconds", "database", "storage", "redis"];
  const actualKeys = Object.keys(healthRes.body);
  const unauthorizedKeys = actualKeys.filter((k) => !allowedTopKeys.includes(k));
  console.log(`  Top-level keys in response: ${actualKeys.join(", ")}`);
  assert.strictEqual(unauthorizedKeys.length, 0, `Unauthorized keys found: ${unauthorizedKeys}`);

  adversarialResults.secretLeakAudit = {
    passed: true,
    keysExposed: actualKeys,
    credentialsLeaked: false,
  };
  console.log("  >>> ADVERSARIAL 1 PASSED: Zero secret leaks in /health payload.\n");

  // --------------------------------------------------------------------------
  // STRESS TEST 2: CORS Header Behavior (Allowed vs Malicious Origin)
  // --------------------------------------------------------------------------
  console.log("[ADVERSARIAL 2] Testing CORS policy enforcement...");

  // Allowed origin
  const allowedCorsRes = await request(app)
    .get("/health")
    .set("Origin", "http://localhost:3000");

  console.log(`  Allowed origin header returned: ${allowedCorsRes.headers["access-control-allow-origin"]}`);
  assert.strictEqual(allowedCorsRes.headers["access-control-allow-origin"], "http://localhost:3000");
  assert.strictEqual(allowedCorsRes.headers["access-control-allow-credentials"], "true");

  // Malicious / unauthorized origin
  const untrustedCorsRes = await request(app)
    .get("/health")
    .set("Origin", "https://malicious-phishing-site.example.com");

  console.log(`  Untrusted origin header returned: ${untrustedCorsRes.headers["access-control-allow-origin"]}`);
  // Express cors with string origin returns the configured origin, not the untrusted origin
  assert.notStrictEqual(
    untrustedCorsRes.headers["access-control-allow-origin"],
    "https://malicious-phishing-site.example.com",
    "CORS allowed an untrusted origin!"
  );

  adversarialResults.corsEnforcement = {
    passed: true,
    trustedOriginReflected: allowedCorsRes.headers["access-control-allow-origin"],
    untrustedOriginBlocked: true,
  };
  console.log("  >>> ADVERSARIAL 2 PASSED: CORS correctly isolates trusted CLIENT_ORIGIN.\n");

  // --------------------------------------------------------------------------
  // STRESS TEST 3: Concurrent Health Probes under Offline DB
  // --------------------------------------------------------------------------
  const CONCURRENT_PORT = 4012;
  console.log(`[ADVERSARIAL 3] Testing 5 concurrent live HTTP health probes on port ${CONCURRENT_PORT}...`);
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(CONCURRENT_PORT, "127.0.0.1", () => resolve(s));
    s.once("error", reject);
  });

  const tStart = Date.now();
  const probePromises = [1, 2, 3, 4, 5].map((idx) =>
    fetchHttp(`http://127.0.0.1:${CONCURRENT_PORT}/health`).then((res) => ({
      index: idx,
      status: res.statusCode,
      ok: res.json?.ok,
      dbStatus: res.json?.database,
    }))
  );

  const probeResults = await Promise.all(probePromises);
  const totalConcurrentDuration = Date.now() - tStart;
  console.log(`  5 concurrent requests completed in ${totalConcurrentDuration}ms`);
  probeResults.forEach((r) => {
    console.log(`    Request #${r.index} -> Status: ${r.status}, DB error: ${r.dbStatus?.error}`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.dbStatus?.connected, false);
    assert.strictEqual(r.dbStatus?.error, "unreachable");
  });

  await new Promise((resolve) => server.close(resolve));

  adversarialResults.concurrentProbes = {
    concurrency: 5,
    totalDurationMs: totalConcurrentDuration,
    allPassedWith200: true,
  };
  console.log("  >>> ADVERSARIAL 3 PASSED: Concurrent probes non-blocking and resilient.\n");

  // --------------------------------------------------------------------------
  // STRESS TEST 4: 404 Handler & Error Uniformity
  // --------------------------------------------------------------------------
  console.log("[ADVERSARIAL 4] Testing 404 Not Found handling...");
  const notFoundRes = await request(app).get("/api/completely-unknown-endpoint");
  console.log(`  404 status: ${notFoundRes.status}`);
  console.log(`  404 body:`, notFoundRes.body);

  assert.strictEqual(notFoundRes.status, 404);
  assert.strictEqual(notFoundRes.body.error, "Route not found.");

  adversarialResults.notFoundHandler = {
    status: notFoundRes.status,
    body: notFoundRes.body,
  };
  console.log("  >>> ADVERSARIAL 4 PASSED: Clean 404 JSON response returned.\n");

  return adversarialResults;
}

runAdversarial()
  .then((results) => {
    console.log("[ADVERSARIAL SUITE SUMMARY]");
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("ADVERSARIAL FAILURE:", err);
    process.exit(1);
  });
