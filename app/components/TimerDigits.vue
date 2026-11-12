<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { MINUS } from '#shared/timer/display'
import { RESERVE_MINUS_CELL, TIMER_FONTS } from '~/features'
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
onMounted(() => { widths.value = measureCellWidths(font.family, font.weight) })

// Cells are keyed from the right, so seconds stay the same element when the minus or the hour appears.
const cells = computed(() => {
  const chars = [...props.text]
  return chars.map((ch, i) => ({
    ch,
    key: chars.length - i,
    kind: ch === ':' ? 'colon' : ch === MINUS ? 'minus' : 'digit',
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
</script>

<template>
  <div
    class="digits"
    :class="{ fit, negative, shaking: shake && shakeKey > 0 }"
    :style="style"
    role="timer"
    :aria-label="label"
    data-testid="digits"
  >
    <span :key="`shake-${shakeKey}`" class="line">
      <span v-for="c in cells" :key="c.key" class="cell" :class="c.kind" data-testid="cell" aria-hidden="true">{{ c.ch }}</span>
    </span>
  </div>
</template>

<style scoped>
.digits {
  color: #fff;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  white-space: nowrap;
  display: flex;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
}
.digits.fit {
  /* Width-limited by the line (in em), height-limited by the box: as big as legibly fits. */
  font-size: min(calc(100cqw / var(--line-em)), 92cqh);
}
.digits.negative { color: var(--overtime); }
.line { display: inline-flex; }
.cell { display: inline-block; text-align: center; }
.cell.digit { width: var(--cell-digit); }
.cell.colon { width: var(--cell-colon); }
.cell.minus { width: var(--cell-minus); }

/* Apple-style "no" shake: quick, decaying, once. Keyed by shakeKey so it replays per crossing. */
.digits.shaking .line { animation: shake 620ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  12% { transform: translateX(-0.09em); }
  26% { transform: translateX(0.08em); }
  40% { transform: translateX(-0.06em); }
  54% { transform: translateX(0.04em); }
  68% { transform: translateX(-0.02em); }
  82% { transform: translateX(0.01em); }
}
@media (prefers-reduced-motion: reduce) {
  .digits.shaking .line { animation: none; }
}
</style>
