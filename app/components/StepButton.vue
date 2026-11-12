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

// Top to bottom: 15, 10, 5, 1 ("drag up for more"). The strip is offset so the current step sits under the finger.
const choices = [...STEP_CHOICES].reverse()
const offsetIndex = computed(() => Math.max(0, choices.indexOf(props.step as StepMinutes)))
const label = computed(() => `${props.sign > 0 ? '+' : MINUS}${props.step}`)
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
  highlight.value = el ? Number(el.dataset.stepChoice) : null // off the strip sideways = cancel
}
function onUp() {
  clearTimeout(holdTimer)
  if (open.value) {
    if (highlight.value !== null) emit('pick', highlight.value as StepMinutes)
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
      class="step glass"
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
        class="strip glass"
        :style="{ '--offset': offsetIndex }"
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
          {{ c }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.step-wrap { position: relative; }
.step {
  min-width: var(--step-size);
  height: var(--step-size);
  padding: 0 0.6em;
  border-radius: calc(var(--step-size) / 2);
  font: 700 var(--step-font) / 1 system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  touch-action: none;
}
.step.pressed { transform: scale(1.06); }
.strip {
  --choice-h: var(--step-size);
  position: absolute;
  left: 50%;
  width: calc(var(--step-size) * 1.15);
  top: calc(50% - (var(--offset) + 0.5) * var(--choice-h));
  transform: translateX(-50%);
  border-radius: calc(var(--step-size) / 2);
  overflow: hidden;
  z-index: 3;
  /* It floats over the white digits: near-opaque so every choice stays readable. */
  background: rgb(28 28 30 / 0.94);
}
.choice {
  height: var(--choice-h);
  display: grid;
  place-items: center;
  font: 700 var(--step-font) / 1 system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  color: rgb(255 255 255 / 0.85);
}
.choice.active { background: #fff; color: #000; }
.strip-enter-active, .strip-leave-active { transition: opacity 160ms ease-out, transform 200ms cubic-bezier(0.16, 1, 0.3, 1); }
.strip-enter-from, .strip-leave-to { opacity: 0; transform: translateX(-50%) scaleY(0.6); }
@media (prefers-reduced-motion: reduce) {
  .strip-enter-active, .strip-leave-active { transition: opacity 120ms linear; }
  .strip-enter-from, .strip-leave-to { transform: translateX(-50%); }
  .step.pressed { transform: none; }
}
</style>
