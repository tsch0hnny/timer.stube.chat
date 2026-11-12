<script setup lang="ts">
import { computed } from 'vue'
import { select as selectCore } from '#shared/timer/core'
import { display as displayOf } from '#shared/timer/display'
import { useStageTimer } from '~/composables/useStageTimer'
import { useDebugOverlay } from '~/composables/useSecretTaps'

const timer = useStageTimer()
const debug = useDebugOverlay()
const version = useRuntimeConfig().public.appVersion as string
const pwa = useNuxtApp().$pwa

// Tiles show the time exactly as the timer view will (same formatter, same digit cells).
const tiles = computed(() =>
  timer.store.loadPresets().map((p) => ({ ...p, text: displayOf(selectCore(p.durationMs), 0)!.text })),
)
const minutesLabel = (ms: number) => {
  const m = ms / 60000
  return m % 60 === 0 ? `${m / 60} hour${m === 60 ? '' : 's'}` : m > 60 ? `${Math.floor(m / 60)} hour ${m % 60} minutes` : `${m} minutes`
}
</script>

<template>
  <section class="presets" data-testid="presets">
    <StatusPills :wake-lock-matters="false" />
    <ul class="grid" role="list">
      <li v-for="t in tiles" :key="t.id">
        <button
          type="button"
          class="tile"
          :aria-label="`Open a ${minutesLabel(t.durationMs)} timer`"
          :data-testid="`preset-${t.durationMs / 60000}`"
          @click="timer.select(t.durationMs)"
        >
          <TimerDigits :text="t.text" :negative="false" :shake-key="0" :shake="false" />
        </button>
      </li>
    </ul>
    <footer class="foot">
      <button v-if="pwa?.needRefresh" type="button" class="update" data-testid="update" @click="pwa.updateServiceWorker(true)">
        Update ready · reload
      </button>
      <button type="button" class="version" data-testid="version" @click="debug.tap">{{ version }}</button>
    </footer>
  </section>
</template>

<style scoped>
.presets {
  position: fixed; /* full height on iOS standalone: see .stage in TimerView.vue */
  top: 0;
  left: 0;
  right: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding:
    calc(env(safe-area-inset-top) + 0.75rem)
    calc(env(safe-area-inset-right) + 0.75rem)
    calc(env(safe-area-inset-bottom) + 0.25rem)
    calc(env(safe-area-inset-left) + 0.75rem);
  background: var(--bg);
}
.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
  min-height: 0;
}
@media (orientation: landscape) {
  .grid { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(3, 1fr); }
}
.grid li { min-height: 0; }
.tile {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 1.25rem;
  background: var(--tile);
  container-type: inline-size;
  touch-action: manipulation;
  transition: background-color 120ms ease-out, transform 120ms ease-out;
}
.tile:active { background: var(--tile-pressed); transform: scale(0.97); }
.tile :deep(.digits) { font-size: calc(100cqw / 4.3); }
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.5rem;
}
.update {
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 0.3);
  background: var(--tile);
  color: #fff;
  font: 600 0.9375rem / 1 system-ui, -apple-system, sans-serif;
}
.version {
  margin-left: auto;
  padding: 0.6rem 0.25rem;
  border: 0;
  background: none;
  color: var(--dim);
  font: 500 0.75rem / 1 ui-monospace, Menlo, monospace;
}
@media (prefers-reduced-motion: reduce) {
  .tile:active { transform: none; }
}
</style>
