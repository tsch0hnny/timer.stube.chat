# StageTimer (timer.stube.chat)

A full-screen countdown for the band's set, on a phone lying on the synth. Pure black, white
digits that never move, red with a minus sign in overtime, the screen kept on, and it works
offline from the home screen. Product context: [PRODUCT.md](PRODUCT.md).

## Layout

| Path | What |
|---|---|
| `shared/timer/` | Framework-free timer core: state machine, display formatting, second-aligned ticker |
| `shared/storage/` | The one storage interface (timer, presets, prefs) over localStorage; sync plugs in here later |
| `app/` | Nuxt 4 client app (presets, timer view, controls, debug overlay); `app/features.ts` holds the cut switches |
| `deploy/` | nginx config, compose files for test-timer and timer, header check script |
| `spike/` | Throwaway device spike (see `spike/CHECKLIST.md`) |
| `test/unit/` | Vitest for the core · `test/e2e/` Playwright against the real container |
| `docs/` | [Device checklist](docs/DEVICE-CHECKLIST.md) · [Soundcheck](docs/SOUNDCHECK.md) · [Release](docs/RELEASE.md) |

## Commands

```sh
npm ci
npm test               # Vitest: timer core
npm run typecheck      # vue-tsc via nuxt typecheck
npm run e2e            # build the gig image, run it on :8090, Playwright in WebKit + Chromium
npm run dev            # dev server (no service worker; wake lock needs HTTPS: use test-timer)
```

Node 24.22.3 is pinned with Volta in `package.json`.

## Evidence map: which check covers what

CI (`.github/workflows/ci.yml`) runs all of this on every push.

| Phase 1 feature | Automated evidence | Needs the real phone |
|---|---|---|
| Correct time, no drift, absolute timestamps | `test/unit/core`, `display`, `ticker` (60 tests); E2E full 60:00 run | 60-minute run next to the Clock app |
| Pause/resume, ± steps, across zero | unit `core`; E2E pause 10 min, ± across zero | — |
| Survives reload and lock | unit `store` (each state), `ticker` (visibilitychange); E2E reload in overtime | Lock/unlock, kill/reopen |
| Digits don't jump | E2E `digits.spec` (cell boxes identical 0–9, line static) | iPhone's own system-ui at 2 m |
| Overtime red + minus + shake | E2E 60:00 run (red, U+2212) | The shake's feel on the device |
| Controls behaviour, step picker, exit confirm | E2E `timer.spec` | Touch feel, long press on iOS |
| Wake lock, no silent failure | E2E pill refused vs held (mocked API) | **Only the phone proves the lock holds** |
| Offline, install | E2E offline reload (SW); manifest/icons test; header checks | Airplane-mode cold start; Add to Home Screen |
| Landscape via CSS rotation, safe areas | E2E screenshots in WebKit/Chromium | Notch, status bar, rotation lock |
| Design quality | `impeccable detect` on the running app and on every rendered timer state | Glare and legibility under stage light |
