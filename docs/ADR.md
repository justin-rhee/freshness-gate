# Architecture Decision Records (ADRs)

Why this is shaped the way it is, in a package small enough that most of the decisions fit in one line each.

## A flag a process sets is only true until the process stops

A dashboard that asks a process one question, are you healthy, gets back whatever the process last wrote down, and that answer survives exactly as long as it takes for the process to crash, hang, or quietly stop doing its work while leaving the flag untouched. A crashed worker and a comatose one both show green forever if green is just a value someone set once and nobody is required to update.

So this doesn't read a health flag at all. `classifyFreshness` and `overallFreshness` compute an answer from real timestamps the work itself produced, a heartbeat row, a completed job, a synced record, checked against a cadence the caller declares. If the timestamp is old, the process isn't doing the thing, no matter what it last claimed on its way out the door.

## Never seen is the worst verdict it can give

A timestamp that's null, non-finite, or zero-or-negative classifies red, the same as a timestamp that's just very old. There's no third, softer state for "haven't heard from you yet," because treating an unknown as anything gentler than dead would let a process that never reported at all hide behind the same green as one that's actually working.

A timestamp from the future, meaning the clock producing it is running ahead, gets the opposite treatment: it's classified fresh rather than flagged as suspicious. The number alone can't tell you whether that's real skew or a lie, and guessing wrong in the suspicious direction just manufactures false alarms out of a clock difference nobody asked about. Two ambiguous cases, and the two defaults point opposite ways on purpose, because the cost of being wrong isn't the same in both directions.

## The pipeline is as alive as its liveliest source, not its most current

`overallFreshness` classifies a whole set of timestamps by the most recent valid one, the max, not the min. One fresh heartbeat among a pile of stale ones is enough to call the set fresh, because that's answering a narrower question than it sounds like: is this reporting pipeline still alive, not is every source feeding it current. The README says this directly rather than leaving it to be discovered the first time someone expects the opposite.

## The comment was wrong before the code got read closely

The original docstring described the stale window as under twice the interval; the code it sat above computed tolerance times a `redMultiple` that defaults to 3. The code was correct and the sentence describing it wasn't, so the fix touched the comment and left the logic alone. The extracted module also arrived with no real test coverage of its own, since the sibling test file in its original home exercised a different module entirely. The fourteen tests here were written fresh against the actual API: exact values at both boundaries, NaN, Infinity, negative and zero inputs, future skew, empty sets, and the max-not-min property of `overallFreshness`.
