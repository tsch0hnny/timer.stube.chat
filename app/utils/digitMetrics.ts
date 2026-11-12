import { MINUS } from '#shared/timer/display'

export interface CellWidths {
  /** Widest of 0–9, in em. */
  digit: number
  colon: number
  minus: number
}

/**
 * Measures the real font on this device, so every digit cell is as wide as the widest digit and
 * nothing moves when a digit changes, whatever system-ui resolves to (SF Pro, Roboto, …).
 */
export function measureCellWidths(family: string, weight: number, minusGlyph: string = MINUS): CellWidths {
  const el = document.createElement('span')
  // Same features as the digits on screen ('case' changes the colon's and the dash's glyphs).
  el.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;font:${weight} 100px ${family};font-feature-settings:'tnum' 1,'case' 1`
  document.body.appendChild(el)
  const em = (ch: string) => { el.textContent = ch; return el.getBoundingClientRect().width / 100 }
  const round = (x: number) => Math.ceil(x * 1000) / 1000
  const widths = {
    digit: round(Math.max(...[...'0123456789'].map(em))),
    colon: round(em(':')),
    minus: round(em(minusGlyph)),
  }
  el.remove()
  return widths
}

/** Total line width in em for a display text, optionally reserving room for a minus sign. */
export function lineEm(text: string, w: CellWidths, reserveMinus: boolean): number {
  let total = 0
  let hasMinus = false
  for (const ch of text) {
    if (ch === ':') total += w.colon
    else if (ch === MINUS) { total += w.minus; hasMinus = true }
    else total += w.digit
  }
  if (reserveMinus && !hasMinus) total += w.minus
  return total
}
