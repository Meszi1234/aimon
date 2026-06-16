// round.ts — the game state machine: the single owner of "what phase are we in and what's the
// current round's state". Everything else (input, render, the UI overlays) reads from or drives
// this. It holds no DOM and no clock of its own: callers pass the current time (`now`) in, and
// push the latest cursor via setCursor — so this module is a pure function of its inputs.

import { resolvePreset, type Difficulty, type Mode, type TierParams } from './config'
import { spawnTargets, spawnOne, hitTest, type Point, type Target } from './targets'

// The four phases. The legal transitions are:
//   select  --pick difficulty-->  ready
//   ready   --first click------->  running
//   running --timer hits 0------>  ended
//   ended   --play again-------->  ready      (same difficulty)
//   ended   --change difficulty->  select
export type Phase = 'select' | 'ready' | 'running' | 'ended'

const MODE: Mode = 'gridshot' // v1 is single-mode; this is where the mode dimension plugs in later.

export interface Game {
  readonly phase: Phase
  readonly difficulty: Difficulty | null
  readonly targets: readonly Target[]
  readonly hits: number
  readonly misses: number
  /** hits / (hits + misses), in [0,1]; 0 when no shots fired (guards divide-by-zero). */
  readonly accuracy: number
  /** Milliseconds left in the round at `now` (0 once over). Full duration before the round starts. */
  remainingMs(now: number): number
  /** Latest cursor position in logical units; spawning uses it to avoid placing a target under the pointer. */
  setCursor(point: Point | null): void
  /** select → ready: resolve the tier, pre-spawn its targets (shown dimmed; lifetimes frozen until start). */
  select(difficulty: Difficulty, now: number): void
  /** ready → running: start the clock and (re)stamp every target's lifetime from this instant. */
  start(now: number): void
  /** running only: resolve one Shot to a hit (remove + respawn) or a miss. */
  shoot(point: Point, now: number): void
  /** running only: despawn+respawn expired targets, and end the round when the timer reaches 0. */
  update(now: number): void
  /** ended → ready: replay the same difficulty. */
  playAgain(now: number): void
  /** ended → select: back to the difficulty menu. */
  changeDifficulty(): void
}

export function createGame(): Game {
  let phase: Phase = 'select'
  let difficulty: Difficulty | null = null
  let params: TierParams | null = null
  let targets: Target[] = []
  let hits = 0
  let misses = 0
  let roundEndsAt = 0
  let cursor: Point | null = null

  // Enter the ready state for a given tier: resolve its params, reset the score, and pre-spawn
  // the targets so the player sees the layout before starting. Their expiresAt is stamped here
  // but ignored until start() — update() only ages targets while running — so the lifetimes are
  // effectively frozen during ready no matter how long the player waits.
  function enterReady(diff: Difficulty, now: number): void {
    difficulty = diff
    params = resolvePreset(MODE, diff)
    hits = 0
    misses = 0
    targets = spawnTargets(params, cursor, now)
    phase = 'ready'
  }

  return {
    get phase() {
      return phase
    },
    get difficulty() {
      return difficulty
    },
    get targets() {
      return targets
    },
    get hits() {
      return hits
    },
    get misses() {
      return misses
    },
    get accuracy() {
      const shots = hits + misses
      return shots === 0 ? 0 : hits / shots
    },

    remainingMs(now: number): number {
      if (phase !== 'running') return params ? params.durationSeconds * 1000 : 0
      return Math.max(0, roundEndsAt - now)
    },

    setCursor(point: Point | null): void {
      cursor = point
    },

    select(diff: Difficulty, now: number): void {
      if (phase !== 'select') return
      enterReady(diff, now)
    },

    start(now: number): void {
      if (phase !== 'ready' || !params) return
      // Start the clock, and (re)stamp every pre-spawned target so its lifetime counts from now —
      // not from whenever the player happened to be shown the ready screen.
      roundEndsAt = now + params.durationSeconds * 1000
      for (const t of targets) t.expiresAt = now + t.lifetimeMs
      phase = 'running'
    },

    shoot(point: Point, now: number): void {
      if (phase !== 'running' || !params) return
      const i = hitTest(point, targets)
      if (i === -1) {
        misses++ // a shot into empty playfield
      } else {
        hits++
        // Remove the hit target and immediately spawn a replacement so the count stays constant.
        const others = targets.filter((_, j) => j !== i)
        targets[i] = spawnOne(others, params, cursor, now)
      }
    },

    update(now: number): void {
      if (phase !== 'running' || !params) return
      // End first, so we don't spend the final frame spawning targets no one can shoot.
      if (now >= roundEndsAt) {
        phase = 'ended'
        return
      }
      // Despawn any target whose lifetime ran out and replace it (count stays constant). Handled
      // in place so multiple simultaneous expiries — e.g. the synchronized first wave — each get
      // checked against the already-replaced ones and never overlap.
      for (let i = 0; i < targets.length; i++) {
        if (targets[i].expiresAt <= now) {
          const others = targets.filter((_, j) => j !== i)
          targets[i] = spawnOne(others, params, cursor, now)
        }
      }
    },

    playAgain(now: number): void {
      if (phase !== 'ended' || !difficulty) return
      enterReady(difficulty, now)
    },

    changeDifficulty(): void {
      if (phase !== 'ended') return
      phase = 'select'
      targets = []
      difficulty = null
      params = null
    },
  }
}
