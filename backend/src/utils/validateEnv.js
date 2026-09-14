/**
 * Production environment validation (VPS / Docker single-file deploy).
 *
 * Root `.env` (copied from `.env.example`) is the ONLY runtime env file.
 * `backend/.env` is NOT read — see server.js / seed.js / docker-compose.yml.
 *
 * - In `production`: missing/weak secrets are fatal (fail fast at boot with
 *   a clear message instead of a cryptic runtime crash or, worse, running
 *   on known dev defaults).
 * - In dev/test: never throws — prints a warning so local setup stays
 *   frictionless. (`NODE_ENV=test` / Jest workers skip entirely; tests
 *   inject their own mock secrets via backend/tests/env.js.)
 */

const WEAK_JWT_SECRETS = new Set([
  "",
  "change-this-to-a-long-random-string",
  "change-this-too",
  "dev-magic-link-salt",
  "dev-salt-change-me",
  "promptothon-super-secret-jwt-key-2026-production",
  "promptothon-jury-alias-salt-2026",
  "test-secret-min-32-chars-for-promptothon-testing",
  "test-jury-alias-salt-offline",
]);

const WEAK_PASSWORDS = new Set([
  "",
  "password",
  "password123",
  "postgres",
  "changeme",
  "changeme123!",
  "ChangeMe123!",
  "Password123!",
]);

function isProd() {
  return process.env.NODE_ENV === "production";
}

function isTest() {
  return process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);
}

function validateEnv() {
  if (isTest()) return;

  const errors = [];
  const warnings = [];
  const prod = isProd();

  const jwtSecret = process.env.JWT_SECRET || "";
  if (!jwtSecret) {
    (prod ? errors : warnings).push("JWT_SECRET is missing (copy .env.example to .env and set a fresh value: openssl rand -hex 32).");
  } else if (prod && jwtSecret.length < 32) {
    errors.push(`JWT_SECRET must be 32+ chars in production (got ${jwtSecret.length}). Generate: openssl rand -hex 32.`);
  } else if (prod && WEAK_JWT_SECRETS.has(jwtSecret)) {
    errors.push("JWT_SECRET is a known dev/placeholder value — generate a fresh one: openssl rand -hex 32.");
  } else if (!prod && jwtSecret.length < 32) {
    warnings.push("JWT_SECRET is shorter than 32 chars — fine for local dev, but generate a fresh 32+ char value for production.");
  }

  const aliasSalt = process.env.JURY_ALIAS_SALT || "";
  if (!aliasSalt) {
    (prod ? errors : warnings).push("JURY_ALIAS_SALT is missing (copy .env.example to .env and set a fresh value: openssl rand -hex 32).");
  } else if (prod && aliasSalt.length < 32) {
    errors.push(`JURY_ALIAS_SALT must be 32+ chars in production (got ${aliasSalt.length}). Generate: openssl rand -hex 32.`);
  } else if (prod && WEAK_JWT_SECRETS.has(aliasSalt)) {
    errors.push("JURY_ALIAS_SALT is a known dev/placeholder value — generate a fresh one: openssl rand -hex 32.");
  }

  const pgPassword = process.env.POSTGRES_PASSWORD || "";
  if (!pgPassword) {
    (prod ? errors : warnings).push("POSTGRES_PASSWORD is missing (set a fresh value in root .env).");
  } else if (prod && WEAK_PASSWORDS.has(pgPassword)) {
    errors.push('POSTGRES_PASSWORD is a known dev default (e.g. "password123") — set a fresh value in root .env.');
  } else if (prod && pgPassword.length < 12) {
    errors.push("POSTGRES_PASSWORD must be 12+ chars in production.");
  }

  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    const value = process.env[name] || "";
    if (!value) {
      (prod ? errors : warnings).push(`${name} is missing (docker-compose.yml builds it from POSTGRES_*; local dev reads it from root .env).`);
    } else if (prod && /localhost|127\.0\.0\.1/i.test(value)) {
      errors.push(`${name} points at localhost — inside Docker the DB host must be "db" (compose injects it; do not override with a localhost URL).`);
    } else if (prod && /password123/i.test(value)) {
      errors.push(`${name} contains the dev password "password123" — rotate POSTGRES_PASSWORD in root .env.`);
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminEmail || !adminPassword) {
    (prod ? errors : warnings).push("ADMIN_EMAIL / ADMIN_PASSWORD must be set (used once by prisma/seed.js to bootstrap the admin).");
  } else if (prod && WEAK_PASSWORDS.has(adminPassword)) {
    errors.push('ADMIN_PASSWORD is a known dev default (e.g. "ChangeMe123!") — set a fresh value in root .env.');
  }

  for (const name of ["CLIENT_ORIGIN", "API_PUBLIC_URL"]) {
    const value = process.env[name] || "";
    if (!value) {
      (prod ? errors : warnings).push(`${name} is missing (set it to the real public URL in root .env).`);
    } else if (prod && /localhost|127\.0\.0\.1/i.test(value)) {
      errors.push(`${name}="${value}" — must be the real public https:// URL in production, not localhost.`);
    } else if (prod && !/^https:\/\//i.test(value)) {
      errors.push(`${name}="${value}" — must start with https:// in production (secure cookies require HTTPS).`);
    }
  }

  if (warnings.length && !prod) {
    warnings.forEach((w) => console.warn(`[env] warning: ${w}`));
  }

  if (errors.length) {
    throw new Error(`[env] Invalid production configuration:\n - ${errors.join("\n - ")}\nFix root .env (copied from .env.example), then: docker compose up --build -d`);
  }
}

module.exports = { validateEnv };
