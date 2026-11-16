# freshness-gate

[![tests](https://github.com/justin-rhee/freshness-gate/actions/workflows/test.yml/badge.svg)](https://github.com/justin-rhee/freshness-gate/actions/workflows/test.yml) [![npm](https://img.shields.io/npm/v/freshness-gate.svg)](https://www.npmjs.com/package/freshness-gate) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) ![node >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg) ![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)

Tells a health check whether a job actually ran recently, and treats a job that never reported as dead.

```ts
import { classifyFreshness } from "freshness-gate";

const hourly = { name: "sync", expectedIntervalMin: 60, graceMin: 15 };
const now = Date.parse("2026-11-13T12:00:00Z");

classifyFreshness(Date.parse("2026-11-13T11:30:00Z"), now, hourly); // "fresh"
classifyFreshness(Date.parse("2026-11-13T09:00:00Z"), now, hourly); // "stale"
classifyFreshness(Date.parse("2026-11-12T12:00:00Z"), now, hourly); // "red"
classifyFreshness(null, now, hourly);                               // "red": never seen looks like dead
```

Most dashboards ask a process whether it's healthy and get back whatever it last wrote down. A crashed worker and one quietly stuck both stay green forever if green is a flag someone set once. The honest question is when the work last ran, and only timestamps the work produced can answer it.

## Use it if

- your monitoring reads a status field something else wrote
- you need exact boundaries you can pin in a test
- you'd rather pass the clock in than have a module read it

## Install

```sh
npm install freshness-gate
```

Node 22 or newer. No dependencies. It ships compiled JavaScript with type definitions. Rather vendor it? Copy `src/freshness-gate.ts` into your project instead: about 70 lines, and Node 22 reads TypeScript directly.

## How it works

A cadence sets the expected interval plus a grace period, and together they're the tolerance window. Within it is fresh, up to three times it is stale (`redMultiple` changes that), and beyond is red. A missing or invalid timestamp is red. A timestamp ahead of `now` counts as fresh, since clock skew and truth look the same from the number alone.

`overallFreshness` classifies a whole set as one system using its most recent valid entry, and an empty set is red.

## Why not a hosted dead man's switch?

If you're watching finished services, healthchecks.io or Dead Man's Snitch already do this job. This is the embeddable half of that pattern, for when the classification has to live in your own monitoring code.

## What it won't do

- collect timestamps, poll anything or schedule its own checks
- send alerts; it only returns a classification
- flag a future timestamp as suspicious, since guessing wrong about skew makes false alarms with no payoff
- tell you every source is current: one fresh entry among stale ones calls the whole set fresh

## How I tested it

- 14 tests on Node's built-in runner, against the TypeScript source: `bash tests/run.sh`
- the exact boundaries at the tolerance window and at three times it, plus a custom `redMultiple`
- never-seen, empty and all-invalid sets, and NaN, Infinity, zero and negative timestamps, all red

## License

MIT. See [LICENSE](LICENSE). No warranty. Security notes and how to report a problem: [SECURITY.md](SECURITY.md). Design decisions: [docs/ADR.md](docs/ADR.md).

<!-- related:start -->
## Related

- [alert-throttle](https://github.com/justin-rhee/alert-throttle): holds back repeat alerts and says how many it held
- [headroom](https://github.com/justin-rhee/headroom): shows Claude usage and API spend in the macOS menu bar

Part of a small set of tools I pulled out of my own agent harness. I use them myself and read every issue. More on my [GitHub profile](https://github.com/justin-rhee).
<!-- related:end -->
