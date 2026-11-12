import { unpaintedStrip } from '~/utils/unpaintedStrip'

/**
 * Sets --strip in the iOS home-screen app only (navigator.standalone): the unpainted strip below the
 * page, which --safe-bottom subtracts from the bottom safe-area inset. Elsewhere --strip stays unset
 * (0), so nothing changes in a Safari tab or in Chrome.
 */
export default defineNuxtPlugin(() => {
  if ((navigator as Navigator & { standalone?: boolean }).standalone !== true) return
  const update = () => {
    const strip = unpaintedStrip({ innerW: innerWidth, innerH: innerHeight, screenW: screen.width, screenH: screen.height })
    document.documentElement.style.setProperty('--strip', `${strip}px`)
  }
  update()
  addEventListener('resize', update)
})
