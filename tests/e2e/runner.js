#!/usr/bin/env node
/**
 * tests/e2e/runner.js
 * 
 * Comprehensive E2E Test Runner for Prompt Techies Hackathon
 * 
 * Supports:
 *   --tier=1 | --tier=2 | --tier=3 | --tier=4 | --all
 *   --smoke
 *   --json
 *   --filter=<name>
 *   --help
 */

const path = require("path");
const {
  runAllSuites,
  setSmoke,
  setFilter,
  resetRegistry,
} = require("./helpers/testFramework");
const { disconnectDb } = require("./helpers/dbHelper");

const TIER_FILES = {
  1: [
    "./tier1/01_infrastructure.test.js",
    "./tier1/02_auth.test.js",
    "./tier1/03_team_track.test.js",
    "./tier1/04_rbac.test.js",
    "./tier1/05_frontend_views_audit.test.js",
    "./tier1/06_backend_quality.test.js",
    "./tier1/07_certification.test.js",
  ],
  2: [
    "./tier2/boundary_infrastructure.test.js",
    "./tier2/boundary_auth.test.js",
    "./tier2/boundary_team_track.test.js",
    "./tier2/boundary_rbac.test.js",
    "./tier2/boundary_views.test.js",
    "./tier2/boundary_quality_certification.test.js",
  ],
  3: [
    "./tier3/matrix_auth_teams.test.js",
    "./tier3/matrix_teams_tracks_submissions.test.js",
    "./tier3/matrix_jury_evaluations_leaderboard.test.js",
    "./tier3/matrix_admin_settings_announcements.test.js",
  ],
  4: [
    "./tier4/scenario_full_hackathon_lifecycle.test.js",
    "./tier4/scenario_solo_hacker_networking.test.js",
    "./tier4/scenario_multi_team_leaderboard_freeze.test.js",
    "./tier4/scenario_adversarial_concurrency_security.test.js",
  ],
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tiers: [1, 2, 3, 4],
    smoke: false,
    json: false,
    filter: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--smoke" || arg === "-s") {
      options.smoke = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg.startsWith("--tier=")) {
      const val = arg.split("=")[1];
      if (val === "all") {
        options.tiers = [1, 2, 3, 4];
      } else {
        options.tiers = val.split(",").map((t) => parseInt(t.trim(), 10));
      }
    } else if (arg === "--tier" || arg === "-t") {
      const val = args[++i];
      if (val === "all") {
        options.tiers = [1, 2, 3, 4];
      } else {
        options.tiers = val.split(",").map((t) => parseInt(t.trim(), 10));
      }
    } else if (arg === "--all") {
      options.tiers = [1, 2, 3, 4];
    } else if (arg.startsWith("--filter=")) {
      options.filter = arg.split("=")[1];
    } else if (arg === "--filter" || arg === "-f") {
      options.filter = args[++i];
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Prompt Techies Hackathon E2E Test Runner

Usage:
  node tests/e2e/runner.js [options]
  npm run test:e2e -- [options]

Options:
  --all                 Run all test suites across all 4 tiers (default)
  --tier=1..4           Run tests for specific tier (e.g. --tier=1, --tier=2,3)
  --smoke, -s           Run smoke tests only (fast sanity pass)
  --filter=<query>, -f  Filter test suite or case titles by substring
  --json                Output results strictly as formatted JSON
  --help, -h            Show this help guide

Tiers:
  Tier 1: Core Feature Coverage (>=5 tests per feature for all 27 features)
  Tier 2: Boundary & Corner Cases (>=5 edge cases per feature for all 27 features)
  Tier 3: Cross-Feature Interaction Matrix (state machines & cross-domain interactions)
  Tier 4: Real-World Scenarios (multi-user end-to-end hackathon lifecycle journeys)
`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.smoke) {
    setSmoke(true);
  }
  if (options.filter) {
    setFilter(options.filter);
  }

  if (!options.json) {
    console.log("================================================================================");
    console.log("             PROMPT TECHIES HACKATHON — E2E TEST RUNNER");
    console.log("================================================================================");
    console.log(`Mode:      ${options.smoke ? "SMOKE TEST" : "FULL TEST RUN"}`);
    console.log(`Tiers:     ${options.tiers.join(", ")}`);
    if (options.filter) console.log(`Filter:    "${options.filter}"`);
    console.log("--------------------------------------------------------------------------------\n");
  }

  // Collect test files to load
  const filesToLoad = [];
  for (const tier of options.tiers) {
    if (TIER_FILES[tier]) {
      for (const relPath of TIER_FILES[tier]) {
        filesToLoad.push(path.resolve(__dirname, relPath));
      }
    }
  }

  // Load test files into registry
  for (const filePath of filesToLoad) {
    try {
      require(filePath);
    } catch (err) {
      console.error(`Error loading test file ${filePath}:`, err);
      process.exit(1);
    }
  }

  // Run test suites
  const results = await runAllSuites();

  // Close direct DB connection
  await disconnectDb();

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          success: results.failed === 0,
          total: results.total,
          passed: results.passed,
          failed: results.failed,
          skipped: results.skipped,
          durationMs: results.durationMs,
          failures: results.failures,
        },
        null,
        2
      )
    );
  } else {
    // Print human-readable summary
    console.log("\n================================================================================");
    console.log("                              TEST EXECUTION SUMMARY");
    console.log("================================================================================");
    console.log(`Total Executed:  ${results.total}`);
    console.log(`Passed:          ${results.passed}`);
    console.log(`Failed:          ${results.failed}`);
    console.log(`Skipped:         ${results.skipped}`);
    console.log(`Duration:        ${(results.durationMs / 1000).toFixed(2)}s`);
    console.log("--------------------------------------------------------------------------------");

    if (results.failed > 0) {
      console.log("\nFAILURES:");
      results.failures.forEach((f, idx) => {
        console.log(`\n[${idx + 1}] ${f.suite} -> ${f.title}`);
        console.log(f.error);
      });
      console.log("\nOVERALL STATUS: FAILED ❌");
    } else {
      console.log("\nOVERALL STATUS: PASSED ALL TESTS ✅");
    }
    console.log("================================================================================\n");
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal runner error:", err);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, TIER_FILES };
