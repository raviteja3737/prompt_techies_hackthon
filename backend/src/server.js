// Single-file deploy: root `.env` is the ONLY env file.
// (backend/.env is NOT read — root .env holds Next.js + API + Postgres.)
// Compose-injected env vars always win (dotenv never overrides them).
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
dotenv.config();

// Fail fast on missing/weak production secrets (no-op outside production).
require("./utils/validateEnv").validateEnv();

const http = require("http");
const app = require("./app");
const { initSockets } = require("./sockets");

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);
initSockets(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[promptothon-backend] listening on :${PORT} (${process.env.NODE_ENV || "development"})`);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
