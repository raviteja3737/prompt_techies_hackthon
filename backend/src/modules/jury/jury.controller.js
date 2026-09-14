const asyncHandler = require("../../utils/asyncHandler");
const { evaluateSchema, magicLinkRequestSchema, magicLinkVerifySchema } = require("./jury.schema");
const {
  getQueueForJury,
  submitEvaluation,
  requestMagicLink,
  verifyMagicLink,
  getEvaluationsForTeam,
} = require("./jury.service");

const COOKIE_NAME = process.env.COOKIE_NAME || "promptothon_token";
function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/** GET /api/jury/queue — only the teams assigned to the calling jury member. */
const getQueue = asyncHandler(async (req, res) => {
  const queue = await getQueueForJury(req.user.id);
  res.json({ queue });
});

/** POST /api/jury/evaluate — save draft or lock a final score. */
const evaluate = asyncHandler(async (req, res) => {
  const input = evaluateSchema.parse(req.body);
  const evaluation = await submitEvaluation(req.user.id, input);
  res.json({ evaluation });
});

/** POST /api/jury/magic-link/request — public. Never reveals whether the email matched a jury account. */
const requestLink = asyncHandler(async (req, res) => {
  const { email } = magicLinkRequestSchema.parse(req.body);
  const result = await requestMagicLink(email);
  res.json({
    message: "If that email belongs to a registered jury account, a login link has been sent.",
    ...(result.devToken ? { devToken: result.devToken } : {}),
  });
});

/** POST /api/jury/magic-link/verify — public. Exchanges a one-time token for a session cookie. */
const verifyLink = asyncHandler(async (req, res) => {
  const { token } = magicLinkVerifySchema.parse(req.body);
  const { user, token: sessionToken } = await verifyMagicLink(token);
  setSessionCookie(res, sessionToken);
  res.json({ user, token: sessionToken });
});

/** GET /api/jury/evaluations/:teamId — role-scoped view, see jury.service for the access matrix. */
const getEvaluations = asyncHandler(async (req, res) => {
  const result = await getEvaluationsForTeam(req.user, req.params.teamId);
  res.json(result);
});

module.exports = { getQueue, evaluate, requestLink, verifyLink, getEvaluations };
