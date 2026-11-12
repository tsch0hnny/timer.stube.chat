<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MAX_ABS_MS } from '#shared/timer/core'

/**
 * The iOS countdown wheel: hours, minutes, seconds. Native scroll snapping gives the momentum
 * and the snap; the value is read once a column comes to rest. Up to 9:59:59, the longest time
 * the timer can show.
 */
const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [ms: number] }>()

const ROW = 34 // px, one row of the wheel; the grey band is one row tall
const columns = [
  { id: 'hours', unit: 'hours', max: Math.floor(MAX_ABS_MS / 3_600_000), ms: 3_600_000, label: 'Hours' },
  { id: 'minutes', unit: 'min', max: 59, ms: 60_000, label: 'Minutes' },
  { id: 'seconds', unit: 'sec', max: 59, ms: 1000, label: 'Seconds' },
] as const
type Col = (typeof columns)[number]

const split = (ms: number) => [Math.floor(ms / 3_600_000), Math.floor(ms / 60_000) % 60, Math.floor(ms / 1000) % 60]
const values = ref(split(props.modelValue))
const els = ref<HTMLElement[]>([])
const timers: Array<ReturnType<typeof setTimeout> | undefined> = []
/** Where a column is heading after key presses, so repeated presses add up before it settles. */
const pending: Array<number | undefined> = []
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function total(v: number[]) { return v.reduce((sum, n, i) => sum + n * columns[i]!.ms, 0) }
function scrollTo(i: number, n: number, smooth: boolean) {
  els.value[i]?.scrollTo({ top: n * ROW, behavior: smooth && !reduced() ? 'smooth' : 'auto' })
}
function settle(i: number) {
  const el = els.value[i]
  if (!el) return
  const n = Math.max(0, Math.min(columns[i]!.max, Math.round(el.scrollTop / ROW)))
  if (pending[i] === n) pending[i] = undefined
  if (n === values.value[i]) return
  values.value = values.value.map((v, j) => (j === i ? n : v))
  emit('update:modelValue', total(values.value))
}
// Read the value once the column rests: 120 ms without a scroll event (scrollend is not everywhere).
function onScroll(i: number) {
  clearTimeout(timers[i])
  timers[i] = setTimeout(() => settle(i), 120)
}
function onKey(i: number, e: KeyboardEvent) {
  const d = { ArrowUp: 1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key]
  const edge = e.key === 'Home' ? 0 : e.key === 'End' ? columns[i]!.max : undefined
  if (d === undefined && edge === undefined) return
  e.preventDefault()
  const n = edge ?? Math.max(0, Math.min(columns[i]!.max, (pending[i] ?? values.value[i]!) + d!))
  pending[i] = n
  scrollTo(i, n, true)
}
const valueText = (c: Col, n: number) => `${n} ${c.label.toLowerCase()}`

watch(() => props.modelValue, (ms) => {
  if (ms === total(values.value)) return
  values.value = split(ms)
  values.value.forEach((n, i) => scrollTo(i, n, false))
})
onMounted(() => values.value.forEach((n, i) => scrollTo(i, n, false)))
onBeforeUnmount(() => timers.forEach((t) => clearTimeout(t)))
</script>

<template>
  <div class="wheel" data-testid="wheel">
    <div class="band" aria-hidden="true" />
    <div v-for="(c, i) in columns" :key="c.id" class="col">
      <div
        :ref="(el) => { if (el) els[i] = el as HTMLElement }"
        class="scroller"
        role="spinbutton"
        tabindex="0"
        :aria-label="c.label"
        :aria-valuemin="0"
        :aria-valuemax="c.max"
        :aria-valuenow="values[i]"
        :aria-valuetext="valueText(c, values[i]!)"
        :data-testid="`wheel-${c.id}`"
        @scroll.passive="onScroll(i)"
        @keydown="onKey(i, $event)"
      >
        <div
          v-for="n in c.max + 1"
          :key="n"
          class="item"
          :class="{ current: n - 1 === values[i] }"
          aria-hidden="true"
          @click="scrollTo(i, n - 1, true)"
        >
          {{ n - 1 }}
        </div>
      </div>
      <span class="unit" aria-hidden="true">{{ c.id === 'hours' && values[i] === 1 ? 'hour' : c.unit }}</span>
    </div>
  </div>
</template>

<style scoped>
.wheel {
  --row: 34px;
  --rows: 7; /* visible rows, odd: the band sits in the middle one */
  position: relative;
  height: calc(var(--row) * var(--rows));
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: minmax(0, 1fr); /* each column is exactly the wheel's height, so it scrolls */
  user-select: none;
  -webkit-user-select: none;
}
/* The grey selection band across all three columns, as on iOS. */
.band {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(50% - var(--row) / 2);
  height: var(--row);
  border-radius: 8px;
  background: var(--fill-quiet);
  pointer-events: none;
}
.col { position: relative; min-width: 0; }
.scroller {
  height: 100%;
  overflow-y: scroll;
  /* The drum's 3D tilt makes rows a little wider than the column; never let that scroll sideways. */
  overflow-x: hidden;
  touch-action: pan-y;
  scroll-snap-type: y mandatory;
  overscroll-behavior: contain;
  padding: calc(var(--row) * (var(--rows) - 1) / 2) 0;
  scrollbar-width: none;
  outline: none;
  /* The drum fades out towards its top and bottom edges. */
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 32%, #000 68%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 32%, #000 68%, transparent);
}
.scroller::-webkit-scrollbar { display: none; }
.scroller:focus-visible { outline: none; }
.col:has(.scroller:focus-visible) .unit { text-decoration: underline; text-underline-offset: 4px; }
.item {
  height: var(--row);
  scroll-snap-align: center;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: calc(50% + 0.15rem); /* numbers end just left of the centre; the unit follows */
  font: 400 1.4375rem / 1 system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  color: #fff;
}
.unit {
  position: absolute;
  left: calc(50% + 0.55rem);
  top: calc(50% - var(--row) / 2);
  height: var(--row);
  display: flex;
  align-items: center;
  font: 600 1.0625rem / 1 system-ui, -apple-system, sans-serif;
  pointer-events: none;
}
/* The drum's curve, where the browser can tie an animation to scroll position. */
@supports (animation-timeline: view()) {
  .item {
    animation: drum linear both;
    animation-timeline: view();
  }
  @keyframes drum {
    0% { transform: perspective(500px) rotateX(-62deg); opacity: 0.5; }
    50% { transform: none; opacity: 1; }
    100% { transform: perspective(500px) rotateX(62deg); opacity: 0.5; }
  }
}
/* A landscape phone is 390 px tall: a shorter drum keeps the buttons below it in reach. */
@media (orientation: landscape) and (max-height: 500px) {
  .wheel { --rows: 5; }
}
@media (prefers-reduced-motion: reduce) {
  .item { animation: none; }
}
</style>
