/**
 * tests/e2e/helpers/testFramework.js
 * 
 * Lightweight, zero-dependency async test framework providing:
 * - describe, it / test, beforeAll, afterAll, beforeEach, afterEach
 * - expect() assertions with chaining
 * - structured execution metrics and reporting
 */

const state = {
  suites: [],
  currentSuite: null,
  activeFilter: null,
  isSmoke: false,
};

class Expectation {
  constructor(actual, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not() {
    return new Expectation(this.actual, !this.isNot);
  }

  _assert(condition, message) {
    const pass = this.isNot ? !condition : condition;
    if (!pass) {
      throw new Error(message);
    }
  }

  toBe(expected) {
    this._assert(
      this.actual === expected,
      `Expected ${JSON.stringify(this.actual)} to be ${JSON.stringify(expected)}`
    );
  }

  toEqual(expected) {
    const act = JSON.stringify(this.actual);
    const exp = JSON.stringify(expected);
    this._assert(act === exp, `Expected deep equality:\nActual:   ${act}\nExpected: ${exp}`);
  }

  toBeDefined() {
    this._assert(this.actual !== undefined, `Expected value to be defined, received undefined`);
  }

  toBeUndefined() {
    this._assert(this.actual === undefined, `Expected value to be undefined, received ${this.actual}`);
  }

  toBeNull() {
    this._assert(this.actual === null, `Expected value to be null, received ${this.actual}`);
  }

  toBeTruthy() {
    this._assert(Boolean(this.actual), `Expected ${this.actual} to be truthy`);
  }

  toBeFalsy() {
    this._assert(!Boolean(this.actual), `Expected ${this.actual} to be falsy`);
  }

  toBeGreaterThan(expected) {
    this._assert(
      typeof this.actual === "number" && this.actual > expected,
      `Expected ${this.actual} > ${expected}`
    );
  }

  toBeGreaterThanOrEqual(expected) {
    this._assert(
      typeof this.actual === "number" && this.actual >= expected,
      `Expected ${this.actual} >= ${expected}`
    );
  }

  toBeLessThan(expected) {
    this._assert(
      typeof this.actual === "number" && this.actual < expected,
      `Expected ${this.actual} < ${expected}`
    );
  }

  toBeLessThanOrEqual(expected) {
    this._assert(
      typeof this.actual === "number" && this.actual <= expected,
      `Expected ${this.actual} <= ${expected}`
    );
  }

  toContain(item) {
    if (typeof this.actual === "string" || Array.isArray(this.actual)) {
      this._assert(
        this.actual.includes(item),
        `Expected ${JSON.stringify(this.actual)} to contain ${JSON.stringify(item)}`
      );
    } else {
      throw new Error(`toContain requires string or array, got ${typeof this.actual}`);
    }
  }

  toMatch(regex) {
    const re = typeof regex === "string" ? new RegExp(regex) : regex;
    this._assert(re.test(String(this.actual)), `Expected "${this.actual}" to match ${regex}`);
  }

  toThrow(pattern) {
    if (typeof this.actual !== "function") {
      throw new Error(`toThrow requires a function, received ${typeof this.actual}`);
    }
    let threw = false;
    let error = null;
    try {
      this.actual();
    } catch (err) {
      threw = true;
      error = err;
    }
    this._assert(threw, `Expected function to throw, but it did not throw`);
    if (threw && pattern) {
      const msg = error ? error.message : "";
      if (pattern instanceof RegExp) {
        this._assert(pattern.test(msg), `Expected error message to match ${pattern}, got "${msg}"`);
      } else {
        this._assert(msg.includes(pattern), `Expected error message to include "${pattern}", got "${msg}"`);
      }
    }
  }
}

function expect(actual) {
  return new Expectation(actual);
}

function describe(title, fn) {
  const suite = {
    title,
    tests: [],
    beforeAllHooks: [],
    afterAllHooks: [],
    beforeEachHooks: [],
    afterEachHooks: [],
    parent: state.currentSuite,
    suites: [],
  };

  if (state.currentSuite) {
    state.currentSuite.suites.push(suite);
  } else {
    state.suites.push(suite);
  }

  const prevSuite = state.currentSuite;
  state.currentSuite = suite;
  try {
    fn();
  } finally {
    state.currentSuite = prevSuite;
  }
}

function it(title, fn, options = {}) {
  if (!state.currentSuite) {
    throw new Error(`Test "${title}" must be defined inside a describe() block`);
  }
  state.currentSuite.tests.push({
    title,
    fn,
    timeout: options.timeout || 15000,
    isSmoke: Boolean(options.smoke),
  });
}

const test = it;

function beforeAll(fn) {
  if (!state.currentSuite) throw new Error("beforeAll must be inside describe()");
  state.currentSuite.beforeAllHooks.push(fn);
}

function afterAll(fn) {
  if (!state.currentSuite) throw new Error("afterAll must be inside describe()");
  state.currentSuite.afterAllHooks.push(fn);
}

function beforeEach(fn) {
  if (!state.currentSuite) throw new Error("beforeEach must be inside describe()");
  state.currentSuite.beforeEachHooks.push(fn);
}

function afterEach(fn) {
  if (!state.currentSuite) throw new Error("afterEach must be inside describe()");
  state.currentSuite.afterEachHooks.push(fn);
}

function resetRegistry() {
  state.suites = [];
  state.currentSuite = null;
}

function setFilter(filter) {
  state.activeFilter = filter;
}

function setSmoke(isSmoke) {
  state.isSmoke = isSmoke;
}

async function runSuite(suite, results, inheritedBeforeEach = [], inheritedAfterEach = []) {
  const beforeEachList = [...inheritedBeforeEach, ...suite.beforeEachHooks];
  const afterEachList = [...suite.afterEachHooks, ...inheritedAfterEach];

  // Run beforeAll hooks
  for (const hook of suite.beforeAllHooks) {
    await hook();
  }

  // Run tests
  for (const t of suite.tests) {
    if (state.isSmoke && !t.isSmoke && !t.title.toLowerCase().includes("smoke") && !suite.title.toLowerCase().includes("smoke")) {
      // In smoke mode, skip non-smoke tests
      results.skipped += 1;
      continue;
    }

    if (state.activeFilter && !t.title.toLowerCase().includes(state.activeFilter.toLowerCase()) && !suite.title.toLowerCase().includes(state.activeFilter.toLowerCase())) {
      results.skipped += 1;
      continue;
    }

    results.total += 1;
    const testResult = {
      suite: suite.title,
      title: t.title,
      passed: false,
      durationMs: 0,
      error: null,
    };

    const startTime = Date.now();
    try {
      for (const bh of beforeEachList) await bh();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Test timed out after ${t.timeout}ms`)), t.timeout);
      });

      await Promise.race([t.fn(), timeoutPromise]);

      for (const ah of afterEachList) await ah();

      testResult.passed = true;
      results.passed += 1;
    } catch (err) {
      testResult.error = err.message || String(err);
      results.failed += 1;
      results.failures.push({
        suite: suite.title,
        title: t.title,
        error: err.stack || err.message,
      });
    } finally {
      testResult.durationMs = Date.now() - startTime;
      results.tests.push(testResult);
    }
  }

  // Run child suites
  for (const child of suite.suites) {
    await runSuite(child, results, beforeEachList, afterEachList);
  }

  // Run afterAll hooks
  for (const hook of suite.afterAllHooks) {
    await hook();
  }
}

async function runAllSuites() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    tests: [],
    failures: [],
  };

  const startTime = Date.now();
  for (const suite of state.suites) {
    await runSuite(suite, results);
  }
  results.durationMs = Date.now() - startTime;
  return results;
}

module.exports = {
  describe,
  it,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  runAllSuites,
  resetRegistry,
  setFilter,
  setSmoke,
};
