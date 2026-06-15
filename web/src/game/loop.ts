// loop.ts — the render loop. Framework-agnostic: no DOM access, no game-specific knowledge,
// so it can drive any mode later.
//
// Each frame, requestAnimationFrame hands us a high-resolution timestamp `now`. From it we:
//   1. compute `dt` — milliseconds elapsed since the previous frame,
//   2. call update(dt) — advance game state (empty in Slice 2; gridshot has no motion yet),
//   3. call render()   — draw the current state,
//   4. measure framerate and report it.
//
// update() and render() are kept separate so advancing state and drawing never tangle, even
// though there is nothing to advance yet. We deliberately do NOT run a fixed-timestep
// accumulator: nothing in gridshot moves, and the Slice-3 round timer reads absolute
// timestamps, so an accumulator would be machinery with no job. If a future tracking mode
// ever needs deterministic stepping, it slots into update() then.

export interface LoopCallbacks {
  update: (dt: number) => void
  render: () => void
  onFps?: (fps: number) => void
}

export function startLoop({ update, render, onFps }: LoopCallbacks): () => void {
  let running = true
  let last: number | null = null
  let smoothedFps = 0

  function frame(now: number): void {
    if (!running) return

    // The first frame has no predecessor, so nothing has elapsed yet — dt is 0.
    const dt = last === null ? 0 : now - last
    last = now

    update(dt)
    render()

    // Per-frame FPS is noisy; an exponential moving average makes it a readable number.
    if (dt > 0 && onFps) {
      const instantFps = 1000 / dt
      smoothedFps = smoothedFps === 0 ? instantFps : smoothedFps * 0.9 + instantFps * 0.1
      onFps(smoothedFps)
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)

  // Caller can stop the loop (e.g. on teardown). Returning a stopper avoids module-level state.
  return () => {
    running = false
  }
}
