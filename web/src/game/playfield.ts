// playfield.ts — the playfield's fixed coordinate space and the canvas it draws into.
//
// All game math lives in "logical units": a fixed 1000×700 grid, independent of how big the
// canvas appears on screen or how dense the display's pixels are. We translate screen pixels
// into this space in exactly one place (screenToLogical), so the rest of the game never has
// to think about devicePixelRatio, window size, or CSS scaling.

export const LOGICAL_WIDTH = 1000
export const LOGICAL_HEIGHT = 700
export const TARGET_RADIUS = 30

// Fixed on-screen size of the playfield (CSS pixels), separate from the logical space. The
// playfield renders at this size on any adequately sized window and only shrinks (uniformly,
// via CSS) on smaller ones — it never grows to fill big monitors. A consistent display size
// keeps aim difficulty consistent, which is what makes leaderboard scores comparable. (10:7,
// matching the logical aspect ratio; logical→display scale is a fixed 1.4×. See ADR 0002.)
export const DISPLAY_WIDTH = 1400
export const DISPLAY_HEIGHT = 980

/**
 * Size the canvas's backing store for the current devicePixelRatio and scale the drawing
 * context so all our drawing code can speak logical units.
 *
 * A canvas has two sizes that are easy to confuse:
 *   - the *backing store* (canvas.width / canvas.height) — the real pixel grid we draw into
 *   - the *display size* (set by CSS) — how big the browser stretches the element on screen
 *
 * On a HiDPI screen (devicePixelRatio = 2), one CSS pixel is painted by a 2×2 block of
 * physical pixels. We size the backing store to the *display* size × dpr (DISPLAY_* × dpr),
 * then scale the context so a single transform maps logical 1000×700 units onto it:
 * scale = (DISPLAY_WIDTH / LOGICAL_WIDTH) × dpr. Drawing a circle at logical (500, 350) thus
 * lands on the correct physical pixels AND stays crisp, while our code stays in 1000×700.
 *
 * Why key the backing store off the *display* size rather than the logical size: the element
 * is shown at DISPLAY_WIDTH (1400), so a logical-sized store would be up-scaled by CSS and
 * look soft. When a small window shrinks the element below 1400, CSS *down*-scales this
 * already-dense store, which stays crisp — so resize needs no rebuild; only a DPR change does
 * (setTransform replaces any prior transform rather than compounding, so re-calling is safe).
 */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  const dpr = window.devicePixelRatio || 1
  canvas.width = DISPLAY_WIDTH * dpr
  canvas.height = DISPLAY_HEIGHT * dpr
  const scale = (DISPLAY_WIDTH / LOGICAL_WIDTH) * dpr
  ctx.setTransform(scale, 0, 0, scale, 0, 0)

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
