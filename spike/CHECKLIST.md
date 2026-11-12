# Device spike checklist (test-timer.stube.chat)

Takes about 40 minutes. iPhone first; it is the stage phone. Write down the answers to the
**bold questions** and send them with the copied reports.

## Before you start (iPhone)

- Settings → Display & Brightness → **Auto-Lock: 30 seconds**. This makes the wake lock test
  decisive: without a wake lock the screen dims at about 20 s and locks at 30 s.
- Low Power Mode **off** (it is tested separately in step 9).
- Settings → General → Date & Time → Set Automatically **on**.
- If you installed an earlier spike icon, delete it from the home screen first. WebKit reportedly
  fixes some layout behaviour at install time.

## iPhone, Safari tab

1. Open `https://test-timer.stube.chat` in Safari. The header must say `spike-1` and `context=tab`.
2. Tap **Request (with tap)**. "held now" must turn **YES**.
3. Tap **Open stage view**, put the phone down and don't touch it for **2 minutes**.
   **Did the screen stay on without dimming? What does the HUD say for "max"?**
4. Lock with the side button, wait 20 s, unlock.
   **Does the HUD show "wake lock ON" again by itself, or the red "tap once" banner?**
   Tap once if the banner shows.

## iPhone, home screen app

5. Share → Add to Home Screen (leave "Open as Web App" on) → open it from the icon.
   The header must say `context=app`. **Does "contexts seen in this storage" show only `app`?**
   This checks the expected tab/app storage separation.
6. Repeat steps 2–4 in the app.
7. In the report view, tap **10-min** (test countdown). Note the end time shown, then:
   - pull down to reload, if the app allows it (otherwise skip),
   - lock and unlock,
   - swipe the app away in the app switcher and reopen it from the icon.
   **Is the countdown still right after each step? After the reopen, is the wake lock on, or does
   it need a tap?** (A tap is expected.)
8. Stage view, with **rotation lock ON** (Control Center):
   - Lay the phone flat, then prop it at an angle the way it will sit on the synth.
   - **Do the digits fill the screen, clear of the notch? Is there a blurry or frosted band
     anywhere (expected along the notch side, if it appears at all)? Does it cover any digit?**
   - Tap the screen for the toolbar. Try **Rotate ↻** and **Rotate ↺**.
     **Which way round reads better on stage?**
   - Take one screenshot of the stage view (it should show the red and green outlines).
9. **Rotation lock OFF**, mode **Auto**: turn the phone into landscape both ways and back, then lay
   it flat. **Does the layout follow cleanly, or does it end up stuck, cut off or flipping while
   flat?** Screenshot anything broken.
10. Legibility: prop the phone at waist height under the brightest lamp you have and read it from
    1 m and 2 m at an angle. Try sizes S / M / L and MM:SS / H:MM:SS in the toolbar.
    **Which size is still readable at 2 m?**
11. Offline: switch on airplane mode (Wi-Fi off too), swipe the app away, then open it from the icon.
    **Does it open? The report should show "controlled at load: yes" and "last ping: FAILED".**
    Switch airplane mode off afterwards.
12. Low Power Mode **on**, then repeat step 3 for 1 minute. **Did the screen stay on?**
    Switch Low Power Mode off afterwards.
13. In the app, tap **Copy report** and paste it into a note. Do the same in the Safari tab. Send me both.

## Android (Chrome), shorter

1. Open the URL in Chrome and run steps 2–4.
2. Menu → Install app (or Add to home screen), then open it from the icon.
   **What does the header say for display-mode?**
3. In the app, tap **Try screen.orientation.lock('landscape')**. **What is the result?**
   If it says "ok", Android may not need the CSS rotation.
4. Repeat step 3 (2 minutes untouched) and step 11 (airplane mode cold start).
5. Copy the report and send it.

## What I need back

- The copied reports: iPhone app, iPhone tab, Android app.
- Answers to the bold questions (one word each is fine), plus the stage screenshot(s).

Change Auto-Lock back to your usual setting afterwards. For the gig the plan is to set it to
**Never** as a second safety layer. That is not done during this test, because it would hide
whether the wake lock works.
