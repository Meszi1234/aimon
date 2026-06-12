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
- One mechanic: gridshot
- Solo play, single shared leaderboard
- Typed nickname identity (no accounts)
- Canvas rendering, mouse input

**Explicitly out of scope for v1 (designed for, not built):**
- User accounts / auth — schema reserves a nullable `user_id`
- Additional modes (flick, tracking) — schema carries a `mode` field
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

Single `scores` table. Every field that affects difficulty is stored so the leaderboard
can group correctly.

```sql
CREATE TABLE scores (
  id               BIGSERIAL PRIMARY KEY,
  mode             TEXT        NOT NULL,            -- 'gridshot' for v1
  display_name     TEXT        NOT NULL,
  user_id          TEXT        NULL,                -- reserved for accounts; always NULL in v1
  score            INTEGER     NOT NULL,            -- = hits, the ranked value
  hits             INTEGER     NOT NULL,
  misses           INTEGER     NOT NULL,
  accuracy         REAL        NOT NULL,            -- 0.0–1.0, derived: hits / (hits + misses)
  duration_seconds INTEGER     NOT NULL,            -- difficulty setting
  target_size      INTEGER     NOT NULL,            -- target radius in logical px; difficulty setting
  target_count     INTEGER     NOT NULL,            -- simultaneous targets; difficulty setting
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scores_leaderboard
  ON scores (mode, duration_seconds, target_size, target_count, score DESC, created_at ASC);
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
  "display_name": "string (1–24 chars)",
  "score": 0,
  "hits": 0,
  "misses": 0,
  "accuracy": 0.0,
  "duration_seconds": 60,
  "target_size": 30,
  "target_count": 3
}
```
Validation: `score`/`hits`/`misses` non-negative integers; `accuracy` 0–1; `display_name`
trimmed, 1–24 chars; `mode` in allowed set. Reject with `400` + message on failure.
→ `201 { id, created_at }`. `user_id` is set to null server-side.

**GET /leaderboard**
Query params (all optional, default to the v1 standard preset):
`mode=gridshot&duration=60&targetSize=30&targetCount=3&limit=20`
Returns top rows filtered by the difficulty params, ordered `score DESC, created_at ASC`.
→ `200 { entries: [{ display_name, score, accuracy, created_at }, ...] }`

## Game Spec — Gridshot

- **Playfield:** logical resolution 1000 × 700, scaled to fit the viewport preserving
  aspect ratio. All game math is in logical units.
- **Targets:** circles of radius `target_size` (default 30). Exactly `target_count`
  (default 3) visible at all times.
- **Spawning:** each target placed at a random position fully inside the playfield (radius
  margin from edges) and not overlapping existing targets.
- **Hit:** a click whose point lies within a target circle removes that target, counts a
  hit, and immediately spawns a replacement so the count stays constant.
- **Miss:** a click landing on no target counts a miss.
- **Round:** fixed `duration_seconds` (default 60), counting down. Round ends at zero.
- **Scoring:** `score = hits`. `accuracy = hits / (hits + misses)` (guard divide-by-zero → 0).
- **Standard preset (the one meaningful v1 board):** `gridshot`, 60s, size 30, count 3.

## Build Plan (slices)

Each slice is one atomic, committable unit. The game is fully playable solo (slice 3)
before the backend exists.

1. **Scaffold** — monorepo with `web/` (Vite+TS) and `api/` (Node+TS+Express); git init;
   stub CLAUDE.md/README. *Done when:* both dev servers start clean.
2. **Game loop** — canvas sized to logical resolution + scaling; rAF loop; render one
   static target and a custom crosshair following the mouse. *Done when:* loop runs at a
   stable framerate and the crosshair tracks the cursor.
3. **Gridshot** — spawn `target_count` targets, point-in-circle hit detection, respawn on
   hit, miss tracking, countdown timer, end-of-round score screen. Score computed locally,
   no backend. *Done when:* a full 60s round is playable and reports hits/misses/accuracy.
4. **API skeleton** — Express server, `/health`, `pg` pool, `001_init.sql` migration
   applied to a local Postgres. *Done when:* `/health` responds and the table exists.
5. **Wire it up** — name entry before play; `POST /scores` on round end; `GET /leaderboard`
   rendered as a table on the menu/score screen. *Done when:* a played score appears on the
   board end-to-end locally.
6. **Deploy** — `web/` → Vercel, `api/` + Postgres → Railway; configure CORS and env
   (`DATABASE_URL`, `PORT`, allowed origin, `VITE_API_URL`). *Done when:* a friend on
   another machine can play and see the shared board.

## Known Limitations (accepted for v1)

- **Scores are forgeable.** The client computes the score and POSTs it; devtools can submit
  anything. Acceptable for trusted friends. Server still does basic type/range validation to
  keep garbage out. Server-side validation or signed sessions is a deferred, scale-time problem.
- **Nicknames are unverified** and can collide or be impersonated. Resolved when accounts land.

## Environment Variables

- **api:** `DATABASE_URL`, `PORT`, `CORS_ORIGIN`
- **web:** `VITE_API_URL`