---
name: StageTimer
description: A set countdown for a phone on stage, read at a glance from 1–2 m; the iOS Clock timer, executed impeccably.
colors:
  stage-black: "#000000"
  digit-white: "#ffffff"
  overtime-red: "#ff453a"
  caution-amber: "#ffd60a"
  end-red: "#d70015"
  start-green: "#30d158"
  start-green-fill: "#0a2a12"
  start-green-disabled: "rgb(48 209 88 / 0.38)"
  secondary-grey: "#8e8e93"
  button-grey: "#333336"
  menu-grey: "#2c2c2e"
  cell-grey: "#1c1c1e"
  separator-grey: "#38383a"
  chevron-grey: "#5a5a5e"
  quiet-fill: "rgb(118 118 128 / 0.24)"
  menu-highlight: "rgb(255 255 255 / 0.16)"
  label-disabled: "rgb(255 255 255 / 0.32)"
  debug-scrim: "rgb(0 0 0 / 0.94)"
  debug-border: "#48484a"
typography:
  digits:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "'tnum' 1, 'case' 1"
  preset-time:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 300
    lineHeight: 1.08
    letterSpacing: "-0.01em"
    fontFeature: "'tnum' 1, 'case' 1"
  heading:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
  wheel-number:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.4375rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "'tnum' 1"
  wheel-unit:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1
  play-label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1
  button-label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "'tnum' 1"
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.2
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
  secondary:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.3
  update:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1
  meta:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "'tnum' 1"
  debug:
    fontFamily: "ui-monospace, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  debug-title:
    fontFamily: "ui-monospace, Menlo, monospace"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  round: "50%"
  capsule: "999px"
  cell: "0.75rem"
  menu: "0.875rem"
  band: "8px"
  debug: "0.6rem"
spacing:
  hairline: "0.5px"
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  gutter: "1.25rem"
  row-gap: "1.75rem"
  section: "2rem"
  notch-dim: "2.5rem"
components:
  button-round:
    backgroundColor: "{colors.button-grey}"
    textColor: "{colors.digit-white}"
    typography: "{typography.button-label}"
    rounded: "{rounded.round}"
    size: "5rem"
  button-round-disabled:
    backgroundColor: "{colors.button-grey}"
    textColor: "{colors.label-disabled}"
    rounded: "{rounded.round}"
  button-start:
    backgroundColor: "{colors.start-green-fill}"
    textColor: "{colors.start-green}"
    typography: "{typography.play-label}"
    rounded: "{rounded.round}"
    size: "5rem"
  button-start-disabled:
    backgroundColor: "{colors.start-green-fill}"
    textColor: "{colors.start-green-disabled}"
    rounded: "{rounded.round}"
  button-round-presets:
    backgroundColor: "{colors.button-grey}"
    textColor: "{colors.digit-white}"
    rounded: "{rounded.round}"
    size: "5.25rem"
  button-exit:
    backgroundColor: "{colors.button-grey}"
    textColor: "{colors.digit-white}"
    rounded: "{rounded.round}"
    size: "3.25rem"
  button-end:
    backgroundColor: "{colors.end-red}"
    textColor: "{colors.digit-white}"
    typography: "{typography.confirm}"
    rounded: "{rounded.capsule}"
    padding: "0.6rem 1.1rem"
  capsule:
    backgroundColor: "{colors.menu-grey}"
    textColor: "{colors.digit-white}"
    typography: "{typography.hint}"
    rounded: "{rounded.capsule}"
    padding: "0.6em 1.2em"
  pill-caution:
    backgroundColor: "{colors.caution-amber}"
    textColor: "{colors.stage-black}"
    typography: "{typography.notice}"
    rounded: "{rounded.capsule}"
    padding: "0.4em 0.9em"
  grouped-cell:
    backgroundColor: "{colors.cell-grey}"
    textColor: "{colors.digit-white}"
    typography: "{typography.body}"
    rounded: "{rounded.cell}"
    padding: "0.5rem 1rem"
    height: "3.25rem"
  switch-off:
    backgroundColor: "{colors.quiet-fill}"
    rounded: "{rounded.capsule}"
    width: "51px"
    height: "31px"
  switch-on:
    backgroundColor: "{colors.start-green}"
    rounded: "{rounded.capsule}"
    width: "51px"
    height: "31px"
  preset-row:
    backgroundColor: "{colors.stage-black}"
    textColor: "{colors.digit-white}"
    typography: "{typography.preset-time}"
    padding: "0.6rem 1.25rem"
  preset-row-pressed:
    backgroundColor: "{colors.cell-grey}"
  preset-play:
    backgroundColor: "{colors.start-green-fill}"
    textColor: "{colors.start-green}"
    rounded: "{rounded.round}"
    size: "2.5rem"
  step-menu:
    backgroundColor: "{colors.menu-grey}"
    textColor: "{colors.digit-white}"
    typography: "{typography.button-label}"
    rounded: "{rounded.menu}"
    width: "7.5rem"
  step-menu-choice-active:
    backgroundColor: "{colors.menu-highlight}"
    textColor: "{colors.digit-white}"
    height: "3rem"
  wheel-band:
    backgroundColor: "{colors.quiet-fill}"
    rounded: "{rounded.band}"
    height: "34px"
  update-capsule:
    backgroundColor: "{colors.menu-grey}"
    textColor: "{colors.digit-white}"
    typography: "{typography.update}"
    rounded: "{rounded.capsule}"
    padding: "0.55rem 0.9rem"
  version-label:
    textColor: "{colors.secondary-grey}"
    typography: "{typography.meta}"
    padding: "0.5rem"
  debug-button:
    backgroundColor: "{colors.cell-grey}"
    textColor: "{colors.digit-white}"
    typography: "{typography.debug}"
    rounded: "{rounded.debug}"
    padding: "0.5rem 0.8rem"
---

# Design System: StageTimer

## Overview

**Creative North Star: "The iOS Clock Timer, Executed Impeccably"**

StageTimer takes the category standard on purpose. The Presets screen is Apple's countdown timer: a three-column wheel with a grey selection band, two big round tinted buttons, one grouped switch cell, and a list in the Recents format. Familiarity is the point; craft is the bar, measured against Apple Clock, Fitness/Workout and Music Now Playing. Nothing on the screen should need explaining to someone who has set a timer on an iPhone.

The one deviation is the product itself: the stage. Where Apple draws a ring, StageTimer draws one full-screen line of heavy white digits on pure black, in landscape, sized to the largest that fits legibly and built from fixed-width cells so no digit ever moves. While running, the stage shows the time and nothing else; a long press brings back the control row. At zero the line shakes once, turns red, and a minus fades in from a cell that was reserved for it all along. The line is centred on both axes of the stage; the control row fits below the ink because a size cap keeps the digits clear of it on any screen shape.

Surfaces are flat and opaque. The earlier liquid-glass treatment was removed with this redesign; controls are iOS fills on black, separated by tone and hairlines, never by blur or shadow. Colour carries meaning and nothing else: one hue per meaning, white for everything that is just information.

**Key Characteristics:**
- Pure #000 ground, white system-ui type, OLED-dark under stage light.
- Apple's round button with its double ring: grey for everything, green only for start.
- Lists in Apple's Recents format: big light tabular time over grey words, hairline separators inset to the text.
- One full-screen line of fixed-cell digits on the stage; nothing else while running.
- Opaque fills only; no glass, no shadows for depth.
- Every motion has a reduced-motion variant (fades instead of shake, scale and glide).

## Colors

A black-and-white stage with four signal colours, each owning exactly one meaning.

### Primary
- **Start Green** (start-green on start-green-fill): Apple's tinted start button. The stage's Start label, the Presets screen's Set-become-Start button and the green play circles in the list, and the "Start right away" switch when on. Green appears on the Presets screen only when "Start right away" is on; when it is off, the wheel's button reads "Set" in grey and the rows carry grey chevrons.

### Secondary
- **Overtime Red** (overtime-red): the stage digits once the countdown passes zero, and nothing else.
- **Caution Amber** (caution-amber, black text on it): the status pill that says the app needs a tap (wake lock lost, storage unavailable). Deliberately not red, so it cannot be misread as overtime.
- **End Red** (end-red, white text on it): destructive actions only: the End button in the exit confirm and the Delete behind a swiped preset.

### Neutral
- **Stage Black** (stage-black): every background, the status-bar strip, the gap inside the button ring.
- **Digit White** (digit-white): digits, labels, icons, the switch knob, focus rings.
- **Secondary Grey** (secondary-grey): the words under preset times, the version label, debug labels.
- **Button Grey** (button-grey): every round button that is not start (reset, Set, Pause, ±step, exit).
- **Menu Grey** (menu-grey): the step menu, the hint and exit-confirm capsules, the update capsule.
- **Cell Grey** (cell-grey): the grouped "Start right away" cell and a pressed preset row.
- **Separator Grey** (separator-grey): 0.5px hairlines between list rows and menu choices.
- **Chevron Grey** (chevron-grey): the row chevrons when presets only set.
- **Quiet Fill** (quiet-fill): the wheel's selection band and the off switch track.
- **Menu Highlight** (menu-highlight): the step choice under the finger. **Label Disabled** (label-disabled): a disabled round button's label.

### Named Rules
**The One Meaning Rule.** Green is start, red is overtime, amber is "needs a tap", deep red is destructive (End, Delete). No colour is borrowed for decoration or emphasis, and no new hue joins without a new meaning.

**The No Orange Rule.** Apple's orange Pause is not used. Pause is grey, like every other non-start control.

**The Pure Black Rule.** The ground is #000, overriding any "no pure black" guidance: dark stages, OLED panels, nothing glowing around the digits.

## Typography

**Display Font:** system-ui (with -apple-system, Roboto, sans-serif)
**Body Font:** system-ui (with -apple-system, sans-serif)
**Label/Mono Font:** ui-monospace, Menlo, inside the hidden debug overlay only

**Character:** One family, the device's own, used the way iOS uses it: heavy for the stage digits, light and large for list times, regular for controls.

### Hierarchy
- **Digits** (700, sized to fit the digits box, line-height 1, tabular): the stage line only. Size is the minimum of the box width divided by the line's width in em and 92% of the box height.
- **Preset Time** (300, 2.5rem, 1.08, -0.01em, tabular): list times ("1:15:00").
- **Wheel Number** (400, 1.4375rem, 1, tabular) with **Wheel Unit** (600, 1.0625rem): the countdown wheel.
- **Heading** (700, 1.375rem, 1.2): the "Presets" list header.
- **Hint** (700, 1.25rem) and **Notice** (800, 1.25rem): the hint capsule and the amber pill, legible from 2 m.
- **Play Label** (400, 1.1875rem): Start / Pause in the stage's centre button.
- **Button Label** (400, 1.0625rem, tabular): round buttons, step labels ("+5 min"), step menu choices (600 when highlighted).
- **Body** (400, 1.0625rem, 1.2): the grouped switch cell.
- **Confirm** (700, 1.125rem): "End timer?" and its End button.
- **Secondary** (400, 0.9375rem, 1.3): the words under a preset time. **Update** (600, 0.9375rem): the update capsule.
- **Meta** (500, 0.75rem, tabular): the version label.
- **Debug** (0.8125rem / 1.4 monospace) and **Debug Title** (700, 1rem): the diagnostic sheet.

### Named Rules
**The Device Font Rule.** system-ui only. No downloaded fonts, no SF files, no monospace outside the debug overlay.

**The Measured Cell Rule.** Every stage digit sits in a fixed-width cell measured from the device font at runtime (digit, colon and minus widths in em). The line is sized against its widest form with the minus cell reserved, so the font size never changes at zero and no digit ever shifts.

**The Centred Punctuation Rule.** Digits use the 'case' feature, so colons (on stage and in the preset list) and the minus sit on the figures' centre line, as on the iOS Clock; without it SF Pro sets the colon 0.11 em low. The overtime minus is drawn as a hyphen (the owner's short bar, 0.441 em), while the text and the accessible label keep a true minus.

## Layout

The app is two screens, both fixed to the full screen height. In the iOS home-screen app the viewport can stop short of the screen at the home-bar end, so screens use the measured full height (`--app-h`) and fall back to 100dvh elsewhere.

**Presets, portrait:** one column with a 1.25rem gutter plus safe-area insets. The wheel (7 rows of 34px) sits at the top, then the two 5.25rem round buttons pushed to the edges, the grouped switch cell, the "Presets" header (2rem above) and the full-bleed list whose rows keep the gutter as padding. The version label closes the page.

**Presets, landscape:** two columns, the wheel column (16–22rem) beside the list with a 2.5rem gap. Where the height allows (360px and up) the wheel column is sticky and only the list scrolls; below 500px tall the wheel shows 5 rows.

**Stage:** always landscape, drawn by CSS rotation inside the portrait viewport, with the safe-area insets remapped to the rotated sides. The digits box leaves room for the control row whether or not it is shown, so the digits never move when controls appear. The control row (−step, Start/Pause, +step, 1.75rem apart) sits centred 0.75rem from the bottom; exit sits top-left, the version label bottom-right.

### Named Rules
**The Notch Dim Rule.** iOS dims a band about 85px deep along the notch edge in the home-screen app. Content on that edge moves a further `notch-dim` (2.5rem) inward: the top of the Presets screen in portrait, and the corner controls on the notch side of the stage.

**The Quiet Stage Rule.** While running, the stage shows nothing but the digits (and an amber pill if something threatens the show). Controls return only on a long press.

## Elevation & Depth

Flat by construction. Depth comes from tone, not shadow: grey fills step up from black (cell-grey, menu-grey, button-grey), hairline separators divide lists and menus, and a stage-black strip the height of the status bar keeps scrolling rows out from under the status bar. The only box-shadow in the system is the round button's double ring, a 2px black gap then a 2px ring of the button's own fill, which is Apple's button outline rather than elevation.

### Named Rules
**The Opaque Fill Rule.** No glass, no backdrop blur, no drop shadows. Floating things (capsules, the step menu) are opaque menu-grey.

## Shapes

Three shapes, all Apple's: circles for buttons and play marks (50%), capsules for pills, hints, confirm and End (999px), and gently rounded rectangles for grouped cells (0.75rem), the step menu (0.875rem) and the wheel band (8px). Separators are 0.5px hairlines inset to the text on the leading side and running to the trailing edge.

## Components

### Buttons
Apple's round timer button, tactile and plain.
- **Shape:** a full circle (50%) with the double ring: 2px black gap, then a 2px ring in the button's fill.
- **Default:** button-grey fill, white label. Sizes: 5.25rem on Presets, 5rem on the stage, 3.25rem for exit.
- **Start:** start-green-fill with start-green label. On the stage it is Start until running, then becomes grey Pause; the label cross-fades (100ms).
- **Pressed:** brightness 1.45 over 120ms. **Disabled:** label dims only (white at 32%, green at 38%); the fill stays.
- **Focus:** a 3px white outline, 3px offset, everywhere.
- **End:** a capsule in end-red, white text, inside the exit confirm only (the swiped Delete is the only other end-red surface).

### Step Buttons and Step Menu
- Round grey buttons labelled with the current step ("−5 min", "+5 min"). A tap steps; a hold opens the step menu above the button (the button scales to 1.06 while held).
- **Menu:** opaque menu-grey, 0.875rem corners, 7.5rem wide, 3rem choices (15, 10, 5, 1 min) split by hairlines. The choice under the finger lights menu-highlight and goes 600; it grows from the button (opacity 160ms, scaleY from 0.6 over 200ms). Reduced motion: a 120ms fade only.

### Grouped Cell and Switch
- **Cell:** cell-grey, 0.75rem corners, at least 3.25rem tall, 0.5rem 1rem padding: the "Start right away" row, as the iOS timer's "When Timer Ends" row.
- **Switch:** iOS proportions (51×31px, 27px white knob). Off is quiet-fill, on is start-green, because turning it on makes taps start. Knob slides over 220ms.

### Preset List (Recents format)
- Each row: a big light tabular time over grey words ("1 hr, 15 min", "42 min, 15 secs"), with the action at the right: a grey chevron when tapping sets, a 2.5rem green play circle when tapping starts. Both share one 2.5rem slot and swap in place (shrink and fade, grow in; each row 18ms after the one above). Pressed rows take cell-grey. Hairline separators inset to the text. One row per length, sorted by length.
- **Swipe to delete (iOS):** the row follows a sideways drag (vertical drags stay native scrolling) and uncovers end-red with a white "Delete" in an 88px strip; released past half the strip it rests open, past 60% of the row it deletes: the row slides out (200ms) and collapses (240ms) while the rows below move up. On a full swipe the label rides the row's edge. One row open at a time; a tap or a scroll anywhere closes it and does nothing else. Keyboard: Delete on a focused row. Reduced motion: no sliding.
- **Adding:** a length set with the wheel joins the list by itself, as iOS fills Recents, and its row lights up once (menu-grey fading to black over 1.6s) when the list returns.
- **Restore Default Presets:** a plain full-width action row (white text, bold counter-clockwise arrow) under the list whenever any of the 12 defaults is missing; pressed takes cell-grey. With no presets at all, one dim line explains that wheel lengths appear here.

### Countdown Wheel
- Three scroll-snapping columns (hours, min, sec), numbers ending just left of each column's centre with the unit beside them; a quiet-fill band (8px corners) across all three at the centre row; the drum fades to transparent at top and bottom and, where supported, curves with a scroll-linked rotateX. Reduced motion drops the curve. A focused column underlines its unit.

### Capsules and Pills
- **Hint / exit confirm:** opaque menu-grey capsules, white bold text.
- **Status pill:** caution-amber, black 800-weight text, centred at the top of the stage.

### Stage Digits (signature)
- One line of fixed cells keyed from the right, so seconds stay the same element when an hour or the minus appears. At zero: one decaying 620ms "no" shake, the colour turns overtime-red, the line glides half a minus cell to its new centre over 560ms while the minus fades in. Reduced motion: no shake, no glide, a 220ms fade.

## Do's and Don'ts

### Do:
- **Do** keep every background stage-black (#000).
- **Do** use start-green on start-green-fill only for actions that start counting.
- **Do** use the round double-ring button for every primary control, grey unless it starts.
- **Do** size stage digits from measured cells and reserve the minus cell, so nothing moves at zero.
- **Do** move content on the notch edge in by notch-dim, and size screens with the full-screen height.
- **Do** give every animation a reduced-motion variant (a fade).
- **Do** use Phosphor icons only: X bold, ArrowCounterClockwise bold, CaretRight bold, Play fill.

### Don't:
- **Don't** use orange anywhere; Pause is grey.
- **Don't** use overtime-red, caution-amber or end-red outside their one meaning.
- **Don't** use glass, backdrop blur or drop shadows; floating controls are opaque fills.
- **Don't** load web fonts or SF fonts, or use monospace outside the debug overlay.
- **Don't** show controls, rings or labels on the running stage.
- **Don't** use SF Symbols.
