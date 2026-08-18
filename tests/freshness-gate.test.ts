/**
 * Tests for the pure freshness classifier. Each case names the specific claim it proves rather
 * than just re-stating the input, since the boundaries here are the whole point of the module.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFreshness, overallFreshness, type Cadence } from "../src/freshness-gate.ts";

const MIN = 60_000;
const NOW = 1_760_000_000_000; // fixed ms-epoch, repeatable across runs
const cadence: Cadence = { name: "test", expectedIntervalMin: 5, graceMin: 10 }; // tolerance = 15

// ---------------------------------- classifyFreshness ----------------------------------

test("never-seen (null or undefined lastAt) is red, not a softer unknown", () => {
  assert.equal(classifyFreshness(null, NOW, cadence), "red");
  assert.equal(classifyFreshness(undefined, NOW, cadence), "red");
});

test("NaN, Infinity, and negative lastAt are all red, none of them is a valid report", () => {
  assert.equal(classifyFreshness(NaN, NOW, cadence), "red");
  assert.equal(classifyFreshness(Infinity, NOW, cadence), "red");
  assert.equal(classifyFreshness(-Infinity, NOW, cadence), "red");
  assert.equal(classifyFreshness(-1, NOW, cadence), "red");
  assert.equal(classifyFreshness(0, NOW, cadence), "red");
});

test("boundary: exactly tolerance (expectedIntervalMin + graceMin) is still fresh", () => {
  const lastAt = NOW - 15 * MIN; // tolerance = 5 + 10 = 15
  assert.equal(classifyFreshness(lastAt, NOW, cadence), "fresh");
});

test("boundary: one ms past tolerance is stale", () => {
  const lastAt = NOW - (15 * MIN + 1);
  assert.equal(classifyFreshness(lastAt, NOW, cadence), "stale");
});

test("boundary: exactly tolerance*redMultiple (default 3) is still stale", () => {
  const lastAt = NOW - 45 * MIN; // 15 * 3
  assert.equal(classifyFreshness(lastAt, NOW, cadence), "stale");
});

test("boundary: one ms past tolerance*redMultiple is red", () => {
  const lastAt = NOW - (45 * MIN + 1);
  assert.equal(classifyFreshness(lastAt, NOW, cadence), "red");
});

test("future skew (lastAt after now) is fresh, since skew and a lie are not distinguishable and treating skew as suspect only manufactures false alarms", () => {
  assert.equal(classifyFreshness(NOW + 5 * MIN, NOW, cadence), "fresh");
  assert.equal(classifyFreshness(NOW + 1000 * MIN, NOW, cadence), "fresh");
});

test("custom redMultiple shifts the stale/red boundary", () => {
  const lastAt = NOW - 35 * MIN; // tolerance is 15, so this is already past fresh either way
  assert.equal(classifyFreshness(lastAt, NOW, cadence, 3), "stale"); // 35 <= 15*3 (45)
  assert.equal(classifyFreshness(lastAt, NOW, cadence, 2), "red"); // 35 > 15*2 (30)
  assert.equal(classifyFreshness(lastAt, NOW, cadence, 1), "red"); // 1x collapses the stale band to nothing
});

// ---------------------------------- overallFreshness ----------------------------------

test("empty timestamp set is red with null fields, nothing reported is not milder than gone quiet", () => {
  const r = overallFreshness([], NOW, cadence);
  assert.deepEqual(r, { level: "red", lastAt: null, ageMin: null });
});

test("a set with only invalid entries (NaN, Infinity, zero, negative) is red with null fields", () => {
  const r = overallFreshness([NaN, Infinity, -Infinity, 0, -100], NOW, cadence);
  assert.deepEqual(r, { level: "red", lastAt: null, ageMin: null });
});

test("overall takes the max, not the min: one fresh timestamp among stale ones makes the system fresh, because overallFreshness asserts the reporting pipeline is alive, not that every source is current", () => {
  const fresh = NOW - 1 * MIN;
  const stale = NOW - 20 * MIN;
  const alsoStale = NOW - 40 * MIN;
  const r = overallFreshness([stale, fresh, alsoStale], NOW, cadence);
  assert.equal(r.level, "fresh");
  assert.equal(r.lastAt, fresh);
});

test("overall reflects the worst case too: all-stale timestamps classify as stale, not fresh", () => {
  const r = overallFreshness([NOW - 20 * MIN, NOW - 25 * MIN], NOW, cadence);
  assert.equal(r.level, "stale");
  assert.equal(r.lastAt, NOW - 20 * MIN);
});

test("overall filters out invalid entries before taking the max, rather than letting them win", () => {
  const fresh = NOW - 2 * MIN;
  const r = overallFreshness([NaN, Infinity, -1, 0, fresh], NOW, cadence);
  assert.equal(r.level, "fresh");
  assert.equal(r.lastAt, fresh);
});

test("overall reports ageMin consistent with now minus the chosen lastAt", () => {
  const lastAt = NOW - 7 * MIN;
  const r = overallFreshness([lastAt], NOW, cadence);
  assert.equal(r.lastAt, lastAt);
  assert.equal(r.ageMin, 7);
});
