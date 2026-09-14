const { z } = require("zod");

// Query params always arrive as strings, so coerce the paging numbers.
const attendeesQuerySchema = z.object({
  skill: z.string().trim().max(40).optional(),
  technology: z.string().trim().max(40).optional(),
  college: z.string().trim().max(120).optional(),
  search: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const connectSchema = z.object({
  userId: z.string().min(1),
});

module.exports = { attendeesQuerySchema, connectSchema };
