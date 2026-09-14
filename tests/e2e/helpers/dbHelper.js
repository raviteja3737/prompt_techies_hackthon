/**
 * tests/e2e/helpers/dbHelper.js
 * 
 * Direct Prisma database verification helper for E2E tests:
 * - Query users, teams, submissions, evaluations, settings, and audit logs
 * - Assert database state persistence directly against PostgreSQL
 */

const path = require("path");
const prismaPath = path.resolve(__dirname, "../../../backend/src/config/prisma");
const prisma = require(prismaPath);

async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      teamMember: {
        include: { team: true },
      },
    },
  });
}

async function findTeamByInviteCode(inviteCode) {
  return prisma.team.findUnique({
    where: { inviteCode },
    include: {
      leader: true,
      members: { include: { user: true } },
      track: true,
      submission: true,
      evaluations: true,
    },
  });
}

async function findTeamByName(name) {
  return prisma.team.findFirst({
    where: { name },
    include: {
      leader: true,
      members: { include: { user: true } },
      track: true,
      submission: true,
      evaluations: true,
    },
  });
}

async function getTracks() {
  return prisma.track.findMany({ orderBy: { createdAt: "asc" } });
}

async function getSubmissionByTeamId(teamId) {
  return prisma.submission.findUnique({ where: { teamId } });
}

async function getEvaluationsByTeamId(teamId) {
  return prisma.evaluation.findMany({ where: { teamId } });
}

async function getAuditLogs(action = null) {
  const where = action ? { action } : {};
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

async function getSystemSetting(key) {
  return prisma.systemSetting.findUnique({ where: { key } });
}

async function disconnectDb() {
  await prisma.$disconnect();
}

module.exports = {
  prisma,
  findUserByEmail,
  findTeamByInviteCode,
  findTeamByName,
  getTracks,
  getSubmissionByTeamId,
  getEvaluationsByTeamId,
  getAuditLogs,
  getSystemSetting,
  disconnectDb,
};
