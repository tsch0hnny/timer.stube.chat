/**
 * Height of the full-screen views (stage, presets) in the iOS home-screen app.
 *
 * Measured on the iPhone 13 Pro, iOS 27.0.1, fresh install of e625305: innerHeight, the layout
 * viewport and 100dvh are 797 on the 844 px screen. The web view itself runs edge to edge (the
 * content sits under the status bar), but everything sized to the viewport stops 47 px (the
 * status-bar height) short at the home-bar end. WebKit bugs 313800 and 297779 describe the same.
 * In the spike, 100lvh measured 844 there. So use lvh, but never more than the screen, so a wrong
 * lvh can't push the controls off it, and never less than the viewport.
 */
export function appHeight(m: { innerW: number; innerH: number; lvh: number; screenW: number; screenH: number }): number {
  // iOS reports screen.width/height in portrait whatever the orientation.
  const portrait = m.innerH >= m.innerW
  const screenH = portrait ? Math.max(m.screenW, m.screenH) : Math.min(m.screenW, m.screenH)
  return Math.max(m.innerH, Math.min(m.lvh, screenH))
}
