# 2. Fixed-size playfield, shrink-only

- Status: Accepted
- Date: 2026-06-15

## Context

The playfield's game math runs in a fixed **logical** space of 1000×700 units. Separately,
the playfield must be given an **on-screen size**. The first implementation scaled it to fill
the viewport (the largest 10:7 box that fit), so the on-screen size tracked the window size.

For a game with a **shared leaderboard**, on-screen size is not cosmetic. A `Preset` —
`(mode, difficulty)` — is the unit of comparability: scores are only meant to compare within
one. But scale-to-fit makes the same Preset play differently by window size. Uniform scaling
keeps *ratios* identical (target-size ÷ playfield, inter-target distance ÷ playfield), so it
looks the same — yet the **absolute mouse travel** changes. A smaller window puts targets
physically closer, shortening flicks and amplifying mouse-DPI jitter. Window size becomes a
hidden difficulty dial, so two players' scores on one Preset are not truly comparable.

## Decision

**Render the playfield at a fixed on-screen size of 1400×980 CSS pixels (10:7), centered,
and only shrink it — uniformly — when the window is too small to fit. It never grows to fill
larger monitors.** The logical space stays 1000×700; the logical→display scale is a fixed
1.4×. The canvas backing store is sized to the display size × devicePixelRatio for crispness.

## Consequences

- Aim difficulty is **consistent across window sizes** on any adequately sized window, which
  is what the leaderboard needs.
- The on-screen size is an exact integer in the common case, which also removed a resize
  artifact (sub-pixel rounding / scrollbar-gutter drift) the scale-to-fit version had.
- **Large monitors show unused space** around the playfield. This is the accepted cost:
  consistency is preferred over filling the screen for a competitive board.
- Changing the display size later would alter the feel of the game and make new scores
  incomparable with historical ones — so this is **hard to reverse once scores exist**.
- **Physical fairness is still not guaranteed** and is *not* what this solves: a 1400px box
  is physically larger on a 24″ 1080p monitor than a 27″ 1440p one, browser zoom rescales it,
  and mouse DPI/sensitivity is unreadable from the browser. Perfect cross-player fairness is
  unachievable in a browser (cf. "scores are forgeable"); this decision only removes *window
  size on one machine* as a free difficulty knob. Recorded in SPEC → Known Limitations.

## Alternatives considered

- **Scale-to-fit (the original).** Always uses the full viewport and looks full-bleed, but
  makes window size a hidden difficulty dial that undermines cross-player comparability — the
  reason for this change.
- **Fullscreen-only / require a minimum window.** Closest to how desktop aim trainers (fixed
  resolution + cm/360 sensitivity) achieve consistency, but heavy-handed for a browser game
  played among friends; shrink-only degrades gracefully instead of blocking play.
