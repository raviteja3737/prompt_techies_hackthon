const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { recordAudit } = require("../../utils/auditLog");
const { isBeforeDeadline, KEYS } = require("../../utils/settings");
const { getPresignedUploadUrl, getStorageProvider } = require("../../utils/storage");
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
 * PUT /api/team/submission/upload/:key
 * Leader-only. Step 2 of the local-disk upload flow
 * (STORAGE_PROVIDER=local): persists the PUT body under LOCAL_STORAGE_DIR.
 * The :key must be a server-minted key whose team segment matches the
 * caller's own team — anything else is rejected before touching disk.
 */
const uploadPitchDeck = asyncHandler(async (req, res) => {
  if (getStorageProvider() !== "local") {
    throw new ApiError(501, "Direct uploads are only enabled with STORAGE_PROVIDER=local.");
  }

  const membership = await getMembershipOrThrow(req.user.id);
  if (membership.role !== "LEADER") {
    throw new ApiError(403, "Only the team leader can upload the pitch deck.");
  }
  if (membership.team.submission?.status === "SUBMITTED") {
    throw new ApiError(409, "This submission has already been finalized and cannot be edited.");
  }

  const buffer = req.body;
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ApiError(422, "Empty file. Choose a pitch-deck PDF to upload.");
  }

  const contentType = String(req.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const localStorage = require("../../services/storage/localStorage");
  const saved = await localStorage.saveBuffer({
    key: req.params.key,
    teamId: membership.team.id,
    buffer,
    contentType,
  });

  await recordAudit(req.user.id, "PITCH_DECK_UPLOADED", {
    teamId: membership.team.id,
    key: req.params.key,
    sizeBytes: saved.bytesWritten,
  });

  res.status(201).json({ key: req.params.key, sizeBytes: saved.bytesWritten });
});

/**
 * Ownership-checked pitch-deck key resolution shared by the download-link
 * and file-stream endpoints. Returns { key, url, teamId } where `url` is
 * only set for externally-linked decks (key starts with "url:").
 */
async function resolvePitchDeckKeyOrThrow(req) {
  if (req.user.role === "PARTICIPANT") {
    const membership = await getMembershipOrThrow(req.user.id);
    const submission = membership.team.submission;
    if (!submission?.pitchDeckKey) {
      throw new ApiError(404, "No pitch deck has been uploaded for this team.");
    }
    return { key: submission.pitchDeckKey, url: submission.pitchDeckUrl || null, teamId: membership.team.id };
  }

  const teamId = req.query.teamId;
  if (!teamId) throw new ApiError(422, "teamId is required.");

  if (req.user.role === "JURY") {
    const assignment = await prisma.juryAssignment.findUnique({
      where: { juryId_teamId: { juryId: req.user.id, teamId: String(teamId) } },
    });
    if (!assignment) throw new ApiError(403, "You are not assigned to this team.");
  } else if (req.user.role !== "ADMIN") {
    throw new ApiError(403, "You do not have access to this resource.");
  }

  const submission = await prisma.submission.findUnique({ where: { teamId: String(teamId) } });
  if (!submission?.pitchDeckKey) {
    throw new ApiError(404, "No pitch deck has been uploaded for this team.");
  }
  return { key: submission.pitchDeckKey, url: submission.pitchDeckUrl || null, teamId: String(teamId) };
}

/**
 * GET /api/team/submission/pitch-deck-url
 * Returns a short-lived signed download URL for the caller's OWN team's
 * pitch deck (participants), or — for JURY/ADMIN — any team they're
 * legitimately allowed to view (assigned team for jury, any team for
 * admin). This is the ownership-checked read path spec §4 requires
 * instead of ever making the bucket public.
 *
 * With STORAGE_PROVIDER=local the link points at the authenticated
 * pitch-deck-file streaming route below; externally-linked decks
 * (key starts with "url:") resolve straight to their stored URL.
 */
const getPitchDeckUrl = asyncHandler(async (req, res) => {
  const { key, url, teamId } = await resolvePitchDeckKeyOrThrow(req);

  if (String(key).startsWith("url:")) {
    if (!url) throw new ApiError(404, "No pitch deck has been uploaded for this team.");
    return res.json({ url });
  }

  if (getStorageProvider() === "local") {
    const localStorage = require("../../services/storage/localStorage");
    const exists = await localStorage.fileExistsForTeam({ key, teamId });
    if (!exists) throw new ApiError(404, "Pitch deck file not found on the server.");
    return res.json({
      downloadUrl: localStorage.getDownloadUrl({
        key,
        teamId: req.user.role === "PARTICIPANT" ? undefined : teamId,
      }),
    });
  }

  const { getSignedDownloadUrl } = require("../../utils/storage");
  const result = await getSignedDownloadUrl(key);
  res.json(result);
});

/**
 * GET /api/team/submission/pitch-deck-file[?teamId=...]
 * Streams a locally-stored pitch deck (STORAGE_PROVIDER=local) after the
 * same ownership checks as pitch-deck-url. Browsers open this directly
 * (the "View pitch deck" button), sending the session cookie as usual.
 */
const getPitchDeckFile = asyncHandler(async (req, res) => {
  if (getStorageProvider() !== "local") {
    throw new ApiError(501, "File streaming is only available with STORAGE_PROVIDER=local. Use pitch-deck-url instead.");
  }

  const { key, teamId } = await resolvePitchDeckKeyOrThrow(req);
  if (String(key).startsWith("url:")) {
    throw new ApiError(404, "This team's pitch deck is an external link, not a stored file.");
  }

  const localStorage = require("../../services/storage/localStorage");
  const stat = await localStorage.readStatForTeam({ key, teamId });
  if (!stat) throw new ApiError(404, "Pitch deck file not found on the server.");

  res.setHeader("Content-Type", stat.contentType);
  res.setHeader("Content-Length", String(stat.sizeBytes));
  res.setHeader("Content-Disposition", `inline; filename="pitch-deck-${teamId}.${stat.ext}"`);
  res.setHeader("Cache-Control", "private, max-age=300");

  const stream = localStorage.createReadStream(stat.absPath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(404).json({ error: "Pitch deck file not found on the server." });
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
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

  // With local-disk storage the key must reference a file this team
  // actually uploaded (prevents attaching foreign or phantom keys).
  // Externally-linked decks (key starts with "url:") skip this check.
  if (getStorageProvider() === "local" && !String(key).startsWith("url:")) {
    const localStorage = require("../../services/storage/localStorage");
    const exists = await localStorage.fileExistsForTeam({ key, teamId: membership.team.id });
    if (!exists) {
      throw new ApiError(422, "No uploaded file matches this key. Upload the pitch deck first.");
    }
  }

  const submission = await prisma.submission.update({
    where: { teamId: membership.team.id },
    data: { pitchDeckKey: key, pitchDeckUrl: url },
  });

  res.json({ submission });
});

module.exports = { upsertSubmission, getMySubmission, requestUploadUrl, uploadPitchDeck, attachPitchDeck, getPitchDeckUrl, getPitchDeckFile };
