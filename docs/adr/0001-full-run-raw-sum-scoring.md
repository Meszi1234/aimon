# 1. Full Run total = raw sum of per-mode scores

- Status: Accepted
- Date: 2026-06-12

## Context

A **Full Run** is one sitting in which a player plays every available mode once at a single
chosen difficulty. Its headline number — the **Total score** ranked on the main-menu
leaderboard — must combine the per-mode round scores into one figure.

Modes have **different natural score scales**. A gridshot round scores in hits (tens); a
future tracking mode might score in milliseconds-on-target (thousands). Any combining rule
implicitly decides how much each mode "counts."

This decision is being made before the second mode exists, so any per-mode calibration would
be guesswork. v1 ships only gridshot, so the rule has no observable effect yet — but it sets
the durable meaning of `full_runs.total_score`.

## Decision

**Total score = the raw arithmetic sum of the member rounds' scores.** No per-mode weighting
or normalization is applied.

## Consequences

- Simple, transparent, and needs no calibration: a player can add up their round scores and
  get their total.
- **High-volume modes dominate the total.** When modes with very different scales coexist, a
  mode that naturally yields larger numbers contributes disproportionately to ranking.
- The meaning of `total_score` is **hard to change later**: introducing normalization would
  make new totals incomparable with historical ones, likely forcing a leaderboard reset or a
  versioned scoring field.
- Cross-mode normalization is therefore recorded as an explicit **deferred concern**, to be
  revisited when a mode with a wildly different scale is actually added.

## Alternatives considered

- **Normalized points per mode** (each mode mapped to a common 0–N range via a per-mode
  curve). Fairer cross-mode weighting, but requires defining and calibrating a curve per mode
  up front — impossible to do well before the modes exist.
- **Rank points per mode** (placement on each mode board converts to points, summed).
  Fully scale-independent, but a player's total then shifts as *other* players post,
  producing the confusing "my total dropped and I didn't play" effect.
