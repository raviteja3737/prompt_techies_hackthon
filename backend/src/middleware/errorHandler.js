const { ZodError } = require("zod");
const ApiError = require("../utils/ApiError");

function notFoundHandler(req, res) {
  res.status(404).json({ error: "Route not found." });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Validation failed.",
      details: err.flatten(),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Prisma unique constraint violation, etc.
  if (err.code === "P2002") {
    return res.status(409).json({
      error: `A record with this ${err.meta?.target?.join(", ") || "value"} already exists.`,
    });
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
}

module.exports = { notFoundHandler, errorHandler };
