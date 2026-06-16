// screens.ts — the HTML-overlay controller. All DOM for the menus/prompts/timer/score screen
// lives here; main.ts drives it through showPhase/setTimer/setScore and reacts to the button
// callbacks. The canvas only ever draws targets — none of this is painted there.

import type { Difficulty } from '../game/config'
import type { Phase } from '../game/round'

// What main wants to know about: which difficulty was picked, and the two end-screen choices.
export interface ScreenHandlers {
  onSelectDifficulty: (difficulty: Difficulty) => void
  onPlayAgain: () => void
  onChangeDifficulty: () => void
}

export interface Screens {
  /** Show exactly the overlays/timer that belong to a phase; hide the rest. */
  showPhase: (phase: Phase) => void
  /** Update the live countdown text from milliseconds remaining. */
  setTimer: (remainingMs: number) => void
  /** Fill the end-of-round stats. */
  setScore: (hits: number, misses: number, accuracy: number) => void
}

// Format milliseconds as m:ss for the countdown. Round UP so the player sees "1:00" for a full
// 60s round and only sees "0:00" exactly at the end.
function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function setupScreens(handlers: ScreenHandlers): Screens {
  const select = document.querySelector<HTMLDivElement>('#screen-select')!
  const ready = document.querySelector<HTMLDivElement>('#screen-ready')!
  const score = document.querySelector<HTMLDivElement>('#screen-score')!
  const timer = document.querySelector<HTMLDivElement>('#timer')!

  const hits = document.querySelector<HTMLElement>('#score-hits')!
  const misses = document.querySelector<HTMLElement>('#score-misses')!
  const accuracy = document.querySelector<HTMLElement>('#score-accuracy')!

  // Wire the difficulty buttons. Each carries its tier in data-difficulty; we hand it back to
  // main, which owns the actual transition.
  for (const button of select.querySelectorAll<HTMLButtonElement>('button[data-difficulty]')) {
    button.addEventListener('click', () => {
      handlers.onSelectDifficulty(button.dataset.difficulty as Difficulty)
    })
  }

  document
    .querySelector<HTMLButtonElement>('#btn-play-again')!
    .addEventListener('click', () => handlers.onPlayAgain())
  document
    .querySelector<HTMLButtonElement>('#btn-change-difficulty')!
    .addEventListener('click', () => handlers.onChangeDifficulty())

  return {
    showPhase(phase: Phase): void {
      select.hidden = phase !== 'select'
      ready.hidden = phase !== 'ready'
      score.hidden = phase !== 'ended'
      timer.hidden = phase !== 'running'
    },

    setTimer(remainingMs: number): void {
      timer.textContent = formatClock(remainingMs)
    },

    setScore(h: number, m: number, acc: number): void {
      hits.textContent = h.toString()
      misses.textContent = m.toString()
      accuracy.textContent = `${Math.round(acc * 100)}%`
    },
  }
}
