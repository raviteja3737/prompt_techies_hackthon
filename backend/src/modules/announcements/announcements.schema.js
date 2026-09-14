const { z } = require("zod");

const priority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const createAnnouncementSchema = z.object({
  title: z.string().min(2).max(160),
  message: z.string().min(1).max(5000),
  priority: priority.default("NORMAL"),
  published: z.boolean().default(true),
  scheduledAt: z.union([z.string().datetime({ offset: true }), z.string().datetime()]).nullable().optional(),
});

const updateAnnouncementSchema = createAnnouncementSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { createAnnouncementSchema, updateAnnouncementSchema, listQuerySchema };
