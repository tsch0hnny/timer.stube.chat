import { shallowRef } from 'vue'

export interface DebugEvent {
  t: number
  type: string
  detail: string
}

const MAX = 200
const events = shallowRef<DebugEvent[]>([])

/** In-memory event log for the debug overlay (wake lock, visibility, SW, state changes, clock jumps). */
export function useDebugLog() {
  function log(type: string, detail = '') {
    events.value = [{ t: Date.now(), type, detail }, ...events.value].slice(0, MAX)
  }
  return { events, log }
}
