const crypto = require("crypto");
const ApiError = require("../../utils/ApiError");

/**
 * Supabase Storage driver (spec §4).
 *
 * Bucket: PITCH_DECK_BUCKET (default "pitch-decks"), created as **private**.
 * Nothing here ever touches the service-role key from a response body —
 * signed URLs are generated server-side and only the URL itself (which is
 * already scoped + time-limited) is returned to the client.
 *
 * Required Supabase Storage bucket setup (see README "Supabase Storage
 * bucket setup" for the full walkthrough):
 *   1. Create a bucket named `pitch-decks` (or set PITCH_DECK_BUCKET).
 *   2. Leave it PRIVATE (do not enable public access).
 *   3. No public RLS policies are required — every read/write here goes
 *      through the service-role key, server-side only.
 *
 * The @supabase/supabase-js client is required lazily so a server that
 * never sets STORAGE_PROVIDER=supabase doesn't need the package installed
 * or the env vars populated to boot and serve every other route.
 */

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-powerpoint", // .ppt
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB — pitch decks only, not videos

function assertContentTypeAllowed(contentType) {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new ApiError(422, "Unsupported file type for a pitch deck. Allowed: PDF, PPT, PPTX.");
  }
}

function assertSizeAllowed(sizeBytes) {
  if (typeof sizeBytes === "number" && sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(422, `Pitch deck exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`);
  }
}

function extensionFor(contentType) {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "application/vnd.ms-powerpoint") return "ppt";
  return "pptx";
}

/** Deterministic-but-unguessable object path, namespaced by team so ownership is trivially checkable. */
function buildObjectKey(teamId, contentType) {
  const random = crypto.randomBytes(8).toString("hex");
  const safeTeamId = String(teamId).replace(/[^a-zA-Z0-9_-]/g, "");
  return `${safeTeamId}/${Date.now()}-${random}.${extensionFor(contentType)}`;
}

let _client = null;
function getServiceClient() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new ApiError(
      500,
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set when STORAGE_PROVIDER=supabase."
    );
  }

  let createClient;
  try {
    ({ createClient } = require("@supabase/supabase-js"));
  } catch (err) {
    throw new ApiError(
      500,
      "STORAGE_PROVIDER=supabase requires the Supabase SDK. Run: npm install @supabase/supabase-js"
    );
  }

  // Service-role client: full bucket access, used ONLY server-side, NEVER
  // sent to the frontend and never logged. If this key leaks, rotate it in
  // the Supabase dashboard immediately (Settings → API).
  _client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

function bucketName() {
  return process.env.PITCH_DECK_BUCKET || "pitch-decks";
}

/**
 * Returns a signed upload URL/token the client uses to PUT the file
 * directly to Supabase Storage — the file bytes never pass through this
 * Express server.
 *
 * @param {{ teamId: string, contentType: string, sizeBytes?: number }} params
 */
async function getPresignedUploadUrl({ teamId, contentType, sizeBytes }) {
  assertContentTypeAllowed(contentType);
  assertSizeAllowed(sizeBytes);

  const client = getServiceClient();
  const key = buildObjectKey(teamId, contentType);

  const { data, error } = await client.storage.from(bucketName()).createSignedUploadUrl(key);
  if (error) {
    throw new ApiError(502, `Could not create a Supabase signed upload URL: ${error.message}`);
  }

  return {
    uploadUrl: data.signedUrl,
    method: "PUT",
    key,
    token: data.token, // supabase-js client SDK needs this for uploadToSignedUrl(); harmless to return, it's single-use/short-lived
    bucket: bucketName(),
    expiresIn: 120, // Supabase signed upload URLs are valid for 2 minutes
  };
}

/**
 * Signed, time-limited download URL for a previously uploaded object. Used
 * instead of ever making the bucket public, so only holders of a
 * freshly-issued URL (gated by our own ownership check in the controller)
 * can read a pitch deck.
 */
async function getSignedDownloadUrl(key, expiresInSeconds = 300) {
  const client = getServiceClient();
  const { data, error } = await client.storage.from(bucketName()).createSignedUrl(key, expiresInSeconds);
  if (error) {
    throw new ApiError(404, "Could not resolve a download URL for this file.");
  }
  return { url: data.signedUrl, expiresIn: expiresInSeconds };
}

/** Best-effort delete, e.g. when a pitch deck is replaced. Never throws — a stray orphaned object isn't worth failing the request over. */
async function deleteObject(key) {
  try {
    const client = getServiceClient();
    await client.storage.from(bucketName()).remove([key]);
  } catch (err) {
    console.error("[supabaseStorage] failed to delete object:", err.message);
  }
}

module.exports = {
  getPresignedUploadUrl,
  getSignedDownloadUrl,
  deleteObject,
  ALLOWED_CONTENT_TYPES,
  MAX_FILE_SIZE_BYTES,
};
