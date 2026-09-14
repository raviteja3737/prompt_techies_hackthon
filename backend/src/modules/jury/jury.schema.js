const { z } = require("zod");

const rubricScore = z.number().int().min(0).max(25);

const evaluateSchema = z.object({
  teamId: z.string().min(1),
  innovation: rubricScore,
  technical: rubricScore,
  design: rubricScore,
  viability: rubricScore,
  feedback: z.string().trim().max(4000).optional(),
  // false/absent = save as DRAFT (editable, resubmittable); true = LOCKED (final, immutable).
  lock: z.boolean().optional().default(false),
});

const magicLinkRequestSchema = z.object({
  email: z.string().email(),
});

const magicLinkVerifySchema = z.object({
  token: z.string().min(20),
});

module.exports = { evaluateSchema, magicLinkRequestSchema, magicLinkVerifySchema };
