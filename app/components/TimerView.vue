<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhPause, PhPlay, PhX } from '@phosphor-icons/vue'
import { FEATURES, LANDSCAPE_ROTATION } from '~/features'
import { useStageTimer } from '~/composables/useStageTimer'
import { useDebugOverlay } from '~/composables/useSecretTaps'

const timer = useStageTimer()
const debug = useDebugOverlay()
const version = useRuntimeConfig().public.appVersion as string

const LONG_PRESS_MS = 500
const AUTO_HIDE_MS = 5000
const HINT_MS = 1600
const CONFIRM_MS = 3000

const isRunning = computed(() => timer.phase.value === 'running' || timer.phase.value === 'overtime')
const shownWhileRunning = ref(false)
const picking = ref(false)
const controlsVisible = computed(() => !isRunning.value || shownWhileRunning.value)
const hint = ref(false)
const confirmExit = ref(false)

// ---- landscape: CSS rotation inside a portrait viewport, none when the viewport is already landscape
const portrait = ref(true)
let mq: MediaQueryList | undefined
const syncOrientation = () => { portrait.value = mq?.matches ?? true }
const rotation = computed(() => (portrait.value ? LANDSCAPE_ROTATION : 'none'))

// ---- timers for auto-hide, hint and confirm
let hideTimer: ReturnType<typeof setTimeout> | undefined
let hintTimer: ReturnType<typeof setTimeout> | undefined
let confirmTimer: ReturnType<typeof setTimeout> | undefined
let pressTimer: ReturnType<typeof setTimeout> | undefined
let longPressFired = false

function scheduleHide() {
  clearTimeout(hideTimer)
  if (!isRunning.value || picking.value) return
  hideTimer = setTimeout(() => { shownWhileRunning.value = false; confirmExit.value = false }, AUTO_HIDE_MS)
}
function showControls() {
  shownWhileRunning.value = true
  hint.value = false
  scheduleHide()
}
function hideControls() {
  shownWhileRunning.value = false
  confirmExit.value = false
  clearTimeout(hideTimer)
}
watch(isRunning, (running) => {
  // Pressing play keeps the controls up; they fade after 5 s without touches.
  if (running) showControls()
  else { clearTimeout(hideTimer); shownWhileRunning.value = false }
})
watch(picking, (p) => { if (p) clearTimeout(hideTimer); else scheduleHide() })

// ---- stage gestures: long press shows controls, a tap shows the hint or hides them
const onControl = (e: Event) => !!(e.target as HTMLElement | null)?.closest('[data-control]')
function onStageDown(e: PointerEvent) {
  if (onControl(e)) { if (isRunning.value) scheduleHide(); return }
  longPressFired = false
  clearTimeout(pressTimer)
  if (isRunning.value && !shownWhileRunning.value) {
    pressTimer = setTimeout(() => { longPressFired = true; showControls() }, LONG_PRESS_MS)
  }
}
function onStageUp(e: PointerEvent) {
  clearTimeout(pressTimer)
  if (onControl(e) || longPressFired || !isRunning.value) return
  if (shownWhileRunning.value) { hideControls(); return }
  hint.value = true
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => { hint.value = false }, HINT_MS)
}
function onStageCancel() { clearTimeout(pressTimer) }

// ---- actions
function onToggle() { timer.toggle(); scheduleHide() }
function onStep(sign: 1 | -1, minutes: number) { timer.step(sign, minutes); scheduleHide() }
function onExit() {
  if (!isRunning.value) { timer.exit(); return }
  if (!confirmExit.value) {
    confirmExit.value = true
    clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => { confirmExit.value = false }, CONFIRM_MS)
    scheduleHide()
    return
  }
}
function onConfirmEnd() { clearTimeout(confirmTimer); confirmExit.value = false; timer.exit() }

function onKey(e: KeyboardEvent) {
  if (debug.debugOpen.value) return
  if (e.key === ' ' || e.key === 'k') { e.preventDefault(); onToggle() }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onStep(1, timer.prefs.value.stepMinutes) }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onStep(-1, timer.prefs.value.stepMinutes) }
  else if (e.key === 'Escape') { if (confirmExit.value) confirmExit.value = false; else onExit() }
}

onMounted(() => {
  mq = window.matchMedia('(orientation: portrait)')
  syncOrientation()
  mq.addEventListener('change', syncOrientation)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  mq?.removeEventListener('change', syncOrientation)
  window.removeEventListener('keydown', onKey)
  for (const t of [hideTimer, hintTimer, confirmTimer, pressTimer]) clearTimeout(t)
})

const display = timer.display
</script>

<template>
  <section
    class="stage"
    :data-rot="rotation"
    data-testid="timer-view"
    @pointerdown="onStageDown"
    @pointerup="onStageUp"
    @pointercancel="onStageCancel"
    @contextmenu.prevent
  >
    <div class="land">
      <div class="safe">
        <div class="digits-box" :class="{ paused: !isRunning }">
          <TimerDigits
            v-if="display"
            :text="display.text"
            :negative="display.negative"
            :shake-key="timer.zeroCrossings.value"
            :shake="FEATURES.shake"
            fit
          />
        </div>

        <StatusPills :wake-lock-matters="true" />

        <Transition name="fade">
          <p v-if="hint && !controlsVisible" class="hint glass" data-testid="hint">Hold to show controls</p>
        </Transition>

        <Transition name="fade">
          <div v-if="controlsVisible" class="controls" data-testid="controls">
            <div class="exit" data-control>
              <button type="button" class="round glass exit-btn" aria-label="Back to presets" data-testid="exit" @click="onExit">
                <PhX :size="28" weight="bold" />
              </button>
              <Transition name="fade">
                <div v-if="confirmExit" class="confirm glass" data-testid="exit-confirm">
                  <span>End timer?</span>
                  <button type="button" class="end" data-testid="exit-confirm-end" @click="onConfirmEnd">End</button>
                </div>
              </Transition>
            </div>

            <div class="row">
              <template v-if="FEATURES.stepPicker">
                <StepButton :sign="-1" :step="timer.prefs.value.stepMinutes" picker @act="(m) => onStep(-1, m)" @pick="timer.setStep" @picking="(o) => (picking = o)" />
              </template>
              <template v-else>
                <StepButton :sign="-1" :step="5" :picker="false" @act="(m) => onStep(-1, m)" />
                <StepButton :sign="-1" :step="1" :picker="false" @act="(m) => onStep(-1, m)" />
              </template>

              <button
                type="button"
                class="play glass"
                data-control
                :aria-label="isRunning ? 'Pause' : 'Start'"
                :data-testid="isRunning ? 'pause' : 'play'"
                @click="onToggle"
              >
                <Transition name="morph" mode="out-in">
                  <PhPause v-if="isRunning" key="pause" :size="38" weight="fill" />
                  <PhPlay v-else key="play" :size="38" weight="fill" class="play-icon" />
                </Transition>
              </button>

              <template v-if="FEATURES.stepPicker">
                <StepButton :sign="1" :step="timer.prefs.value.stepMinutes" picker @act="(m) => onStep(1, m)" @pick="timer.setStep" @picking="(o) => (picking = o)" />
              </template>
              <template v-else>
                <StepButton :sign="1" :step="1" :picker="false" @act="(m) => onStep(1, m)" />
                <StepButton :sign="1" :step="5" :picker="false" @act="(m) => onStep(1, m)" />
              </template>
            </div>

            <button type="button" class="version" data-control data-testid="version" @click="debug.tap">{{ version }}</button>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stage {
  /* In the iOS home-screen app the viewport (and so inset: 0 and 100dvh) can stop 47 px short of
     the screen at the home-bar end; --app-h is the full screen there (plugins/app-height.client.ts).
     Elsewhere 100dvh: the visible area in a Safari tab and in Chrome. */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--app-h, 100dvh);
  background: var(--bg);
  container-type: size;
  overflow: hidden;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.land { position: absolute; top: 0; left: 0; }
/* The insets are reported in physical (portrait) coordinates; map them to the rotated sides. */
.stage[data-rot='none'] .land {
  width: 100cqw; height: 100cqh;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
.stage[data-rot='cw'] .land {
  width: 100cqh; height: 100cqw;
  transform-origin: 0 0;
  transform: translateX(100cqw) rotate(90deg);
  padding: env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left) env(safe-area-inset-top);
}
.stage[data-rot='ccw'] .land {
  width: 100cqh; height: 100cqw;
  transform-origin: 0 0;
  transform: translateY(100cqh) rotate(-90deg);
  padding: env(safe-area-inset-left) env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom);
}
/* The digits clear the dimmed band along the notch edge (--notch-dim in main.css); the corner
   controls on that side move further in. */
.stage[data-rot='cw'] { --notch-left: var(--notch-dim); }
.stage[data-rot='ccw'] { --notch-right: var(--notch-dim); }
.safe {
  --play-size: 5rem;
  --step-size: 3.75rem;
  --step-font: 1.375rem;
  --row-bottom: 0.75rem;
  position: relative;
  width: 100%;
  height: 100%;
}
/* The digit box always leaves room for the control row, paused or running, so the digits never
   move when the controls appear and the controls never cover them. */
.digits-box {
  position: absolute;
  inset: 4% 3% calc(var(--play-size) + var(--row-bottom) + 0.75rem);
  container-type: size;
  display: grid;
  place-items: center;
}

.controls {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.controls [data-control], .controls .row > * { pointer-events: auto; }
.row {
  position: absolute;
  left: 50%;
  bottom: var(--row-bottom);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  pointer-events: none;
}
.round, .play {
  display: grid;
  place-items: center;
  border-radius: 50%;
  touch-action: manipulation;
}
.play { width: var(--play-size); height: var(--play-size); }
.play-icon { transform: translateX(3px); }
.exit { position: absolute; top: 0.75rem; left: calc(0.75rem + var(--notch-left, 0px)); display: flex; align-items: center; gap: 0.6rem; }
.exit-btn { width: 3.25rem; height: 3.25rem; }
.confirm {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 0.4rem 0.35rem 1rem;
  border-radius: 999px;
  font: 700 1.125rem / 1 system-ui, -apple-system, sans-serif;
}
.end {
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  border: 0;
  background: var(--destructive);
  color: #fff;
  font: inherit;
}
.version {
  position: absolute;
  right: calc(0.75rem + var(--notch-right, 0px));
  bottom: 0.5rem;
  padding: 0.5rem;
  border: 0;
  background: none;
  color: var(--dim);
  font: 500 0.75rem / 1 ui-monospace, Menlo, monospace;
}
.hint {
  position: absolute;
  left: 50%;
  bottom: calc(var(--row-bottom) + 0.6rem);
  transform: translateX(-50%);
  margin: 0;
  padding: 0.6em 1.2em;
  border-radius: 999px;
  font: 700 1.25rem / 1.2 system-ui, -apple-system, sans-serif;
  pointer-events: none;
}

.fade-enter-active, .fade-leave-active { transition: opacity 220ms ease-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.morph-enter-active, .morph-leave-active { transition: opacity 120ms ease-out, transform 160ms cubic-bezier(0.2, 0.9, 0.3, 1); }
.morph-enter-from { opacity: 0; transform: scale(0.6) rotate(-30deg); }
.morph-leave-to { opacity: 0; transform: scale(0.6) rotate(30deg); }
@media (prefers-reduced-motion: reduce) {
  .morph-enter-from, .morph-leave-to { transform: none; }
}
</style>
