// render.ts — draws the scene in logical units. The context arrives already scaled for DPR
// (see setupCanvas), so we draw as if the canvas is exactly LOGICAL_WIDTH × LOGICAL_HEIGHT.

import { LOGICAL_WIDTH, LOGICAL_HEIGHT, TARGET_RADIUS } from './playfield'

// Slice 2 renders a single static target dead-center. The Target type, random spawning, and
// respawn-on-hit arrive in Slice 3 — this literal becomes real data then.
const STATIC_TARGET = { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2, radius: TARGET_RADIUS }

export function render(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)

  ctx.fillStyle = '#e94560'
  ctx.beginPath()
  ctx.arc(STATIC_TARGET.x, STATIC_TARGET.y, STATIC_TARGET.radius, 0, Math.PI * 2)
  ctx.fill()

  // --- Crosshair seam --------------------------------------------------------------------
  // v1 uses the OS pointer (cursor: default in CSS), so nothing is drawn here. Custom reticle
  // styles will render in a future design phase. Whatever is drawn MUST be anchored to the
  // logical point returned by screenToLogical() (the cursor hotspot / pointer tip), or the
  // player's aim and the registered Shot point will disagree.
  // ---------------------------------------------------------------------------------------
}
