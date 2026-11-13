import { unpaintedStrip } from '~/utils/unpaintedStrip'
import { useDebugLog } from '~/composables/useDebugLog'

/**
 * Sets --strip in the iOS home-screen app only (navigator.standalone): the unpainted strip below the
 * page, which --safe-bottom subtracts from the bottom safe-area inset. Elsewhere --strip stays unset
 * (0), so nothing changes in a Safari tab or in Chrome.
 *
 * Measured again after a rotation has settled, not only on resize: after portrait → landscape →
 * portrait the owner saw the presets screen's floating capsule sit higher (13 Nov, 6dd9794), which
 * is what a strip measured mid-rotation would do (0 instead of 47 px lifts --safe-bottom by the
 * 34 px inset). Every change is logged, so the debug report shows what the page measured.
 */
export default defineNuxtPlugin(() => {
  if ((navigator as Navigator & { standalone?: boolean }).standalone !== true) return
  const { log } = useDebugLog()
  let current = ''
  const update = () => {
    const strip = `${unpaintedStrip({ innerW: innerWidth, innerH: innerHeight, screenW: screen.width, screenH: screen.height })}px`
    if (strip === current) return
    current = strip
    document.documentElement.style.setProperty('--strip', strip)
    log('strip', `${strip} (page ${innerWidth}×${innerHeight}, screen ${screen.width}×${screen.height})`)
  }
  const timers: ReturnType<typeof setTimeout>[] = []
  const settle = () => {
    update()
    for (const t of timers.splice(0)) clearTimeout(t)
    requestAnimationFrame(update)
    for (const ms of [250, 700, 1500]) timers.push(setTimeout(update, ms))
  }
  update()
  addEventListener('resize', settle)
  addEventListener('orientationchange', settle)
  visualViewport?.addEventListener('resize', settle)
})
