---
name: StageTimer
description: A set countdown for a phone on stage, read at a glance from 1–2 m.
colors:
  stage-black: "#000000"
  digit-white: "#ffffff"
  overtime-red: "#ff453a"
  caution-amber: "#ffd60a"
  end-red: "#d70015"
  dim-grey: "#8e8e93"
  tile-grey: "#1c1c1e"
  tile-grey-pressed: "#2c2c2e"
typography:
  digits:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "'tnum' 1"
  step:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "'tnum' 1"
  notice:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
  hint:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  confirm:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1
  meta:
    fontFamily: "ui-monospace, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
rounded:
  tile: "1.25rem"
  pill: "999px"
  circle: "50%"
spacing:
  tile-gap: "0.625rem"
  edge: "0.75rem"
  control-gap: "1.5rem"
components:
  preset-tile:
    backgroundColor: "{colors.tile-grey}"
    textColor: "{colors.digit-white}"
    rounded: "{rounded.tile}"
  preset-tile-pressed:
    backgroundColor: "{colors.tile-grey-pressed}"
  play-button:
    backgroundColor: "rgb(255 255 255 / 0.1)"
    textColor: "{colors.digit-white}"
    rounded: "{rounded.circle}"
    size: "5rem"
  step-button:
    backgroundColor: "rgb(255 255 255 / 0.1)"
    textColor: "{colors.digit-white}"
    typography: "{typography.step}"
    rounded: "{rounded.pill}"
    height: "3.75rem"
    padding: "0 0.6em"
  exit-button:
    backgroundColor: "rgb(255 255 255 / 0.1)"
    textColor: "{colors.digit-white}"
    rounded: "{rounded.circle}"
    size: "3.25rem"
  status-pill:
    backgroundColor: "{colors.caution-amber}"
    textColor: "{colors.stage-black}"
    typography: "{typography.notice}"
    rounded: "{rounded.pill}"
    padding: "0.4em 0.9em"
  end-button:
    backgroundColor: "{colors.end-red}"
    textColor: "{colors.digit-white}"
    typography: "{typography.confirm}"
    rounded: "{rounded.pill}"
    padding: "0.6rem 1.1rem"
  step-choice-active:
    backgroundColor: "{colors.digit-white}"
    textColor: "{colors.stage-black}"
    typography: "{typography.step}"
---

# Design System: StageTimer

## Overview

**Creative North Star: "The Digits Are the Interface"**

A single line of bold white numerals on pure black, held in fixed cells so nothing ever jumps. While the timer runs there is nothing else on screen; controls are summoned, float over the black as glass, and fade away again. The system is built for one job: read the time at an angle from 2 m under stage light, on an OLED phone lying on a synth.

Pure black and system-ui are owner-pinned hard rules (PRODUCT.md), not defaults to revisit. Colour is semantic and scarce: each hue means exactly one thing. The category default (rings, progress bars, labels around a small clock) is rejected.

**Key Characteristics:**
- Pure #000 ground, white bold tabular digits sized to the largest width that fits.
- Digit cells measured from the device's own font; the minus cell reserved from the start.
- One meaning per colour: bright red = overtime, amber = needs a tap, deep red = End.
- Glass only on floating controls; preset tiles are plain filled tap targets.
- Silent; motion is short, and every movement has a reduced-motion variant.

## Colors

A black stage with white type and three signal hues, each bound to one meaning.

### Primary
- **Digit White** (`digit-white`): the digits, icons, glass control text, focus ring (3px solid, 3px offset) and the active step choice background.

### Secondary
- **Overtime Red** (`overtime-red`): the digits once the time is below zero. Nothing else. 6.0:1 on black.
- **Caution Amber** (`caution-amber`, black text, 14:1): status pills that need the player's action (wake lock refused, storage failing). Deliberately not red, so under stage light it is never misread as overtime.

### Tertiary
- **End Red** (`end-red`, white text 5.4:1): the End button inside the exit confirm, and nowhere else.

### Neutral
- **Stage Black** (`stage-black`): every ground. Not softened, by owner rule.
- **Dim Grey** (`dim-grey`, 6.2:1): the version label and debug metadata.
- **Tile Grey** (`tile-grey`) / **Tile Grey Pressed** (`tile-grey-pressed`): preset tile fill and its pressed state; also the near-opaque step strip fill (at 94%).

### Named Rules
**The One Meaning Rule.** Each hue carries one meaning. Bright red is overtime only; deep red is End only; amber is "needs a tap" only. A new state gets a new meaning only by owner decision, never by reusing a hue.

**The Pure Black Rule.** The ground is #000 on every surface, overriding any "no pure black" guidance (dark stages, OLED).

## Typography

**Display Font:** system-ui (with -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** the same system-ui stack
**Label/Mono Font:** ui-monospace (with Menlo), version label and debug overlay only

**Character:** One family, set heavy. The device's own UI face at weight 700–800 reads as solid mass at distance; no downloaded fonts.

### Hierarchy
- **Digits** (700, line-height 1, tabular-nums): the timer line. In the timer view sized `min(100cqw / line-em, 92cqh)` against the digit box; on preset tiles `100cqw / 4.3` of the tile.
- **Notice** (800, 1.25rem, 1.2): amber status pills.
- **Hint** (700, 1.25rem, 1.2): "Hold to show controls".
- **Step** (700, 1.375rem, 1, tabular): ±step buttons and the step strip choices.
- **Confirm** (700, 1.125rem, 1): "End timer?" and the End button.
- **Meta** (500, 0.75rem, monospace, dim grey): version label.

### Named Rules
**The Fixed Cell Rule.** Every digit sits in a cell as wide as the widest digit 0–9, measured at runtime from the resolved font (weight 700, tabular-nums); colon and minus get their own measured cells. Cells are keyed from the right so seconds stay the same element when an hour or minus appears.

**The Reserved Minus Rule.** The line is sized as if the minus were already present, so the digit size never changes at zero.

## Layout

**Timer view.** Always landscape. When the viewport is portrait the stage is drawn with a CSS rotation (clockwise in phase 1; configurable), and the safe-area insets are remapped to the rotated sides; when the viewport is already landscape, no rotation. Inside the safe area the digit box is inset 4% top, 3% sides, and its bottom always reserves the control band (play size 5rem + 0.75rem row offset + 0.75rem), paused or running, so the digits never move when controls appear and controls never cover them. The control row is centred at the bottom: −step, play, +step with a 1.5rem gap. Exit sits top-left and the version label bottom-right, both 0.75rem from the edge. Status pills are centred at the top.

**Presets.** A 3×4 grid of equal tiles in portrait, 4×3 in landscape, 0.625rem gaps, 0.75rem edge padding plus safe-area insets, a slim footer for the version label.

**The Quiet Stage Rule.** While running, nothing renders but the digits and any status pill that reports a threat. Controls come back on long press (500 ms) and auto-hide after 5 s without touches.

## Elevation & Depth

Flat black, with one material: glass, used only on controls that float over the stage (play, ±step, exit, exit confirm, hint, step strip). Depth comes from a translucent fill and a rim light, not from shadow.

### Shadow Vocabulary
- **Glass rim** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.32), inset 0 -1px 0 rgb(255 255 255 / 0.06)`): every glass control, with a 1px rim stroke `rgb(255 255 255 / 0.24)`.

### Named Rules
**The Glass Recipe Rule.** Glass is a 10% white fill, `blur(20px) saturate(180%)`, a 1px 24% white rim and the inset rim light above. Pressed raises the fill to 20%. In Chromium the blur is replaced by a refraction filter plus `blur(4px)`; Safari keeps the frosted blur, and it must look right there. The cut switch falls back to a plain `rgb(58 58 60 / 0.88)` fill with no backdrop filter.

**The No Outer Shadow Rule.** Nothing casts an outer shadow, glass or status pill: on #000 a shadow is invisible and only darkens the digits underneath.

## Shapes

Soft and round. Preset tiles have generous corners (1.25rem); every floating control is a circle (play, exit) or a full pill (step, confirm, End, hint, status pill, step strip). No hard corners on interactive elements, no cards, no dividers.

## Components

### Preset Tile
Plain filled tap target. Tile grey, 1.25rem corners, no border, digits rendered with the timer's own digit component and formatter. Pressed: tile grey pressed and scale 0.97 (120 ms ease-out); no scale with reduced motion.

### Play / Pause
Glass circle, 5rem, centred in the control band. Phosphor icon at 38px, **fill** weight (solid mass reads at distance); the play triangle is nudged 3px right to sit optically centred. The icons swap with a 120 ms fade and a 160 ms scale-from-0.6 and ±30° turn; reduced motion keeps only the fade.

### Step Button and Strip
Glass pill, 3.75rem tall, label "−5" / "+5" in the step style. Hold (380 ms) opens a vertical strip of 15, 10, 5, 1 (top to bottom) offset so the current step sits under the finger; drag to choose, slide off sideways to cancel. The strip is tile grey at 94% so choices stay legible over the white digits; the highlighted choice is white with black text. Open: 160 ms opacity, 200 ms `cubic-bezier(0.16, 1, 0.3, 1)` scaleY from 0.6; the held button scales 1.06. Reduced motion: 120 ms linear fade, no scaling.

### Exit and Confirm
Glass circle, 3.25rem, top-left, Phosphor X at 28px **bold** (the filled X is a square badge and reads as window-close). Paused: exits at once. Running: opens an inline glass pill "End timer?" with the End-red End button, which lapses after 3 s.

### Status Pill
Caution amber, black 800-weight text, full pill, top-centre. Renders only when something threatens the show; plain words that say what to do ("Tap once to keep the screen on").

### Timer Digits (signature)
The fixed-cell line described in Typography. At each live zero crossing the line shakes once (620 ms, decaying ±0.09em, `cubic-bezier(0.36, 0.07, 0.19, 0.97)`), turns overtime red and gains the minus; simultaneously it glides from the old centre to the new one (560 ms, `cubic-bezier(0.65, 0, 0.35, 1)`), so nothing jumps. Reduced motion: no shake, no glide, a 220 ms fade instead. Controls and hint fade in and out at 220 ms ease-out.

## Do's and Don'ts

### Do:
- **Do** keep every ground #000 and the digits #fff bold system-ui with tabular figures.
- **Do** size digits from measured cells with the minus reserved, and keep the control band reserved below them.
- **Do** put glass only on controls floating over the stage, using the one recipe and its Safari blur and fallback.
- **Do** use Phosphor icons: fill for play and pause, bold for X.
- **Do** give every motion a reduced-motion variant (fade instead of shake, scale or glide).
- **Do** report anything that threatens the show in an amber pill with black text.

### Don't:
- **Don't** use bright red for anything but overtime digits, or deep red for anything but End.
- **Don't** add rings, progress bars or labels around the time.
- **Don't** put glass on the preset tiles or give glass an outer drop shadow.
- **Don't** let the digit size or position change when a digit, the hour or the minus sign changes.
- **Don't** use SF Symbols or downloaded SF fonts.
- **Don't** add sound or haptics.
