// targets.ts — the Target type, spawning (random, non-overlapping, in-bounds), and hit
// detection (point-in-circle). All math is in logical units (the fixed 1000×700 space); this
// module never touches the DOM, the canvas, or screen pixels.

import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './playfield'
import type { TierParams } from './config'

// A point in logical space — the shape screenToLogical() returns, and what a Shot resolves to.
export interface Point {
  x: number
  y: number
}

// One live target. Position + radius are its geometry; the two time fields drive its lifetime:
//   expiresAt  — the performance.now() timestamp at which it despawns on its own
//   lifetimeMs — its full lifespan, kept so render can compute "fraction of life left" for the
//                fade-out cue without needing the round's params
// (Both are absolute-timestamp based, consistent with the round timer — see round.ts.)
export interface Target {
  x: number
  y: number
  radius: number
  lifetimeMs: number
  expiresAt: number
}

// Spacing rules, in logical units.
const SPAWN_GAP = 12 // extra breathing room between target edges, on top of just-not-touching
const CURSOR_CLEARANCE = 1.5 // a new target's center stays ≥ radius × this from the cursor
const MAX_SPAWN_ATTEMPTS = 200 // safety valve; 3 small targets in 1000×700 never realistically hits this

// Squared distance between two points. We compare squared distances throughout so we never
// call Math.sqrt — comparing d² < r² is equivalent to d < r for non-negative values, and skips
// the square root entirely. (A micro-optimisation, but it's also just less code.)
function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

/**
 * Place one target validly and return it. Uses **rejection sampling**: pick a uniformly random
 * center inside the legal area, accept it if it clears every constraint, otherwise pick again.
 *
 * Constraints:
 *   - **In bounds, fully:** the center stays ≥ radius from each edge, so the whole circle is
 *     inside the playfield (SPEC: "radius margin from edges").
 *   - **No overlap:** its center is far enough from every existing target that the circles
 *     don't touch (plus a small SPAWN_GAP so they're not visually kissing).
 *   - **Not under the cursor:** if a cursor position is known, the center keeps CURSOR_CLEARANCE
 *     away from it — otherwise a respawn could pop in directly under the pointer and be a free
 *     or accidental click.
 *
 * If MAX_SPAWN_ATTEMPTS is somehow exhausted we return the last candidate anyway: better a
 * rare slightly-too-close target than a hang. With 3 targets of radius ≤ 42 in a 1000×700
 * field there is always abundant free space, so this fallback is effectively unreachable.
 */
export function spawnOne(
  existing: Target[],
  params: TierParams,
  cursor: Point | null,
  now: number,
): Target {
  const r = params.size
  // Legal center range so the whole circle stays inside the playfield.
  const minX = r
  const maxX = LOGICAL_WIDTH - r
  const minY = r
  const maxY = LOGICAL_HEIGHT - r

  let x = 0
  let y = 0
  for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt++) {
    x = minX + Math.random() * (maxX - minX)
    y = minY + Math.random() * (maxY - minY)

    // Reject if too close to the cursor.
    if (cursor) {
      const clearance = r * CURSOR_CLEARANCE
      if (distSq(x, y, cursor.x, cursor.y) < clearance * clearance) continue
    }

    // Reject if it would overlap (or nearly touch) any existing target.
    let overlaps = false
    for (const t of existing) {
      const minDist = r + t.radius + SPAWN_GAP
      if (distSq(x, y, t.x, t.y) < minDist * minDist) {
        overlaps = true
        break
      }
    }
    if (!overlaps) break // this candidate is valid
  }

  return { x, y, radius: r, lifetimeMs: params.lifetimeMs, expiresAt: now + params.lifetimeMs }
}

/**
 * Spawn a full set of `count` targets, each valid against the ones already placed. Builds the
 * array incrementally so every target is checked against all its predecessors.
 */
export function spawnTargets(params: TierParams, cursor: Point | null, now: number): Target[] {
  const targets: Target[] = []
  for (let i = 0; i < params.count; i++) {
    targets.push(spawnOne(targets, params, cursor, now))
  }
  return targets
}

/**
 * Hit detection: return the index of the target containing `point`, or -1 for a miss.
 *
 * A point is inside a circle when its distance to the center is ≤ the radius — i.e.
 * d² ≤ r² (squared form, no sqrt). Because spawning forbids overlaps, at most one target can
 * contain any point, so the first match is THE match; a linear scan is correct and plenty fast
 * for a handful of targets. This is the moment the Slice-2 "Shot point = pointer tip" invariant
 * pays off: `point` is exactly what screenToLogical() returned.
 */
export function hitTest(point: Point, targets: Target[]): number {
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]
    if (distSq(point.x, point.y, t.x, t.y) <= t.radius * t.radius) return i
  }
  return -1
}
