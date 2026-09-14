const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Prefer a dedicated test database so `npm test` never touches dev/seed
// data. Copy the unified ../../.env.example (Sections 2+4) -> .env.test
// and point DATABASE_URL at a throwaway database before running the suite.
const testEnvPath = path.resolve(__dirname, "..", ".env.test");
dotenv.config({ path: fs.existsSync(testEnvPath) ? testEnvPath : path.resolve(__dirname, "..", ".env") });

process.env.NODE_ENV = "test";
if (!process.env.PORT) process.env.PORT = "4001";
if (!process.env.CLIENT_ORIGIN) process.env.CLIENT_ORIGIN = "http://localhost:3000";
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mockdb";
if (!process.env.DIRECT_URL) process.env.DIRECT_URL = "postgresql://mock:mock@localhost:5432/mockdb";
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-min-32-chars-for-promptothon-testing";
if (!process.env.JWT_EXPIRES_IN) process.env.JWT_EXPIRES_IN = "7d";
if (!process.env.COOKIE_NAME) process.env.COOKIE_NAME = "promptothon_token";
if (!process.env.JURY_ALIAS_SALT) process.env.JURY_ALIAS_SALT = "test-jury-alias-salt-offline";
if (!process.env.STORAGE_PROVIDER) process.env.STORAGE_PROVIDER = "disabled";
if (!process.env.GITHUB_API_VERIFICATION) process.env.GITHUB_API_VERIFICATION = "disabled";

