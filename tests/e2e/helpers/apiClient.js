/**
 * tests/e2e/helpers/apiClient.js
 * 
 * Unified HTTP / Supertest API Client for E2E Tests:
 * - Automatically detects live server on port 4000 or uses in-memory backend/src/app
 * - Manages session cookies & Bearer tokens per client instance
 * - Provides typed helper methods for all 27 hackathon features
 */

const path = require("path");
const http = require("http");

// Load backend app and supertest
const supertestPath = path.resolve(__dirname, "../../../backend/node_modules/supertest");
const supertest = require(supertestPath);
const appPath = path.resolve(__dirname, "../../../backend/src/app");
const app = require(appPath);

let rateLimiter = null;
try {
  rateLimiter = require("../../../backend/src/middleware/rateLimiter");
} catch (e) {}

async function resetRateLimiters() {
  if (!rateLimiter) return;
  const ips = ["::ffff:127.0.0.1", "127.0.0.1", "::1", "127.0.0.1:0"];
  for (const limiter of [rateLimiter.authLimiter, rateLimiter.adminLimiter, rateLimiter.juryLimiter, rateLimiter.generalLimiter]) {
    if (limiter && typeof limiter.resetKey === "function") {
      for (const ip of ips) {
        try {
          await limiter.resetKey(ip);
        } catch (e) {}
      }
    }
  }
}

class ApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.TEST_BASE_URL || null;
    this.token = null;
    this.cookies = [];
    this.currentUser = null;
  }

  setToken(token) {
    this.token = token;
  }

  setCookies(cookies) {
    if (Array.isArray(cookies)) {
      this.cookies = cookies;
    } else if (typeof cookies === "string") {
      this.cookies = [cookies];
    }
  }

  _parseCookies(res) {
    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const c of cookieArray) {
        const parts = c.split(";")[0];
        if (parts) {
          // Replace or add cookie
          const name = parts.split("=")[0];
          this.cookies = this.cookies.filter((existing) => !existing.startsWith(name + "="));
          this.cookies.push(parts);
        }
      }
    }
  }

  _formatHeaders(customHeaders = {}) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...customHeaders,
    };

    if (this.token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    if (this.cookies.length > 0 && !headers["Cookie"]) {
      headers["Cookie"] = this.cookies.join("; ");
    }

    return headers;
  }

  _getTarget() {
    return this.baseUrl || app;
  }

  async request(method, endpoint, body = null, customHeaders = {}) {
    await resetRateLimiters();
    const target = this._getTarget();
    const req = supertest(target)[method.toLowerCase()](endpoint);
    const headers = this._formatHeaders(customHeaders);

    for (const [key, value] of Object.entries(headers)) {
      req.set(key, value);
    }

    if (body !== null && body !== undefined) {
      req.send(body);
    }

    const res = await req;
    this._parseCookies(res);

    return {
      status: res.status,
      body: res.body,
      text: res.text,
      headers: res.headers,
      ok: res.status >= 200 && res.status < 300,
    };
  }

  async get(endpoint, headers = {}) {
    return this.request("GET", endpoint, null, headers);
  }

  async post(endpoint, body = {}, headers = {}) {
    return this.request("POST", endpoint, body, headers);
  }

  async patch(endpoint, body = {}, headers = {}) {
    return this.request("PATCH", endpoint, body, headers);
  }

  async delete(endpoint, headers = {}) {
    return this.request("DELETE", endpoint, null, headers);
  }

  // --- Auth Helpers ---

  async register(data) {
    const payload = {
      name: data.name !== undefined ? data.name : "Test User",
      email: data.email,
      password: data.password || "SuperSecret123!",
      intent: data.intent || "solo",
      teamName: data.teamName,
      teamCode: data.teamCode,
      college: data.college || "Tech University",
      skills: data.skills || ["JavaScript", "Python"],
      githubUrl: data.githubUrl || "https://github.com/testuser",
      linkedinUrl: data.linkedinUrl || "https://linkedin.com/in/testuser",
    };

    const res = await this.post("/api/auth/register", payload);
    if (res.ok && res.body.token) {
      this.token = res.body.token;
      this.currentUser = res.body.user;
    }
    return res;
  }

  async login(email, password = "SuperSecret123!") {
    const res = await this.post("/api/auth/login", { email, password });
    if (res.ok && res.body.token) {
      this.token = res.body.token;
      this.currentUser = res.body.user;
    }
    return res;
  }

  async loginAsAdmin() {
    const { findUserByEmail } = require("./dbHelper");
    const { signToken } = require("../../../backend/src/utils/jwt");
    const admin = await findUserByEmail("admin@promptothon.dev");
    if (admin) {
      this.token = signToken({ sub: admin.id, role: "ADMIN" });
      this.currentUser = admin;
      return { ok: true, status: 200, body: { user: admin, token: this.token } };
    }
    return this.login("admin@promptothon.dev", "ChangeMe123!");
  }

  async loginAsJury(email = "jury1@promptothon.dev") {
    const { findUserByEmail } = require("./dbHelper");
    const { signToken } = require("../../../backend/src/utils/jwt");
    const jury = await findUserByEmail(email);
    if (jury) {
      this.token = signToken({ sub: jury.id, role: "JURY" });
      this.currentUser = jury;
      return { ok: true, status: 200, body: { user: jury, token: this.token } };
    }
    return this.login(email, "Password123!");
  }

  authenticateUser(user) {
    const { signToken } = require("../../../backend/src/utils/jwt");
    this.token = signToken({ sub: user.id, role: user.role });
    this.currentUser = user;
  }

  async logout() {
    const res = await this.post("/api/auth/logout");
    this.token = null;
    this.currentUser = null;
    this.cookies = [];
    return res;
  }

  async getMe() {
    return this.get("/api/auth/me");
  }

  // --- Team & Track Helpers ---

  async getMyTeam() {
    return this.get("/api/team/me");
  }

  async joinTeam(teamCode) {
    return this.post("/api/team/join", { teamCode });
  }

  async lockTrack(trackId) {
    return this.post("/api/team/track-lock", { trackId });
  }

  // --- Submissions Helpers ---

  async getMySubmission() {
    return this.get("/api/team/submission");
  }

  async saveSubmissionDraft(data) {
    return this.post("/api/team/submission", {
      submit: false,
      repoUrl: data.repoUrl || "https://github.com/test-org/hackathon-project",
      liveUrl: data.liveUrl || "https://project-demo.vercel.app",
      videoUrl: data.videoUrl || "https://youtube.com/watch?v=demo123",
      techTags: data.techTags || ["Next.js", "Express", "PostgreSQL"],
    });
  }

  async finalizeSubmission(data) {
    return this.post("/api/team/submission", {
      submit: true,
      repoUrl: data.repoUrl || "https://github.com/test-org/hackathon-project",
      liveUrl: data.liveUrl || "https://project-demo.vercel.app",
      videoUrl: data.videoUrl || "https://youtube.com/watch?v=demo123",
      techTags: data.techTags || ["Next.js", "Express", "PostgreSQL"],
    });
  }

  async requestUploadUrl(contentType = "application/pdf", sizeBytes = 1048576) {
    return this.post("/api/team/submission/upload-url", { contentType, sizeBytes });
  }

  async attachPitchDeck(key, url) {
    return this.post("/api/team/submission/pitch-deck", { key, url });
  }

  // --- Tracks Helpers ---

  async getTracks() {
    return this.get("/api/tracks");
  }

  async getTrack(id) {
    return this.get(`/api/tracks/${id}`);
  }

  // --- Leaderboard Helpers ---

  async getLeaderboard(trackId = null) {
    const url = trackId ? `/api/leaderboard?trackId=${encodeURIComponent(trackId)}` : "/api/leaderboard";
    return this.get(url);
  }

  // --- Jury Helpers ---

  async getJuryQueue() {
    return this.get("/api/jury/queue");
  }

  async evaluateSubmission(data) {
    return this.post("/api/jury/evaluate", {
      teamId: data.teamId,
      innovation: data.innovation ?? 20,
      technical: data.technical ?? 20,
      design: data.design ?? 20,
      viability: data.viability ?? 20,
      feedback: data.feedback || "Solid implementation with clear architecture.",
      lock: Boolean(data.lock),
    });
  }

  // --- Admin Helpers ---

  async getAdminDashboard() {
    return this.get("/api/admin/dashboard");
  }

  async getAdminSettings() {
    return this.get("/api/admin/settings");
  }

  async updateAdminSettings(settings) {
    return this.patch("/api/admin/settings", settings);
  }

  async freezeScores(frozen = true) {
    return this.post("/api/admin/freeze-scores", { frozen });
  }

  async listJuryAssignments() {
    return this.get("/api/admin/jury-assignments");
  }

  async createJuryAssignment(juryId, teamId, trackId = null) {
    const payload = { juryId, teamId };
    if (trackId) payload.trackId = trackId;
    return this.post("/api/admin/jury-assignments", payload);
  }

  async listAuditLogs() {
    return this.get("/api/admin/audit-logs");
  }

  // --- Announcements Helpers ---

  async getAnnouncements() {
    return this.get("/api/announcements");
  }

  async createAnnouncement(data) {
    return this.post("/api/admin/announcements", {
      title: data.title !== undefined ? data.title : "Hackathon Milestone Announcement",
      message: data.message !== undefined ? data.message : "Submissions close in 2 hours. Ensure tracks are locked!",
      priority: data.priority || "NORMAL",
      published: data.published !== false,
      scheduledAt: data.scheduledAt || null,
    });
  }

  // --- Health Helper ---

  async getHealth() {
    return this.get("/health");
  }
}

// Utility factories
function generateUniqueEmail(prefix = "user") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@promptothon.dev`;
}

function generateUniqueTeamName(prefix = "Team") {
  return `${prefix} ${Date.now().toString().slice(-4)} ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

module.exports = {
  ApiClient,
  generateUniqueEmail,
  generateUniqueTeamName,
  app,
};
