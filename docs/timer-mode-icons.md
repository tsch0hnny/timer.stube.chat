# Timer mode icons: count up / count down

Spec for adding a matching count-up / count-down icon pair to timer.stube.chat, with a short animation when the user taps one.

## Prompt for Claude Code

> Read `docs/timer-mode-icons.md` and implement it. Wherever the app lets the user choose between counting up and counting down, replace the current stopwatch icon with the two icons from the spec, and play each icon's animation when its option is tapped. The reference implementation at the end of the spec is framework-agnostic vanilla JS; port it to whatever this project uses (keep the geometry, timings, easing and tap rules exactly), or drop the module in as-is if that fits better. Keep the icons as inline SVG so `currentColor` and the animation work. Check the acceptance list at the end before you finish.

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

The hand never changes length or opacity in either animation. It only rotates.

### Count up: one lap (900 ms)

The hand rotates clockwise from 45° to 405° (one full lap) with ease-in-out cubic and ends back at rest. Nothing else moves.

### Count down: drain, hold, refill + kick (about 1.7 s)

Everything moves counter-clockwise. Nothing in this animation ever turns clockwise, because that would read as counting up.

| # | Phase | Duration | What happens |
|---|---|---|---|
| 1 | Drain | 1080 ms, ease-in-out cubic | The end of the bright arc and the hand move together counter-clockwise from 300° to 0°. The faded arc grows to fill the rest. At the end the ring is fully faded and the hand points at 12. |
| 2 | Hold | 100 ms | Ring fully faded, hand waits at 12. This marks the moment time hits zero. |
| 3 | Refill | 520 ms, ease-in-out quad | The bright arc grows back counter-clockwise: its 10:00 end stays put while its other end sweeps from 10:00 through 9, 6 and 3 to 12. The bright arc is [300 − 300·f, 300], where f is the eased progress. The hand keeps waiting at 12 (treat it as 360° so the next move is counter-clockwise). |
| 3a | Kick | 120 ms, ease-out cubic, inside phase 3 | When the refill reaches f ≥ 0.8, the hand snaps counter-clockwise from 360° to 300°, as if pushed by the arriving bar. It lands just before the bar finishes (snap starts about 356 ms into the refill and ends about 476 ms in, out of 520). |

The tunable values are named constants in the reference code: `drain`, `hold`, `refill`, `snapTrigger`, `snap`.

## Behaviour

- **Switch instantly, animate on top.** On tap, change the mode, selected styling and display immediately, then start the animation without awaiting it. Never put the mode change after the animation.

  ```js
  setMode('down'); // instant
  downIcon.play(); // fire and forget
  ```

- **Every tap plays the icon's animation,** including a tap on the option that's already selected. That doubles as a "tap registered" confirmation.
- **Taps on an icon that's already animating are ignored.** No restart, no rewind, no jumping back to rest mid-motion. The running animation finishes normally. `play()` returns the running promise in that case.
- **Never play an animation backwards.**
- **Switching options mid-animation:** the other icon's animation keeps playing to the end while the newly tapped icon starts its own. Two icons moving for a moment is fine.
- `prefers-reduced-motion: reduce` → no animation. Just change the selection.
- Colour comes from `currentColor`, so the icons follow the button's text colour, including the selected state and dark mode. The faded arc is the same colour at opacity 0.25.
- Use inline SVG, not `<img>` or CSS backgrounds. Those break both `currentColor` and the animation.
- The icon is decorative (`aria-hidden="true"`). The button needs a real accessible name, such as visible "Count up" / "Count down" text or an `aria-label`. Expose the selected state with `aria-pressed` or a radio group.
- Call `cancel()` when the icon is unmounted, so no animation keeps running in the background. It stops the animation and restores the rest state.

## Acceptance checklist

- [ ] At rest, both icons match the SVGs above (no crown, carets bottom left, count-down resting at 10:00).
- [ ] Count up: one smooth clockwise lap in about 0.9 s, ending exactly at rest.
- [ ] Count down: bar and hand drain counter-clockwise to 12, a short hold, the bar refills counter-clockwise from 10:00, and the hand is kicked from 12 to 10:00 just before the bar arrives. Nothing moves clockwise, and the hand never shrinks or fades.
- [ ] The mode changes the instant you tap, not after the animation.
- [ ] Tapping the already-selected option replays its animation.
- [ ] Tapping during an animation does nothing to that icon. No restart, no jump.
- [ ] Rapid back-and-forth between options: each icon finishes its own animation cleanly, and the mode always matches the last tap.
- [ ] Reduced motion: no animation, selection still works.
- [ ] Looks right in light and dark mode and in the selected and unselected states.
- [ ] Crisp at 16 px and 24 px on the phone used on stage. If the 120 ms snap reads as a jump instead of a kick on the real device, try `snap: 150`.

## Reference implementation

Vanilla ES module, no dependencies. Tested in jsdom: the rest states match the SVGs above, the count-down sequence runs in about 1.71 s, taps during an animation are ignored, replaying after it finishes works, and `cancel()` returns to rest.

```js
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
```
