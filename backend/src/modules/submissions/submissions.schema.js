const { z } = require("zod");
const { GITHUB_URL_REGEX } = require("../../utils/github");

const upsertSubmissionSchema = z.object({
  repoUrl: z.string().regex(GITHUB_URL_REGEX, "Must be a valid github.com repository URL."),
  liveUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  techTags: z.array(z.string().max(30)).max(15).optional(),
  submit: z.boolean().optional(), // true = final SUBMITTED, false/absent = DRAFT save
});

const uploadUrlSchema = z.object({
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024).optional(),
});

module.exports = { upsertSubmissionSchema, uploadUrlSchema };
