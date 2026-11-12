# Device checklist for a StageTimer candidate (test-timer.stube.chat)

Run this on the **iPhone 13 Pro** for every candidate before it may go to timer.stube.chat. The
Android part is shorter. Write down the **bold answers** and send them together with the copied
debug report.

The time column is a rough guide (about 1 h 45 min including the 60-minute run, which can run
alongside other work).

## Setup (2 min)

- Delete the old "Spike" and "StageTimer" icons from the home screen. WebKit fixes some layout at
  install time, and an installed app never picks up a changed icon.
- Settings → Display & Brightness → **Auto-Lock: 30 seconds** for the test, so that a missing wake
  lock shows within 30 s. (For the gig itself it gets set to Never; see SOUNDCHECK.md.)
- Low Power Mode off; Date & Time → Set Automatically on.

## iPhone (about 25 min plus the 60-minute run)

1. **Install.** In Safari, open `https://test-timer.stube.chat`, tap Share → Add to Home Screen. It
   should suggest "StageTimer" and the white ring icon with a red sixth. Open it from the icon.
2. **Version.** Tap the small version label at the bottom right five times to open the debug
   overlay. **Version = the candidate you were told? Service worker "activated"?** Close it, swipe the
   app away, open it again, and check the overlay once more. **"controlled=true" now?**
3. **Presets.** **Are all 12 tiles readable, without anything cut off?** Tap 15:00. The landscape
   timer opens paused, with the controls showing. **Is there no red pill?** (No pill means the
   screen-on lock is held.)
4. **Controls.**
   - Tap play. The controls stay for about 5 s, then fade, and only the digits remain.
   - A single tap shows "Hold to show controls". A long press brings the controls back. A tap next
     to them hides them.
   - Tap +1 and −1 and watch the change. Hold + until the strip appears, slide to 5 and release.
     Both buttons now read +5 / −5.
   - Tap ✕ while running: "End timer?" appears and disappears again after 3 s.
   - **Does everything respond on the first tap? Does the step strip work?**
5. **Zero and overtime.** Step down to about 00:20 (−5 a few times, then −1), and wait. At zero:
   **red, one shake, a minus sign, and it keeps counting −00:01, −00:02 …?**
6. **Lock and unlock.** While it is running, lock with the side button, wait 30 s, then unlock.
   **Is the time right? Is there no red pill?** If the pill shows, tap once; it must disappear.
7. **Kill and reopen.** Swipe the app away while it is running, then open it from the icon. **Does it
   open straight into the timer view with the correct time?** A red "Tap once to keep the screen on"
   pill is expected here (iOS needs a tap after every launch); tap once and it must disappear.
8. **Offline.** Turn on airplane mode, swipe the app away, open it from the icon. **Does it open with
   the correct time?** Then turn airplane mode off.
9. **Stage position.** Turn rotation lock on. Lay the phone flat, then prop it the way it will sit on
   the synth.
   - **Are the digits clear of the notch and the corners?**
   - **Is the time readable from 1 m and 2 m at an angle, under the brightest light you have?**
   - Then turn rotation lock off and turn the phone to landscape. **Does the layout follow cleanly?**
10. **The 60-minute run, next to the iPhone's own Clock timer.** Run it on battery, with Auto-Lock at
    30 s.
    - Note the battery %. Set a 60:00 StageTimer (paused).
    - In the Clock app, set a 60-minute timer but don't start it.
    - Start both in the same second: Clock first, then StageTimer right after. Note the gap if they
      start more than a moment apart.
    - Leave the phone untouched, propped up, with StageTimer in front.
    - At the end, **both must reach zero within 1 s of each other** (subtract any start gap). The
      Clock alarm will sound from the background; watch StageTimer turn red.
    - **Did the screen stay on for the whole hour? What is the battery % at the end?**
11. **Report.** Open the debug overlay, tap Copy, paste it into a note and send it to me.

## Android (about 10 min)

1. In Chrome, open the URL, then Install app, then open it from the icon.
2. Repeat steps 3–8. Also check: **is there no status bar (full screen)?**
3. Copy the debug report and send it.

## Pass rule

The candidate passes when every bold answer is "yes" and the 60-minute gap is at most 1 s. Any "no"
in steps 3, 6, 7, 8 or 10 blocks the release. Those steps cover the never-cut list: correct time,
digits that don't jump, the screen staying on, surviving reload and lock.
