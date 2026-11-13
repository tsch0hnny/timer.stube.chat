<script setup lang="ts">
/**
 * The stage lock, drawn after the owner's reference (13 Nov): a closed padlock with a filled, softly
 * rounded body and a tall round shackle, no keyhole (Apple's lock.fill). Phosphor's simple padlock
 * has a short shackle and read as a shopping bag at stage size.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M8 12V6.6a4 4 0 0 1 8 0V12" stroke="currentColor" stroke-width="2.1" />
    <rect x="4.6" y="10.6" width="14.8" height="11.6" rx="2.6" fill="currentColor" />
  </svg>
</template>
