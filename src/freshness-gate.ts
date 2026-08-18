/**
 * Freshness classification (pure).
 *
 * A process that reports its own health can only tell you what it last wrote down, and that
 * self-report is worthless the instant the process stops running. This module never reads a
 * self-reported flag. Instead it computes freshness from real timestamps checked against a
 * declared cadence, so a dead process looks dead from the outside, and a process that has never
 * reported at all is indistinguishable from one that died: both come back red, never a softer
 * "unknown" in between.
 *
 * Two shapes are provided:
 *   - classifyFreshness: classify a single timestamp against a single cadence.
 *   - overallFreshness: classify a set of timestamps as one system, using the most recent of
 *     them. One fresh entry among stale ones is enough to call the whole set fresh, because that
 *     is a claim about whether the reporting pipeline itself is still alive, not a claim that
 *     every individual source in it is current.
 *
 * No IO, no clock reads, no globals. Every timestamp and "now" is a parameter you supply.
 */

export type Cadence = { name: string; expectedIntervalMin: number; graceMin: number };
export type FreshnessLevel = "fresh" | "stale" | "red";

/**
 * Classify one freshness fact. `lastAt` and `now` are ms-epoch. `expectedIntervalMin` and
 * `graceMin` describe how often this source is supposed to report. Within interval+grace is
 * fresh; beyond that but within tolerance*redMultiple is stale; beyond that is red.
 *
 * A missing, non-finite, or non-positive `lastAt` is red: never having reported must look exactly
 * like having died, not like some third, softer state. A negative age (`lastAt` in the future,
 * i.e. clock skew) is treated as fresh rather than flagged as a lie, since skew and truth are not
 * distinguishable from the timestamp alone, and treating skew as suspect would only manufacture
 * false alarms out of a clock difference.
 */
export function classifyFreshness(
  lastAt: number | null | undefined,
  now: number,
  cadence: Pick<Cadence, "expectedIntervalMin" | "graceMin">,
  redMultiple = 3,
): FreshnessLevel {
  if (lastAt == null || !Number.isFinite(lastAt) || lastAt <= 0) return "red";
  const ageMin = (now - lastAt) / 60000;
  if (ageMin < 0) return "fresh"; // clock skew toward the future: treat as fresh, not a lie
  const tolerance = cadence.expectedIntervalMin + cadence.graceMin;
  if (ageMin <= tolerance) return "fresh";
  if (ageMin <= tolerance * redMultiple) return "stale";
  return "red";
}

/**
 * Classify a set of timestamps as one system: the system is only as fresh as its most recent
 * valid entry. Returns the level for `now - max(validTimestamps)`. An empty set, or a set with no
 * valid entries, is red with null fields, for the same reason a missing single timestamp is red:
 * nothing reported is not a milder case than something reported and gone quiet.
 */
export function overallFreshness(
  timestamps: readonly number[],
  now: number,
  cadence: Pick<Cadence, "expectedIntervalMin" | "graceMin">,
  redMultiple = 3,
): { level: FreshnessLevel; lastAt: number | null; ageMin: number | null } {
  const valid = timestamps.filter((t) => Number.isFinite(t) && t > 0);
  if (valid.length === 0) return { level: "red", lastAt: null, ageMin: null };
  const lastAt = Math.max(...valid);
  const level = classifyFreshness(lastAt, now, cadence, redMultiple);
  return { level, lastAt, ageMin: (now - lastAt) / 60000 };
}
