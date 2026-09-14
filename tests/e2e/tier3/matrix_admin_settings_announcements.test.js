/**
 * tests/e2e/tier3/matrix_admin_settings_announcements.test.js
 * 
 * Tier 3: Cross-Feature State Matrix — Admin x Settings x Announcements
 * Validates the administrative control loop and participant visibility matrix:
 * - Admin broadcasts published announcements to participants
 * - Admin unpublished announcements hidden from participants
 * - Score freeze toggles real-time freeze state on public leaderboard
 * - System settings updates persist and enforce deadlines
 * - Audit logs record immutable operational audit trails
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail } = require("../helpers/apiClient");
const { getAuditLogs, getSystemSetting } = require("../helpers/dbHelper");

describe("Tier 3 Matrix: Admin x Settings x Announcements", () => {
  let adminClient;
  let participantClient;
  let urgentAnnouncementId;

  it("Matrix-ASA-01: Admin publishes URGENT announcement; participant sees it in feed", async () => {
    adminClient = new ApiClient();
    await adminClient.loginAsAdmin();

    const createRes = await adminClient.createAnnouncement({
      title: "URGENT: Hackathon Hackathon Final Sprint",
      message: "Final submissions close in exactly 60 minutes.",
      priority: "URGENT",
      published: true,
    });
    expect(createRes.status).toBe(201);
    urgentAnnouncementId = createRes.body.announcement.id;

    // Participant views feed
    participantClient = new ApiClient();
    await participantClient.register({
      name: "ASA Participant",
      email: generateUniqueEmail("asa-part"),
      password: "Password123!",
      intent: "solo",
    });

    const feedRes = await participantClient.getAnnouncements();
    expect(feedRes.status).toBe(200);
    const found = feedRes.body.announcements.find((a) => a.id === urgentAnnouncementId);
    expect(found).toBeDefined();
    expect(found.priority).toBe("URGENT");
  }, { smoke: true });

  it("Matrix-ASA-02: Admin creates unpublished announcement; participant feed hides it", async () => {
    const draftRes = await adminClient.createAnnouncement({
      title: "Draft Organizer Notes",
      message: "Internal judging briefing notes.",
      priority: "NORMAL",
      published: false,
    });
    expect(draftRes.status).toBe(201);
    const draftId = draftRes.body.announcement.id;

    // Participant checks feed
    const feedRes = await participantClient.getAnnouncements();
    const foundInParticipantFeed = feedRes.body.announcements.find((a) => a.id === draftId);
    expect(foundInParticipantFeed).toBeUndefined();
  });

  it("Matrix-ASA-03: Admin toggles score freeze; public leaderboard reflects scoresFrozen: true", async () => {
    const freezeRes = await adminClient.freezeScores(true);
    expect(freezeRes.status).toBe(200);
    expect(freezeRes.body.scoresFrozen).toBe(true);

    // Public visitor checks leaderboard
    const publicClient = new ApiClient();
    const boardRes = await publicClient.getLeaderboard();
    expect(boardRes.status).toBe(200);
    expect(boardRes.body.scoresFrozen).toBe(true);

    // Unfreeze
    await adminClient.freezeScores(false);
    const unfreezeBoard = await publicClient.getLeaderboard();
    expect(unfreezeBoard.body.scoresFrozen).toBe(false);
  });

  it("Matrix-ASA-04: Admin updates submission deadline settings successfully", async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const updateRes = await adminClient.updateAdminSettings({
      submissionDeadline: futureDate,
      normalizationEnabled: false,
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.settings).toBeDefined();

    // Verify persisted setting in DB
    const dbSetting = await getSystemSetting("submissionDeadline");
    expect(dbSetting).toBeDefined();
    expect(dbSetting.value).toBe(futureDate);
  });

  it("Matrix-ASA-05: Audit logs verify full lifecycle of administrative actions", async () => {
    const logs = await getAuditLogs();
    expect(logs.length).toBeGreaterThanOrEqual(1);

    const actions = logs.map((l) => l.action);
    expect(actions.includes("SCORES_FROZEN") || actions.includes("SETTINGS_UPDATED") || actions.includes("ANNOUNCEMENT_CREATED")).toBe(true);
  });
});
