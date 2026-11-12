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

THESIS: The digits are the interface: one fixed-cell white numeral line that never shifts, on pure black, with nothing else on screen while running. Refuses the category default of a dashboard of rings, progress bars and labels around a small clock.

OWN-WORLD: #000 ground, #fff bold system-ui tabular digits in fixed-width cells, one state colour (red) for overtime, glass only on floating controls (frosted in Safari, refraction in Chromium), Phosphor icons at one weight, no borders or cards.

STORY: The player taps a preset, sees the paused landscape timer with controls, taps play, and the screen goes quiet: only time. Long press brings controls back; at zero the digits shake once, turn red and a minus sign settles in.

FIRST VIEWPORT: Timer view, rotated landscape: digits centred in the safe area at the largest size readable from 2 m; while paused a centred round play button floats over the digits' lower half, −step left and +step right, ✕ top-left; a red warning pill top-centre only when the wake lock is missing.

FORM: Pinned by the spec and the owner's hard rules (position 1 of 1; no direction roll run). seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
