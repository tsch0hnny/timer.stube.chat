<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { FEATURES } from '~/features'
import { useStageTimer } from '~/composables/useStageTimer'
import { useDebugLog } from '~/composables/useDebugLog'
import { useDebugOverlay } from '~/composables/useSecretTaps'

const timer = useStageTimer()
const { log } = useDebugLog()
const { debugOpen } = useDebugOverlay()
const inTimer = computed(() => timer.state.value.status !== 'idle')

onMounted(() => {
  const root = document.documentElement
  const isChromium = !!(navigator as Navigator & { userAgentData?: { brands: Array<{ brand: string }> } }).userAgentData?.brands?.some((b) => /Chromium/.test(b.brand))
  if (!FEATURES.liquidGlass) root.classList.add('glass-off')
  else if (isChromium) root.classList.add('glass-refract')

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
    <!-- Refraction map for Chromium's backdrop-filter: url(); ignored elsewhere. -->
    <svg width="0" height="0" aria-hidden="true" focusable="false" style="position: absolute">
      <filter id="lg-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="11" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="26" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  </main>
</template>
