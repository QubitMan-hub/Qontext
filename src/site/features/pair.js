// Pair Production: a sneaker drop, start to finish. The pair stands in a vitrine that stays pinned while six
// steps scroll past. The left foot reads the visitor's grid by its rows, the right foot by its columns.
//
// The section sleeps until a visitor is near. The SVG is built once from text nodes; after that only fill and
// stop-color attributes change. Every color comes from the engine through pair-shape.js.

import { oklch, hexToOklch, hexToLin, wcagContrast, harmony, fixLightness, INKS, WCAG_AA } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { h, svg, whenNear } from '../lib.js';
import { site, onWorld, worldNumber } from '../world.js';
import { PANELS, LOGO, LACES, SEAMS, TREAD, pairOf } from '../pair-shape.js';

/** What the visitor has done to the pair in this world. A new world starts it over. */
export const pair = { nudge: 0, d: 3, L: null, painted: new Set(), match: false };

const SIDES = { L: { x: 610, y: 18, flip: true, caption: 'Left foot reads the rows' }, R: { x: 10, y: 330, flip: false, caption: 'Right foot reads the columns' } };
const paths = { L: new Map(), R: new Map() };
const stops = { L: new Map(), R: new Map() };
const logos = [];
let built = false;

/** The world's palette with the showcase's own harmony and lightness on top. */
export function palette() {
  const p = site.palette;
  return { base: p.base + pair.nudge, d: pair.d, L: pair.L ?? p.L, C: p.C };
}

function gradient(defs, side, id) {
  const a = svg('stop', { offset: '0.5' });
  const b = svg('stop', { offset: '0.5' });
  defs.append(svg('linearGradient', { id: `pg-${side}-${id}`, x1: 0, y1: 0, x2: 1, y2: 1 }, a, b));
  stops[side].set(id, [a, b]);
}

function shoe(defs, side) {
  const s = SIDES[side];
  const g = svg('g', { 'data-side': side, transform: `translate(${s.x} ${s.y})${s.flip ? ' scale(-1 1)' : ''}` });
  g.append(svg('ellipse', { class: 'floor', cx: 305, cy: 266, rx: 262, ry: 10 }));
  for (const p of PANELS) {
    gradient(defs, side, p.id);
    const el = svg('path', { class: 'pnl', d: p.d, 'data-panel': p.id });
    paths[side].set(p.id, el);
    g.append(el);
  }
  for (const d of SEAMS) g.append(svg('path', { class: 'seam', d }));
  for (const d of TREAD) g.append(svg('path', { class: 'tread', d }));
  for (const d of LACES) g.append(svg('path', { class: 'lace', d }));
  // The logo reads the right way round on both feet, so the mirrored foot mirrors it back.
  const k = LOGO.size;
  const mark = svg('g', { class: 'logo', transform: `translate(${LOGO.x} ${LOGO.y})${s.flip ? ` translate(${k + 70} 0) scale(-1 1)` : ''}` });
  const tile = svg('path', { d: `M0 0H${k}L0 ${k}Z` });
  const cut = svg('path', { d: `M${k} 0V${k}H0Z`, class: 'cut' });
  const word = svg('text', { x: k + 6, y: k - 1 }, 'Qontext');
  mark.append(tile, cut, word);
  logos.push({ tile, cut, word });
  g.append(mark);
  return g;
}

function build() {
  const root = $('pairSvg');
  const defs = svg('defs');
  root.append(defs);
  for (const side of ['L', 'R']) {
    root.append(svg('text', { class: 'caption', x: 18, y: SIDES[side].y + 22 }, SIDES[side].caption));
    root.append(shoe(defs, side));
  }
  built = true;
}

const GLASS_L = 0.27;

/** An unmeasured outcome, washed toward the glass (as the site washes swatches toward the paper), so a panel
 * reads as undecided until it is painted, and painting is the moment it comes to full color. */
function washed(hex) {
  const c = hexToOklch(hex);
  return oklch(c.L + (GLASS_L - c.L) * 0.42, c.C * 0.55, c.h).hex;
}

const ratio = (ink, fill) => wcagContrast(hexToLin(ink), hexToLin(fill));

/**
 * Bouncer on the logo: the stripe can come out in either of its two colors, so the logo takes whichever of the
 * two inks reads better on the weaker of them. Returns { ink, ratio, stripe }.
 */
function logoInk(stripe) {
  const rate = (ink) => Math.min(...stripe.map((c) => ratio(ink, c)));
  const dark = rate(INKS.dark);
  const light = rate(INKS.light);
  return dark >= light ? { ink: INKS.dark, ratio: dark, stripe } : { ink: INKS.light, ratio: light, stripe };
}

/** Step 2 and step 3: the harmony's chips and the logo's contrast. */
function renderControls(pal, logo) {
  $('pairLight').value = String(Math.round(pal.L * 100));
  $('pairLightOut').textContent = pal.L.toFixed(2);
  $('pairTurn').value = String(pair.nudge);
  $('pairTurnOut').textContent = `${pair.nudge}°`;
  for (const b of $('pairD').children) b.setAttribute('aria-pressed', String(Number(b.dataset.d) === pair.d));
  $('pairHarmony').replaceChildren(...harmony(pal).map((c) => h('li', { class: 'chip' }, h('i', { style: { background: c.hex } }), h('code', {}, c.hex))));
  const shown = Math.floor(logo.ratio * 10) / 10;
  const ok = logo.ratio >= WCAG_AA;
  $('pairInkRatio').textContent = `${shown.toFixed(1)} : 1`;
  $('pairFix').hidden = ok;
  const which = logo.ink === INKS.dark ? 'Dark ink' : 'Light ink';
  $('pairInkNote').textContent = ok
    ? `${which} reads on both stripe colors. Bouncer lets this pair ship.`
    : `${which} is too faint on one stripe color. Fix moves every color's lightness together until it reads.`;
  const stage = $('pairStage');
  stage.dataset.stripe = logo.stripe.join(' ');
  stage.dataset.ink = logo.ink;
}

/** Fix: the lightness closest to today's at which the logo's ink reads on every color the pair can take. */
function fix() {
  const pal = palette();
  const { ink } = logoInk(pairOf(pal, site.result.outcomes).both.get('stripe'));
  const other = ink === INKS.dark ? INKS.light : INKS.dark;
  const L = fixLightness(pal, ink) ?? fixLightness(pal, other);
  if (L !== null) pair.L = L;
  render();
}

/** Paints the pair from the current world and the showcase's state. */
export function render() {
  const sec = $('pair');
  const pal = palette();
  sec.style.setProperty('--band', oklch(0.2, 0.03, pal.base).hex);
  sec.style.setProperty('--glass', oklch(GLASS_L, 0.036, pal.base).hex);
  $('pairWorld').textContent = worldNumber();
  const p = pairOf(pal, site.result.outcomes);
  const logo = logoInk(p.both.get('stripe'));
  renderControls(pal, logo);
  if (!built) return;
  for (const l of logos) for (const el of [l.tile, l.cut, l.word]) el.setAttribute('fill', logo.ink);
  for (const side of ['L', 'R']) {
    const foot = side === 'L' ? p.left : p.right;
    for (const panel of PANELS) {
      const [a, b] = stops[side].get(panel.id);
      const [plus, minus] = p.both.get(panel.id);
      a.setAttribute('stop-color', washed(plus));
      b.setAttribute('stop-color', washed(minus));
      paths[side].get(panel.id).setAttribute('fill', pair.painted.has(panel.id) ? foot.get(panel.id) : `url(#pg-${side}-${panel.id})`);
    }
  }
}

export function initPair() {
  const sec = $('pair');
  if (!sec) return;
  render();
  whenNear(sec, () => {
    build();
    render();
  }, '600px 0px');
  $('pairTurn').addEventListener('input', (e) => {
    pair.nudge = Number(e.target.value);
    render();
  });
  $('pairD').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    pair.d = Number(b.dataset.d);
    render();
  });
  $('pairLight').addEventListener('input', (e) => {
    pair.L = Number(e.target.value) / 100;
    render();
  });
  $('pairFix').addEventListener('click', fix);
  onWorld((kind) => {
    if (kind !== 'world') return;
    Object.assign(pair, { nudge: 0, d: 3, L: null, match: false });
    pair.painted.clear();
    render();
  });
}
