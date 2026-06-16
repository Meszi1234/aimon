-- 001_init.sql — initial schema (SPEC.md → Data Model).
-- Two tables: `scores` (one row per completed Round) and `full_runs` (the
-- aggregate for a Full Run, deferred until a 2nd mode lands but reserved now).
-- Comparability keys on (mode, difficulty); the resolved tuning params are
-- denormalized onto each score row so re-tuning a tier later never rewrites the
-- meaning of old scores (arch decision #11).
--
-- migrate.ts wraps this whole file in a single transaction, so no BEGIN/COMMIT here.

CREATE TABLE full_runs (
  id           BIGSERIAL PRIMARY KEY,
  difficulty   TEXT        NOT NULL,               -- 'easy' | 'normal' | 'hard'
  display_name TEXT        NOT NULL,
  user_id      TEXT        NULL,                   -- reserved for accounts; always NULL in v1
  total_score  INTEGER     NOT NULL,               -- raw sum of member rounds' scores (ADR 0001)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scores (
  id                 BIGSERIAL PRIMARY KEY,
  mode               TEXT        NOT NULL,         -- 'gridshot' for v1
  difficulty         TEXT        NOT NULL,         -- 'easy' | 'normal' | 'hard'
  display_name       TEXT        NOT NULL,
  user_id            TEXT        NULL,             -- reserved for accounts; always NULL in v1
  full_run_id        BIGINT      NULL REFERENCES full_runs(id),  -- NULL = solo round
  score              INTEGER     NOT NULL,         -- = hits, the ranked value
  hits               INTEGER     NOT NULL,
  misses             INTEGER     NOT NULL,
  accuracy           REAL        NOT NULL,         -- 0.0-1.0, derived: hits / (hits + misses)
  duration_seconds   INTEGER     NOT NULL,         -- resolved from (mode, difficulty); stored for history
  target_size        INTEGER     NOT NULL,         -- resolved; target radius in logical px
  target_count       INTEGER     NOT NULL,         -- resolved; simultaneous targets
  target_lifetime_ms INTEGER     NOT NULL,         -- resolved; ms a target lives before despawn (ADR 0003)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scores_leaderboard
  ON scores (mode, difficulty, score DESC, created_at ASC);

CREATE INDEX idx_full_runs_board
  ON full_runs (difficulty, total_score DESC, created_at ASC);
