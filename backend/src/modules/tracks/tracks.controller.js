const { z } = require("zod");
const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { recordAudit } = require("../../utils/auditLog");

const trackSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2),
  guidelines: z.string().optional(),
  datasetUrl: z.string().url().optional(),
  capacity: z.number().int().positive().optional(),
});

/** GET /api/tracks \u2014 problem statements, guidelines & datasets. */
const listTracks = asyncHandler(async (req, res) => {
  let tracks;
  try {
    tracks = await prisma.track.findMany({ orderBy: { createdAt: "asc" } });
  } catch (dbErr) {
    if (process.env.NODE_ENV !== "production") {
      tracks = [
        { id: "track-1", title: "Generative AI Agents & Reasoning", description: "Design autonomous multi-step agents using LLM reasoning and tools." },
        { id: "track-2", title: "Intelligent Developer Platforms", description: "Build automated code refactoring, test generation, and DevOps bots." },
        { id: "track-3", title: "AI for Social Good & Healthcare", description: "Deploy high-impact assistive AI solutions for healthcare, education, or accessibility." },
      ];
      return res.json({ tracks });
    }
    throw dbErr;
  }
  res.json({ tracks });
});

/** GET /api/tracks/:id */
const getTrack = asyncHandler(async (req, res) => {
  const track = await prisma.track.findUnique({ where: { id: req.params.id } });
  if (!track) throw new ApiError(404, "Track not found.");
  res.json({ track });
});

/** POST /api/tracks \u2014 admin-only creation for the problem statement CMS. */
const createTrack = asyncHandler(async (req, res) => {
  const input = trackSchema.parse(req.body);
  const track = await prisma.track.create({ data: input });
  await recordAudit(req.user.id, "TRACK_CREATED", { trackId: track.id });
  res.status(201).json({ track });
});

/** PATCH /api/tracks/:id */
const updateTrack = asyncHandler(async (req, res) => {
  const input = trackSchema.partial().parse(req.body);
  const track = await prisma.track
    .update({ where: { id: req.params.id }, data: input })
    .catch(() => null);
  if (!track) throw new ApiError(404, "Track not found.");
  await recordAudit(req.user.id, "TRACK_UPDATED", { trackId: track.id });
  res.json({ track });
});

/** DELETE /api/tracks/:id */
const deleteTrack = asyncHandler(async (req, res) => {
  await prisma.track.delete({ where: { id: req.params.id } }).catch(() => {
    throw new ApiError(404, "Track not found.");
  });
  await recordAudit(req.user.id, "TRACK_DELETED", { trackId: req.params.id });
  res.status(204).send();
});

module.exports = { listTracks, getTrack, createTrack, updateTrack, deleteTrack };
