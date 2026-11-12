<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhCaretRight, PhPlay, PhTrash } from '@phosphor-icons/vue'

/**
 * One preset in Apple's Recents format, with swipe to delete as in the iOS 26/27 Clock app: the row
 * follows the finger and uncovers a small dim circle with a trash icon that grows and brightens,
 * then stretches into a capsule; released past half the circle it rests open on the circle, and
 * past 60% of the row the icon jumps to the capsule's left end: releasing then deletes. Vertical
 * scrolling stays the browser's (touch-action: pan-y); only a gesture that starts sideways is ours.
 */
const props = defineProps<{
  testId: string
  text: string
  words: string
  startOnTap: boolean
  /** This row's Delete is showing (one row at a time; the list decides). */
  open: boolean
  swipe: boolean
  /** Just added by the wheel: lights up once. */
  fresh?: boolean
  index: number
}>()
const emit = defineEmits<{ select: []; delete: []; open: [open: boolean] }>()

const D = 52 // px, the delete circle's diameter = the capsule's height
const M = 10 // px, its margin to the screen edge and to the row
const ACTION = D + 2 * M // how far the row moves when it rests open on the circle
const FULL = 0.6 // share of the row width past which releasing deletes

const row = ref<HTMLElement | null>(null)
const fg = ref<HTMLElement | null>(null)
const drag = ref<number | null>(null) // finger-driven offset while dragging, else null
const width = ref(390)
const removing = ref(false)
let start: { x: number; y: number; base: number; id: number } | null = null
let sideways: boolean | null = null
/** The current gesture went sideways: its click (if any) must not open a timer. Reset per touch. */
let swiped = false

const offset = computed(() => drag.value ?? (props.open ? -ACTION : 0))
const armed = computed(() => -offset.value > width.value * FULL || removing.value)
// The capsule always fills the uncovered strip, a margin M on both sides: first a circle that grows
// and brightens with the strip, then, once full size, a capsule stretching left with the row.
const pill = computed(() => {
  const reveal = Math.max(0, -offset.value)
  const grow = Math.min(1, Math.max(0, (reveal - 2 * M) / D))
  return {
    width: `${Math.max(D, reveal - 2 * M)}px`,
    transform: `translateY(-50%) scale(${grow})`,
    opacity: String(0.35 + 0.65 * grow),
  }
})
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function onDown(e: PointerEvent) {
  if (!props.swipe || removing.value || (e.pointerType === 'mouse' && e.button !== 0)) return
  if (drag.value !== null) settle() // a swipe the browser never finished: put it to rest first
  swiped = false
  start = { x: e.clientX, y: e.clientY, base: props.open ? -ACTION : 0, id: e.pointerId }
  sideways = null
  width.value = row.value?.clientWidth ?? width.value
}
function onMove(e: PointerEvent) {
  if (!start || e.pointerId !== start.id) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (sideways === null) {
    if (Math.hypot(dx, dy) < 8) return
    sideways = Math.abs(dx) > Math.abs(dy)
    if (!sideways) { start = null; return } // a scroll: the browser's
    swiped = true
    fg.value?.setPointerCapture(e.pointerId)
    emit('open', true) // closes any other open row
  }
  let x = start.base + dx
  if (x > 0) x /= 4 // rubber band to the right
  drag.value = Math.max(-width.value, x)
}
/** Ends a swipe: rest open, rest closed, or delete when armed. */
function settle(fromRelease = false) {
  start = null
  if (drag.value === null || removing.value) return
  if (fromRelease && armed.value) { void remove(); return }
  const open = drag.value < -ACTION / 2
  drag.value = null
  emit('open', open)
}
function onUp(e: PointerEvent) {
  if (!start || e.pointerId !== start.id) return
  settle(true)
}
// The browser can take a touch away (a scroll, an overlapping gesture, iOS cancelling the capture)
// without a pointerup: the swipe still has to come to rest instead of sticking halfway.
function onCancel() { settle() }
function onLostCapture() { if (start) settle() }
function onClick() {
  if (swiped) { swiped = false; return } // the click that ends a swipe opens nothing
  if (props.open) { emit('open', false); return } // a tap on an open row just closes it
  emit('select')
}
function onKey(e: KeyboardEvent) {
  swiped = false
  if (props.swipe && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); void remove() }
}

async function remove() {
  if (removing.value) return
  removing.value = true
  const el = row.value
  const front = fg.value
  if (el && front && !reduced()) {
    width.value = el.clientWidth
    const from = offset.value
    drag.value = -width.value
    await front.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${-width.value}px)` }], {
      duration: 200, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards',
    }).finished
    await el.animate([{ height: `${el.offsetHeight}px` }, { height: '0px' }], {
      duration: 240, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)', fill: 'forwards',
    }).finished
  }
  emit('delete')
}
</script>

<template>
  <li ref="row" class="row" :class="{ on: startOnTap, fresh }" :style="{ '--i': index }">
    <button
      v-if="swipe"
      v-show="offset < 0 || removing"
      type="button"
      class="delete"
      :class="{ armed, settling: drag === null }"
      :style="pill"
      :tabindex="open ? 0 : -1"
      :aria-hidden="!open"
      :aria-label="`Delete the ${words} preset`"
      :data-testid="`delete-${testId}`"
      @click="remove"
    >
      <PhTrash class="trash" :size="24" aria-hidden="true" />
    </button>
    <button
      ref="fg"
      type="button"
      class="preset"
      :class="{ dragging: drag !== null }"
      :style="{ transform: offset ? `translateX(${offset}px)` : undefined }"
      :aria-label="`${startOnTap ? 'Start' : 'Open'} a ${words} timer`"
      :aria-keyshortcuts="swipe ? 'Delete' : undefined"
      :data-testid="`preset-${testId}`"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onCancel"
      @lostpointercapture="onLostCapture"
      @click="onClick"
      @keydown="onKey"
    >
      <span class="time">{{ text }}</span>
      <span class="words">{{ words }}</span>
      <!-- One slot for both, so they share a centre; the switch swaps them in place. -->
      <span class="slot" aria-hidden="true">
        <PhCaretRight class="chevron" :size="18" weight="bold" />
        <span class="go"><PhPlay :size="18" weight="fill" /></span>
      </span>
    </button>
  </li>
</template>

<style scoped>
.row { position: relative; overflow: hidden; }
/* Behind the row, in the strip it uncovers: the destructive capsule, anchored right, centred. */
.delete {
  position: absolute;
  right: 10px;
  top: 50%;
  height: 52px;
  min-width: 52px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--destructive);
  color: #fff;
  transform-origin: right center;
  cursor: pointer;
}
/* While the finger drives it, the capsule follows exactly; once released it settles like the row. */
.delete.settling {
  transition:
    width 360ms cubic-bezier(0.25, 1, 0.5, 1),
    transform 360ms cubic-bezier(0.25, 1, 0.5, 1),
    opacity 200ms ease-out;
}
/* The trash icon sits in the middle, and jumps to the capsule's left end once a release deletes. */
.trash {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: left 240ms cubic-bezier(0.34, 1.4, 0.64, 1);
}
.delete.armed .trash { left: 26px; }
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
  background: var(--bg); /* opaque: it covers the red until swiped */
  color: #fff;
  text-align: left;
  touch-action: pan-y; /* vertical scrolling stays native; a sideways gesture is a swipe */
  transition: background-color 120ms ease-out, transform 360ms cubic-bezier(0.25, 1, 0.5, 1);
}
.preset.dragging { transition: background-color 120ms ease-out; }
.preset::after { /* separator, inset to the text like iOS */
  content: '';
  position: absolute;
  left: var(--gutter);
  right: 0;
  bottom: 0;
  height: 0.5px;
  background: var(--separator);
}
.preset:active:not(.dragging) { background: var(--tile); }
.time {
  grid-column: 1;
  font: 300 2.5rem / 1.08 system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1, 'case' 1; /* colons on the figures' centre, as in Clock */
  letter-spacing: -0.01em;
}
.words {
  grid-column: 1;
  font: 400 0.9375rem / 1.3 system-ui, -apple-system, sans-serif;
  color: var(--dim);
}
.slot {
  grid-column: 2;
  grid-row: 1 / span 2;
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
}
/* Chevron and play disc swap in place, the same both ways, as iOS replaces a symbol: the old one
   shrinks and fades while the new one grows in, rippling down the list (each row 18 ms later). */
.slot > * {
  position: absolute;
  inset: 0;
  margin: auto;
  transition: opacity 180ms ease-out, transform 280ms cubic-bezier(0.3, 0.7, 0.4, 1);
  transition-delay: calc(var(--i, 0) * 18ms);
}
.chevron { color: var(--chevron); transform: scale(1); }
.go {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--go-fill);
  color: var(--go);
  opacity: 0;
  transform: scale(0.4);
}
.go :deep(svg) { transform: translateX(1px); }
.row.on .chevron { opacity: 0; transform: scale(0.4); }
.row.on .go { opacity: 1; transform: none; }
/* Just added by the wheel: the row lights up once, then settles. */
.row.fresh .preset { animation: fresh 1.6s ease-out; }
@keyframes fresh {
  0%, 30% { background: var(--menu); }
  100% { background: var(--bg); }
}
@media (prefers-reduced-motion: reduce) {
  .preset, .preset.dragging, .delete.settling, .trash { transition: none; }
  .slot > * { transition: opacity 150ms linear; transition-delay: 0ms; }
  .row.on .chevron, .go, .row.on .go { transform: none; }
}
</style>
