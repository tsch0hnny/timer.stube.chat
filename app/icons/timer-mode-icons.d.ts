/** Types for the owner's reference module (timer-mode-icons.js, docs/timer-mode-icons.md). */
export interface TimerModeIcon {
  el: SVGSVGElement
  /**
   * Plays the tap animation. While one is running it is ignored (no restart, no rewind) and the
   * running promise comes back. Decoration only: never await it before changing the mode.
   */
  play(): Promise<void>
  /** Stops any animation and restores the rest state (call on unmount). */
  cancel(): void
  isPlaying(): boolean
}
export function createCountUpIcon(opts?: { size?: number }): TimerModeIcon
export function createCountDownIcon(opts?: { size?: number }): TimerModeIcon
/** Arc from `from` to `to` (clock degrees) with `gap` cut out, as an SVG path. */
export function ringPath(from: number, to: number, gap: [number, number]): string
