require("dotenv").config();

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
