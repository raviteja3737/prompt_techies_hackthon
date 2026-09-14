require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

// Every non-admin seed account shares one password so the dataset is easy
// to log in with locally. Never hardcoded — if SEED_PASSWORD isn't set we
// generate a random one for this run only and print it once.
const SEED_PASSWORD = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString("base64url");

async function ensureUser({ email, name, role = "PARTICIPANT", password, ...rest }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password || SEED_PASSWORD, 10);
  return prisma.user.create({ data: { email, name, role, passwordHash, ...rest } });
}

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap.");
    return null;
  }
  const admin = await ensureUser({ email, name: "Admin", role: "ADMIN", password });
  console.log(`[seed] Admin ready: ${admin.email}`);
  return admin;
}

async function ensureTrack({ title, description, guidelines, datasetUrl }) {
  const existing = await prisma.track.findFirst({ where: { title } });
  if (existing) return existing;
  return prisma.track.create({ data: { title, description, guidelines, datasetUrl } });
}

/** Creates a team + leader (and optional extra members) atomically, or returns the existing team by name. */
async function ensureTeam({ name, inviteCode, leaderEmail, leaderName, extraMembers = [], trackId, lockTrack }) {
  const existing = await prisma.team.findFirst({ where: { name } });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const leaderHash = await bcrypt.hash(SEED_PASSWORD, 10);
    const leader = await tx.user.upsert({
      where: { email: leaderEmail },
      update: {},
      create: { email: leaderEmail, name: leaderName, role: "PARTICIPANT", passwordHash: leaderHash },
    });

    const team = await tx.team.create({
      data: {
        name,
        inviteCode,
        leaderId: leader.id,
        memberCount: 1 + extraMembers.length,
        trackId: lockTrack ? trackId : undefined,
        trackLockedAt: lockTrack ? new Date() : undefined,
        members: { create: { userId: leader.id, role: "LEADER" } },
      },
    });

    for (const member of extraMembers) {
      const memberHash = await bcrypt.hash(SEED_PASSWORD, 10);
      const memberUser = await tx.user.upsert({
        where: { email: member.email },
        update: {},
        create: { email: member.email, name: member.name, role: "PARTICIPANT", passwordHash: memberHash },
      });
      await tx.teamMember.create({ data: { teamId: team.id, userId: memberUser.id, role: "MEMBER" } });
    }

    return team;
  });
}

async function ensureAssignment({ juryId, teamId, trackId }) {
  const existing = await prisma.juryAssignment.findUnique({ where: { juryId_teamId: { juryId, teamId } } });
  if (existing) return existing;
  return prisma.juryAssignment.create({ data: { juryId, teamId, trackId } });
}

async function ensureEvaluation({ teamId, juryId, innovation, technical, design, viability, feedback, locked }) {
  const existing = await prisma.evaluation.findUnique({ where: { teamId_juryId: { teamId, juryId } } });
  if (existing) return existing;
  return prisma.evaluation.create({
    data: {
      teamId,
      juryId,
      innovation,
      technical,
      design,
      viability,
      feedback,
      status: locked ? "LOCKED" : "DRAFT",
      lockedAt: locked ? new Date() : null,
    },
  });
}

async function main() {
  await ensureAdmin();

  await prisma.systemSetting.upsert({
    where: { key: "scoresFrozen" },
    create: { key: "scoresFrozen", value: false },
    update: {},
  });

  const healthcareTrack = await ensureTrack({
    title: "AI Agents for Healthcare",
    description: "Build an AI agent that assists patients or clinicians with a real healthcare workflow.",
    guidelines: "Must use at least one LLM call and handle at least one realistic failure mode gracefully.",
    datasetUrl: "https://example.com/datasets/healthcare-sample.csv",
  });

  const fintechTrack = await ensureTrack({
    title: "Sustainable Fintech",
    description: "Build a tool that nudges users or businesses toward more sustainable financial decisions.",
    guidelines: "Include at least one chart or visualization of impact.",
    datasetUrl: "https://example.com/datasets/fintech-sample.csv",
  });

  const jury1 = await ensureUser({ email: "jury1@promptothon.dev", name: "Dr. Asha Rao", role: "JURY" });
  const jury2 = await ensureUser({ email: "jury2@promptothon.dev", name: "Marcus Webb", role: "JURY" });
  await ensureUser({ email: "jury3@promptothon.dev", name: "Priya Nathan", role: "JURY" });

  // A checked-in solo participant, discoverable via the networking directory.
  await ensureUser({
    email: "solo1@promptothon.dev",
    name: "Jordan Lee",
    isSolo: true,
    checkedInAt: new Date(),
    college: "State University",
    skills: ["Python", "PyTorch"],
  });

  const teamAlpha = await ensureTeam({
    name: "Team Alpha",
    inviteCode: "PRMPT-ALPHA1",
    leaderEmail: "alpha.leader@promptothon.dev",
    leaderName: "Sam Alpha",
    extraMembers: [{ email: "alpha.member1@promptothon.dev", name: "Riya Alpha" }],
    trackId: healthcareTrack.id,
    lockTrack: true,
  });

  const teamBeta = await ensureTeam({
    name: "Team Beta",
    inviteCode: "PRMPT-BETA01",
    leaderEmail: "beta.leader@promptothon.dev",
    leaderName: "Beta Leader",
    extraMembers: [],
    trackId: fintechTrack.id,
    lockTrack: true,
  });

  // A team that hasn't locked a track yet — useful for testing "lock a
  // track before submitting" and "only 1 member so far" flows.
  await ensureTeam({
    name: "Team Gamma",
    inviteCode: "PRMPT-GAMMA1",
    leaderEmail: "gamma.leader@promptothon.dev",
    leaderName: "Gamma Leader",
    extraMembers: [],
  });

  await prisma.submission.upsert({
    where: { teamId: teamAlpha.id },
    create: {
      teamId: teamAlpha.id,
      repoUrl: "https://github.com/promptothon/team-alpha",
      liveUrl: "https://team-alpha.example.com",
      videoUrl: "https://youtube.com/watch?v=team-alpha-demo",
      techTags: ["Next.js", "Python", "LangChain"],
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    update: {},
  });

  await prisma.submission.upsert({
    where: { teamId: teamBeta.id },
    create: {
      teamId: teamBeta.id,
      repoUrl: "https://github.com/promptothon/team-beta",
      techTags: ["React", "Node.js"],
      status: "DRAFT",
    },
    update: {},
  });

  await ensureAssignment({ juryId: jury1.id, teamId: teamAlpha.id, trackId: healthcareTrack.id });
  await ensureAssignment({ juryId: jury2.id, teamId: teamAlpha.id, trackId: healthcareTrack.id });
  await ensureAssignment({ juryId: jury1.id, teamId: teamBeta.id, trackId: fintechTrack.id });

  await ensureEvaluation({
    teamId: teamAlpha.id,
    juryId: jury1.id,
    innovation: 22,
    technical: 20,
    design: 18,
    viability: 19,
    feedback: "Strong healthcare use case with a working demo.",
    locked: true,
  });

  await ensureEvaluation({
    teamId: teamAlpha.id,
    juryId: jury2.id,
    innovation: 19,
    technical: 21,
    design: 17,
    viability: 18,
    feedback: "Draft — need to double check the eval on the video walkthrough.",
    locked: false,
  });

  const admin = await prisma.user.findUnique({ where: { email: process.env.ADMIN_EMAIL || "" } });

  await prisma.announcement.upsert({
    where: { id: "seed-announcement-welcome" },
    create: {
      id: "seed-announcement-welcome",
      title: "Welcome to Promptothon!",
      message: "Registration is open. Lock your track before the deadline and good luck!",
      priority: "NORMAL",
      published: true,
      authorId: admin?.id,
    },
    update: {},
  });

  await prisma.announcement.upsert({
    where: { id: "seed-announcement-deadline" },
    create: {
      id: "seed-announcement-deadline",
      title: "Submission deadline reminder",
      message: "Final submissions close soon \u2014 make sure your pitch deck is uploaded.",
      priority: "HIGH",
      published: true,
      authorId: admin?.id,
    },
    update: {},
  });

  console.log(`[seed] Done. Non-admin seed accounts share the password: ${SEED_PASSWORD}`);
  console.log("[seed] Seed accounts: jury1/jury2/jury3@promptothon.dev, solo1@promptothon.dev,");
  console.log("[seed]   alpha.leader/alpha.member1@promptothon.dev, beta.leader@promptothon.dev, gamma.leader@promptothon.dev");
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
