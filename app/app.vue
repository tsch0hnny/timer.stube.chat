<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStageTimer } from '~/composables/useStageTimer'
import { useDebugLog } from '~/composables/useDebugLog'
import { useDebugOverlay } from '~/composables/useSecretTaps'

const timer = useStageTimer()
const { log } = useDebugLog()
const { debugOpen } = useDebugOverlay()
const inTimer = computed(() => timer.state.value.status !== 'idle')

onMounted(() => {
  document.addEventListener('visibilitychange', () => log('visibility', document.visibilityState))
  window.addEventListener('pageshow', (e) => log('pageshow', `bfcache=${e.persisted}`))
  window.addEventListener('online', () => log('network', 'online'))
  window.addEventListener('offline', () => log('network', 'offline'))
  const nuxt = useNuxtApp()
  nuxt.hook('service-worker:registered', ({ url }) => log('sw', `registered ${url}`))
  nuxt.hook('service-worker:activated', () => log('sw', 'activated'))
  nuxt.hook('service-worker:registration-failed', ({ error }) => log('sw', `registration failed: ${String(error)}`))
})
</script>

<template>
  <main data-testid="app-shell" :data-view="inTimer ? 'timer' : 'presets'">
    <TimerView v-if="inTimer" />
    <PresetGrid v-else />
    <DebugOverlay v-if="debugOpen" />
  </main>
</template>
