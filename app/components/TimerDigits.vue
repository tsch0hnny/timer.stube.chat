<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { MINUS } from '#shared/timer/display'
import { MINUS_GLYPH, RESERVE_MINUS_CELL, TIMER_FONTS } from '~/features'
import { lineEm, measureCellWidths, type CellWidths } from '~/utils/digitMetrics'

const props = defineProps<{
  text: string
  negative: boolean
  /** Bumps on every live crossing into overtime: plays the shake once. */
  shakeKey: number
  shake: boolean
  /** Size from the container (timer view) or a fixed font-size (preset tiles). */
  fit?: boolean
}>()

const font = TIMER_FONTS[0]
const widths = ref<CellWidths>({ digit: 0.62, colon: 0.32, minus: 0.62 })
onMounted(() => { widths.value = measureCellWidths(font.family, font.weight, MINUS_GLYPH) })

// Cells are keyed from the right, so seconds stay the same element when the minus or the hour appears.
const cells = computed(() => {
  const chars = [...props.text]
  return chars.map((ch, i) => ({
    ch,
    key: chars.length - i,
    kind: ch === ':' ? 'colon' : ch === MINUS ? 'minus' : 'digit',
    glyph: ch === MINUS ? MINUS_GLYPH : ch,
  }))
})
const style = computed(() => ({
  '--cell-digit': `${widths.value.digit}em`,
  '--cell-colon': `${widths.value.colon}em`,
  '--cell-minus': `${widths.value.minus}em`,
  // Size against the widest this format can get (minus included), so the size never changes at zero.
  '--line-em': String(lineEm(props.text, widths.value, RESERVE_MINUS_CELL)),
  fontFamily: font.family,
  fontWeight: String(font.weight),
}))
const label = computed(() => (props.negative ? `${props.text.slice(1)} over` : `${props.text} left`))

/*
 * The line is centred, so when the minus sign appears (or goes) every digit would shift by half a
 * minus cell. The spec says the line "re-centres during the shake": start it exactly where the
 * digits were and glide to the new centre, so nothing ever jumps. Reduced motion: a short fade.
 * The minus starts half a cell further out, under the notch edge (and briefly past it during the
 * shake), so it fades in as it slides into place.
 */
const root = ref<HTMLElement | null>(null)
watch(
  () => props.negative,
  (negative, was) => {
    const el = root.value
    if (!props.fit || !el || negative === was) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
      return
    }
    const shift = (widths.value.minus * parseFloat(getComputedStyle(el).fontSize)) / 2
    el.animate(
      [{ transform: `translateX(${negative ? -shift : shift}px)` }, { transform: 'translateX(0px)' }],
      { duration: 560, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
    )
    if (negative) el.querySelector('.cell.minus')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 560, easing: 'ease-in' })
  },
  { flush: 'post' },
)

/*
 * Apple-style "no" shake: quick, decaying, once, at a live crossing into overtime only (shakeKey
 * counts those). Played as a one-off animation: as a class it stayed on after the first overtime
 * and replayed every time a later timer opened (seen on the iPhone with c190046).
 */
const SHAKE: Keyframe[] = [0, -0.09, 0.08, -0.06, 0.04, -0.02, 0.01, 0].map((x, i) => ({
  offset: [0, 0.12, 0.26, 0.4, 0.54, 0.68, 0.82, 1][i],
  transform: `translateX(${x}em)`,
  easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)',
}))
watch(
  () => props.shakeKey,
  (k, was) => {
    if (!props.shake || k <= (was ?? 0)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    root.value?.querySelector('.line')?.animate(SHAKE, { duration: 620 })
  },
  { flush: 'post' },
)
</script>

<template>
  <div
    ref="root"
    class="digits"
    :class="{ fit, negative }"
    :style="style"
    role="timer"
    :aria-label="label"
    data-testid="digits"
  >
    <span class="line">
      <span v-for="c in cells" :key="c.key" class="cell" :class="c.kind" data-testid="cell" aria-hidden="true">{{ c.glyph }}</span>
    </span>
  </div>
</template>

<style scoped>
.digits {
  position: relative;
  color: #fff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  /* 'case' lifts the colon and the minus to the centre of the figures, as on the iOS Clock (without
     it SF Pro sets the colon 0.11 em low and the minus 0.07 em low, measured in WebKit and Chromium). */
  font-feature-settings: 'tnum' 1, 'case' 1;
  white-space: nowrap;
  display: flex;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
}
.digits.fit {
  /* Width-limited by the line (in em), height-limited by the box: as big as legibly fits. The third
     term keeps the ink (about 0.37 em below the line's centre) clear of the control band (--band,
     set by the box) when the line is centred, on any screen shape; on a phone the width wins. */
  font-size: min(calc(100cqw / var(--line-em)), 92cqh, calc((100cqh - 2 * var(--band, 0px)) / 0.76));
}
.digits.negative { color: var(--overtime); }
.line { display: inline-flex; }
.cell { display: inline-block; text-align: center; }
.cell.digit { width: var(--cell-digit); }
.cell.colon { width: var(--cell-colon); }
.cell.minus { width: var(--cell-minus); }

</style>
