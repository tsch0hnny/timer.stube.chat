<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { MINUS } from '#shared/timer/display'
import { STEP_CHOICES, type StepMinutes } from '#shared/storage/store'

const props = defineProps<{
  sign: 1 | -1
  step: number
  /** Hold to open the 1/5/10/15 strip. Off = a fixed-step button (cut fallback). */
  picker: boolean
}>()
const emit = defineEmits<{ act: [minutes: number]; pick: [minutes: StepMinutes]; picking: [open: boolean] }>()

const HOLD_MS = 380
const open = ref(false)
const highlight = ref<number | null>(null)
let holdTimer: ReturnType<typeof setTimeout> | undefined

// Top to bottom: 15, 10, 5, 1 ("slide up for more"). The strip opens above the button, never around
// the finger: the buttons sit near the bottom edge, and on the iPhone a strip centred on the current
// step hung off the screen from 5 upwards. The current step stays highlighted until the finger
// reaches another choice, so releasing anywhere else keeps it.
const choices = [...STEP_CHOICES].reverse()
const label = computed(() => `${props.sign > 0 ? '+' : MINUS}${props.step} min`)
const aria = computed(() => `${props.sign > 0 ? 'Add' : 'Subtract'} ${props.step} minute${props.step === 1 ? '' : 's'}${props.picker ? '. Hold to change the step.' : ''}`)

function setOpen(v: boolean) {
  open.value = v
  emit('picking', v)
}
function onDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  if (props.picker) {
    holdTimer = setTimeout(() => { highlight.value = props.step; setOpen(true) }, HOLD_MS)
  }
}
function onMove(e: PointerEvent) {
  if (!open.value) return
  // elementFromPoint respects the CSS rotation, so "up/down" works in the rotated landscape view.
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-step-choice]')
  highlight.value = el ? Number(el.dataset.stepChoice) : props.step
}
function onUp() {
  clearTimeout(holdTimer)
  if (open.value) {
    if (highlight.value !== null && highlight.value !== props.step) emit('pick', highlight.value as StepMinutes)
    highlight.value = null
    setOpen(false)
    return
  }
  emit('act', props.step)
}
function onCancel() {
  clearTimeout(holdTimer)
  highlight.value = null
  if (open.value) setOpen(false)
}
// Keyboard activation (Enter/Space) arrives as a click with detail 0; pointer taps are handled above.
function onClick(e: MouseEvent) {
  if (e.detail === 0) emit('act', props.step)
}
onBeforeUnmount(() => clearTimeout(holdTimer))
</script>

<template>
  <div class="step-wrap" data-control>
    <button
      type="button"
      class="step btn-round"
      :class="{ pressed: open }"
      :aria-label="aria"
      :data-testid="sign > 0 ? 'step-plus' : 'step-minus'"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onCancel"
      @lostpointercapture="onCancel"
      @click="onClick"
      @contextmenu.prevent
    >
      {{ label }}
    </button>
    <Transition name="strip">
      <div
        v-if="open"
        class="strip"
        role="listbox"
        :aria-label="`Step size, currently ${step} minutes`"
        data-testid="step-strip"
      >
        <div
          v-for="c in choices"
          :key="c"
          class="choice"
          :class="{ active: highlight === c }"
          role="option"
          :aria-selected="highlight === c"
          :data-step-choice="c"
          :data-testid="`step-choice-${c}`"
        >
          {{ c }} min
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.step-wrap { position: relative; }
.step {
  width: var(--step-size);
  height: var(--step-size);
  padding: 0;
  font-size: var(--step-font);
  white-space: nowrap;
  touch-action: none;
}
.step.pressed { transform: scale(1.06); }
/* An iOS menu: opaque grey, rounded, hairline separators; the choice under the finger lights up grey,
   as iOS highlights a menu row (a white block would be the brightest thing on a dark stage). */
.strip {
  --choice-h: 3rem;
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.75rem);
  width: 7.5rem;
  transform: translateX(-50%);
  transform-origin: 50% 100%; /* grows out of the button */
  border-radius: 0.875rem;
  overflow: hidden;
  z-index: 3;
  background: var(--menu);
}
.choice {
  height: var(--choice-h);
  display: grid;
  place-items: center;
  font: 400 var(--step-font) / 1 system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  color: #fff;
}
.choice + .choice { border-top: 0.5px solid var(--separator); }
.choice.active { background: rgb(255 255 255 / 0.16); color: #fff; font-weight: 600; }
.strip-enter-active, .strip-leave-active { transition: opacity 160ms ease-out, transform 200ms cubic-bezier(0.16, 1, 0.3, 1); }
.strip-enter-from, .strip-leave-to { opacity: 0; transform: translateX(-50%) scaleY(0.6); }
@media (prefers-reduced-motion: reduce) {
  .strip-enter-active, .strip-leave-active { transition: opacity 120ms linear; }
  .strip-enter-from, .strip-leave-to { transform: translateX(-50%); }
  .step.pressed { transform: none; }
}
</style>
