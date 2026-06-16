# 3. Target lifetime: despawn on expiry, no miss penalty

- Status: Accepted
- Date: 2026-06-16

## Context

Gridshot's difficulty originally varied only by target **size** (and could vary count). To add
a second, **time-pressure** axis, targets now carry a finite **lifetime**: a target the player
doesn't click in time **despawns on its own**, and a replacement spawns so the on-screen count
stays constant.

That raised a scoring question — what does an expired, un-clicked target do to the score?
Three candidates: (a) nothing, just a lost opportunity; (b) it counts as a Miss; (c) it's a
separate "let slip" statistic. The choice matters because SPEC defines a **Shot** as a committed
input that is *exactly one Hit or one Miss*, a **Miss** as "a shot into empty space," and
**Accuracy** as `hits / (hits + misses)`. Any option other than (a) redefines those terms.

## Decision

**An expired target despawns with no scoring penalty.** Hit and Miss stay tied strictly to
actual shots, so SPEC's Shot / Hit / Miss / Accuracy definitions are unchanged. The difficulty
pressure is **indirect**: a shorter lifetime means fewer reachable targets, so a slow player
simply lands fewer hits (`score = hits`). Accuracy stays a pure measure of click precision.

A fairness cue accompanies the mechanic: a target **fades out** over roughly the last third of
its life. The fade is cosmetic only — the hit radius never changes, so a faded target is still
fully clickable.

## Consequences

- SPEC's glossary and scoring model stay intact; the only additions are the lifetime/despawn
  **mechanic** and one new resolved param, `target_lifetime`.
- Per the denormalize-resolved-params decision (SPEC arch #11), that param is stored on each
  score row (`target_lifetime_ms`, added in the Slice-4 migration) and stamped server-side, so
  re-tuning a tier later can't rewrite the meaning of old scores. **Hard to reverse once scored
  rounds exist.**
- Accuracy cannot express "you were too slow" — slowness shows up only as a lower hit count,
  never a lower accuracy. Accepted: **accuracy = precision, score = throughput**, kept orthogonal.

## Alternatives considered

- **Expiry counts as a Miss.** More punishing (rewards speed *and* precision), but it redefines
  Miss to include a non-shot event and folds speed into accuracy, turning accuracy into a murkier
  combined metric.
- **Separate "let slip" stat.** Carries the most information, but adds a third counter to thread
  through round state, the score screen, and later the schema and API — a cost not justified at
  friends-scale for v1.
