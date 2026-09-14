const crypto = require("crypto");
const ApiError = require("./ApiError");

/**
 * Storage abstraction for the pitch-deck upload flow (spec §4/§27).
 *
 * STORAGE_PROVIDER selects the backing driver:
 *   - "local"    (default) -> src/services/storage/localStorage.js
 *                  PDFs are stored on this server's own disk
 *                  (LOCAL_STORAGE_DIR; a persistent Docker volume on
 *                  the VPS) and streamed back by the API.
 *   - "supabase" (external) -> src/services/storage/supabaseStorage.js
 *   - "s3"       (external) -> presigned S3 PUT URLs (needs AWS SDK)
 *   - "disabled" (default) -> upload endpoints return a clear 501 instead
 *                  of crashing on boot when no provider is configured.
 *
 * Callers (submissions.controller.js) never see which driver is active --
 * they only see { uploadUrl, method, key, ... }.
 */

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-powerpoint", // .ppt
]);

function assertContentTypeAllowed(contentType) {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new ApiError(422, "Unsupported file type for a pitch deck. Allowed: PDF, PPT, PPTX.");
  }
}

function buildObjectKey(teamId, contentType) {
  const ext = contentType === "application/pdf" ? "pdf" : "pptx";
  const random = crypto.randomBytes(8).toString("hex");
  return `pitch-decks/${teamId}/${Date.now()}-${random}.${ext}`;
}

/**
 * @param {{ teamId: string, contentType: string, sizeBytes?: number }} params
 * @returns {Promise<{ uploadUrl: string, method: string, key: string, publicUrl?: string, bucket?: string, expiresIn: number }>}
 */
async function getPresignedUploadUrl({ teamId, contentType, sizeBytes }) {
  assertContentTypeAllowed(contentType);

  const provider = process.env.STORAGE_PROVIDER || "disabled";

  if (provider === "disabled") {
    throw new ApiError(
      501,
      "File uploads are not configured on this server (STORAGE_PROVIDER is disabled)."
    );
  }

  if (provider === "local") {
    // VPS-disk driver: the client PUTs the file straight back to this
    // API (PUT /api/team/submission/upload/:key), which persists it
    // under LOCAL_STORAGE_DIR. The UI flow is unchanged.
    const localStorage = require("../services/storage/localStorage");
    return localStorage.createUpload({ teamId, contentType, sizeBytes });
  }

  if (provider === "supabase") {
    const supabaseStorage = require("../services/storage/supabaseStorage");
    return supabaseStorage.getPresignedUploadUrl({ teamId, contentType, sizeBytes });
  }

  if (provider === "s3") {
    return getS3PresignedUploadUrl({ teamId, contentType });
  }

  throw new ApiError(500, `Unknown STORAGE_PROVIDER "${provider}".`);
}

/**
 * Signed, short-lived download URL. Only implemented for the supabase
 * driver today (S3 files in this codebase's existing flow keep a public
 * URL captured at upload time instead).
 */
async function getSignedDownloadUrl(key) {
  const provider = process.env.STORAGE_PROVIDER || "disabled";
  if (provider !== "supabase") {
    throw new ApiError(501, "Signed downloads are only available with STORAGE_PROVIDER=supabase.");
  }
  const supabaseStorage = require("../services/storage/supabaseStorage");
  return supabaseStorage.getSignedDownloadUrl(key);
}

/** Reports config status for /health without leaking secrets. */
function getStorageStatus() {
  const provider = process.env.STORAGE_PROVIDER || "disabled";
  if (provider === "disabled") return { provider, configured: false };
  if (provider === "local") {
    const localStorage = require("../services/storage/localStorage");
    return localStorage.getLocalStatus();
  }
  if (provider === "supabase") {
    return {
      provider,
      configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      bucket: process.env.PITCH_DECK_BUCKET || "pitch-decks",
    };
  }
  if (provider === "s3") {
    return { provider, configured: Boolean(process.env.AWS_S3_BUCKET && process.env.AWS_REGION) };
  }
  return { provider, configured: false };
}

async function getS3PresignedUploadUrl({ teamId, contentType }) {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) {
    throw new ApiError(500, "AWS_S3_BUCKET and AWS_REGION must be set when STORAGE_PROVIDER=s3.");
  }

  let S3Client, PutObjectCommand, getSignedUrl;
  try {
    ({ S3Client, PutObjectCommand } = require("@aws-sdk/client-s3"));
    ({ getSignedUrl } = require("@aws-sdk/s3-request-presigner"));
  } catch (err) {
    throw new ApiError(
      500,
      "STORAGE_PROVIDER=s3 requires the AWS SDK. Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner"
    );
  }

  const key = buildObjectKey(teamId, contentType);
  const client = new S3Client({ region });
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const expiresIn = 5 * 60; // seconds
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    method: "PUT",
    key,
    publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
    expiresIn,
  };
}

/** Active provider id ("local" | "supabase" | "s3" | "disabled"). */
function getStorageProvider() {
  return process.env.STORAGE_PROVIDER || "disabled";
}

module.exports = { getPresignedUploadUrl, getSignedDownloadUrl, getStorageStatus, getStorageProvider, ALLOWED_CONTENT_TYPES };
