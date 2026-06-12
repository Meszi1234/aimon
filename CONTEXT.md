# CONTEXT.md — Aim Trainer Glossary

Canonical project vocabulary. Glossary only — no implementation details, no spec.
When code or conversation uses one of these words, it means exactly this.

- **Player** — a person playing. v1 identifies them only by a typed **Nickname**, which is
  *not* an identity.
- **Nickname** (`display_name`) — unverified label, 1–24 trimmed chars. Can collide or be
  impersonated; never an identity key in v1.
- **Mode** — a distinct aim challenge (gridshot; later flick, tracking). Registered in a
  shared **mode registry**.
- **Difficulty** — a named tier (easy / normal / hard). A global axis; per mode it resolves
  to a fixed bundle of tuning params. "Hard gridshot" and "hard tracking" are each that
  mode's hard numbers.
- **Preset** — a resolved `(mode, difficulty)` pairing and its tuning params. The unit of
  comparability: scores compare only within the same Preset.
- **Round** — one timed playthrough of one mode at one difficulty. Produces one Score / one
  `scores` row. (Not "game" or "session".)
- **Full Run** — one sitting in which a Player plays every available Mode once, all at one
  chosen Difficulty, in the registry's canonical order. Identified by a `full_run_id`; its
  rounds are ordinary Rounds tagged with that id.
- **Shot** — a committed input: a left-button mousedown inside the playfield. Exactly one
  Hit or one Miss.
- **Hit** / **Miss** — a Shot inside / outside a target. A Hit removes the target and spawns
  a replacement.
- **Score** — the ranked integer for a Round, equal to Hits.
- **Accuracy** — Hits ÷ (Hits + Misses), in [0,1]; 0 when no shots. Derived.
- **Total score** — a Full Run's headline number: the raw sum of its Rounds' Scores.
- **Playfield** — the 1000×700 logical play surface; all game math in logical units. Distinct
  from the **letterbox margins** of aspect-ratio scaling.
- **Entry** — one row on a leaderboard. On a **per-mode leaderboard** it is a Round; on the
  **Full Run leaderboard** it is a Full Run.
- **Per-mode leaderboard** — top N Rounds for one `(mode, difficulty)`, by Score desc.
- **Full Run leaderboard** — top N Full Runs for one Difficulty, by Total score desc. The
  main-menu headline (built when a 2nd mode lands).
