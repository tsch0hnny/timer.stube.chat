import { ref } from 'vue'

const debugOpen = ref(false)
let taps: number[] = []

/** 5 taps within 3 s on the version label toggles the debug overlay. */
export function useDebugOverlay() {
  function tap() {
    const now = Date.now()
    taps = [...taps.filter((t) => now - t < 3000), now]
    if (taps.length >= 5) {
      taps = []
      debugOpen.value = !debugOpen.value
    }
  }
  return { debugOpen, tap, close: () => { debugOpen.value = false } }
}
