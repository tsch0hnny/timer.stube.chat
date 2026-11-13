<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createCountDownIcon, createCountUpIcon } from '~/icons/timer-mode-icons.js'

/**
 * The count up / count down icons from docs/timer-mode-icons.md, drawn and animated by the owner's
 * reference module (app/icons/timer-mode-icons.js), used as it is so geometry, timings and easing stay
 * exact. The module builds an inline <svg> (currentColor, aria-hidden); this only mounts it and hands
 * its play() to the parent, which calls it when the option is tapped.
 */
const props = withDefaults(defineProps<{ kind: 'up' | 'down'; size?: number }>(), { size: 24 })
const host = ref<HTMLElement | null>(null)
let icon: ReturnType<typeof createCountUpIcon> | null = null

onMounted(() => {
  icon = (props.kind === 'up' ? createCountUpIcon : createCountDownIcon)({ size: props.size })
  host.value?.appendChild(icon.el)
})
onBeforeUnmount(() => icon?.cancel())

defineExpose({
  /** Selects nothing; plays this icon's animation from rest (a running one restarts). */
  play: () => { void icon?.play() },
})
</script>

<template>
  <!-- Sized up front, so nothing shifts when the module's <svg> arrives. -->
  <span ref="host" class="mode-icon" :data-kind="kind" :style="{ width: `${size}px`, height: `${size}px` }" />
</template>

<style scoped>
.mode-icon { display: inline-grid; place-items: center; }
.mode-icon :deep(svg) { display: block; }
</style>
