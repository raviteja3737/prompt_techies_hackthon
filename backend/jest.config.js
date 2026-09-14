module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/env.js"],
  testTimeout: 20000,
  maxWorkers: 1,
  // Prisma against a single shared Postgres test DB — safer sequential
  // (jest --runInBand, set in package.json's test script) than parallel
  // workers stepping on each other's truncated tables.
  testPathIgnorePatterns: ["/node_modules/"],
};
