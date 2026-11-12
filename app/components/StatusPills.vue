<script setup lang="ts">
import { computed } from 'vue'
import { useStageTimer } from '~/composables/useStageTimer'

/** Anything that threatens the show, shown on screen. Nothing renders when all is well. */
const props = defineProps<{ wakeLockMatters: boolean }>()
const timer = useStageTimer()

const pills = computed(() => {
  const out: Array<{ id: string; text: string }> = []
  if (props.wakeLockMatters) {
    const s = timer.wakeLock.status.value
    if (s === 'needs-tap') out.push({ id: 'wakelock', text: 'Tap once to keep the screen on' })
    else if (s === 'error') out.push({ id: 'wakelock', text: 'Screen may sleep · set Auto-Lock to Never' })
    else if (s === 'unsupported') out.push({ id: 'wakelock', text: 'Screen may sleep · set Auto-Lock to Never' })
  }
  if (timer.storageError.value) out.push({ id: 'storage', text: 'Not saved · a reload will lose the timer' })
  return out
})
</script>

<template>
  <div v-if="pills.length" class="pills" role="status" aria-live="polite">
    <p v-for="p in pills" :key="p.id" class="pill" :data-testid="`pill-${p.id}`">{{ p.text }}</p>
  </div>
</template>

<style scoped>
.pills {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  z-index: 4;
  pointer-events: none;
}
.pill {
  margin: 0;
  padding: 0.4em 0.9em;
  border-radius: 999px;
  /* Amber, not red: under stage light a red pill could be misread as overtime. */
  background: var(--caution);
  color: #000;
  font: 800 1.25rem / 1.2 system-ui, -apple-system, sans-serif;
  white-space: nowrap;
}
</style>
