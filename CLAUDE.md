# CLAUDE.md — Aim Trainer

I want to learn as I build, work in small slices with educational comments and tutoring. Explain the reasoning behind choices.
Working agreement and live state for Claude Code sessions on this project.
**SPEC.md is the source of truth for architecture and scope** — read it first, and do
not contradict or re-decide anything in it without me stating a new reason.

## Orientation

Browser aim trainer with a shared online leaderboard. Async (solo play, shared board),
gridshot mechanic first, canvas game loop, own Node+TS+Express API, Postgres. Built as a
learning project: the point is for me to understand the game loop and to build a real
backend from scratch. See SPEC.md for full detail.

## Stack (quick reference)

- **web/** — Vite + TypeScript, HTML canvas. → Vercel
- **api/** — Node (LTS) + TypeScript + Express, always-on. → Railway
- **db** — PostgreSQL, accessed via `pg` with hand-written parameterized SQL

## Environment

- Project lives under `~/` in WSL/Ubuntu — **not** `/mnt/c` (filesystem performance).
- Node via `nvm`.
- This repo is synced across two machines (work PC, home PC). **Pull before editing** at
  the start of every session; never start work on a stale tree.

## Commands

(Scripts get wired into `package.json` during Slice 1; keep these names as the convention.)

```bash
# frontend dev server
cd web && npm run dev

# backend dev server
cd api && npm run dev

# apply the DB migration to a local Postgres
cd api && npm run migrate        # or: psql "$DATABASE_URL" -f migrations/001_init.sql

# typecheck (both packages should expose this)
npm run typecheck
```

## How to work with me

- **Build one slice at a time** (see SPEC.md → Build Plan). Do not run ahead to the next
  slice without me confirming the current one is done.
- **Plan before you touch files.** State what you're about to change and why, briefly,
  before making edits — I build understanding of each step before it executes.
- **Diff-before-accept.** Make changes reviewable. I read every diff and predict the
  expected result before accepting; surface anything surprising rather than burying it.
- **Don't hand me a black box.** When you write logic I'll need to reason about later
  (game loop, hit detection, SQL), explain the *why*, don't just produce it.

## Approvals & safety (blast-radius principle)

- **Narrow approvals for anything that touches the system** — installs, migrations,
  deletes, git history operations, anything outside the repo. Ask per-action.
- Broader approval is fine for **sandboxed scratch work** (e.g. throwaway files in `/tmp`).
- **Never** use wildcard "don't ask again" approvals.
- Ask before any destructive or irreversible operation (file deletion, `git reset --hard`,
  dropping tables, force-push).

## Code conventions

- **TypeScript strict mode** on in both packages.
- **SQL is always parameterized** — never string-interpolate user input into a query.
- **Secrets live in env vars, never in the repo.** `.env` is git-ignored; commit a
  `.env.example` with keys and dummy values instead. Required vars: SPEC.md → Environment.
- Keep **deterministic work in scripts** (migrations, build steps); reserve model judgment
  for genuinely ambiguous decisions.

## Commit discipline

- **Atomic commits** — one logical change each, with a meaningful message.
- **Commit CLAUDE.md and SPEC.md on their own**, separate from feature work, so project
  memory isn't gated behind a feature merge.
- Solo project → local merge is fine, but practice a PR workflow deliberately before any
  team work.

## Current State

> Update this section at the end of **every** slice. A stale state section is worse than
> none — it's an actively misleading liability.

- **Phase:** Slice 1 complete. Monorepo scaffolded; both dev servers verified.
- **Done:** SPEC.md and CLAUDE.md authored. Grilling session sharpened the design: added
  `CONTEXT.md` (glossary), reshaped SPEC for modes/difficulties/Full Runs, and recorded
  `docs/adr/0001-full-run-raw-sum-scoring.md`. **Slice 1:** `web/` (Vite+TS vanilla, demo
  trimmed) and `api/` (hand-built Node+TS+Express, ESM, `tsx` dev runner) as independent
  packages; `.nvmrc` (Node 24); `.env.example` in each package. Both `npm run dev` start
  clean, both `npm run typecheck` pass.
- **Next:** Slice 2 — canvas sized to logical 1000×700 + aspect-ratio scaling, rAF loop,
  render one static target and a custom crosshair tracking the mouse. Done when the loop
  runs at a stable framerate and the crosshair follows the cursor. (Difficulty config +
  selector arrive in Slice 3; the `full_runs` schema in Slice 4.)
- **Open questions / deferred:** Railway vs Render for the always-on host not yet finalized
  (does not block Slices 1–3, which are backend-free). v1 ships gridshot at three difficulty
  tiers; the **Full Run flow + main-menu Total board**, a **2nd mode**, the **per-name
  leaderboard cap**, accounts, and server-side anti-forgery are all explicitly post-v1
  (SPEC.md → Out of Scope / Build Plan post-v1). Cross-mode score normalization is a
  deferred concern recorded in ADR 0001.

### Slice log

(Append a one-line entry per completed slice: what shipped + the commit/PR.)

- **Slice 1 — Scaffold.** Monorepo: `web/` (Vite+TS) + `api/` (Node+TS+Express) as
  independent packages, `.nvmrc`, per-package `.env.example`. Both dev servers start clean.