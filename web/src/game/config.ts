// config.ts — the (mode, difficulty) → tuning-params table, and the one function that
// resolves a pair to its params.
//
// SPEC arch decision #10: a `(mode, difficulty)` pair deterministically resolves to a bundle
// of tuning params. Difficulty (easy/normal/hard) is a GLOBAL axis; each mode defines its own
// numbers for each tier. This table is the single source of those numbers on the client.
//
// In Slice 4 the SERVER becomes the authority on resolved params (it re-resolves them from the
// posted mode+difficulty and stamps them on the score row, so the client can't lie about them).
// We shape this table to mirror that: same keys, same field names as the future `scores`
// columns (target_size, target_count, duration_seconds, target_lifetime_ms), so the server
// version is a near-copy and the mapping is obvious.

// A registered aim challenge. Only gridshot exists in v1; adding a mode later is one more key
// here (and in the server's copy) — that's the "shared mode registry" seam SPEC describes.
export type Mode = 'gridshot'

// The global difficulty axis. Every mode resolves each of these to its own param bundle.
export type Difficulty = 'easy' | 'normal' | 'hard'

// The resolved tuning bundle for one (mode, difficulty). All game math reads these.
export interface TierParams {
  /** Target radius, in logical units (the playfield is a fixed 1000×700 logical space). */
  size: number
  /** How long a target lives before it despawns on its own, in milliseconds. */
  lifetimeMs: number
  /** Round length, in seconds. */
  durationSeconds: number
  /** How many targets are visible simultaneously (kept constant by respawn-on-removal). */
  count: number
}

// The table. Difficulty varies two knobs — smaller targets AND shorter lifetimes are harder —
// while duration and count stay constant, so each tier differs on exactly the "aim under time
// pressure" axis. These are starting values and are meant to be tuned after playtesting
// (SPEC arch decision #11 stores the resolved params on each score precisely so re-tuning a
// tier later can't silently rewrite the meaning of old scores).
export const PRESETS: Record<Mode, Record<Difficulty, TierParams>> = {
  gridshot: {
    easy: { size: 42, lifetimeMs: 2000, durationSeconds: 60, count: 3 },
    normal: { size: 30, lifetimeMs: 1200, durationSeconds: 60, count: 3 }, // SPEC baseline
    hard: { size: 22, lifetimeMs: 800, durationSeconds: 60, count: 3 },
  },
}

/**
 * Resolve a (mode, difficulty) pair to its tuning params. A typed lookup — the param types
 * guarantee both arguments are valid keys, so this can't miss. Mirrors the server's resolve
 * step in Slice 4.
 */
export function resolvePreset(mode: Mode, difficulty: Difficulty): TierParams {
  return PRESETS[mode][difficulty]
}
