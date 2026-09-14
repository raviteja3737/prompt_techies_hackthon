const path = require("path");
const bcrypt = require(path.resolve(__dirname, "../../backend/node_modules/bcryptjs"));
const { PrismaClient } = require(path.resolve(__dirname, "../../backend/node_modules/@prisma/client"));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:password123@localhost:5432/promptothon?schema=public",
    },
  },
});

async function main() {
  console.log("=== FORENSIC DATABASE AUDIT ===");

  // 1. Table row counts
  const counts = {
    User: await prisma.user.count(),
    Track: await prisma.track.count(),
    Team: await prisma.team.count(),
    TeamMember: await prisma.teamMember.count(),
    Submission: await prisma.submission.count(),
    JuryAssignment: await prisma.juryAssignment.count(),
    Evaluation: await prisma.evaluation.count(),
    Announcement: await prisma.announcement.count(),
    SystemSetting: await prisma.systemSetting.count(),
    AuditLog: await prisma.auditLog.count(),
    Notification: await prisma.notification.count(),
    Connection: await prisma.connection.count(),
    MagicLinkToken: await prisma.magicLinkToken.count(),
  };
  console.log("\n--- Table Counts ---");
  console.log(JSON.stringify(counts, null, 2));

  // 2. Query seed users and verify bcrypt hashes
  console.log("\n--- Bcrypt Password Verifications ---");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, isSolo: true, passwordHash: true },
  });
  console.log(`Retrieved ${users.length} users from database.`);

  const passwordTests = [
    { email: "admin@promptothon.dev", testPass: "ChangeMe123!", expected: true },
    { email: "admin@promptothon.dev", testPass: "WrongPassword!", expected: false },
    { email: "admin@promptothon.dev", testPass: "Password123!", expected: false },
    { email: "jury1@promptothon.dev", testPass: "Password123!", expected: true },
    { email: "jury1@promptothon.dev", testPass: "WrongPass", expected: false },
    { email: "jury2@promptothon.dev", testPass: "Password123!", expected: true },
    { email: "jury3@promptothon.dev", testPass: "Password123!", expected: true },
    { email: "solo1@promptothon.dev", testPass: "Password123!", expected: true },
    { email: "alpha.leader@promptothon.dev", testPass: "Password123!", expected: true },
    { email: "alpha.member1@promptothon.dev", testPass: "Password123!", expected: true },
    { email: "beta.leader@promptothon.dev", testPass: "Password123!", expected: true },
    { email: "gamma.leader@promptothon.dev", testPass: "Password123!", expected: true },
  ];

  let bcryptPassed = true;
  for (const test of passwordTests) {
    const user = users.find((u) => u.email === test.email);
    if (!user) {
      console.error(`FAIL: User ${test.email} not found!`);
      bcryptPassed = false;
      continue;
    }
    const match = await bcrypt.compare(test.testPass, user.passwordHash);
    const pass = match === test.expected;
    if (!pass) {
      bcryptPassed = false;
      console.error(`FAIL: Password match for ${test.email} with '${test.testPass}' was ${match}, expected ${test.expected}`);
    } else {
      console.log(`PASS: ${test.email} -> '${test.testPass}' match=${match} (expected: ${test.expected})`);
    }
  }

  // 3. Relational integrity checks
  console.log("\n--- Relational Integrity Checks ---");
  const teams = await prisma.team.findMany({
    include: {
      members: { include: { user: true } },
      track: true,
      submission: true,
      evaluations: true,
      juryAssignments: {
        include: {
          jury: true,
        },
      },
    },
  });

  let relationsValid = true;
  for (const team of teams) {
    console.log(`\nTeam: ${team.name} (id: ${team.id}, inviteCode: ${team.inviteCode}, track: ${team.track ? team.track.name : "none"})`);
    console.log(`  Members count: ${team.members.length}`);
    for (const m of team.members) {
      if (!m.user) {
        console.error(`  FAIL: TeamMember ${m.id} has no linked user!`);
        relationsValid = false;
      } else {
        console.log(`  - Member: ${m.user.name} (${m.user.email}) Role: ${m.role}`);
      }
    }
    if (team.submission) {
      console.log(`  Submission: status=${team.submission.status}, title=${team.submission.title}`);
    } else {
      console.log(`  Submission: none`);
    }
    console.log(`  Jury Assignments: ${team.juryAssignments.length}`);
    for (const ja of team.juryAssignments) {
      console.log(`  - Assigned Jury: ${ja.jury ? ja.jury.email : "none"}`);
    }
    console.log(`  Evaluations: ${team.evaluations.length}`);
    for (const ev of team.evaluations) {
      console.log(`  - Evaluation: status=${ev.status}, totalScore=${ev.totalScore}, notes=${ev.notes}`);
    }
  }

  // 4. Announcements check
  console.log("\n--- Announcements ---");
  const announcements = await prisma.announcement.findMany({
    include: { author: true },
  });
  for (const a of announcements) {
    console.log(`- [${a.priority}] ${a.title} by ${a.author ? a.author.email : "system"}`);
  }

  // 5. System Settings
  console.log("\n--- System Settings ---");
  const settings = await prisma.systemSetting.findMany();
  console.log(JSON.stringify(settings, null, 2));

  console.log("\n=== AUDIT SUMMARY ===");
  console.log("Bcrypt checks:", bcryptPassed ? "ALL PASSED" : "FAILED");
  console.log("Relational integrity:", relationsValid ? "ALL PASSED" : "FAILED");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
