/**
 * tests/e2e/tier3/matrix_teams_tracks_submissions.test.js
 * 
 * Tier 3: Cross-Feature State Matrix — Teams x Tracks x Submissions
 * Validates the multi-state transition pipeline from team creation to finalized submission:
 * - Submission blocked before track lock
 * - Track locking freezes track modifications (one-way lock)
 * - Leader manages draft submissions while member is forbidden
 * - Finalized submission becomes permanently immutable
 */

const { describe, it, expect } = require("../helpers/testFramework");
const { ApiClient, generateUniqueEmail, generateUniqueTeamName } = require("../helpers/apiClient");
const { getTracks, findTeamByName } = require("../helpers/dbHelper");

describe("Tier 3 Matrix: Teams x Tracks x Submissions", () => {
  let leaderClient;
  let memberClient;
  let teamName;
  let tracks;

  it("Matrix-TTS-01: Submitting before track locking is rejected with 409 Conflict", async () => {
    leaderClient = new ApiClient();
    teamName = generateUniqueTeamName("TTSMatrix");
    await leaderClient.register({
      name: "TTS Leader",
      email: generateUniqueEmail("tts-lead"),
      password: "Password123!",
      intent: "create",
      teamName,
    });

    const res = await leaderClient.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/premature-sub",
    });
    expect(res.status).toBe(409);
    expect(res.body.error || res.body.message).toContain("Lock a track selection before submitting");
  }, { smoke: true });

  it("Matrix-TTS-02: Leader locks track, and subsequent track-lock attempts are rejected", async () => {
    tracks = await getTracks();
    expect(tracks.length).toBeGreaterThanOrEqual(2);

    // First lock succeeds
    const lockRes = await leaderClient.lockTrack(tracks[0].id);
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.team.trackLockedAt).toBeDefined();

    // Second lock attempt on different track is rejected
    const relockRes = await leaderClient.lockTrack(tracks[1].id);
    expect(relockRes.status).toBe(409);
    expect(relockRes.body.error || relockRes.body.message).toBeDefined();
  });

  it("Matrix-TTS-03: Leader can create and incrementally update DRAFT submission", async () => {
    // Initial draft
    const draftRes1 = await leaderClient.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/initial-draft",
      liveUrl: "https://v1.demo.app",
      techTags: ["Next.js"],
    });
    expect(draftRes1.status).toBe(200);
    expect(draftRes1.body.submission.status).toBe("DRAFT");
    expect(draftRes1.body.submission.repoUrl).toBe("https://github.com/prompt-techies/initial-draft");

    // Incremental update
    const draftRes2 = await leaderClient.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/updated-draft",
      liveUrl: "https://v2.demo.app",
      techTags: ["Next.js", "PostgreSQL", "Socket.IO"],
    });
    expect(draftRes2.status).toBe(200);
    expect(draftRes2.body.submission.repoUrl).toBe("https://github.com/prompt-techies/updated-draft");
  });

  it("Matrix-TTS-04: Non-leader member attempting to modify submission is rejected with 403", async () => {
    const team = await leaderClient.getMyTeam();
    memberClient = new ApiClient();
    await memberClient.register({
      name: "TTS Member",
      email: generateUniqueEmail("tts-mem"),
      password: "Password123!",
      intent: "join",
      teamCode: team.body.team.inviteCode,
    });

    const memberSubRes = await memberClient.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/unauthorized-edit",
    });
    expect(memberSubRes.status).toBe(403);
  });

  it("Matrix-TTS-05: Finalizing submission makes it permanently immutable", async () => {
    // Leader finalizes submission
    const finalRes = await leaderClient.finalizeSubmission({
      repoUrl: "https://github.com/prompt-techies/final-submission",
      liveUrl: "https://production.demo.app",
      techTags: ["Next.js", "Express", "Prisma"],
    });
    expect(finalRes.status).toBe(200);
    expect(finalRes.body.submission.status).toBe("SUBMITTED");
    expect(finalRes.body.submission.submittedAt).not.toBeNull();

    // Post-finalization edit attempt is rejected with 409
    const postEditRes = await leaderClient.saveSubmissionDraft({
      repoUrl: "https://github.com/prompt-techies/post-final-tamper",
    });
    expect(postEditRes.status).toBe(409);
    expect(postEditRes.body.error || postEditRes.body.message).toContain("already been finalized");
  });
});
