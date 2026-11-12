import { computed, ref, shallowRef, watch } from 'vue'
import { MINUTE, phase as phaseOf, select as selectCore, start, step as stepCore, toggle as toggleCore, clear, type TimerState } from '#shared/timer/core'
import { display as displayOf } from '#shared/timer/display'
import { createTicker } from '#shared/timer/ticker'
import { createLocalStore, withDefaults, withPreset, withoutPreset, type KeyValue, type Preset, type StepMinutes } from '#shared/storage/store'
import { useDebugLog } from './useDebugLog'
import { useWakeLock } from './useWakeLock'

function safeLocalStorage(): KeyValue | null {
  try {
    const ls = window.localStorage
    ls.setItem('timer.v1.probe', '1')
    ls.removeItem('timer.v1.probe')
    return ls
  } catch {
    return null
  }
}

const describe = (s: TimerState) =>
  s.status === 'idle' ? 'idle'
    : s.status === 'paused' ? `paused ${Math.round(s.remainingMs / 1000)}s left`
      : `running, ends ${new Date(s.endAt).toISOString()}`

let instance: ReturnType<typeof create> | null = null

function create() {
  const { log } = useDebugLog()
  const wakeLock = useWakeLock()
  const store = createLocalStore(safeLocalStorage())
  const state = shallowRef<TimerState>(store.loadTimer())
  const prefs = ref(store.loadPrefs())
  const presets = shallowRef<readonly Preset[]>(store.loadPresets())
  /** The preset the wheel added last, so the list can point it out once. */
  let lastAdded: string | null = null
  function storePresets(next: readonly Preset[], action: string) {
    presets.value = next
    store.savePresets(next)
    storageError.value = store.lastError()
    log('presets', action)
  }
  const now = ref(Date.now())
  /** Increments each time the timer crosses into overtime while on screen (drives the shake). */
  const zeroCrossings = ref(0)
  const storageError = ref(store.lastError())
  log('boot', `restored: ${describe(state.value)}`)

  const ticker = createTicker({
    now: () => Date.now(),
    mono: () => performance.now(),
    getState: () => state.value,
    onTick: (t) => { now.value = t },
    onClockJump: (ms) => log('clock-jump', `wall clock moved ${ms > 0 ? '+' : ''}${Math.round(ms / 1000)} s relative to the monotonic clock`),
    document,
    window,
  })
  ticker.start()

  const display = computed(() => displayOf(state.value, now.value))
  const phase = computed(() => phaseOf(state.value, now.value))
  watch(phase, (next, prev) => {
    if (next === 'overtime' && prev === 'running') zeroCrossings.value++
    log('phase', `${prev} → ${next}`)
  })

  function commit(next: TimerState, action: string) {
    if (next === state.value) return
    state.value = next
    store.saveTimer(next)
    storageError.value = store.lastError()
    log('state', `${action}: ${describe(next)}`)
    ticker.poke()
  }

  // A stored, non-idle timer means the timer view is open: keep the screen on.
  if (state.value.status !== 'idle') wakeLock.want(true, 'restored timer')

  return {
    state, prefs, presets, now, display, phase, zeroCrossings, storageError,
    store,
    wakeLock,
    /**
     * Tap on a preset or the wheel's button: opens the timer view paused, or already counting when
     * "Start right away" is on. Call from the tap handler (the wake lock needs that activation).
     */
    select(durationMs: number) {
      wakeLock.want(true, 'preset tapped')
      const paused = selectCore(durationMs)
      const label = `${Math.round(durationMs / 1000)} s`
      if (prefs.value.startOnTap) commit(start(paused, Date.now()), `select ${label} and start`)
      else commit(paused, `select ${label}`)
    },
    toggle() {
      wakeLock.want(true, 'play/pause tapped')
      commit(toggleCore(state.value, Date.now()), state.value.status === 'running' ? 'pause' : 'start')
    },
    start() { commit(start(state.value, Date.now()), 'start') },
    step(sign: 1 | -1, minutes: number = prefs.value.stepMinutes) {
      commit(stepCore(state.value, sign * minutes * MINUTE, Date.now()), `step ${sign > 0 ? '+' : '−'}${minutes}`)
    },
    setStep(minutes: StepMinutes) {
      prefs.value = { ...prefs.value, stepMinutes: minutes }
      store.savePrefs(prefs.value)
      log('prefs', `step ${minutes} min`)
    },
    /** Remembers the wheel's length when it is used, so the wheel opens on it next time. */
    setWheel(ms: number) {
      if (ms === prefs.value.wheelMs) return
      prefs.value = { ...prefs.value, wheelMs: ms }
      store.savePrefs(prefs.value)
      log('prefs', `wheel ${Math.round(ms / 1000)} s`)
    },
    /** A length set with the wheel joins the presets (one per length, sorted), as iOS fills Recents. */
    addPreset(ms: number) {
      const r = withPreset(presets.value, ms)
      if (!r.added) return
      lastAdded = r.added.id
      storePresets(r.list, `add ${Math.round(ms / 1000)} s`)
    },
    deletePreset(id: string) {
      storePresets(withoutPreset(presets.value, id), `delete ${id}`)
    },
    restorePresets() {
      storePresets(withDefaults(presets.value), 'restore defaults')
    },
    takeLastAdded() {
      const id = lastAdded
      lastAdded = null
      return id
    },
    setStartOnTap(on: boolean) {
      prefs.value = { ...prefs.value, startOnTap: on }
      store.savePrefs(prefs.value)
      log('prefs', `start right away ${on ? 'on' : 'off'}`)
    },
    exit() {
      commit(clear(), 'exit')
      wakeLock.want(false, 'back to presets')
    },
  }
}

/** One timer per page, shared by every component. */
export function useStageTimer() {
  if (!instance) instance = create()
  return instance
}
