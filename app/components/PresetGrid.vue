<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PhArrowCounterClockwise } from '@phosphor-icons/vue'
import { MINUTE, select as selectCore } from '#shared/timer/core'
import { BUILT_IN_PRESETS, missingDefaults } from '#shared/storage/store'
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
  if (FEATURES.editablePresets) timer.addPreset(wheelMs.value) // as iOS fills Recents
  timer.select(wheelMs.value)
}

/** Apple's words for a length: "15 secs", "12 min", "42 min, 15 secs", "1 hr, 20 min". */
function words(ms: number) {
  const total = Math.round(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor(total / 60) % 60
  const sec = total % 60
  return [h && `${h} hr`, m && `${m} min`, sec && `${sec} ${sec === 1 ? 'sec' : 'secs'}`].filter(Boolean).join(', ')
}
const presets = computed(() => (FEATURES.editablePresets ? timer.presets.value : BUILT_IN_PRESETS))
// Each row shows the time exactly as the timer view will (same formatter), then the words.
const rows = computed(() =>
  presets.value.map((p) => ({ ...p, testId: String(p.durationMs / MINUTE), text: displayOf(selectCore(p.durationMs), 0)!.text, words: words(p.durationMs) })),
)
const canRestore = computed(() => FEATURES.editablePresets && missingDefaults(presets.value))

// Swipe to delete: one open row at a time. A tap or a scroll anywhere closes it, and that tap does
// nothing else (iOS); a tap on a row while another is open must not open a timer.
const openId = ref<string | null>(null)
let swallowSelect = false
function onOpen(id: string, open: boolean) {
  if (open) openId.value = id
  else if (openId.value === id) openId.value = null
}
function closeOnOutside(e: PointerEvent) {
  swallowSelect = false // every touch starts fresh
  if (!openId.value) return
  const rowEl = (e.target as HTMLElement).closest('[data-row]')
  if (rowEl?.getAttribute('data-row') === openId.value) return
  openId.value = null
  swallowSelect = true // this touch only closes the row
}
// Whatever that touch ends on, its click is over once it bubbles here: the next one counts again.
const endSwallow = () => { swallowSelect = false }
onMounted(() => window.addEventListener('click', endSwallow))
onBeforeUnmount(() => window.removeEventListener('click', endSwallow))
function onSelect(ms: number) {
  if (swallowSelect) { swallowSelect = false; return }
  timer.select(ms)
}
function onDelete(id: string) {
  if (openId.value === id) openId.value = null
  timer.deletePreset(id)
}
// A length the wheel just added lights up once when the list comes back.
const fresh = ref<string | null>(null)
onMounted(() => { fresh.value = timer.takeLastAdded() })
const action = computed(() => (startOnTap.value ? 'Start' : 'Set'))
</script>

<template>
  <section class="presets" data-testid="presets" @pointerdown.capture="closeOnOutside" @scroll.passive="openId = null">
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
        <!-- The visible switch is plain spans; the checkbox is an invisible tap area on top, so no
             browser's own form-control rendering (iOS sizes checkboxes its own way) can bend it. -->
        <span class="switch">
          <input
            type="checkbox"
            role="switch"
            :checked="startOnTap"
            data-testid="start-on-tap"
            @change="timer.setStartOnTap(($event.target as HTMLInputElement).checked)"
          >
          <span class="track" aria-hidden="true"><span class="knob" /></span>
        </span>
      </label>
    </div>

    <div class="listcol">
      <h2 class="heading">Presets</h2>
      <ul class="list" role="list">
        <PresetRow
          v-for="(r, i) in rows"
          :key="r.id"
          :data-row="r.id"
          :test-id="r.testId"
          :text="r.text"
          :words="r.words"
          :start-on-tap="startOnTap"
          :open="openId === r.id"
          :swipe="FEATURES.editablePresets"
          :fresh="fresh === r.id"
          :index="i"
          @open="(o) => onOpen(r.id, o)"
          @select="onSelect(r.durationMs)"
          @delete="onDelete(r.id)"
        />
      </ul>
      <p v-if="!rows.length" class="empty" data-testid="presets-empty">No presets. Lengths you set with the wheel appear here.</p>
      <button v-if="canRestore" type="button" class="restore" data-testid="restore-presets" @click="timer.restorePresets()">
        <PhArrowCounterClockwise :size="20" weight="bold" aria-hidden="true" />
        Restore Default Presets
      </button>
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
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  touch-action: manipulation; /* a scroll container: html's value does not reach in here */
  overscroll-behavior: contain;
  padding:
    calc(env(safe-area-inset-top) + 0.75rem)
    calc(env(safe-area-inset-right) + var(--gutter))
    calc(var(--safe-bottom) + 0.5rem)
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
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  z-index: 1;
  cursor: pointer;
}
.track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--fill-quiet);
  transition: background-color 200ms ease-out;
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #fff;
  transition: transform 220ms cubic-bezier(0.3, 0.7, 0.4, 1);
}
.switch input:checked + .track { background: var(--go); }
.switch input:checked + .track .knob { transform: translateX(20px); }
.switch input:focus-visible + .track { outline: 3px solid #fff; outline-offset: 3px; }

.heading {
  margin: 2rem 0 0.25rem;
  font: 700 1.375rem / 1.2 system-ui, -apple-system, sans-serif;
}
.list { margin: 0 calc(-1 * var(--gutter)); padding: 0; list-style: none; }
/* The rows themselves live in PresetRow.vue. */
.empty {
  margin: 1rem 0 0;
  font: 400 0.9375rem / 1.4 system-ui, -apple-system, sans-serif;
  color: var(--dim);
}
/* An iOS action row: plain text and a glyph, full width, no fill until pressed. */
.restore {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: calc(100% + 2 * var(--gutter));
  margin: 0 calc(-1 * var(--gutter));
  padding: 0.95rem var(--gutter);
  border: 0;
  background: none;
  color: #fff;
  font: 400 1.0625rem / 1.2 system-ui, -apple-system, sans-serif;
  text-align: left;
  touch-action: manipulation;
  transition: background-color 120ms ease-out;
}
.restore:active { background: var(--tile); }

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
  .knob, .track, .restore { transition: none; }
}
</style>
