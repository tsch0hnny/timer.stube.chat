# Timer mode icons: count up / count down

Spec for adding a matching count-up / count-down icon pair to timer.stube.chat, with a short animation when the user taps one.

## The icons

Both are 24×24 line icons in the same style as the current stopwatch: `stroke="currentColor"`, `stroke-width="2"`, round caps and joins, no fill. No crown button on top. The ring is centred at (12, 12) with radius 8.

| | Count up | Count down |
|---|---|---|
| Ring | Full ring with a gap for the caret | Bright arc from 12 clockwise to 10:00, faded arc (opacity 0.25) from 10:00 back to 12, same kind of gap |
| Hand | Centre → 1:30 (45°), length 4.24 | Centre → 10:00 (300°), length 4.24, sits exactly on the end of the bright arc |
| Badge | Up caret at 7:30 (bottom left) | Down caret at 7:30 (bottom left) |

The carets sit at 7:30 on purpose: at that spot, clockwise motion goes up and counter-clockwise motion goes down, so the caret direction matches both the number and the hand's movement. The ring gaps are computed per icon so the visible space between each ring end and the caret is 1.5 units on both sides. Don't "simplify" them into one shared gap.

Angles in this spec are clock degrees: 0° = 12 o'clock, increasing clockwise.

### Rest-state SVGs

`timer-count-up.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4.41 14.54A8 8 0 1 1 10.5 19.86"/>
  <path d="M12 12L15 9"/>
  <path d="M3 20l2-2 2 2"/>
</svg>
```

`timer-count-down.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5.07 8A8 8 0 0 1 12 4" opacity=".25"/>
  <path d="M12 4A8 8 0 1 1 10.04 19.76M4.52 14.84A8 8 0 0 1 5.07 8"/>
  <path d="M12 12L8.33 9.88"/>
  <path d="M3 18l2 2 2-2"/>
</svg>
```

The reference implementation renders exactly these shapes at rest.

## Animations

Every tween uses ease-in-out cubic: `p < .5 ? 4p³ : 1 − (−2p + 2)³ / 2`.

### Count up: one lap (900 ms)

The hand rotates clockwise from 45° to 405° (one full lap) and ends back at rest. Nothing else moves.

### Count down: drain, retract, refill (about 1.86 s)

| # | Phase | Duration | What happens |
|---|---|---|---|
| 1 | Drain | 1080 ms (3.6 ms per degree × 300°) | The end of the bright arc and the hand move together counter-clockwise from 300° to 0°. The faded arc grows to fill the rest of the ring. At the end the ring is fully faded and the hand points at 12. |
| 2 | Retract | 220 ms | The hand shrinks from its tip into the centre (length 4.24 → 0). It never fades or disappears. It ends as the round-cap dot at the centre. |
| 3 | Pause | 80 ms | Ring fully faded, centre dot only. |
| 4 | Refill + regrow | 480 ms | The bright arc refills clockwise from 0° to 300°. The hand stays at 300° and grows from the centre (0 → 4.24) during the last 60 % of this phase, using its own ease-in-out over that window. The hand reaches full length exactly as the arc reaches it. |

Things to keep:
- The hand never moves clockwise during the count-down animation. A clockwise hand would look like counting up.
- The hand never fades. Its length animates, not its opacity. Keep a minimum length of 0.01 instead of 0 so WebKit still draws the round-cap dot.
- The bright arc and the faded arc always skip the caret gap.

## Behaviour

- Tapping an option selects that mode and plays that icon's animation.
- Tapping again while an animation is running restarts it from rest. Never let two sequences stack.
- With `prefers-reduced-motion: reduce`, don't animate. Just change the selection.
- Colour comes from `currentColor`, so the icons follow the text colour of the button, including the selected state and dark mode. The faded arc is the same colour at opacity 0.25.
- Use inline SVG, not `<img>` or CSS backgrounds. Those break both `currentColor` and the animation.
- The icon is decorative (`aria-hidden="true"`). The button needs a real accessible name, such as visible "Count up" / "Count down" text or an `aria-label`. Expose the selected state with `aria-pressed` or a radio group.
- Animating doesn't change the icon's box size, so there's no layout shift.

## Acceptance checklist

- [ ] At rest, both icons match the SVGs above (including the 10:00 resting point and the bottom-left carets).
- [ ] Count up: one smooth clockwise lap in about 0.9 s, ending exactly at rest.
- [ ] Count down: drains counter-clockwise to 12, the hand shrinks into the centre without disappearing, the ring refills, and the hand grows back at 10:00, meeting the end of the arc.
- [ ] Rapid repeated taps restart cleanly with no flicker or stacked animations.
- [ ] Reduced motion: no animation, selection still works.
- [ ] Looks right in light and dark mode and in the selected and unselected states.
- [ ] Crisp at 16 px and 24 px on the phone used on stage.

## Reference implementation

Vanilla ES module, no dependencies. Tested in jsdom: the rest states match the SVGs above, the count-down sequence runs in about 1.89 s, and restart and cancel both return to rest.

```js
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
```
