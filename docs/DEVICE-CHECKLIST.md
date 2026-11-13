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
2. **Version.** Scroll to the end of the presets list and tap the small version label five times
   to open the debug overlay. **Version = the candidate you were told? Service worker "activated"?** Close it, swipe the
   app away, open it again, and check the overlay once more. **"controlled=true" now? Does the
   "stage" row read 390×797 at 0,0 and the "units" row end in "unpainted strip 47px"?** (iOS 27
   gives the home-screen app a 797 px page and leaves the 47 px below it unpainted, home indicator
   included; the app keeps everything inside the 797 px. A different number there is worth a
   screenshot.)
3. **Wheel and presets.**
   - **Is the wheel fully bright (below the dimmed band at the notch), and does it turn and snap
     like the Clock app's timer?**
   - Dial 1 hours, 7 min, 30 sec and tap the green **Set**: **the timer opens paused at 1:07:30?**
     Tap ✕. **The wheel shows 1:07:30 again?** Tap the reset arrow: **0:00:00, and Set greyed out?**
   - Scroll the Presets list. **All 12 readable, "1:15:00" over "1 hr, 15 min" and so on?**
   - Swipe the 30:00 row slowly to the left: **a small dim circle with a trash icon grows and
     brightens, then stretches into a capsule, as in the Clock app?** Let go early: it rests open on
     the circle. Tap the circle: **the row collapses and the rows below move up?**
     Swipe 45:00 all the way across: **it deletes on release?** Tap a row while another is open:
     **it only closes, no timer opens?** At the end of the list, tap **Restore Default Presets**:
     **30:00 and 45:00 are back?**
   - Dial 0 hours, 42 min, 15 sec and tap **Set**, then ✕: **the list has 42:15 ("42 min, 15
     secs") between 30:00 and 45:00, lit up for a moment?** Swipe it away again.
   - Turn **Start right away** on: **the button reads Start and every row gets a green play
     button?** Tap 15:00: **it counts at once, with Pause showing?** Tap ✕ → End, and turn the switch
     off again.
   - Tap 15:00. The landscape
   timer opens paused, with the controls showing. **Is there no amber pill, or does it go away
   when you tap?** (No pill means the screen-on lock is held. iOS sometimes refuses the first tap
   after opening; the next one works.)
4. **Controls.**
   - Tap the green **Start**. The controls stay for about 5 s, then fade, and only the digits remain.
   - A single tap shows "Hold to show controls". A long press brings the controls back. A tap next
     to them hides them.
   - Tap +1 min and −1 min and watch the change. Hold +1 min until the step menu appears above the
     button, slide up to 5 min and release. Both buttons now read +5 min / −5 min.
   - Hold +5 min again and pick 15 min, then hold +15 min and pick 1 min. **The menu opens above the
     button and stays fully on screen every time** (on e625305 it hung off the screen from 5
     upwards). Releasing anywhere off the menu keeps the step. Set it back to 1 min.
   - Tap ✕ while running: "End timer?" appears and disappears again after 3 s.
   - Tap the reset arrow (top right) while running: **"Reset timer?" appears and goes after 3 s;
     tap it again and then Reset: back to the full length, paused, green Start?** With the timer
     paused at its full length, **the reset arrow is greyed out?**
   - **Does everything respond on the first tap? Does the step menu work?**
   - Let the controls fade. **One short tap shows them, the next tap hides them?** Let them fade and
     **tap right where Pause sits**, then where the ✕ sits, then where the padlock sits (bottom left):
     **each time only the controls appear: it keeps running, no "End timer?", not locked?**
   - **Long press right where Pause sits**: **the controls appear and it keeps running** (on c18efb0
     the lifting finger could press the Pause that had just appeared)?
   - **Lock:** tap the padlock. **The controls go and "Hold to unlock" shows?** Tap anywhere, also
     where Pause sits: **only "Hold to unlock", it keeps running?** Swipe the app away and reopen it:
     **still locked?** Long press anywhere: **the controls come back?** Let them fade and tap once:
     **they show (it did not lock itself again)?**
5. **Zero and overtime.** Step down to about 00:20 (−5 min a few times, then −1 min), and wait. At zero:
   **red, one shake, the digits glide sideways once (no jump) while the minus sign fades in, and it
   keeps counting −00:01, −00:02 …?**
5a. **Count up** (added 13 Nov: the band rehearses with a clock that counts up). Tap ✕ → End and
   tap the **count-up icon** (right half of the capsule at the bottom, the caret pointing up): **the
   grey highlight slides over and the hand runs one lap?** Tap the **count-down icon** (left half):
   **the arc drains, the hand shrinks to a dot, the ring refills and the hand grows back?** Tap it
   twice quickly: **it restarts cleanly, no flicker?** Are all three icons (both mode icons and the
   stage lock) **crisp?** Turn the phone to landscape and back (rotation lock off for this): **the
   capsule is back just above the bottom edge, not higher?** Tap count up again, dial 0 hours, 0 min,
   20 sec and tap **Set**.
   - **It opens at 00:00, paused, with the reset arrow greyed out?** Tap **Start**: **00:01, 00:02 …
     and at 00:20 red and one shake, then 00:21, 00:22 … in red, with no minus?**
   - Tap +1 min: **the digits jump a minute forward (about 01:25) and stay red?** Tap −1 min twice:
     **00:00 at most, white again, still counting?**
   - Lock for 30 s, unlock: **the right time?** Swipe the app away and reopen it: **straight back
     into the count-up at the right time?**
   - Reset arrow → Reset: **00:00, paused?**
   - Optional, with a second phone: start the same length counting up on one and counting down on
     the other in the same second. **The two numbers always add up to the length?**
   - Tap ✕ → End, tap the **count-down icon** and then 15:00: **15:00, counting down as before?** Tap ✕.
   - Scroll to the end of the list: **the last preset, Restore and the version label all scroll
     clear of the capsule?**
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
   - **Are the digits centred along the long side of the screen, and is the reset arrow (top
     right, at the home-bar end) fully visible?** (d995c7b drew it into iOS's unpainted strip.)
   - Take one screenshot in overtime (step down past zero) and send it.
   - **Is the time readable from 1 m and 2 m at an angle, under the brightest light you have?**
   - **Are the digits centred on the short side too, and do the colons sit on the middle of the
     digits? Is the overtime minus the short bar?**
   - Rotation lock stays on: with it off iOS turns the page with its own animation, which a web app
     cannot stop, so it is not part of the stage setup and not tested here.
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
in steps 3, 5a, 6, 7, 8 or 10 blocks the release. Those steps cover the never-cut list: correct time,
digits that don't jump, the screen staying on, surviving reload and lock.
