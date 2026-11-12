# Saturday soundcheck: 5 minutes with the stage phone

1. **Phone settings (1 min).**
   - Plug the phone in and set brightness to maximum.
   - Settings → Display & Brightness → **Auto-Lock: Never**. This is a second safety layer next to
     the app's wake lock.
   - Low Power Mode **off**.
   - Turn on a **Focus / Do Not Disturb** mode, so no notification banner covers the digits.
2. **Open from the home screen (20 s).** Tap the **StageTimer icon**, not Safari. The home-screen app
   has its own storage; a timer started in Safari does not exist there.
3. **Check the debug overlay (40 s).** Tap the version label at the bottom right five times. Check:
   - **version** = the frozen gig tag (written below),
   - **service worker** activated and `controlled=true`,
   - **storage** ok.

   Close the overlay.
4. **Start a timer (30 s).** Tap the set length. The paused landscape view opens; **there must be no
   red pill**. Tap play and watch it count for a few seconds.
5. **Lock and unlock (1 min).** Lock with the side button, wait 15 s, then unlock. **The time has to
   be right** (it has kept counting) and **there must be no red pill**. If "Tap once to keep the screen
   on" shows, tap once; it must disappear.
6. **Position and read (1 min).** Put the phone where it will sit on the synth, with the stage lights
   on. Check the time is readable from where everyone plays.
7. **Reset for the set (20 s).** Tap ✕ → End, then tap the set length again so it waits paused. At
   the first note: **play**.

Frozen gig version: `________` (filled in Friday night)

If something is wrong on stage: a red pill → tap once. The time looks wrong → open the debug overlay
(controls → version label × 5) and take a screenshot for later. As a last resort, the iPhone's own
Clock timer is the backup.
