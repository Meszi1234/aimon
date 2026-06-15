import './style.css'
import { setupCanvas, screenToLogical, onDevicePixelRatioChange } from './game/playfield'
import { render } from './game/render'
import { startLoop } from './game/loop'

const canvas = document.querySelector<HTMLCanvasElement>('#game')!

// `let` because the context is rebuilt if the display's pixel density changes.
let ctx = setupCanvas(canvas)
onDevicePixelRatioChange(() => {
  ctx = setupCanvas(canvas)
})

// --- Dev HUD ----------------------------------------------------------------------------
// A diagnostic overlay (toggle with the backtick key), not part of the game. It proves the
// two Slice-2 success criteria: a steady framerate, and an accurate screen→logical mapping
// (move the pointer tip to a playfield corner and watch the coords hit ~0,0 / ~1000,700).
const hud = document.querySelector<HTMLDivElement>('#hud')!
const hudFps = document.querySelector<HTMLSpanElement>('#hud-fps')!
const hudCursor = document.querySelector<HTMLSpanElement>('#hud-cursor')!

canvas.addEventListener('mousemove', (e) => {
  const p = screenToLogical(canvas, e.clientX, e.clientY)
  hudCursor.textContent = `${p.x.toFixed(0)}, ${p.y.toFixed(0)}`
})

window.addEventListener('keydown', (e) => {
  if (e.key === '`') hud.hidden = !hud.hidden
})

// --- Game loop --------------------------------------------------------------------------
// update() is empty in Slice 2 — nothing moves yet. render() reads `ctx` at call time, so it
// always uses the current context even after a DPR rebuild.
startLoop({
  update: () => {},
  render: () => render(ctx),
  onFps: (fps) => {
    if (!hud.hidden) hudFps.textContent = fps.toFixed(0)
  },
})
