# SPEC.md — Aim Trainer

## Purpose

A browser-based aim trainer with a shared online leaderboard. Players each play solo;
scores post to a leaderboard everyone can see. Built as a learning project — primary
goals are (a) the canvas game loop and (b) building a real backend API from scratch.

This file is the source of truth for architecture and scope. Decisions here have been
made deliberately; do not re-litigate them without a stated new reason. Implementation
state lives in CLAUDE.md.

## Scope

**v1 (this spec):**
- One mode: gridshot — playable at three difficulty tiers (easy / normal / hard)
- A difficulty selector before play (players pick a tier; they do **not** free-tune
  duration/size/count — those are resolved from the tier)
- Per-`(mode, difficulty)` leaderboard, which doubles as the interim main-menu board
- Solo play, shared leaderboard
- Typed nickname identity (no accounts)
- Canvas rendering, mouse input

**Explicitly out of scope for v1 (designed for, not built):**
- User accounts / auth — schema reserves a nullable `user_id`
- Additional modes (flick, tracking) — schema carries a `mode` field and a shared mode
  registry is the seam for adding them
- **Full Run** flow + main-menu Total-score board — the `full_runs` table and `full_run_id`
  exist in the schema, but with only one mode a Full Run is degenerate, so the flow ships
  when the second mode lands
- Per-name leaderboard cap (top-N max K per nickname, a window query)
- Real-time / synchronous play
- Server-side score validation beyond basic type/range checks (scores are forgeable; see Known Limitations)
- Touch / mobile input — mouse only

## Architecture Decisions

Each decision records the rejected alternative and why, so the reasoning survives.

1. **Async leaderboard, not real-time.** Rejected real-time head-to-head: it front-loads
   the hardest part (netcode/latency) for little benefit at friends-scale. A leaderboard
   is the backbone either way and synchronized rounds can layer on later.
2. **Gridshot first, multi-mode-ready.** Every score carries `mode`. Scores are only
   comparable within the same mode and difficulty settings.
3. **Nickname now, accounts later.** Scores reference a nullable `user_id` plus a
   `display_name`. v1 scores have `user_id = null`; they stay "anonymous" forever and new
   accounts attach going forward. Retrofitting identity onto nickname-only data is
   impossible, so the field exists from day one.
4. **Canvas + requestAnimationFrame, not DOM targets.** The game loop is the transferable
   skill and canvas is required for smooth tracking later. DOM targets were rejected as a
   dead end for the tracking mode.
5. **Own API, not Backend-as-a-Service.** Rejected Supabase/Firebase: the missing skill
   here is the server side. A leaderboard is the lowest-risk place to learn it.
6. **Node + TypeScript.** Rejected plain JS (untyped backends hide request-shape bugs) and
   Python (splits the stack into two languages for no gain).
7. **Classic always-on server, not serverless.** Rejected serverless: it abstracts away the
   "server" — the exact concept being learned — and adds a Postgres connection-pooling
   wrinkle. Move to serverless later once the model is solid.
8. **Vanilla Vite + TS frontend, not React.** In a canvas game the canvas does the
   rendering, so React's render cycle manages almost nothing and fights the game loop. UI
   chrome is light enough to build without a framework. (Most arguable decision; revisit if
   UI grows.)
9. **node-postgres (`pg`) with hand-written parameterized SQL, not an ORM.** Maximizes SQL
   learning and teaches injection-safe queries. Prisma is a reasonable later upgrade.
10. **Difficulty is a named bundle of tuning params, per mode.** A `(mode, difficulty)` pair
    deterministically resolves to `(duration, target_size, target_count, …)` from shared
    config; difficulty (easy/normal/hard) is a global axis each mode defines its own numbers
    for. Rejected free-form sliders for duration/size/count: they fragment the board into
    near-empty buckets and multiply the test surface for no friends-scale benefit.
11. **Scores store the difficulty *and* the resolved params (denormalized).** Comparability
    keys on `(mode, difficulty)`; the resolved params are stored alongside so re-tuning a
    tier later does not silently rewrite the meaning of old scores. Rejected storing only the
    difficulty enum (history-unsafe; the two synced machines could drift on config).
12. **A round is a round.** Every completed round is one `scores` row on its `(mode,
    difficulty)` board, whether played solo or inside a Full Run; Full Run rounds merely
    carry a non-null `full_run_id`. Rejected segregating Full Run rounds: it splits "a score"
    into two populations and needs an exclusion flag everywhere.
13. **Full Run total = raw sum of per-mode scores.** No cross-mode normalization. Rejected
    normalized points (need per-mode calibration that can't exist before the modes do) and
    rank points (a player's total shifts as *others* post). See `docs/adr/0001`.

## Tech Stack

- **Frontend:** Vite + TypeScript, HTML canvas. Hosted on Vercel.
- **Backend:** Node (LTS) + TypeScript + Express. Always-on process. Hosted on Railway.
- **Database:** PostgreSQL (Railway-managed), accessed via `pg` with parameterized SQL.
- **Repo:** single monorepo, two deploy targets.

## Repo Structure

```
aim-trainer/
  web/                  # Vite + TS frontend
    src/
      game/             # game loop, gridshot logic, hit detection, rendering (framework-agnostic)
      ui/               # menu, leaderboard table, name entry
      api.ts            # fetch wrappers for the backend
      main.ts
    index.html
  api/                  # Node + TS + Express
    src/
      server.ts         # app entry, middleware, CORS
      routes/
        scores.ts       # POST /scores, GET /leaderboard
        health.ts       # GET /health
      db.ts             # pg pool + query helper
    migrations/
      001_init.sql
  CLAUDE.md
  SPEC.md
  README.md
```

## Data Model

Two tables. `scores` holds one row per completed round; `full_runs` holds the aggregate for
a Full Run. Comparability keys on `(mode, difficulty)`; the resolved tuning params are stored
on each row so historical scores stay interpretable even if a tier is re-tuned later.

```sql
CREATE TABLE full_runs (
  id           BIGSERIAL PRIMARY KEY,
  difficulty   TEXT        NOT NULL,               -- 'easy' | 'normal' | 'hard'
  display_name TEXT        NOT NULL,
  user_id      TEXT        NULL,                   -- reserved for accounts; always NULL in v1
  total_score  INTEGER     NOT NULL,               -- raw sum of member rounds' scores (ADR 0001)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scores (
  id               BIGSERIAL PRIMARY KEY,
  mode             TEXT        NOT NULL,            -- 'gridshot' for v1
  difficulty       TEXT        NOT NULL,            -- 'easy' | 'normal' | 'hard'
  display_name     TEXT        NOT NULL,
  user_id          TEXT        NULL,                -- reserved for accounts; always NULL in v1
  full_run_id      BIGINT      NULL REFERENCES full_runs(id),  -- NULL = solo round
  score            INTEGER     NOT NULL,            -- = hits, the ranked value
  hits             INTEGER     NOT NULL,
  misses           INTEGER     NOT NULL,
  accuracy         REAL        NOT NULL,            -- 0.0–1.0, derived: hits / (hits + misses)
  duration_seconds INTEGER     NOT NULL,            -- resolved from (mode, difficulty); stored for history
  target_size      INTEGER     NOT NULL,            -- resolved; target radius in logical px
  target_count     INTEGER     NOT NULL,            -- resolved; simultaneous targets
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scores_leaderboard
  ON scores (mode, difficulty, score DESC, created_at ASC);

CREATE INDEX idx_full_runs_board
  ON full_runs (difficulty, total_score DESC, created_at ASC);
```

## API Contract

Base URL from `VITE_API_URL`. JSON in/out. Server validates all input — never trust the
client even though scores are ultimately forgeable.

**GET /health**
→ `200 { "status": "ok" }`

**POST /scores**
Body:
```json
{
  "mode": "gridshot",
  "difficulty": "normal",
  "display_name": "string (1–24 chars)",
  "hits": 0,
  "misses": 0,
  "full_run_id": null
}
```
The client sends only the inputs. The server is the authority on everything derived:
- Validates `(mode, difficulty)` is in the allowed set; `hits`/`misses` non-negative
  integers; `display_name` trimmed, 1–24 chars. Reject with `400` + message on failure.
- **Resolves and stamps** `duration_seconds`/`target_size`/`target_count` from the
  `(mode, difficulty)` config — client-sent params are ignored.
- **Computes** `score = hits` and `accuracy = hits / (hits + misses)` (÷0 → 0). Any
  client-sent `score`/`accuracy` are overridden, so rows are always internally consistent.
- `user_id` is set to null server-side. `full_run_id` is stored as given (null for solo).

→ `201 { id, created_at }`

**GET /leaderboard**
Query params: `mode=gridshot&difficulty=normal&limit=20` (default to the v1 standard:
gridshot / normal). Returns the top rounds for that `(mode, difficulty)`, ordered
`score DESC, created_at ASC`.
→ `200 { entries: [{ display_name, score, accuracy, created_at }, ...] }`

**Full Run endpoints (deferred — built with the 2nd mode):** a create/finalize path for the
`full_runs` aggregate, plus `GET /full-runs/leaderboard?difficulty=normal&limit=20` returning
the top Full Runs by `total_score` — the main-menu headline board.

## Game Spec — Gridshot

- **Playfield:** logical resolution 1000 × 700, scaled to fit the viewport preserving
  aspect ratio. All game math is in logical units.
- **Targets:** circles of radius `target_size` (default 30). Exactly `target_count`
  (default 3) visible at all times.
- **Spawning:** each target placed at a random position fully inside the playfield (radius
  margin from edges) and not overlapping existing targets.
- **Shot:** a single committed input — a **left-button `mousedown` inside the playfield**.
  Right/middle buttons and clicks on the letterbox margins are ignored (not misses). Every
  shot is exactly one hit or one miss; `click`/`mouseup` is deliberately not used (it adds
  latency and lets a press-drag-release dodge a miss).
- **Hit:** a shot whose point lies within a target circle removes that target, counts a hit,
  and immediately spawns a replacement so the count stays constant.
- **Miss:** a shot inside the playfield that lands on no target.
- **Round lifecycle:** a "click to start" ready state precedes the timer (so it never runs
  while the player isn't looking). The round runs `duration_seconds`, counting down to zero.
  On natural completion it **auto-submits once** (guarded against double-submit); an
  abandoned/reloaded round submits nothing. The score screen renders the local result
  *immediately*, independent of the network — the `POST` runs in the background with a
  non-blocking Retry on failure, and the leaderboard panel has its own error/empty state.
- **Scoring:** `score = hits`. `accuracy = hits / (hits + misses)` (guard divide-by-zero → 0).
- **Difficulty tiers:** `(gridshot, easy|normal|hard)` resolve to fixed param bundles in
  shared config; `normal` is the baseline (60s, size 30, count 3). The player picks a tier;
  the resolved params are server-stamped onto the score (see API Contract). Each
  `(mode, difficulty)` is its own leaderboard.

## Build Plan (slices)

Each slice is one atomic, committable unit. The game is fully playable solo (slice 3)
before the backend exists.

1. **Scaffold** — monorepo with `web/` (Vite+TS) and `api/` (Node+TS+Express); git init;
   stub CLAUDE.md/README. *Done when:* both dev servers start clean.
2. **Game loop** — canvas sized to logical resolution + scaling; rAF loop; render one
   static target. The aiming reticle in v1 is the **OS mouse pointer** (`cursor: default`);
   custom drawn crosshair styles are deferred to a later design phase. A swap seam is left
   in `render.ts`, and the **Shot point = cursor hotspot (pointer tip)** invariant lives in
   `screenToLogical()`. *Done when:* loop runs at a stable framerate and the pointer maps
   accurately into logical playfield coordinates.
3. **Gridshot** — a shared `(mode, difficulty)` config + difficulty selector; spawn
   `target_count` targets, point-in-circle hit detection, respawn on hit, miss tracking,
   click-to-start, countdown timer, end-of-round score screen. Score computed locally, no
   backend. *Done when:* a full round at any tier is playable and reports hits/misses/accuracy.
4. **API skeleton** — Express server, `/health`, `pg` pool, `001_init.sql` migration (the
   `full_runs` + `scores` schema) applied to a local Postgres. *Done when:* `/health`
   responds and both tables exist.
5. **Wire it up** — name entry before play; `POST /scores` (server resolves params, computes
   derived) on round end; `GET /leaderboard?mode=&difficulty=` rendered as a table on the
   menu/score screen, decoupled from submission with Retry. *Done when:* a played score
   appears on the right `(mode, difficulty)` board end-to-end locally.
6. **Deploy** — `web/` → Vercel, `api/` + Postgres → Railway; configure CORS and env
   (`DATABASE_URL`, `PORT`, allowed origin, `VITE_API_URL`). *Done when:* a friend on
   another machine can play and see the shared board.

**Post-v1 (designed for, sequenced for later):**

7. **2nd mode + registry generalization** — add a second mode (e.g. flick) and harden the
   mode registry as the "add a mode" seam.
8. **Full Run flow + Total board** — run-sequencing UI across all modes at one difficulty,
   `full_runs` create/finalize, and the main-menu `GET /full-runs/leaderboard` Total board.
9. **Per-name leaderboard cap** — "top-N max K per nickname" via a `ROW_NUMBER() OVER
   (PARTITION BY display_name …)` window query (a deliberate SQL-learning slice).

## Known Limitations (accepted for v1)

- **Scores are forgeable.** The client computes the score and POSTs it; devtools can submit
  anything. Acceptable for trusted friends. Server still does basic type/range validation to
  keep garbage out. Server-side validation or signed sessions is a deferred, scale-time problem.
- **Nicknames are unverified** and can collide or be impersonated. Resolved when accounts land.

## Environment Variables

- **api:** `DATABASE_URL`, `PORT`, `CORS_ORIGIN`
- **web:** `VITE_API_URL`