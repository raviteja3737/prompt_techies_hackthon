const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { recordAudit } = require("../../utils/auditLog");
const { isBeforeDeadline, KEYS } = require("../../utils/settings");
const { getPresignedUploadUrl } = require("../../utils/storage");
const { upsertSubmissionSchema, uploadUrlSchema } = require("./submissions.schema");
const { getMembershipOrThrow } = require("../team/team.controller");
const { verifyGithubRepoExists } = require("../../utils/github");

/**
 * POST /api/team/submission
 * Upserts the team's submission (repo link, live demo, video URL, tech
 * tags). Leader-only, matching "team leader ... Submit GitHub URL, live
 * deploy link, video walkthrough" in the spec. `submit: true` finalizes
 * as SUBMITTED; otherwise it's saved as a DRAFT the team can keep editing.
 *
 * The backend — not the client's `submit` flag — is the source of truth
 * for whether a submission is allowed at all: a track must be locked
 * first, the submission deadline (if configured) must not have passed,
 * and a SUBMITTED submission is immutable.
 */
const upsertSubmission = asyncHandler(async (req, res) => {
  const input = upsertSubmissionSchema.parse(req.body);
  const membership = await getMembershipOrThrow(req.user.id);

  if (membership.role !== "LEADER") {
    throw new ApiError(403, "Only the team leader can manage the submission.");
  }
  if (!membership.team.trackId) {
    throw new ApiError(409, "Lock a track selection before submitting.");
  }
  if (membership.team.submission?.status === "SUBMITTED") {
    throw new ApiError(409, "This submission has already been finalized and cannot be edited.");
  }
  if (!(await isBeforeDeadline(KEYS.SUBMISSION_DEADLINE))) {
    throw new ApiError(409, "The submission deadline has passed.");
  }

  const { submit, ...fields } = input;
  const status = submit ? "SUBMITTED" : "DRAFT";

  // Optional, best-effort — see src/utils/github.js. Never blocks the
  // submission; a false/unknown result is only informational.
  const githubCheck = await verifyGithubRepoExists(fields.repoUrl);
  if (submit && githubCheck.verified === false) {
    throw new ApiError(422, "The GitHub repository URL could not be verified to exist. Double-check the link.");
  }

  const submission = await prisma.submission.upsert({
    where: { teamId: membership.team.id },
    create: {
      teamId: membership.team.id,
      ...fields,
      status,
      submittedAt: submit ? new Date() : null,
    },
    update: {
      ...fields,
      status,
      submittedAt: submit ? new Date() : null,
    },
  });

  await recordAudit(req.user.id, submit ? "SUBMISSION_FINALIZED" : "SUBMISSION_DRAFT_SAVED", {
    teamId: membership.team.id,
    submissionId: submission.id,
    githubVerified: githubCheck.verified,
  });

  res.json({ submission, githubVerification: githubCheck });
});

/** GET /api/team/submission — the caller's own team submission, if any. */
const getMySubmission = asyncHandler(async (req, res) => {
  const membership = await getMembershipOrThrow(req.user.id);
  const submission = await prisma.submission.findUnique({
    where: { teamId: membership.team.id },
  });
  res.json({ submission });
});

/**
 * POST /api/team/submission/upload-url
 * Leader-only. Returns a short-lived presigned URL the client uploads the
 * pitch deck to directly — the file itself never passes through this
 * server. See src/utils/storage.js for provider configuration.
 */
const requestUploadUrl = asyncHandler(async (req, res) => {
  const { contentType, sizeBytes } = uploadUrlSchema.parse(req.body);
  const membership = await getMembershipOrThrow(req.user.id);

  if (membership.role !== "LEADER") {
    throw new ApiError(403, "Only the team leader can upload the pitch deck.");
  }
  if (membership.team.submission?.status === "SUBMITTED") {
    throw new ApiError(409, "This submission has already been finalized and cannot be edited.");
  }

  const result = await getPresignedUploadUrl({ teamId: membership.team.id, contentType, sizeBytes });
  res.json(result);
});

/**
 * GET /api/team/submission/pitch-deck-url
 * Returns a short-lived signed download URL for the caller's OWN team's
 * pitch deck (participants), or — for JURY/ADMIN — any team they're
 * legitimately allowed to view (assigned team for jury, any team for
 * admin). This is the ownership-checked read path spec §4 requires
 * instead of ever making the bucket public.
 */
const getPitchDeckUrl = asyncHandler(async (req, res) => {
  let key;

  if (req.user.role === "PARTICIPANT") {
    const membership = await getMembershipOrThrow(req.user.id);
    key = membership.team.submission?.pitchDeckKey;
  } else if (req.user.role === "JURY") {
    const teamId = req.query.teamId;
    if (!teamId) throw new ApiError(422, "teamId is required.");
    const assignment = await prisma.juryAssignment.findUnique({
      where: { juryId_teamId: { juryId: req.user.id, teamId: String(teamId) } },
    });
    if (!assignment) throw new ApiError(403, "You are not assigned to this team.");
    const submission = await prisma.submission.findUnique({ where: { teamId: String(teamId) } });
    key = submission?.pitchDeckKey;
  } else {
    // ADMIN
    const teamId = req.query.teamId;
    if (!teamId) throw new ApiError(422, "teamId is required.");
    const submission = await prisma.submission.findUnique({ where: { teamId: String(teamId) } });
    key = submission?.pitchDeckKey;
  }

  if (!key) throw new ApiError(404, "No pitch deck has been uploaded for this team.");

  const { getSignedDownloadUrl } = require("../../utils/storage");
  const result = await getSignedDownloadUrl(key);
  res.json(result);
});

/**
 * POST /api/team/submission/pitch-deck
 * Leader-only. Called after a successful direct upload to persist the
 * object's key/URL against the team's submission record.
 */
const attachPitchDeck = asyncHandler(async (req, res) => {
  const { key, url } = req.body || {};
  if (!key || !url) {
    throw new ApiError(422, "key and url are required.");
  }

  const membership = await getMembershipOrThrow(req.user.id);
  if (membership.role !== "LEADER") {
    throw new ApiError(403, "Only the team leader can attach the pitch deck.");
  }
  if (!membership.team.submission) {
    throw new ApiError(409, "Save your submission before attaching a pitch deck.");
  }
  if (membership.team.submission.status === "SUBMITTED") {
    throw new ApiError(409, "This submission has already been finalized and cannot be edited.");
  }

  const submission = await prisma.submission.update({
    where: { teamId: membership.team.id },
    data: { pitchDeckKey: key, pitchDeckUrl: url },
  });

  res.json({ submission });
});

module.exports = { upsertSubmission, getMySubmission, requestUploadUrl, attachPitchDeck, getPitchDeckUrl };
