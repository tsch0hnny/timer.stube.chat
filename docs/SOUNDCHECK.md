# Saturday soundcheck: 5 minutes with the stage phone

1. **Phone settings (1 min).**
   - Plug the phone in and set brightness to maximum.
   - Settings → Display & Brightness → **Auto-Lock: Never**. This is a second safety layer next to
     the app's wake lock.
   - Low Power Mode **off**.
   - Control Center → **rotation lock on**. Otherwise iOS turns the whole screen with an animation
     whenever the phone tilts, and the app's own landscape view is the only rotation it needs.
   - Turn on a **Focus / Do Not Disturb** mode, so no notification banner covers the digits.
2. **Open from the home screen (20 s).** Tap the **StageTimer icon**, not Safari. The home-screen app
   has its own storage; a timer started in Safari does not exist there.
3. **Check the debug overlay (40 s).** Scroll to the end of the presets list and tap the version
   label five times. Check:
   - **version** = the frozen gig tag (written below),
   - **service worker** activated and `controlled=true`,
   - **storage** ok.

   Close the overlay.
4. **Start a timer (30 s).** Check that the **stopwatch** is chosen in the capsule at the bottom
   (the band reads the time elapsed) and **Start right away is off**. Tap the set length in the
   Presets list (or dial it on the wheel and tap **Set**). The paused landscape view opens at 00:00. If the
   amber "Tap once to keep the screen on" pill shows, tap the screen until it disappears (iOS
   sometimes refuses the first tap after opening the app). **No amber pill may stay.** Tap the green
   **Start** and watch it count for a few seconds.
5. **Lock and unlock (1 min).** Lock with the side button, wait 15 s, then unlock. **The time has to
   be right** (it has kept counting) and **there must be no amber pill**. (On the iPhone the screen
   lock comes back by itself after unlocking; if the pill does show, tap until it disappears.)
6. **Position and read (1 min).** Put the phone where it will sit on the synth, with the stage lights
   on. Check the time is readable from where everyone plays.
7. **Reset for the set (20 s).** Tap ✕ → End, then tap the set length again so it waits paused at
   00:00. At the first note: the green **Start**, then the **padlock** (bottom left). From then on a
   tap only says "Hold to unlock"; a long press anywhere brings the controls back.

Frozen gig version: `________` (filled in Friday night)

If something is wrong on stage: an amber pill → tap the screen until it disappears. The time looks wrong → open the debug overlay
(controls → version label × 5) and take a screenshot for later. As a last resort, the iPhone's own
Clock timer is the backup.
