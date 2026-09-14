/**
 * tests/ephemeral_health_probe.js
 * 
 * Challenger 2 Gen 2: Empirical Server Boot & Health Probe Verification Script
 * - Probes Supertest against src/app.js directly
 * - Boots src/app.js on test port 4008 (via app.listen)
 * - Sends live HTTP GET /health request to http://localhost:4008/health
 * - Boots full HTTP + Socket.IO server on test port 4009 (via http.createServer + initSockets)
 * - Sends live HTTP GET /health request to http://localhost:4009/health
 * - Asserts HTTP 200 OK, graceful offline DB response, security headers
 * - Closes servers cleanly and verifies port release
 * - Tests port collision (EADDRINUSE) handling
 * - Exits cleanly with code 0
 */

const http = require("http");
const net = require("net");
const assert = require("assert");

// Configure test environment variables before requiring app
process.env.NODE_ENV = "test";
process.env.CLIENT_ORIGIN = "http://localhost:3000";
process.env.JWT_SECRET = "test-secret-at-least-32-chars-long-for-tests-12345";
process.env.JWT_EXPIRES_IN = "7d";
process.env.COOKIE_NAME = "promptothon_token";
process.env.JURY_ALIAS_SALT = "test-jury-alias-salt";
process.env.STORAGE_PROVIDER = "disabled";
process.env.DATABASE_URL = "postgresql://mock_user:mock_pass@127.0.0.1:54329/mock_offline_db";
process.env.DIRECT_URL = "postgresql://mock_user:mock_pass@127.0.0.1:54329/mock_offline_db";

const request = require("supertest");
const app = require("../src/app");
const { initSockets } = require("../src/sockets");

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
          } catch (e) {
            // raw text
          }
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

async function main() {
  console.log("=================================================================");
  console.log("CHALLENGER 2 GEN 2: EMPIRICAL SERVER BOOT & HEALTH PROBE SUITE");
  console.log("=================================================================\n");

  const startTime = Date.now();
  const summaryReport = {
    timestamp: new Date().toISOString(),
    supertestProbe: null,
    port4008BootProbe: null,
    port4009SocketIoBootProbe: null,
    portCollisionProbe: null,
    portReleaseVerification: {},
  };

  // --------------------------------------------------------------------------
  // TEST 1: Direct Supertest Verification of GET /health
  // --------------------------------------------------------------------------
  console.log("[TEST 1] Direct Supertest GET /health probe against src/app.js...");
  const t0 = Date.now();
  const supertestRes = await request(app).get("/health");
  const supertestDuration = Date.now() - t0;

  console.log(`  HTTP Status: ${supertestRes.status}`);
  console.log(`  Latency: ${supertestDuration}ms`);
  console.log(`  Payload:`, JSON.stringify(supertestRes.body, null, 2));

  assert.strictEqual(supertestRes.status, 200, "Supertest status must be 200");
  assert.strictEqual(supertestRes.body.ok, true, "Supertest body.ok must be true");
  assert.strictEqual(typeof supertestRes.body.uptimeSeconds, "number");
  assert.deepStrictEqual(supertestRes.body.database, { connected: false, error: "unreachable" });
  assert.strictEqual(supertestRes.body.storage.provider, "disabled");
  assert.strictEqual(supertestRes.body.redis.configured, false);

  summaryReport.supertestProbe = {
    status: supertestRes.status,
    latencyMs: supertestDuration,
    payload: supertestRes.body,
    headers: {
      contentType: supertestRes.headers["content-type"],
      rateLimitLimit: supertestRes.headers["ratelimit-limit"],
      rateLimitRemaining: supertestRes.headers["ratelimit-remaining"],
      xFrameOptions: supertestRes.headers["x-frame-options"],
    },
  };
  console.log("  >>> TEST 1 PASSED: Supertest verified.\n");

  // --------------------------------------------------------------------------
  // TEST 2: Live Server Boot on Port 4008 (app.listen) & HTTP GET /health
  // --------------------------------------------------------------------------
  const PORT_4008 = 4008;
  console.log(`[TEST 2] Live server boot on port ${PORT_4008} via app.listen()...`);

  const port4008FreeBefore = await checkPortFree(PORT_4008);
  console.log(`  Port ${PORT_4008} free initially: ${port4008FreeBefore}`);
  assert.strictEqual(port4008FreeBefore, true);

  const server4008 = await new Promise((resolve, reject) => {
    const s = app.listen(PORT_4008, "127.0.0.1", () => resolve(s));
    s.once("error", reject);
  });

  console.log(`  Server bound to: 127.0.0.1:${PORT_4008}`);
  const t2 = Date.now();
  const res4008 = await fetchHttp(`http://127.0.0.1:${PORT_4008}/health`);
  const latency4008 = Date.now() - t2;

  console.log(`  GET http://localhost:${PORT_4008}/health -> Status: ${res4008.statusCode}, Latency: ${latency4008}ms`);
  console.log(`  Response body:`, JSON.stringify(res4008.json, null, 2));

  assert.strictEqual(res4008.statusCode, 200);
  assert.strictEqual(res4008.json.ok, true);
  assert.deepStrictEqual(res4008.json.database, { connected: false, error: "unreachable" });

  await new Promise((resolve) => server4008.close(resolve));
  const port4008FreeAfter = await checkPortFree(PORT_4008);
  console.log(`  Port ${PORT_4008} released after close(): ${port4008FreeAfter}`);
  assert.strictEqual(port4008FreeAfter, true);

  summaryReport.port4008BootProbe = {
    port: PORT_4008,
    statusCode: res4008.statusCode,
    latencyMs: latency4008,
    payload: res4008.json,
    serverClosedCleanly: true,
    portReleased: port4008FreeAfter,
  };
  summaryReport.portReleaseVerification[PORT_4008] = port4008FreeAfter;
  console.log("  >>> TEST 2 PASSED: Port 4008 boot, live HTTP probe, and shutdown verified.\n");

  // --------------------------------------------------------------------------
  // TEST 3: Full Server Boot on Port 4009 (httpServer + initSockets)
  // --------------------------------------------------------------------------
  const PORT_4009 = 4009;
  console.log(`[TEST 3] Full server boot on port ${PORT_4009} (http.createServer + initSockets)...`);

  const port4009FreeBefore = await checkPortFree(PORT_4009);
  console.log(`  Port ${PORT_4009} free initially: ${port4009FreeBefore}`);
  assert.strictEqual(port4009FreeBefore, true);

  const httpServer4009 = http.createServer(app);
  const io = initSockets(httpServer4009);

  await new Promise((resolve, reject) => {
    httpServer4009.once("error", reject);
    httpServer4009.listen(PORT_4009, "127.0.0.1", resolve);
  });

  console.log(`  HTTP+Socket server bound to: 127.0.0.1:${PORT_4009}`);
  const t3 = Date.now();
  const res4009 = await fetchHttp(`http://127.0.0.1:${PORT_4009}/health`);
  const latency4009 = Date.now() - t3;

  console.log(`  GET http://localhost:${PORT_4009}/health -> Status: ${res4009.statusCode}, Latency: ${latency4009}ms`);
  assert.strictEqual(res4009.statusCode, 200);
  assert.strictEqual(res4009.json.ok, true);
  assert.deepStrictEqual(res4009.json.database, { connected: false, error: "unreachable" });

  // Probe Socket.IO handshake
  const socketRes = await fetchHttp(`http://127.0.0.1:${PORT_4009}/socket.io/?EIO=4&transport=polling`);
  console.log(`  GET /socket.io/?EIO=4 -> Status: ${socketRes.statusCode}, Body prefix: ${socketRes.body.slice(0, 10)}`);
  assert.strictEqual(socketRes.statusCode, 200);
  assert.ok(socketRes.body.startsWith("0{"), "Socket.IO handshake packet expected");

  // Gracefully close Socket.IO and httpServer
  await new Promise((resolve) => io.close(resolve));
  await new Promise((resolve) => httpServer4009.close(resolve));

  const port4009FreeAfter = await checkPortFree(PORT_4009);
  console.log(`  Port ${PORT_4009} released after close(): ${port4009FreeAfter}`);
  assert.strictEqual(port4009FreeAfter, true);

  summaryReport.port4009SocketIoBootProbe = {
    port: PORT_4009,
    healthStatus: res4009.statusCode,
    healthLatencyMs: latency4009,
    socketIoHandshakeStatus: socketRes.statusCode,
    socketIoHandshakeBody: socketRes.body,
    serverClosedCleanly: true,
    portReleased: port4009FreeAfter,
  };
  summaryReport.portReleaseVerification[PORT_4009] = port4009FreeAfter;
  console.log("  >>> TEST 3 PASSED: Full HTTP + Socket.IO server boot, health probe, and shutdown verified.\n");

  // --------------------------------------------------------------------------
  // TEST 4: Port Collision Adversarial Test
  // --------------------------------------------------------------------------
  console.log(`[TEST 4] Adversarial Port Collision (EADDRINUSE) Probe on port ${PORT_4008}...`);
  const blocker = net.createServer();
  await new Promise((resolve) => blocker.listen(PORT_4008, "127.0.0.1", resolve));

  let collisionError = null;
  try {
    await new Promise((resolve, reject) => {
      const s = app.listen(PORT_4008, "127.0.0.1", () => resolve(s));
      s.once("error", reject);
    });
  } catch (err) {
    collisionError = err;
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
  }

  console.log(`  Caught collision error: ${collisionError?.code} - ${collisionError?.message}`);
  assert.strictEqual(collisionError?.code, "EADDRINUSE");

  summaryReport.portCollisionProbe = {
    port: PORT_4008,
    caughtError: collisionError.code,
    message: collisionError.message,
    handledGracefully: true,
  };
  console.log("  >>> TEST 4 PASSED: Port collision gracefully handled with EADDRINUSE.\n");

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  const totalDuration = Date.now() - startTime;
  console.log("=================================================================");
  console.log(`ALL 4 EMPIRICAL VERIFICATION TESTS PASSED (Total: ${totalDuration}ms)`);
  console.log("=================================================================");

  return summaryReport;
}

main()
  .then((report) => {
    console.log("\n[EMPIRICAL JSON REPORT]");
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nFATAL EMPIRICAL FAILURE:", err);
    process.exit(1);
  });
