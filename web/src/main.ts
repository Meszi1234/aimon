import './style.css'
import { setupCanvas, screenToLogical, onDevicePixelRatioChange } from './game/playfield'
import { render } from './game/render'
import { startLoop } from './game/loop'
import { createGame } from './game/round'
import { setupScreens } from './ui/screens'

const canvas = document.querySelector<HTMLCanvasElement>('#game')!

// `let` because the context is rebuilt if the display's pixel density changes.
let ctx = setupCanvas(canvas)
onDevicePixelRatioChange(() => {
  ctx = setupCanvas(canvas)
})

const game = createGame()

// The screen controller owns the HTML overlays; we hand it callbacks for the user choices it
// surfaces (difficulty buttons, the end-screen buttons). All transitions are read back through
// game.phase by sync() below, so a handler only needs to poke the game and re-sync.
const screens = setupScreens({
  onSelectDifficulty: (difficulty) => {
    game.select(difficulty, performance.now())
    sync()
  },
  onPlayAgain: () => {
    game.playAgain(performance.now())
    sync()
  },
  onChangeDifficulty: () => {
    game.changeDifficulty()
    sync()
  },
})

// Keep the visible overlays in step with the game phase. Idempotent and cheap, so we call it
// every frame (to catch the timer-driven running→ended flip) and right after each button
// handler (to avoid a one-frame flash). Score text is filled once, on entering the end screen.
let lastPhase = game.phase
function sync(): void {
  if (game.phase === lastPhase) return
  screens.showPhase(game.phase)
  if (game.phase === 'ended') screens.setScore(game.hits, game.misses, game.accuracy)
  lastPhase = game.phase
}
screens.showPhase(game.phase) // initial paint matches the game's starting phase (select)

// --- Dev HUD ----------------------------------------------------------------------------
// A diagnostic overlay (toggle with the backtick key), not part of the game.
const hud = document.querySelector<HTMLDivElement>('#hud')!
const hudFps = document.querySelector<HTMLSpanElement>('#hud-fps')!
const hudCursor = document.querySelector<HTMLSpanElement>('#hud-cursor')!
window.addEventListener('keydown', (e) => {
  if (e.key === '`') hud.hidden = !hud.hidden
})

// --- Input ------------------------------------------------------------------------------
canvas.addEventListener('mousemove', (e) => {
  const p = screenToLogical(canvas, e.clientX, e.clientY)
  game.setCursor(p)
  hudCursor.textContent = `${p.x.toFixed(0)}, ${p.y.toFixed(0)}`
})

// A Shot is a single LEFT-button mousedown (SPEC). We branch on the phase BEFORE acting, so the
// click that starts a round is consumed by start() and never also counts as a shot.
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return // ignore right/middle buttons
  const now = performance.now()
  const point = screenToLogical(canvas, e.clientX, e.clientY)
  game.setCursor(point)
  if (game.phase === 'ready') {
    game.start(now)
    sync()
  } else if (game.phase === 'running') {
    game.shoot(point, now)
  }
})

// --- Game loop --------------------------------------------------------------------------
// One clock read per frame, shared by state and rendering so they never disagree on "now".
// gridshot has no per-frame motion, so update() just ages targets and ends the round; the
// loop's `dt` is intentionally unused (it's there for a future tracking mode).
let frameNow = 0
startLoop({
  update: () => {
    frameNow = performance.now()
    game.update(frameNow)
    sync()
    if (game.phase === 'running') screens.setTimer(game.remainingMs(frameNow))
  },
  render: () => render(ctx, game.targets, frameNow, game.phase === 'ready'),
  onFps: (fps) => {
    if (!hud.hidden) hudFps.textContent = fps.toFixed(0)
  },
})
