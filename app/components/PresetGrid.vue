<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhArrowCounterClockwise, PhCaretRight, PhPlay } from '@phosphor-icons/vue'
import { MINUTE, select as selectCore } from '#shared/timer/core'
import { display as displayOf } from '#shared/timer/display'
import { FEATURES } from '~/features'
import { useStageTimer } from '~/composables/useStageTimer'
import { useDebugOverlay } from '~/composables/useSecretTaps'

/** The presets screen, laid out like the iOS Clock timer: wheel, buttons, then the list. */
const timer = useStageTimer()
const debug = useDebugOverlay()
const version = useRuntimeConfig().public.appVersion as string
const pwa = useNuxtApp().$pwa

const startOnTap = computed(() => timer.prefs.value.startOnTap)
const wheelMs = ref(timer.prefs.value.wheelMs) // opens on the last length set with it
function setFromWheel() {
  timer.setWheel(wheelMs.value)
  timer.select(wheelMs.value)
}

/** Apple's words for a length: "15 min", "1 hr", "1 hr, 15 min". */
function words(ms: number) {
  const m = Math.round(ms / MINUTE)
  const h = Math.floor(m / 60)
  if (h === 0) return `${m} min`
  return m % 60 ? `${h} hr, ${m % 60} min` : `${h} hr`
}
// Each row shows the time exactly as the timer view will (same formatter), then the words.
const rows = computed(() =>
  timer.store.loadPresets().map((p) => ({ ...p, text: displayOf(selectCore(p.durationMs), 0)!.text, words: words(p.durationMs) })),
)
const action = computed(() => (startOnTap.value ? 'Start' : 'Set'))
</script>

<template>
  <section class="presets" data-testid="presets">
    <StatusPills :wake-lock-matters="false" />

    <div class="setter">
      <template v-if="FEATURES.wheel">
        <TimeWheel v-model="wheelMs" />
        <div class="buttons">
          <!-- Where the iOS timer has Cancel: back to 0:00:00, to dial a length from scratch. -->
          <button
            type="button"
            class="btn-round"
            :disabled="wheelMs === 0"
            aria-label="Reset the wheel to zero"
            data-testid="wheel-reset"
            @click="wheelMs = 0"
          >
            <PhArrowCounterClockwise :size="30" weight="bold" />
          </button>
          <button
            type="button"
            class="btn-round"
            :class="{ 'btn-go': startOnTap }"
            :disabled="wheelMs === 0"
            :aria-label="`${action} a ${words(wheelMs)}${wheelMs % MINUTE ? `, ${Math.round((wheelMs % MINUTE) / 1000)} sec` : ''} timer`"
            data-testid="wheel-set"
            @click="setFromWheel"
          >
            {{ action }}
          </button>
        </div>
      </template>
      <label class="cell">
        <span>Start right away</span>
        <span class="switch">
          <input
            type="checkbox"
            role="switch"
            :checked="startOnTap"
            data-testid="start-on-tap"
            @change="timer.setStartOnTap(($event.target as HTMLInputElement).checked)"
          >
          <span class="knob" aria-hidden="true" />
        </span>
      </label>
    </div>

    <div class="listcol">
      <h2 class="heading">Presets</h2>
      <ul class="list" role="list">
        <li v-for="r in rows" :key="r.id">
          <button
            type="button"
            class="preset"
            :aria-label="`${startOnTap ? 'Start' : 'Open'} a ${r.words} timer`"
            :data-testid="`preset-${r.durationMs / MINUTE}`"
            @click="timer.select(r.durationMs)"
          >
            <span class="time">{{ r.text }}</span>
            <span class="words">{{ r.words }}</span>
            <span v-if="startOnTap" class="go" aria-hidden="true"><PhPlay :size="18" weight="fill" /></span>
            <PhCaretRight v-else class="chevron" :size="18" weight="bold" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <footer class="foot">
        <button v-if="pwa?.needRefresh" type="button" class="update" data-testid="update" @click="pwa.updateServiceWorker(true)">
          Update ready · reload
        </button>
        <button type="button" class="version" data-testid="version" @click="debug.tap">{{ version }}</button>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.presets {
  --gutter: 1.25rem;
  position: fixed; /* full height on iOS standalone: see .stage in TimerView.vue */
  top: 0;
  left: 0;
  right: 0;
  height: var(--app-h, 100dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding:
    calc(env(safe-area-inset-top) + 0.75rem)
    calc(env(safe-area-inset-right) + var(--gutter))
    calc(env(safe-area-inset-bottom) + 0.5rem)
    calc(env(safe-area-inset-left) + var(--gutter));
  background: var(--bg);
}
/* Rows scroll under a black status bar, not under the clock text (no effect where the inset is 0). */
.presets::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top);
  background: var(--bg);
  z-index: 2;
  pointer-events: none;
}
/* The first thing on screen sat in the dimmed band below the notch on the iPhone (--notch-dim). */
@media (display-mode: standalone) and (orientation: portrait) {
  .presets { padding-top: calc(env(safe-area-inset-top) + 0.25rem + var(--notch-dim)); }
}

.buttons {
  display: flex;
  justify-content: space-between;
  margin: 1rem 0.25rem 1.5rem;
}
.buttons .btn-round { width: 5.25rem; height: 5.25rem; }

/* One grouped cell, as the iOS timer's "When Timer Ends" row. */
.cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.25rem;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  background: var(--tile);
  font: 400 1.0625rem / 1.2 system-ui, -apple-system, sans-serif;
  cursor: pointer;
}
.switch { position: relative; flex: none; width: 51px; height: 31px; }
.switch input {
  position: absolute;
  inset: 0;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 999px;
  background: var(--fill-quiet);
  cursor: pointer;
  transition: background-color 200ms ease-out;
}
.switch input:checked { background: var(--go); }
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #fff;
  pointer-events: none;
  transition: transform 220ms cubic-bezier(0.3, 0.7, 0.4, 1);
}
.switch input:checked + .knob { transform: translateX(20px); }
.switch input:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }

.heading {
  margin: 2rem 0 0.25rem;
  font: 700 1.375rem / 1.2 system-ui, -apple-system, sans-serif;
}
.list { margin: 0 calc(-1 * var(--gutter)); padding: 0; list-style: none; }
/* Apple's Recents row: big light time, the words below, the action at the right. */
.preset {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  column-gap: 1rem;
  padding: 0.6rem var(--gutter);
  border: 0;
  background: none;
  color: #fff;
  text-align: left;
  touch-action: manipulation;
  transition: background-color 120ms ease-out;
}
.preset::after { /* separator, inset to the text like iOS */
  content: '';
  position: absolute;
  left: var(--gutter);
  right: 0;
  bottom: 0;
  height: 0.5px;
  background: var(--separator);
}
.preset:active { background: var(--tile); }
.time {
  grid-column: 1;
  font: 300 2.5rem / 1.08 system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.words {
  grid-column: 1;
  font: 400 0.9375rem / 1.3 system-ui, -apple-system, sans-serif;
  color: var(--dim);
}
.go, .chevron { grid-column: 2; grid-row: 1 / span 2; }
.go {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--go-fill);
  color: var(--go);
}
.go :deep(svg) { transform: translateX(1px); }
.chevron { color: var(--chevron); }

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 3rem;
  margin-top: 0.5rem;
}
.update {
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  border: 0;
  background: var(--menu);
  color: #fff;
  font: 600 0.9375rem / 1 system-ui, -apple-system, sans-serif;
}
.version {
  margin-left: auto;
  padding: 0.6rem 0.25rem;
  border: 0;
  background: none;
  color: var(--dim);
  font: 500 0.75rem / 1 system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
}

/* Landscape (rotation lock off, tablets): the wheel at the left, the list beside it; the page
   scrolls as one, so Cancel and Set are always reachable however short the screen. */
@media (orientation: landscape) {
  .presets {
    display: grid;
    grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr);
    column-gap: 2.5rem;
    align-items: start;
  }
  .heading { margin-top: 0.5rem; }
  .buttons { margin: 0.75rem 0.25rem 1rem; }
}
/* Where the wheel column fits the height, it stays put and only the list scrolls. */
@media (orientation: landscape) and (min-height: 360px) {
  .setter { position: sticky; top: 0.75rem; }
}
@media (prefers-reduced-motion: reduce) {
  .knob, .switch input, .preset { transition: none; }
}
</style>
