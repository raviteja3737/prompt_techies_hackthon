// Single-file deploy: root `.env` is the source of truth.
// Load legacy `backend/.env` first (wins if present, matches compose
// env_file order), then root `.env` fallback, then CWD default.
// Compose-injected env vars always win (dotenv never overrides them).
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
dotenv.config();

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
