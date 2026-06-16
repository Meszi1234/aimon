// render.ts — draws the scene in logical units. The context arrives already scaled for DPR
// (see setupCanvas), so we draw as if the canvas is exactly LOGICAL_WIDTH × LOGICAL_HEIGHT.
// This module draws ONLY the game (the targets). Menus, prompts, timer and score screen are
// HTML overlays (see ui/screens.ts), not painted here.

import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './playfield'
import type { Target } from './targets'

const TARGET_COLOR = '#e94560'
const READY_DIM_ALPHA = 0.4 // targets shown but muted before the round starts
const FADE_FROM = 1 / 3 // fade begins once a target has ≤ this fraction of its life left

/**
 * Opacity for a target at time `now`. While `dimmed` (the ready state, lifetimes frozen) it's a
 * flat muted value. While running, the target is fully opaque until the last FADE_FROM of its
 * life, then ramps linearly to 0 at expiry — the visible warning that it's about to despawn.
 * This is purely cosmetic: the hit radius never changes, so a faint target is still fully
 * clickable.
 */
function alphaFor(t: Target, now: number, dimmed: boolean): number {
  if (dimmed) return READY_DIM_ALPHA
  const fractionLeft = (t.expiresAt - now) / t.lifetimeMs
  if (fractionLeft >= FADE_FROM) return 1
  // Map [0, FADE_FROM) → [0, 1), clamped so stale (already-expired) targets read as invisible.
  return Math.max(0, Math.min(1, fractionLeft / FADE_FROM))
}

export function render(
  ctx: CanvasRenderingContext2D,
  targets: readonly Target[],
  now: number,
  dimmed: boolean,
): void {
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  ctx.fillStyle = TARGET_COLOR
  for (const t of targets) {
    ctx.globalAlpha = alphaFor(t, now, dimmed)
    ctx.beginPath()
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1 // reset so nothing drawn later inherits a faded alpha

  // --- Crosshair seam --------------------------------------------------------------------
  // v1 uses the OS pointer (cursor: default in CSS), so nothing is drawn here. Custom reticle
  // styles will render in a future design phase. Whatever is drawn MUST be anchored to the
  // logical point returned by screenToLogical() (the cursor hotspot / pointer tip), or the
  // player's aim and the registered Shot point will disagree.
  // ---------------------------------------------------------------------------------------
}
