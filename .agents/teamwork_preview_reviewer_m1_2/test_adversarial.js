const path = require("path");
const backendPath = path.resolve(__dirname, "../../backend");
require("dotenv").config({ path: path.join(backendPath, ".env") });

const jwt = require(path.join(backendPath, "node_modules/jsonwebtoken"));
const request = require(path.join(backendPath, "node_modules/supertest"));

const app = require(path.join(backendPath, "src/app"));
const prisma = require(path.join(backendPath, "src/config/prisma"));

async function runAdversarialProbes() {
  console.log("=== STARTING ADVERSARIAL STRESS PROBES ===");
  const secret = process.env.JWT_SECRET || "promptothon-super-secret-jwt-key-2026-production";

  // 1. Check user accounts in DB
  const admin = await prisma.user.findUnique({ where: { email: "admin@promptothon.dev" } });
  const alphaLeader = await prisma.user.findUnique({ where: { email: "alpha.leader@promptothon.dev" } });
  const solo1 = await prisma.user.findUnique({ where: { email: "solo1@promptothon.dev" } });

  const adminToken = jwt.sign({ sub: admin.id, role: admin.role }, secret, { expiresIn: "1h" });
  const leaderToken = jwt.sign({ sub: alphaLeader.id, role: alphaLeader.role }, secret, { expiresIn: "1h" });
  const soloToken = jwt.sign({ sub: solo1.id, role: solo1.role }, secret, { expiresIn: "1h" });

  // Probe 1: Track lock with invalid trackId
  const lockRes = await request(app)
    .post("/api/team/track-lock")
    .set("Authorization", `Bearer ${leaderToken}`)
    .send({ trackId: "non-existent-track-cuid-9999" });
  console.log("PROBE 1 - Track Lock with invalid trackId -> Status:", lockRes.status, "Body:", lockRes.body);

  // Probe 2: Team join with invalid invite code
  const joinRes = await request(app)
    .post("/api/team/join")
    .set("Authorization", `Bearer ${soloToken}`)
    .send({ inviteCode: "NONEXISTENT_CODE" });
  console.log("PROBE 2 - Team Join with invalid invite code -> Status:", joinRes.status, "Body:", joinRes.body);

  // Probe 3: Prisma constraint violation - attempt to insert duplicate team inviteCode directly
  let caughtPrismaError = null;
  try {
    await prisma.team.create({
      data: {
        name: "Conflicting Team",
        inviteCode: "PRMPT-ALPHA1", // already exists for Team Alpha
        leaderId: solo1.id,
      },
    });
  } catch (err) {
    caughtPrismaError = { code: err.code, name: err.name, meta: err.meta };
  }
  console.log("PROBE 3 - Direct Prisma Unique Constraint Violation -> Code:", caughtPrismaError?.code, "Target:", caughtPrismaError?.meta?.target);

  // Probe 4: Foreign key constraint violation - insert TeamMember with nonexistent userId
  let caughtFkError = null;
  try {
    await prisma.teamMember.create({
      data: {
        userId: "cuid-not-real-at-all",
        teamId: "cmu0t0rtl000addmp2324w3kp",
        role: "MEMBER",
      },
    });
  } catch (err) {
    caughtFkError = { code: err.code, name: err.name, meta: err.meta };
  }
  console.log("PROBE 4 - Foreign Key Violation -> Code:", caughtFkError?.code, "Field:", caughtFkError?.meta?.field_name);

  // Probe 5: Health Check when Prisma.$queryRaw fails
  // Temporarily stub $queryRaw to throw database disconnected error
  const originalQueryRaw = prisma.$queryRaw;
  prisma.$queryRaw = async () => {
    throw new Error("Simulated DB socket timeout / connection refused");
  };
  const healthFailureRes = await request(app).get("/health");
  console.log("PROBE 5 - Health Check DB Outage Response -> Status:", healthFailureRes.status, "Body:", healthFailureRes.body);
  prisma.$queryRaw = originalQueryRaw; // restore

  // Probe 6: Live HTTP probe to running daemon on port 4000
  const http = require("http");
  const liveHealth = await new Promise((resolve, reject) => {
    http.get("http://localhost:4000/health", (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on("error", reject);
  });
  console.log("PROBE 6 - Live HTTP request to port 4000 daemon -> Status:", liveHealth.status, "Body:", liveHealth.body);

  console.log("=== ADVERSARIAL STRESS PROBES COMPLETED ===");
  await prisma.$disconnect();
}

runAdversarialProbes().catch((err) => {
  console.error("Adversarial probes failed with error:", err);
  process.exit(1);
});
