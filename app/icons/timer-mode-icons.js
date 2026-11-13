/**
 * Timer mode icons: count-up / count-down pair with tap animations.
 *
 * Framework-agnostic ES module. Each factory returns an inline <svg> plus
 * play()/cancel(). Colour comes from `currentColor`, so the icon follows the
 * text colour of whatever it sits in (light/dark, selected state, etc.).
 *
 *   import { createCountUpIcon, createCountDownIcon } from './timer-mode-icons.js';
 *   const up = createCountUpIcon({ size: 24 });
 *   upButton.prepend(up.el);
 *   upButton.addEventListener('click', () => { setMode('up'); up.play(); });
 *
 * Rest states are identical to timer-count-up.svg / timer-count-down.svg.
 */

const NS = 'http://www.w3.org/2000/svg';

// ---- Geometry (24×24 viewBox, angles in clock degrees: 0 = 12 o'clock, clockwise) ----
const CX = 12;
const CY = 12;
const R = 8; // ring radius
const HAND = 4.24; // hand length
const MIN_HAND = 0.01; // keep >0 so the round cap still draws a centre dot (WebKit)
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
  upSpin: 900, // count-up: one clockwise lap
  downDrainPerDeg: 3.6, // count-down drain: 300° → 1080 ms
  downShrink: 220, // hand retracts into the centre at 12
  downPause: 80,
  downRefill: 480, // ring refills clockwise back to rest
  downGrowStart: 0.4, // hand grows during the last 60 % of the refill
};

const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
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

/** Arc from `from` to `to` (clock degrees, from < to ≤ 360) with `gap` cut out. */
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

/** Tiny rAF tween runner; start() invalidates any sequence already running. */
function makeRunner() {
  let token = 0;
  return {
    start: () => ++token,
    cancel: () => {
      token++;
    },
    tween: (my, duration, fn) =>
      new Promise((resolve) => {
        const t0 = performance.now();
        const frame = (now) => {
          if (my !== token) return resolve(false);
          const p = Math.min(1, Math.max(0, (now - t0) / duration));
          fn(easeInOutCubic(p), p);
          if (p < 1) requestAnimationFrame(frame);
          else resolve(true);
        };
        requestAnimationFrame(frame);
      }),
    wait: (my, ms) => new Promise((resolve) => setTimeout(() => resolve(my === token), ms)),
  };
}

/** Count-up: full ring, hand at 1:30, up caret. Tap → hand does one clockwise lap. */
export function createCountUpIcon({ size = 24 } = {}) {
  const svg = baseSvg(size);
  el('path', { d: arc(GAP_UP[1], GAP_UP[0] + 360) }, svg);
  const hand = el('line', { x1: CX, y1: CY, x2: CX, y2: fmt(CY - HAND) }, svg);
  el('path', { d: CARET_UP }, svg);

  const setHand = (angle) => hand.setAttribute('transform', `rotate(${fmt(angle)} ${CX} ${CY})`);
  setHand(UP_REST);

  const run = makeRunner();
  async function play() {
    const my = run.start();
    setHand(UP_REST);
    if (prefersReducedMotion()) return;
    if (await run.tween(my, T.upSpin, (e) => setHand(UP_REST + 360 * e))) setHand(UP_REST);
  }
  function cancel() {
    run.cancel();
    setHand(UP_REST);
  }
  return { el: svg, play, cancel };
}

/**
 * Count-down: bright arc from 12 to 10:00, faded arc 10:00→12, hand on the
 * boundary, down caret. Tap → drain, hand retracts, ring refills, hand regrows.
 */
export function createCountDownIcon({ size = 24 } = {}) {
  const svg = baseSvg(size);
  const faded = el('path', { opacity: FADED_OPACITY }, svg);
  const bright = el('path', {}, svg);
  const hand = el('line', { x1: CX, y1: CY, x2: CX }, svg);
  el('path', { d: CARET_DOWN }, svg);

  /** remaining = end of bright arc; the hand follows it unless angle is given. */
  function render(remaining, len = HAND, angle = remaining) {
    bright.setAttribute('d', ringPath(0, remaining, GAP_DOWN));
    faded.setAttribute('d', ringPath(remaining, 360, GAP_DOWN));
    hand.setAttribute('transform', `rotate(${fmt(angle)} ${CX} ${CY})`);
    hand.setAttribute('y2', String(fmt(CY - Math.max(MIN_HAND, len))));
  }
  render(DOWN_REST);

  const run = makeRunner();
  async function play() {
    const my = run.start();
    const rest = DOWN_REST;
    render(rest);
    if (prefersReducedMotion()) return;

    // 1. Drain: bright arc and hand sweep counter-clockwise to 12.
    if (!(await run.tween(my, rest * T.downDrainPerDeg, (e) => render(rest * (1 - e))))) return;
    // 2. Hand retracts from its tip into the centre (ends as a dot).
    if (!(await run.tween(my, T.downShrink, (e) => render(0, HAND * (1 - e), 0)))) return;
    if (!(await run.wait(my, T.downPause))) return;
    // 3. Ring refills clockwise; the hand waits at the rest angle and grows
    //    during the last 60 % so it reaches full length as the arc arrives.
    await run.tween(my, T.downRefill, (e, p) => {
      const g = Math.max(0, (p - T.downGrowStart) / (1 - T.downGrowStart));
      render(rest * e, HAND * easeInOutCubic(g), rest);
    });
  }
  function cancel() {
    run.cancel();
    render(DOWN_REST);
  }
  return { el: svg, play, cancel };
}
