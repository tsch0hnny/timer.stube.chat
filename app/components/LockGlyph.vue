<script setup lang="ts">
/**
 * The stage lock: the owner's shape (13 Nov reference: a closed padlock with a tall round shackle, no
 * keyhole) drawn as an outline in the line style of the timer mode icons (docs/timer-mode-icons.md:
 * 24×24, currentColor stroke 2, round caps and joins, no fill), so the three read as one family.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    <rect x="5" y="11" width="14" height="10" rx="2.5" />
  </svg>
</template>
