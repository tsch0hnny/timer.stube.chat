# Release: candidate → test-timer → device checklist → timer.stube.chat → freeze

The owner runs every command on the VPS. Nothing is deployed on gig day.

## One-time setup on the VPS

```sh
git clone https://github.com/tsch0hnny/timer.stube.chat.git /opt/timer/src
```

DNS for timer.stube.chat and test-timer.stube.chat already points to the VPS. Traefik picks up the
containers by label (network `traefik_net`, entrypoint `websecure`, certresolver `letsencrypt`).

## 1. Deploy a candidate to test-timer.stube.chat

```sh
cd /opt/timer/src
git fetch --tags && git checkout <commit-or-tag>      # what you were told to test
export APP_VERSION=$(git describe --tags --always --dirty)
docker compose -f deploy/compose.test.yml up -d --build
```

This builds `timer-stube-chat:$APP_VERSION` and replaces whatever ran at test-timer before (the spike
included). Check from anywhere: `deploy/check-headers.sh https://test-timer.stube.chat`.

**Getting the new version onto a phone that already has the app.** The app never reloads by itself:
a reload would drop the wake lock until the next tap. Two ways to update:
- Open the app and wait on the presets screen until "Update ready · reload" appears, then tap it.
- Or open the app, swipe it away, and open it again.

Either way, check the version in the debug overlay afterwards.

## 2. Device checklist

Run [DEVICE-CHECKLIST.md](DEVICE-CHECKLIST.md) on the iPhone and the Android phone. Only a pass
continues.

## 3. Promote the exact same image to timer.stube.chat

```sh
cd /opt/timer/src
export APP_VERSION=<the version shown in the debug overlay on test-timer>
docker image inspect timer-stube-chat:$APP_VERSION >/dev/null && docker compose -f deploy/compose.prod.yml up -d
```

`compose.prod.yml` never builds (`pull_policy: never`), so production runs the very image that
passed the checklist.

## 4. Freeze (Friday night)

Tag the commit that passed, on the Mac or via GitHub:

```sh
git tag -a gig-2026-11-14 <commit> -m "Gig build, passed device checklist on <date>"
git push origin gig-2026-11-14
```

Write the version into SOUNDCHECK.md. From then on, no deploys until after the gig.

## Rolling back

Previous images stay on the VPS. To go back, export the old `APP_VERSION` and run step 3 again.
Then update the phones as described in step 1 and check the version in the debug overlay.
