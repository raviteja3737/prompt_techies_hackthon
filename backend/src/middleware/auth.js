const { verifyToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");
const prisma = require("../config/prisma");

/**
 * Reads the JWT from the HTTP-only cookie (preferred) or an Authorization:
 * Bearer header (useful for non-browser clients / testing), verifies it,
 * and attaches the current user to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || "promptothon_token";
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies?.[cookieName] || bearer;

    if (!token) {
      throw new ApiError(401, "Authentication required.");
    }

    const payload = verifyToken(token);

    let user;
    try {
      user = await prisma.user.findUnique({ where: { id: payload.sub } });
    } catch (dbErr) {
      if (process.env.NODE_ENV === "development") {
        user = {
          id: payload.sub,
          role: payload.role || "PARTICIPANT",
          name: payload.role === "ADMIN" ? "Admin Developer" : "Participant User",
          email: payload.role === "ADMIN" ? "admin@promptothon.dev" : "user@promptothon.dev",
        };
      } else {
        throw dbErr;
      }
    }

    if (!user) {
      throw new ApiError(401, "Session is no longer valid.");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, "Invalid or expired session."));
  }
}

/**
 * RBAC guard. Usage: requireRole("ADMIN") or requireRole("JURY", "ADMIN").
 * Must run after requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have access to this resource."));
    }
    next();
  };
}

/** Populates req.user if a valid token is present, but never rejects. */
async function optionalAuth(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || "promptothon_token";
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies?.[cookieName] || bearer;
    if (!token) return next();

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
}

module.exports = { requireAuth, requireRole, optionalAuth };
