---
version: 1
slug: "app-app-vue"
primary_target: "app/app.vue"
related_targets: ["app/components"]
---

# StageTimer phase 1 (presets + timer view + debug overlay)

Mode: Operate. Audience: one player runs a set countdown on a phone lying on a synth; the band reads it at a glance from 1–2 m, at an angle, under stage light. Task: pick a set length (preset or any length on the wheel), start at the first note, nudge ± between songs, see overtime. Constraints: PRODUCT.md (phase 1 scope, cut order, never-cut list). Confirmed: inline two-step exit while running; debug overlay = 5 taps on the version label; no rotate button in phase 1; taps open the timer paused unless "Start right away" is on.

Device facts that bind the layout (iPhone 13 Pro, iOS 27): the home-screen app's viewport can stop 47 px short at the home-bar end (--app-h fixes it); iOS dims a band about 85 px deep along the notch edge (--notch-dim).

## Direction contract

THESIS: The owner took the category standard: StageTimer is the iOS Clock timer, executed impeccably, with one deviation that is the product itself: while running, the stage shows nothing but one full-screen line of fixed-cell digits (no ring). Refuses novelty worlds; familiarity is the point, craft is the bar (Apple Clock, Fitness, Music Now Playing).

OWN-WORLD: #000 ground, white system-ui. iOS countdown wheel (hours/min/sec) with the grey selection band; round tinted buttons with Apple's double ring: green (#30d158 on a dark green fill) means start and nothing else, grey for everything else, no orange. Lists in Apple's Recents format: big light tabular time, words below in grey ("1 hr, 15 min"), hairline separators. Red = overtime, amber = needs a tap, deep red = End. Phosphor for the few glyphs (X, chevron).

STORY: The player opens the app, rolls the wheel or taps a preset, lands on the paused landscape timer with a green Start, taps it at the first note; the screen goes quiet. Long press brings Pause and ±step back; at zero the digits shake once, turn red, the minus fades in.

FIRST VIEWPORT: Presets screen, portrait: the wheel at the top (clear of the notch dim band) with the grey band across its centre and unit labels beside the numbers; below it, where Apple has Cancel, a grey reset button (counter-clockwise arrow, back to 0:00:00, disabled at 0) left, and Set (grey, opens paused) or Start (green, when "Start right away" is on) right; then the "Start right away" switch row; then the "Presets" header and twelve rows, each a big light time with its words below and a chevron (Set) or green play circle (Start). Version label at the very end.

FORM: The category standard (canon), taken by the owner after two re-rolls. seed:8ce184f10d83cb66

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
