# Device checklist for a StageTimer candidate (test-timer.stube.chat)

Run this on the **iPhone 13 Pro** for every candidate before it may go to timer.stube.chat. The
Android part is shorter. Write down the **bold answers** and send them together with the copied
debug report.

The time column is a rough guide (about 1 h 45 min including the 60-minute run, which can run
alongside other work).

## Setup (2 min)

- Delete the old "Spike" and "StageTimer" icons from the home screen. WebKit fixes some layout at
  install time, and an installed app never picks up a changed icon.
- First candidate after the spike only: the Safari tab may still show the spike from its cache, and
  Add to Home Screen would then install the spike's name and icon for good. Open test-timer in
  Safari; if it shows the spike, close that tab in the tab overview, wait a few seconds and open the
  URL in a new tab. If it still shows the spike, delete **stube.chat** under Settings → Apps →
  Safari → Advanced → Website Data (iOS lists whole domains, not test-timer.stube.chat; this also
  signs Safari out of other stube.chat sites).
- Settings → Display & Brightness → **Auto-Lock: 30 seconds** for the test, so that a missing wake
  lock shows within 30 s. (For the gig itself it gets set to Never; see SOUNDCHECK.md.)
- Low Power Mode off; Date & Time → Set Automatically on.

## iPhone (about 25 min plus the 60-minute run)

1. **Install.** In Safari, open `https://test-timer.stube.chat`. **It must show the StageTimer preset
   grid, not the spike.** Tap Share → Add to Home Screen. It should suggest "StageTimer" and the
   white ring icon with a red sixth. Open it from the icon.
2. **Version.** Tap the small version label at the bottom right five times to open the debug
   overlay. **Version = the candidate you were told? Service worker "activated"?** Close it, swipe the
   app away, open it again, and check the overlay once more. **"controlled=true" now? Does the
   "stage" row read 390×844 at 0,0 (the whole screen)?** (e625305 read 390×797: iOS gave the page a
   viewport 47 px short. The "units" row shows what iOS reports and the height the app now uses
   instead, "--app-h 844px".)
3. **Presets.** **Are all 12 tiles readable, without anything cut off, and is the top row fully
   bright (below the dimmed band at the notch)?** Tap 15:00. The landscape
   timer opens paused, with the controls showing. **Is there no amber pill, or does it go away
   when you tap?** (No pill means the screen-on lock is held. iOS sometimes refuses the first tap
   after opening; the next one works.)
4. **Controls.**
   - Tap play. The controls stay for about 5 s, then fade, and only the digits remain.
   - A single tap shows "Hold to show controls". A long press brings the controls back. A tap next
     to them hides them.
   - Tap +1 and −1 and watch the change. Hold + until the strip appears above the button, slide
     up to 5 and release. Both buttons now read +5 / −5.
   - Hold +5 again and pick 15, then hold +15 and pick 1. **The strip opens above the button and
     stays fully on screen every time** (on e625305 it hung off the screen from 5 upwards).
     Releasing anywhere off the strip keeps the step. Set it back to 1.
   - Tap ✕ while running: "End timer?" appears and disappears again after 3 s.
   - **Does everything respond on the first tap? Does the step strip work?**
5. **Zero and overtime.** Step down to about 00:20 (−5 a few times, then −1), and wait. At zero:
   **red, one shake, the digits glide sideways once (no jump) while the minus sign fades in, and it
   keeps counting −00:01, −00:02 …?**
6. **Lock and unlock.** While it is running, lock with the side button, wait 30 s, then unlock.
   **Is the time right? Is there no amber pill?** (The spike showed the lock coming back by itself
   after unlocking.) If the pill shows, tap until it disappears.
7. **Kill and reopen.** Swipe the app away while it is running, then open it from the icon. **Does it
   open straight into the timer view with the correct time?** The amber "Tap once to keep the screen
   on" pill is expected here (iOS needs a tap after every launch); tap until it disappears.
8. **Offline.** Turn on airplane mode, swipe the app away, open it from the icon. **Does it open with
   the correct time?** Then turn airplane mode off.
9. **Stage position.** Turn rotation lock on. Lay the phone flat, then prop it the way it will sit on
   the synth.
   - **Are the digits clear of the notch and the corners?**
   - **Are the ✕ and the digits fully bright?** iOS dims a band along the notch edge (about 85 px;
     the spike showed it over the minus sign); nothing should sit in it now.
   - **Are the digits centred along the long side, with no empty black band at the home-bar end?**
     (The spike's stage stopped 47 px short there.)
   - Take one screenshot in overtime (step down past zero) and send it.
   - **Is the time readable from 1 m and 2 m at an angle, under the brightest light you have?**
   - Then turn rotation lock off and turn the phone to landscape. **Does the layout follow cleanly?**
     (iOS's own turning animation is expected here; that's why rotation lock stays on at the gig.)
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
