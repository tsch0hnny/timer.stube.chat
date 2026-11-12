import { readonly, ref } from 'vue'
import { useDebugLog } from './useDebugLog'

/**
 * Screen Wake Lock with no silent failures.
 *  - WebKit grants the first request of a page only inside a user activation (tap); after that
 *    it is sticky for the document's lifetime, so re-acquiring after lock/unlock needs no tap.
 *  - The lock is released whenever the page is hidden and is re-requested on visibilitychange.
 *  - Every state other than 'held' (while wanted) is shown on screen by StatusPills.
 */
export type WakeLockStatus = 'unsupported' | 'off' | 'requesting' | 'held' | 'needs-tap' | 'error'

const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
const status = ref<WakeLockStatus>(supported ? 'off' : 'unsupported')
const error = ref<string | null>(null)
let sentinel: WakeLockSentinel | null = null
let wanted = false
let pending = false
let listening = false

async function acquire(reason: string) {
  const { log } = useDebugLog()
  if (!wanted || !supported || pending) return
  if (sentinel && !sentinel.released) return
  if (document.visibilityState !== 'visible') return
  pending = true
  status.value = 'requesting'
  try {
    const s = await navigator.wakeLock.request('screen')
    if (!wanted) { await s.release(); status.value = 'off'; return }
    sentinel = s
    status.value = 'held'
    error.value = null
    log('wakelock', `acquired (${reason})`)
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null
      log('wakelock', `released (visibility ${document.visibilityState})`)
      if (!wanted) { status.value = 'off'; return }
      status.value = 'needs-tap'
      if (document.visibilityState === 'visible') void acquire('released while visible')
    })
  } catch (e) {
    const err = e as DOMException
    error.value = `${err.name}: ${err.message}`
    status.value = err.name === 'NotAllowedError' ? 'needs-tap' : 'error'
    log('wakelock', `refused (${reason}): ${error.value}`)
  } finally {
    pending = false
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') void acquire('page visible again')
}
// Taps are user activations; pointerdown is not one for touch input, so listen to these.
function onActivation() {
  if (wanted && status.value !== 'held') void acquire('tap')
}

export function useWakeLock() {
  if (!listening && typeof document !== 'undefined') {
    listening = true
    document.addEventListener('visibilitychange', onVisible)
    for (const t of ['pointerup', 'click', 'keydown']) window.addEventListener(t, onActivation, { capture: true })
  }
  /** Call inside a tap handler when the timer view opens (that tap is the activation WebKit needs). */
  function want(on: boolean, reason: string) {
    wanted = on
    if (on) { void acquire(reason); return }
    const s = sentinel
    sentinel = null
    if (s && !s.released) void s.release()
    if (status.value !== 'unsupported') status.value = 'off'
  }
  return { status: readonly(status), error: readonly(error), want }
}
