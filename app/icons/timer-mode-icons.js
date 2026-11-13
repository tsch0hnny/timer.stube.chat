/**
 * Timer mode icons: count-up / count-down pair with tap animations.
 *
 * Framework-agnostic ES module. Each factory returns an inline <svg> plus
 * play()/cancel(). Colour comes from `currentColor`, so the icon follows the
 * text colour of whatever it sits in (light/dark, selected state, etc.).
 *
 *   import { createCountUpIcon, createCountDownIcon } from './timer-mode-icons.js';
 *   const down = createCountDownIcon({ size: 24 });
 *   downButton.prepend(down.el);
 *   downButton.addEventListener('click', () => {
 *     setMode('down'); // switch instantly
 *     down.play();     // decoration only, never await it
 *   });
 *
 * Rest states are identical to timer-count-up.svg / timer-count-down.svg.
 */

const NS = 'http://www.w3.org/2000/svg';

// ---- Geometry (24×24 viewBox, angles in clock degrees: 0 = 12 o'clock, clockwise) ----
const CX = 12;
const CY = 12;
const R = 8; // ring radius
const HAND = 4.24; // hand length (never changes)
const UP_REST = 45; // count-up hand rests at 1:30
const DOWN_REST = 300; // count-down bright arc + hand rest at 10:00
const FADED_OPACITY = 0.25;
// Ring gaps around the caret badge at 7:30. Computed per icon so the visible
// clearance between each ring end and the caret is 1.5 units on both sides.
const GAP_UP = [190.8, 251.5];
const GAP_DOWN = [194.2, 249.2];
const CARET_UP = 'M3 20l2-2 2 2';
const CARET_DOWN = 'M3 18l2 2 2-2';

// ---- Timing (ms) ----
const T = {
  upLap: 900, // count-up: one clockwise lap
  drain: 1080, // count-down: bar + hand sweep counter-clockwise 300° → 0°
  hold: 100, // empty ring, hand waits at 12
  refill: 520, // bar grows back counter-clockwise from 10:00 to 12
  snapTrigger: 0.8, // hand gets "kicked" when the bar is 80 % refilled…
  snap: 120, // …and snaps counter-clockwise 12 → 10:00 in this time
};

const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeInOutQuad = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const fmt = (n) => +n.toFixed(2);

function point(deg) {
  const t = ((deg - 90) * Math.PI) / 180;
  return [fmt(CX + R * Math.cos(t)), fmt(CY + R * Math.sin(t))];
}

function arc(from, to) {
  if (to - from < 0.5) return '';
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  return `M${x1} ${y1}A${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/** Arc from `from` to `to` (clock degrees, 0 ≤ from ≤ to ≤ 360) with `gap` cut out. */
export function ringPath(from, to, gap) {
  let d = '';
  if (from < gap[0]) d += arc(from, Math.min(to, gap[0]));
  if (to > gap[1]) d += arc(Math.max(from, gap[1]), to);
  return d;
}

function el(tag, attrs, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
}

function baseSvg(size) {
  return el('svg', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  });
}

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Plays `sequence` unless it is already running (taps during an animation are
 * ignored: no restart, no rewind). cancel() stops it and lets `reset` restore rest.
 */
function makePlayer(sequence, reset) {
  let token = 0;
  let running = null;

  const tween = (my, duration, fn) =>
    new Promise((resolve) => {
      const t0 = performance.now();
      const frame = (now) => {
        if (my !== token) return resolve(false);
        const p = clamp01((now - t0) / duration);
        fn(p);
        if (p < 1) requestAnimationFrame(frame);
        else resolve(true);
      };
      requestAnimationFrame(frame);
    });
  const wait = (my, ms) => new Promise((resolve) => setTimeout(() => resolve(my === token), ms));

  function play() {
    if (running) return running;
    if (prefersReducedMotion()) return Promise.resolve();
    const my = ++token;
    const p = sequence({ tween: (d, fn) => tween(my, d, fn), wait: (ms) => wait(my, ms) })
      .then((finished) => {
        if (finished !== false) reset();
      })
      .finally(() => {
        if (running === p) running = null;
      });
    running = p;
    return p;
  }
  function cancel() {
    token++;
    running = null;
    reset();
  }
  return { play, cancel, isPlaying: () => running !== null };
}

/** Count-up: full ring, hand at 1:30, up caret. Tap → hand does one clockwise lap. */
export function createCountUpIcon({ size = 24 } = {}) {
  const svg = baseSvg(size);
  el('path', { d: arc(GAP_UP[1], GAP_UP[0] + 360) }, svg);
  const hand = el('line', { x1: CX, y1: CY, x2: CX, y2: fmt(CY - HAND) }, svg);
  el('path', { d: CARET_UP }, svg);

  const setHand = (angle) => hand.setAttribute('transform', `rotate(${fmt(angle)} ${CX} ${CY})`);
  const reset = () => setHand(UP_REST);
  reset();

  const player = makePlayer(
    ({ tween }) => tween(T.upLap, (p) => setHand(UP_REST + 360 * easeInOutCubic(p))),
    reset,
  );
  return { el: svg, ...player };
}

/**
 * Count-down: bright arc from 12 clockwise to 10:00, faded arc 10:00 → 12,
 * hand on the boundary, down caret.
 * Tap → bar and hand drain counter-clockwise to 12, short hold, bar refills
 * counter-clockwise from 10:00, and just before it arrives the hand is
 * "kicked" from 12 back to 10:00. Everything moves counter-clockwise.
 */
export function createCountDownIcon({ size = 24 } = {}) {
  const svg = baseSvg(size);
  const faded = el('path', { opacity: FADED_OPACITY }, svg);
  const bright = el('path', {}, svg);
  const hand = el('line', { x1: CX, y1: CY, x2: CX, y2: fmt(CY - HAND) }, svg);
  el('path', { d: CARET_DOWN }, svg);

  /** Bright arc covers [from, to]; the faded arc covers the rest; hand at `angle`. */
  function render(from, to, angle) {
    bright.setAttribute('d', ringPath(from, to, GAP_DOWN));
    faded.setAttribute('d', ringPath(0, from, GAP_DOWN) + ringPath(to, 360, GAP_DOWN));
    hand.setAttribute('transform', `rotate(${fmt(angle)} ${CX} ${CY})`);
  }
  const reset = () => render(0, DOWN_REST, DOWN_REST);
  reset();

  async function sequence({ tween, wait }) {
    const rest = DOWN_REST;
    // 1. Drain: bar end and hand sweep counter-clockwise from 10:00 to 12.
    if (!(await tween(T.drain, (p) => {
      const r = rest * (1 - easeInOutCubic(p));
      render(0, r, r);
    }))) return false;
    // 2. Hold: ring fully faded, hand at 12.
    if (!(await wait(T.hold))) return false;
    // 3. Refill counter-clockwise from 10:00 back to 12. The hand waits at 12
    //    (360°) and snaps counter-clockwise to 10:00 once the bar is 80 % back.
    let snapAt = null;
    return tween(T.refill, (p) => {
      const t = p * T.refill;
      const f = easeInOutQuad(p);
      if (snapAt === null && f >= T.snapTrigger) snapAt = t;
      const s = snapAt === null ? 0 : easeOutCubic(clamp01((t - snapAt) / T.snap));
      render(rest - rest * f, rest, 360 - (360 - rest) * s);
    });
  }

  const player = makePlayer(sequence, reset);
  return { el: svg, ...player };
}
