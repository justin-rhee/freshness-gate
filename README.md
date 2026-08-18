# freshness-gate

Most dashboards ask a process one question: are you healthy. The process answers with whatever it last wrote down, and that answer is worthless the instant the process stops running, because nothing is left to update it. A crashed worker and a worker that quietly went into a coma both keep showing green forever if green is just a flag someone set once.

The honest question is different. Not "are you healthy" but "when did you last actually do the thing." That second question can only be answered from timestamps the work itself produced: a heartbeat row, a completed job, a synced record. If the timestamp is old, the process isn't doing the thing, no matter what flag it last set on its way out the door.

If anything you watch reports its own health, you're trusting a value that survives the thing that wrote it.

So this is the second question, about 70 lines of TypeScript in two pure functions.

## Use it if

- your monitoring reads a status field something else wrote
- you want never-seen to look the same as dead
- you need exact boundaries you can pin in a test
- you'd rather pass the clock in than have a module read it

## How it works

`classifyFreshness(lastAt, now, cadence, redMultiple?)` takes one timestamp and returns `"fresh"`, `"stale"`, or `"red"`.

- a cadence declares `expectedIntervalMin` and `graceMin`; their sum is the tolerance window
- within tolerance is fresh, beyond it but within `tolerance * redMultiple` is stale, further out is red
- `redMultiple` defaults to 3 and can be overridden per call
- a missing, non-finite, or non-positive `lastAt` is red, because never having reported must look exactly like having died, not like some softer third state
- a negative age, meaning the timestamp is ahead of `now`, is treated as fresh rather than as a lie, since clock skew and truth are not distinguishable from the number alone

`overallFreshness(timestamps, now, cadence, redMultiple?)` takes a whole set of timestamps and classifies the set as one system, using the most recent valid entry. An empty set, or a set with nothing valid in it, comes back red with null fields, for the same reason a single missing timestamp is red.

Both functions are pure. No clock reads, no I/O, no imports. `now` and every timestamp are arguments you pass in, so the same input always produces the same output and the tests can pin exact boundaries.

## Install

There's no build step and nothing to compile. Copy `src/freshness-gate.ts` into your project and import `classifyFreshness` and `overallFreshness` directly. It has zero dependencies.

## What it won't do

- it doesn't collect timestamps, poll anything, or schedule checks of its own
- it doesn't send alerts or notifications, it only returns a classification
- it won't flag a future timestamp as suspicious; forward clock skew is trusted as fresh by design, because guessing wrong about skew produces false alarms with no real payoff
- `overallFreshness` tells you the reporting pipeline as a whole is alive rather than that every source feeding it's current, so one fresh entry among stale ones calls the whole set fresh

## How I tested it

The suite runs on Node's built in test runner against the TypeScript source directly, no transpile step, no other dependencies. It covers: a never seen timestamp classifying red, an empty and an all invalid timestamp set both classifying red, the exact boundary at the tolerance window and at the tolerance times the red multiple, future clock skew classifying fresh, NaN and Infinity and negative and zero timestamps all classifying red, a custom `redMultiple` shifting the stale to red boundary, and `overallFreshness` picking the max rather than the min across a set.

Run it yourself with `bash tests/run.sh`. The real tail from a run on this machine:

```
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 106.165333
```

## License

MIT. See [LICENSE](LICENSE). No warranty. Security notes and how to report a problem: [SECURITY.md](SECURITY.md).

Design decisions and what changed while building it: [docs/ADR.md](docs/ADR.md).

---

This little tool is one of a handful I pulled out of my own day-to-day agent setup. I use them all myself, so when something breaks I usually notice fast. But if you spot something weird, or just want to ask how it works, open an issue. I read every one. More tools on my [GitHub profile](https://github.com/justin-rhee).
