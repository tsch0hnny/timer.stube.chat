<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhArrowCounterClockwise, PhX } from '@phosphor-icons/vue'
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
const confirmReset = ref(false)
const countUp = computed(() => timer.state.value.status !== 'idle' && timer.state.value.countUp === true)
/** Nothing to reset: paused at the full length (00:00 counting up). */
const atFullLength = computed(() => {
  const s = timer.state.value
  return s.status === 'paused' && s.remainingMs === s.durationMs
})

// ---- landscape: CSS rotation inside a portrait viewport, none when the viewport is already landscape
const portrait = ref(true)
let mq: MediaQueryList | undefined
const syncOrientation = () => { portrait.value = mq?.matches ?? true }
const rotation = computed(() => (portrait.value ? LANDSCAPE_ROTATION : 'none'))

// ---- timers for auto-hide, hint and confirm
let hideTimer: ReturnType<typeof setTimeout> | undefined
let hintTimer: ReturnType<typeof setTimeout> | undefined
let confirmTimer: ReturnType<typeof setTimeout> | undefined
let resetTimer: ReturnType<typeof setTimeout> | undefined
let pressTimer: ReturnType<typeof setTimeout> | undefined
let longPressFired = false

function scheduleHide() {
  clearTimeout(hideTimer)
  if (!isRunning.value || picking.value) return
  hideTimer = setTimeout(() => { shownWhileRunning.value = false; confirmExit.value = false; confirmReset.value = false }, AUTO_HIDE_MS)
}
function showControls() {
  shownWhileRunning.value = true
  hint.value = false
  scheduleHide()
}
function hideControls() {
  shownWhileRunning.value = false
  confirmExit.value = false
  confirmReset.value = false
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
// Reset works like the ✕: at once while paused, with an inline confirm while running.
function onReset() {
  if (!isRunning.value) { timer.reset(); return }
  if (!confirmReset.value) {
    confirmReset.value = true
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => { confirmReset.value = false }, CONFIRM_MS)
    scheduleHide()
  }
}
function onConfirmReset() { clearTimeout(resetTimer); confirmReset.value = false; timer.reset() }

function onKey(e: KeyboardEvent) {
  if (debug.debugOpen.value) return
  if (e.key === ' ' || e.key === 'k') { e.preventDefault(); onToggle() }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onStep(1, timer.prefs.value.stepMinutes) }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onStep(-1, timer.prefs.value.stepMinutes) }
  else if (e.key === 'Escape') {
    if (confirmReset.value) confirmReset.value = false
    else if (confirmExit.value) confirmExit.value = false
    else onExit()
  }
}

onMounted(() => {
  mq = window.matchMedia('(orientation: portrait)')
  syncOrientation()
  mq.addEventListener('change', syncOrientation)
  window.addEventListener('keydown', onKey)
  // Opened already counting by "Start right away": show Pause for the usual 5 s, as after play.
  // A timer restored by a reload mid-set stays quiet (it started long before).
  const s = timer.state.value
  if (s.status === 'running' && s.durationMs - (s.endAt - Date.now()) < 2000) showControls()
})
onBeforeUnmount(() => {
  mq?.removeEventListener('change', syncOrientation)
  window.removeEventListener('keydown', onKey)
  for (const t of [hideTimer, hintTimer, confirmTimer, resetTimer, pressTimer]) clearTimeout(t)
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
            :over="display.over"
            :count-up="countUp"
            :shake-key="timer.zeroCrossings.value"
            :shake="FEATURES.shake"
            fit
          />
        </div>

        <StatusPills :wake-lock-matters="true" />

        <Transition name="fade">
          <p v-if="hint && !controlsVisible" class="hint capsule" data-testid="hint">Hold to show controls</p>
        </Transition>

        <Transition name="fade">
          <div v-if="controlsVisible" class="controls" data-testid="controls">
            <div class="exit" data-control>
              <button type="button" class="btn-round exit-btn" aria-label="Back to presets" data-testid="exit" @click="onExit">
                <PhX :size="22" weight="bold" />
              </button>
              <Transition name="fade">
                <div v-if="confirmExit" class="confirm capsule" data-testid="exit-confirm">
                  <span>End timer?</span>
                  <button type="button" class="end" data-testid="exit-confirm-end" @click="onConfirmEnd">End</button>
                </div>
              </Transition>
            </div>

            <!-- Mirrors the ✕: the confirm opens to its left. -->
            <div class="reset" data-control>
              <Transition name="fade">
                <div v-if="confirmReset" class="confirm capsule" data-testid="reset-confirm">
                  <span>Reset timer?</span>
                  <button type="button" class="end" data-testid="reset-confirm-reset" @click="onConfirmReset">Reset</button>
                </div>
              </Transition>
              <button
                type="button"
                class="btn-round exit-btn"
                :aria-label="countUp ? 'Reset to zero' : 'Reset to the full length'"
                :disabled="atFullLength"
                data-testid="reset"
                @click="onReset"
              >
                <PhArrowCounterClockwise :size="22" weight="bold" />
              </button>
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
                class="btn-round play"
                :class="{ 'btn-go': !isRunning }"
                data-control
                :data-testid="isRunning ? 'pause' : 'play'"
                @click="onToggle"
              >
                <Transition name="swap" mode="out-in">
                  <span :key="isRunning ? 'pause' : 'start'">{{ isRunning ? 'Pause' : 'Start' }}</span>
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
  /* The painted area: in the iOS home-screen app iOS 27 leaves a 47 px strip below the viewport
     unpainted, so nothing may sit there (--safe-bottom makes up for it, main.css). */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100dvh;
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
  padding: env(safe-area-inset-top) env(safe-area-inset-right) var(--safe-bottom) env(safe-area-inset-left);
}
.stage[data-rot='cw'] .land {
  width: 100cqh; height: 100cqw;
  transform-origin: 0 0;
  transform: translateX(100cqw) rotate(90deg);
  padding: env(safe-area-inset-right) var(--safe-bottom) env(safe-area-inset-left) env(safe-area-inset-top);
}
.stage[data-rot='ccw'] .land {
  width: 100cqh; height: 100cqw;
  transform-origin: 0 0;
  transform: translateY(100cqh) rotate(-90deg);
  padding: env(safe-area-inset-left) env(safe-area-inset-top) env(safe-area-inset-right) var(--safe-bottom);
}
/* The digits clear the dimmed band along the notch edge (--notch-dim in main.css); the corner
   controls on that side move further in. */
.stage[data-rot='cw'] { --notch-left: var(--notch-dim); }
.stage[data-rot='ccw'] { --notch-right: var(--notch-dim); }
.safe {
  --play-size: 5rem;
  --step-size: 5rem; /* Apple's timer buttons are all one size */
  --step-font: 1.0625rem;
  --row-bottom: 0.75rem;
  position: relative;
  width: 100%;
  height: 100%;
}
/* The digits are centred on the short axis, paused or running, so they never move when the controls
   appear. The controls never cover them: TimerDigits caps the size so the ink stays clear of --band. */
.digits-box {
  --band: calc(var(--play-size) + var(--row-bottom) + 0.75rem);
  position: absolute;
  inset: 0 3%;
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
  gap: 1.75rem;
  pointer-events: none;
}
.play { width: var(--play-size); height: var(--play-size); font-size: 1.1875rem; }
.exit { position: absolute; top: 0.75rem; left: calc(0.75rem + var(--notch-left, 0px)); display: flex; align-items: center; gap: 0.6rem; }
.exit-btn { width: 3.25rem; height: 3.25rem; }
.reset { position: absolute; top: 0.75rem; right: calc(0.75rem + var(--notch-right, 0px)); display: flex; align-items: center; gap: 0.6rem; }
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
  font: 500 0.75rem / 1 system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
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
/* Start ⇄ Pause: the label cross-fades, as on the iOS timer. */
.swap-enter-active, .swap-leave-active { transition: opacity 100ms ease-out; }
.swap-enter-from, .swap-leave-to { opacity: 0; }
</style>
