import { appHeight } from '~/utils/appHeight'

/**
 * Sets --app-h in the iOS home-screen app only (navigator.standalone). Everywhere else the
 * full-screen views keep 100dvh, which is the visible area in a Safari tab and in Chrome.
 */
export default defineNuxtPlugin(() => {
  if ((navigator as Navigator & { standalone?: boolean }).standalone !== true) return
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none'
  document.body.appendChild(probe)
  const update = () => {
    const h = appHeight({ innerW: innerWidth, innerH: innerHeight, lvh: probe.offsetHeight, screenW: screen.width, screenH: screen.height })
    document.documentElement.style.setProperty('--app-h', `${h}px`)
  }
  update()
  addEventListener('resize', update)
})
