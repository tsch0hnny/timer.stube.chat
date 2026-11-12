---
version: 1
slug: "app-app-vue"
primary_target: "app/app.vue"
related_targets: ["app/components"]
---

# StageTimer phase 1 (presets + timer view + debug overlay)

Mode: Operate. Audience: one player runs a set countdown on a phone lying on a synth; the band reads it at a glance from 1–2 m, at an angle, under stage light. Task: start at the first note, nudge ± between songs, see overtime. Constraints: PRODUCT.md (phase 1 scope, cut order, never-cut list). Confirmed: inline two-step exit while running; debug overlay = 5 taps on the version label; no rotate button in phase 1.

Open until the device spike reports: landscape rotation direction (cw/ccw), digit size readable at 2 m, any extra inset on the notch side (iOS 27 status-bar/blur bugs).

## Direction contract

THESIS: The digits are the interface: one fixed-cell white numeral line that never jumps (it holds still, except for one glide to re-centre when the minus sign appears at zero), on pure black, with nothing else on screen while running. Refuses the category default of a dashboard of rings, progress bars and labels around a small clock.

OWN-WORLD: #000 ground, #fff bold system-ui tabular digits in fixed-width cells measured from the device font. Red (#ff453a) means overtime and nothing else; amber (#ffd60a, black text) means "needs a tap"; a deep red is reserved for the End button. Glass only on floating controls (frosted in Safari, refraction in Chromium), Phosphor icons: fill for play and pause (solid mass reads at distance), bold for the X (Phosphor's filled X is a square badge, which reads as a window-close), no borders or cards; preset tiles are plain filled tap targets.

STORY: The player taps a preset, sees the paused landscape timer with controls, taps play, and the screen goes quiet: only time. Long press brings controls back; at zero the digits shake once, turn red and a minus sign settles in.

FIRST VIEWPORT: Timer view, rotated landscape: digits centred horizontally at the largest width-bound size, held above a control band that is always reserved (paused or running), so they never move when controls appear. While paused: round play button centred in that band below the digits, −step left and +step right of it, ✕ top-left, version label bottom-right. An amber pill top-centre only when the wake lock is missing. At zero the minus appears and the line glides to its new centre during the shake (a fade with reduced motion).

FORM: Pinned by the spec and the owner's hard rules (position 1 of 1). No direction roll was run because the owner pinned the world, so there is no seed reference. seed: none (roll skipped: owner-pinned world)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
