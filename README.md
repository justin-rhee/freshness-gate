# freshness-gate

[![tests](https://github.com/justin-rhee/freshness-gate/actions/workflows/test.yml/badge.svg)](https://github.com/justin-rhee/freshness-gate/actions/workflows/test.yml)

Two small TypeScript functions for health checks that read a status field: **classify one timestamp as fresh, stale or red**, **classify a whole set of timestamps as one system**, and **make never-seen look exactly like dead**. About 70 lines in two pure functions, zero dependencies, one file to copy.

It exists because most dashboards ask a process "are you healthy" and get back whatever it last wrote down, a value that survives the thing that wrote it: a crashed worker and one quietly in a coma both stay green forever if green is just a flag someone set once. The honest question is when the work itself last ran, which only timestamps the work produced can answer. This is that second question. If you run finished services rather than your own code, a hosted dead man's switch (healthchecks.io, Dead Man's Snitch) already does this job; this is the embeddable half of that pattern, for when the classification has to live in your own monitoring code.

## Use it if

- your monitoring reads a status field something else wrote, and you want never-seen to look the same as dead
- you need exact boundaries you can pin in a test
- you'd rather pass the clock in than have a module read it

## How it works

`classifyFreshness(lastAt, now, cadence, redMultiple?)` takes one timestamp and returns `"fresh"`, `"stale"`, or `"red"`. A cadence declares `expectedIntervalMin` and `graceMin`, and their sum is the tolerance window: within it is fresh, beyond it but within `tolerance * redMultiple` is stale, further out is red, with `redMultiple` defaulting to 3. A missing, non-finite, or non-positive `lastAt` is red, because never having reported must look exactly like having died. A negative age, a timestamp ahead of `now`, is treated as fresh rather than as a lie, since clock skew and truth are not distinguishable from the number alone.

`overallFreshness(timestamps, now, cadence, redMultiple?)` takes a whole set of timestamps and classifies the set as one system, using the most recent valid entry. An empty set, or a set with nothing valid in it, comes back red with null fields, for the same reason a single missing timestamp is red. Both functions are pure: no clock reads, no I/O, no imports.

## Install

There's no build step and nothing to compile. Copy `src/freshness-gate.ts` into your project and import `classifyFreshness` and `overallFreshness` directly. It has zero dependencies.

```sh
git clone https://github.com/justin-rhee/freshness-gate
cp freshness-gate/src/freshness-gate.ts your-project/src/
bash tests/run.sh   # 14 tests should pass
```

Verify the copy works before you build on it: pass a `lastAt` of `null` and confirm the answer is red, not fresh.

## What it won't do

- collect timestamps, poll anything, or schedule checks of its own
- send alerts or notifications, it only returns a classification
- flag a future timestamp as suspicious: forward clock skew is trusted as fresh by design, because guessing wrong about skew produces false alarms with no real payoff
- tell you every source feeding the pipeline is current: `overallFreshness` tells you the reporting pipeline as a whole is alive, so one fresh entry among stale ones calls the whole set fresh

## How I tested it

The suite runs on Node's built in test runner against the TypeScript source directly, no transpile step, no other dependencies. It covers: a never seen timestamp classifying red, an empty and an all invalid timestamp set both classifying red, the exact boundary at the tolerance window and at the tolerance times the red multiple, future clock skew classifying fresh, NaN and Infinity and negative and zero timestamps all classifying red, a custom `redMultiple` shifting the stale to red boundary, and `overallFreshness` picking the max rather than the min across a set.

```sh
bash tests/run.sh
```

```
ℹ pass 14
ℹ fail 0
```

## License

MIT. See [LICENSE](LICENSE). No warranty. Security notes and how to report a problem: [SECURITY.md](SECURITY.md). Design decisions and what changed while building it: [docs/ADR.md](docs/ADR.md).

This little tool is one of a handful I pulled out of my own day-to-day agent setup. I use them all myself, so when something breaks I usually notice fast. But if you run into any issues, or anything that looks off, open an issue. I read every one. More tools on my [GitHub profile](https://github.com/justin-rhee).
