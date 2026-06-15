// playfield.ts — the playfield's fixed coordinate space and the canvas it draws into.
//
// All game math lives in "logical units": a fixed 1000×700 grid, independent of how big the
// canvas appears on screen or how dense the display's pixels are. We translate screen pixels
// into this space in exactly one place (screenToLogical), so the rest of the game never has
// to think about devicePixelRatio, window size, or CSS scaling.

export const LOGICAL_WIDTH = 1000
export const LOGICAL_HEIGHT = 700
export const TARGET_RADIUS = 30

/**
 * Size the canvas's backing store for the current devicePixelRatio and scale the drawing
 * context so all our drawing code can speak logical units.
 *
 * A canvas has two sizes that are easy to confuse:
 *   - the *backing store* (canvas.width / canvas.height) — the real pixel grid we draw into
 *   - the *display size* (set by CSS) — how big the browser stretches the element on screen
 *
 * On a HiDPI screen (devicePixelRatio = 2), one CSS pixel is painted by a 2×2 block of
 * physical pixels. If the backing store were only 1000×700, the browser would stretch that
 * across ~2000×1400 physical pixels and the target's edge would look soft. So we make the
 * backing store `dpr` times larger, then scale the drawing context back down by `dpr`. Now
 * a circle drawn at logical (500, 350) lands on the correct physical pixels AND stays crisp,
 * while our code still works in clean 1000×700 units.
 *
 * Safe to call again when the DPR changes — setTransform replaces any prior transform rather
 * than compounding onto it.
 */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  const dpr = window.devicePixelRatio || 1
  canvas.width = LOGICAL_WIDTH * dpr
  canvas.height = LOGICAL_HEIGHT * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  return ctx
}

/**
 * Convert a screen-space mouse position (clientX/clientY from a MouseEvent) into logical
 * playfield coordinates. This function is THE definition of a Shot point.
 *
 * Invariant: the returned point corresponds to the cursor's *hotspot* — for the OS arrow
 * pointer, that is the tip. The OS reports mouse position as the hotspot, so reading the
 * event coordinates here maps the tip directly, with no offset math.
 *
 * We read getBoundingClientRect() live (never cached) so the mapping stays correct across
 * window resizes and scrolls without any resize bookkeeping — rect.width is the element's
 * current on-screen width in CSS pixels, so device pixels never enter this calculation.
 *
 * When a drawn crosshair replaces the OS pointer later, its visual anchor MUST sit on this
 * same point, or the player will aim with one spot and shoot from another.
 */
export function screenToLogical(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (clientX - rect.left) * (LOGICAL_WIDTH / rect.width),
    y: (clientY - rect.top) * (LOGICAL_HEIGHT / rect.height),
  }
}

/**
 * Invoke `handler` whenever devicePixelRatio changes — e.g. dragging the window to a monitor
 * with different pixel density, or zooming the browser. A matchMedia query is bound to one
 * specific dpr value, so after it fires we re-arm a fresh query for the new dpr (the `once`
 * option plus the recursive call keep exactly one live listener at a time).
 */
export function onDevicePixelRatioChange(handler: () => void): void {
  const dpr = window.devicePixelRatio || 1
  const mq = matchMedia(`(resolution: ${dpr}dppx)`)
  mq.addEventListener(
    'change',
    () => {
      handler()
      onDevicePixelRatioChange(handler)
    },
    { once: true },
  )
}
