/** Types for the owner's reference module (timer-mode-icons.js, docs/timer-mode-icons.md). */
export interface TimerModeIcon {
  el: SVGSVGElement
  /** Plays the tap animation from rest; a running one restarts. Resolves when it ends or is replaced. */
  play(): Promise<void>
  /** Stops any animation and returns to rest. */
  cancel(): void
}
export function createCountUpIcon(opts?: { size?: number }): TimerModeIcon
export function createCountDownIcon(opts?: { size?: number }): TimerModeIcon
/** Arc from `from` to `to` (clock degrees) with `gap` cut out, as an SVG path. */
export function ringPath(from: number, to: number, gap: [number, number]): string
