/**
 * How much of the screen below the page the iOS home-screen app leaves unpainted.
 *
 * Measured on the iPhone 13 Pro, iOS 27.0.1: the page gets a 797 px viewport on the 844 px screen,
 * and the 47 px strip below it (the status-bar height) is not painted at all: content laid out there
 * is cut off (the stage's reset button was, on d995c7b). WebKit bug 313800 describes the same
 * "orphan strip below page". Nothing can be drawn there, so the layout stays inside the viewport;
 * and since the home indicator sits inside the strip, the bottom safe-area inset need not be kept
 * clear inside the page (see --safe-bottom in main.css).
 */
export function unpaintedStrip(m: { innerW: number; innerH: number; screenW: number; screenH: number }): number {
  // iOS reports screen.width/height in portrait whatever the orientation.
  const portrait = m.innerH >= m.innerW
  const screenH = portrait ? Math.max(m.screenW, m.screenH) : Math.min(m.screenW, m.screenH)
  return Math.max(0, screenH - m.innerH)
}
