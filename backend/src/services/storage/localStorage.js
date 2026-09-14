const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ApiError = require("../../utils/ApiError");

/**
 * Local-disk storage driver (STORAGE_PROVIDER=local).
 *
 * Pitch-deck PDFs are written to LOCAL_STORAGE_DIR on the server's own
 * disk — on the VPS this is a Docker named volume (see the `api`
 * service in docker-compose.yml), so files survive container rebuilds
 * and restarts. No external storage account is involved.
 *
 * Key layout (generated server-side, never client-chosen):
 *   pitch-decks/<teamId>/<timestamp>-<random>.pdf
 *
 * Every read/write re-validates the key shape AND that the embedded
 * teamId matches the requesting team, so one team can never address
 * another team's file and `..` traversal is impossible (keys are also
 * resolved + containment-checked against the storage root).
 */

const MAX_BYTES = 50 * 1024 * 1024; // mirrors uploadUrlSchema.sizeBytes cap

const EXTENSION_TO_CONTENT_TYPE = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ALLOWED_CONTENT_TYPES = new Set(Object.values(EXTENSION_TO_CONTENT_TYPE));

// pitch-decks/<teamId>/<timestamp>-<random>.<ext>
const KEY_REGEX = /^pitch-decks\/([A-Za-z0-9_-]{1,64})\/(\d{1,20})-([a-f0-9]{16})\.(pdf|pptx?)$/;

/** Storage root. Read per-call (not cached) so tests and config reloads work. */
function getStorageDir() {
  const configured = process.env.LOCAL_STORAGE_DIR;
  // Dev default lives inside the backend package (auto-created, gitignored).
  // Production sets LOCAL_STORAGE_DIR=/data/pitch-decks (a named volume).
  const dir = configured && configured.trim() ? configured.trim() : path.join(__dirname, "..", "..", "storage", "pitch-decks");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new ApiError(500, `Pitch-deck storage directory is not writable: ${dir}`);
  }
  return path.resolve(dir);
}

/** Public base URL of this API, used to build browser-facing upload/download links. */
function apiPublicUrl() {
  const raw = process.env.API_PUBLIC_URL || "http://localhost:4000";
  return raw.replace(/\/+$/, "");
}

function extensionForContentType(contentType) {
  const base = String(contentType || "").split(";")[0].trim().toLowerCase();
  for (const [ext, mime] of Object.entries(EXTENSION_TO_CONTENT_TYPE)) {
    if (mime === base) return ext;
  }
  return null;
}

/** Server-side key minting — clients never choose paths. */
function buildLocalKey(teamId, contentType) {
  const safeTeam = String(teamId || "").trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(safeTeam)) {
    throw new ApiError(422, "Invalid team identifier for pitch-deck upload.");
  }
  const ext = extensionForContentType(contentType);
  if (!ext) {
    throw new ApiError(422, "Unsupported file type for a pitch deck. Allowed: PDF, PPT, PPTX.");
  }
  return `pitch-decks/${safeTeam}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
}

/**
 * Validates a key and resolves it inside the storage root.
 * Returns { absPath, teamId, ext }. Throws 422 on any malformed key and
 * 403-equivalent containment failure (surfaced as 422 to avoid probing).
 */
function resolveKeyPath(key) {
  const match = KEY_REGEX.exec(String(key || ""));
  if (!match) {
    throw new ApiError(422, "Invalid pitch-deck key.");
  }
  const [, teamId, , , ext] = match;
  const root = getStorageDir();
  const absPath = path.resolve(root, String(key));
  if (absPath !== root && !absPath.startsWith(root + path.sep)) {
    throw new ApiError(422, "Invalid pitch-deck key.");
  }
  return { absPath, teamId, ext };
}

function contentTypeForExt(ext) {
  return EXTENSION_TO_CONTENT_TYPE[ext] || "application/octet-stream";
}

/** Step 1 of the upload flow: mint a key + hand the client a same-server PUT URL. */
function createUpload({ teamId, contentType, sizeBytes }) {
  if (sizeBytes !== undefined && (typeof sizeBytes !== "number" || sizeBytes <= 0 || sizeBytes > MAX_BYTES)) {
    throw new ApiError(422, "sizeBytes must be a positive number up to 50MB.");
  }
  const key = buildLocalKey(teamId, contentType);
  return {
    uploadUrl: `${apiPublicUrl()}/api/team/submission/upload/${encodeURIComponent(key)}`,
    method: "PUT",
    key,
    expiresIn: 15 * 60,
  };
}

/** Step 2: persist the PUT body. The key's team segment must equal teamId. */
async function saveBuffer({ key, teamId, buffer, contentType }) {
  const { absPath, teamId: keyTeamId } = resolveKeyPath(key);
  if (keyTeamId !== String(teamId)) {
    throw new ApiError(403, "This upload key does not belong to your team.");
  }
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ApiError(422, "Empty file. Choose a pitch-deck file to upload.");
  }
  if (buffer.length > MAX_BYTES) {
    throw new ApiError(413, "File is larger than the 50MB pitch-deck limit.");
  }
  const declared = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(declared)) {
    throw new ApiError(422, "Unsupported file type for a pitch deck. Allowed: PDF, PPT, PPTX.");
  }
  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await fs.promises.writeFile(absPath, buffer);
  return { bytesWritten: buffer.length };
}

/** True when the key is well-formed, belongs to teamId, and exists on disk. */
async function fileExistsForTeam({ key, teamId }) {
  let resolved;
  try {
    resolved = resolveKeyPath(key);
  } catch {
    return false;
  }
  if (resolved.teamId !== String(teamId)) return false;
  try {
    const stat = await fs.promises.stat(resolved.absPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/** Stat a stored file for the owning team. Returns null when absent. */
async function readStatForTeam({ key, teamId }) {
  let resolved;
  try {
    resolved = resolveKeyPath(key);
  } catch {
    return null;
  }
  if (resolved.teamId !== String(teamId)) return null;
  try {
    const stat = await fs.promises.stat(resolved.absPath);
    if (!stat.isFile()) return null;
    return {
      absPath: resolved.absPath,
      teamId: resolved.teamId,
      ext: resolved.ext,
      contentType: contentTypeForExt(resolved.ext),
      sizeBytes: stat.size,
    };
  } catch {
    return null;
  }
}

function createReadStream(absPath) {
  return fs.createReadStream(absPath);
}

/** Browser-facing download link for a stored key (auth is re-checked on open). */
function getDownloadUrl({ key, teamId }) {
  const params = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  return `${apiPublicUrl()}/api/team/submission/pitch-deck-file${params}`;
}

/** Sync health payload for /health (never throws, never leaks paths). */
function getLocalStatus() {
  try {
    const dir = getStorageDir();
    fs.accessSync(dir, fs.constants.W_OK);
    return { provider: "local", configured: true };
  } catch {
    return { provider: "local", configured: false };
  }
}

module.exports = {
  MAX_BYTES,
  getStorageDir,
  apiPublicUrl,
  buildLocalKey,
  resolveKeyPath,
  createUpload,
  saveBuffer,
  fileExistsForTeam,
  readStatForTeam,
  createReadStream,
  getDownloadUrl,
  getLocalStatus,
};
