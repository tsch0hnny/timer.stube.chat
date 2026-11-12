# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Decided by the owner: Nuxt 4 with @vite-pwa/nuxt, built statically (`nuxt generate`) and served by a small nginx container behind Traefik on the Hetzner VPS. The timer core is framework-free TypeScript in `shared/`. Phase 2 sync (Pocket ID) needs a Nuxt server container instead, on a branch; the gig build stays static and login-free.

## Users

A band (friends of the owner) playing live. One band member runs the timer during the gig: starts it at the first note and nudges it ± between songs. The rest of the band only reads it. The audience never sees it.

## Product Purpose

StageTimer counts down the length of a set on a phone on stage, so the band knows how much time is left and how far they are over. Success is a timer that never fails during a gig: correct time, digits that don't jump, a screen that stays on, and state that survives reload and lock. A plain timer proven on the band's real phones beats a polished one proven only in an emulator.

## Positioning

Built for one stage and one band rather than as a general clock app. It is read at a glance from 1–2 m, opens straight into a paused landscape timer, keeps counting into overtime instead of ringing, and reports its own failures (wake lock lost, storage unavailable) on screen instead of failing silently.

## Operating Context

- Stage phone: iPhone 13 Pro on iOS 27, opened as a home-screen web app. Secondary: a recent Android phone with Chrome.
- Lying or propped on a table or synth at about waist height, read from about 1 m (at most 2 m), looking down at an angle, under stage lights and glare. Plugged in.
- Operated by one player between songs; no touching while playing.
- Debugging happens on the phone itself through a hidden debug overlay; there is no remote inspector (no Mac).
- Releases go to test-timer.stube.chat first; only a build that passed the device checklist goes to timer.stube.chat. The gig build is frozen and tagged the night before, and nothing is deployed on gig day.

## Capabilities and Constraints

- Phase 1 (gig, Sat 14 Nov 2026): the 12 presets (15:00 to 3:00:00 in 15-minute steps) plus a countdown wheel for any length up to 9:59:59 (added 12 Nov by the owner), editable presets (swipe to delete the iOS way, lengths set on the wheel join the presets automatically, one per length and sorted, and Restore Default Presets; added 12 Nov by the owner), tap → paused landscape timer view (a "Start right away" switch, off by default, starts counting on the tap instead), play/pause, a reset to the full length (top right, mirroring the exit and its confirm while running; added 12 Nov by the owner), −/+ with the step picker (1, 5, 10, 15 min), overtime in red with a shake, count up (a "Count up" switch, off by default, under "Start right away"; added 13 Nov by the owner because the band rehearses with a clock that counts up: the stage shows the time elapsed, 00:00 → the length, red and one shake there, then on without a minus; ± moves the time shown and the end stays at the length; reset goes back to 00:00), "Tap to show controls" (a switch, off by default; added 13 Nov by the owner: while running, a short tap shows the hidden controls instead of a long press; the click of the touch that shows them is dropped, so it cannot press the Pause or ✕ that appears under the finger, which a long press could do on c18efb0), the controls behaviour from the spec, wake lock, offline, home-screen install.
- Cut order if something is broken on the iPhone on the last evening, first to go first: editable presets (back to the 12 fixed defaults), the countdown wheel (the 12 presets stay), the step picker (fixed ±1 and ±5 buttons), the shake. Count up is not in the cut order: the band's timing depends on it (`FEATURES.countUp` off would give back c18efb0's countdown exactly). Never cut: correct time, digits that don't jump, the screen staying on, surviving reload and lock.
- Phase 2 (re-planned with the owner on 12 Nov): first, the rotation glitch (with rotation lock off, iOS shows one or two squashed or half-drawn frames as it starts turning the page; screen recordings of e625305, d995c7b and c18efb0 all show it, so it is not a regression of the redesign; next step: a control page on the iPhone, a plain page against one with a fixed full-screen layer like the stage, to tell iOS's own behaviour from something the stage could avoid); then looping wheels (59 → 0, as on iOS), a plain stopwatch without a length (counting up to a length shipped for the gig), the settings pane with "Add to Home Screen" (a real install button on Android via Chrome's install prompt; on iOS, which offers no API, a short Share → Add to Home Screen guide; in in-app browsers such as WhatsApp an "open in Safari" note; plus a hint on the presets screen when running in a browser tab), Pocket ID login and synced presets. Dropped: the edit sheet, the opening transition (presets → stage stays instant), the long-press animation.
- Time is stored as absolute UTC timestamps (end time when running, remaining time when paused); the wall clock is the source of truth.
- Landscape is drawn with a CSS rotation inside the portrait viewport, unless the device spike shows something better.
- Silent by default. No haptics on iPhone web.
- Terminology: preset (tile), timer view, controls, step, overtime, count up (the timer read as time elapsed).
- UI language: English. Home-screen name: "StageTimer".

## Brand Commitments

- Hard rules from the owner: pure black background (#000) with white digits, also overriding any "no pure black" guidance (dark stages, OLED). Overtime digits turn red.
- Look (owner decision, 12 Nov 2026, after two direction rounds): the iOS Clock timer, executed impeccably: countdown wheel, round tinted buttons, lists in Apple's Recents format ("1:15:00" over "1 hr, 15 min"). Craft bar: Apple Clock, Apple Fitness/Workout, Apple Music Now Playing. The stage keeps its full-screen digits instead of Apple's ring.
- Green means start (Start, Resume, play) and nothing else; no orange. Liquid glass, if used at all, only on floating controls, and it must look right with Safari's frosted fallback.
- Icons from Phosphor or Lucide, never SF Symbols. Type via `system-ui`; no downloaded SF fonts.
- Part of the stube.chat umbrella, where rooms are named by function (`timer.`). The Stube couch logo and palette are still drafts and are not binding for this app; the app icon is undecided.

## Evidence on Hand

- Spec: Anytype "Timer App – Spec v1 (timer.stube.chat)" in the Stube.chat space.
- Device spike results: pending (`spike/CHECKLIST.md`).
- No user testing with the band before the Saturday soundcheck; all device testing is done by the owner.

## Product Principles

1. Never fail on stage: reliability outranks every visual feature, and the cut order says what goes first.
2. Proven on the real phone: a claim counts once it is shown on the iPhone, not just in an emulator.
3. Glanceable from 2 m at an angle: legibility beats filling the screen edge to edge.
4. No silent failures: anything that threatens the show (wake lock, storage, offline) is shown on screen.
5. Nothing on screen but the time while running: controls appear only when asked for.

## Accessibility & Inclusion

Respect `prefers-reduced-motion` (no shake or scaling; fades instead). High contrast for legibility under stage light and glare.
