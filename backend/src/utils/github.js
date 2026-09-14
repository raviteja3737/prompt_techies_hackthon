const GITHUB_URL_REGEX = /^https:\/\/(www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(\.git)?\/?$/i;

/** Server-side format validation — used by the Zod schema directly. */
function isValidGithubRepoUrl(url) {
  return GITHUB_URL_REGEX.test(url);
}

function parseOwnerRepo(url) {
  const match = url.match(GITHUB_URL_REGEX);
  if (!match) return null;
  return { owner: match[2], repo: match[3] };
}

/**
 * Best-effort existence check against the public GitHub REST API. Never a
 * hard dependency for submission (spec §23: "do not make GitHub API
 * availability a requirement for basic local development") — network
 * failures, rate limits, or GITHUB_API disabled all resolve to
 * `{ verified: null }` ("unknown"), never a rejection.
 *
 * No GitHub token is stored or required; unauthenticated requests are
 * rate-limited by GitHub to 60/hour per IP, which is enough for a
 * best-effort check on submission.
 */
async function verifyGithubRepoExists(url) {
  if (process.env.GITHUB_API_VERIFICATION !== "enabled") {
    return { verified: null, reason: "disabled" };
  }

  const parsed = parseOwnerRepo(url);
  if (!parsed) return { verified: false, reason: "invalid_url" };

  try {
    // global fetch is available in Node 18+, which is this project's
    // minimum engine version (see package.json engines.node).
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "promptothon-backend" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 404) return { verified: false, reason: "not_found" };
    if (!res.ok) return { verified: null, reason: `github_api_${res.status}` };

    const data = await res.json();
    return { verified: true, private: Boolean(data.private) };
  } catch (err) {
    return { verified: null, reason: "network_error" };
  }
}

module.exports = { isValidGithubRepoUrl, parseOwnerRepo, verifyGithubRepoExists, GITHUB_URL_REGEX };
