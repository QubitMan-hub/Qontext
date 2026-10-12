// Pair Production: a sneaker drop, start to finish. The pair stands in a vitrine that stays pinned while six
// steps scroll past. The left foot reads the visitor's grid by its rows, the right foot by its columns.
//
// The section sleeps until a visitor is near. The SVG is built once from text nodes; after that only fill and
// stop-color attributes change. Every color comes from the engine through pair-shape.js.

import { oklch, hexToOklch, hexToLin, wcagContrast, harmony, fixLightness, INKS, WCAG_AA, encodeProject, xmlEscape } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { h, svg, whenNear, onVisible, reduced } from '../lib.js';
import { collapse } from '../../runtime/qontext-runtime.js';
import { goToWorld } from './worlds.js';
import { site, onWorld, worldNumber, paletteFor } from '../world.js';
import { PANELS, LOGO, LACES, SEAMS, TREAD, pairOf, footValues, pairChecks, dropSeeds } from '../pair-shape.js';

/** What the visitor has done to the pair in this world. A new world starts it over. */
export const pair = { nudge: 0, d: 3, L: null, painted: new Set(), match: false };

const SIDES = { L: { x: 610, y: 18, flip: true, caption: 'Left foot reads the rows' }, R: { x: 10, y: 330, flip: false, caption: 'Right foot reads the columns' } };
const paths = { L: new Map(), R: new Map() };
const stops = { L: new Map(), R: new Map() };
const logos = [];
const legend = new Map();
let built = false;
let dropShown = false;
let printTicket = 0;

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

/** A panel is measured: it lands on its row color on the left foot and its column color on the right. */
function paint(id) {
  pair.match = false;
  const fresh = !pair.painted.has(id);
  pair.painted.add(id);
  render();
  if (fresh && built && !reduced()) {
    for (const side of ['L', 'R']) {
      const el = paths[side].get(id);
      el.classList.remove('landed');
      void el.getBoundingClientRect(); // restart the settle
      el.classList.add('landed');
    }
  }
}

/** The rest of the panels, one after another, the way a measurement sweeps a grid. */
function paintRest() {
  const seed = site.seed;
  const rest = PANELS.map((p) => p.id).filter((id) => !pair.painted.has(id));
  if (reduced()) {
    for (const id of rest) pair.painted.add(id);
    pair.match = false;
    render();
    return;
  }
  rest.forEach((id, k) => setTimeout(() => site.seed === seed && paint(id), k * 70));
}

/** Try to match: the right foot copies the left. One of the six rules always breaks. */
function toggleMatch() {
  if (!pair.match) for (const p of PANELS) pair.painted.add(p.id);
  pair.match = !pair.match;
  render();
}

/** Step 4: the legend, the six rules and the verdict. */
function renderPaint(p, outcomes) {
  const { left, right } = footValues(outcomes);
  const checks = pairChecks(left, pair.match ? left : right);
  const held = checks.filter((c) => c.ok).length;
  for (const panel of PANELS) {
    const b = legend.get(panel.id);
    const on = pair.painted.has(panel.id);
    b.setAttribute('aria-pressed', String(on));
    const [plus, minus] = p.both.get(panel.id);
    const [l, r] = on ? [p.left.get(panel.id), pair.match ? p.left.get(panel.id) : p.right.get(panel.id)] : [plus, minus];
    b.style.setProperty('--l', l);
    b.style.setProperty('--r', r);
  }
  $('pairChecks').replaceChildren(...checks.map((c) => h('li', { 'data-ok': String(c.ok), 'data-ctx': c.ctx }, h('span', { class: 'mark', 'aria-hidden': 'true' }), c.label, h('span', { class: 'sr-only' }, c.ok ? ', holds' : ', broken'))));
  $('pairMatch').setAttribute('aria-pressed', String(pair.match));
  $('pairPaintAll').disabled = pair.painted.size === PANELS.length;
  $('pairVerdict').textContent = pair.match
    ? `Matched, ${held} of 6 rules hold. No matching pair can do better than 5, so the pair has to differ.`
    : `${held} of 6 rules hold. ${p.differ.length} of 9 panels differ between the feet.`;
  renderTag(p, held);
}

/** One pair from another world, painted, toes out, for the drop's shelves. */
function miniPair(seed) {
  const pal = paletteFor(seed);
  const p = pairOf(pal, collapse({ ...pal, state: 'random', stateSeed: 7, seed }).outcomes);
  const root = svg('svg', { viewBox: '0 0 1220 290', 'aria-hidden': 'true', focusable: 'false' });
  for (const [side, flip] of [['L', true], ['R', false]]) {
    const foot = side === 'L' ? p.left : p.right;
    const g = svg('g', { transform: `translate(610 0)${flip ? ' scale(-1 1)' : ''}` });
    g.append(svg('ellipse', { class: 'floor', cx: 305, cy: 266, rx: 262, ry: 10 }));
    for (const panel of PANELS) g.append(svg('path', { class: 'pnl', d: panel.d, fill: foot.get(panel.id) }));
    for (const d of LACES) g.append(svg('path', { class: 'lace', d }));
    root.append(g);
  }
  return { root, differ: p.differ.length };
}

/** Step 5: twelve pairs from twelve other worlds, picked from this one, so the wall stays put until a roll. */
function renderDrop() {
  if (!dropShown) return;
  $('pairDrop').replaceChildren(
    ...dropSeeds(site.seed).map((seed) => {
      const { root, differ } = miniPair(seed);
      const label = `World ${worldNumber(seed)}, ${differ} of 9 panels differ`;
      return h('li', {}, h('button', { type: 'button', 'data-seed': seed, 'aria-label': `Make it yours: ${label}` }, root, h('span', { class: 'w' }, `World ${worldNumber(seed)}`), h('span', { class: 'd' }, `${differ} of 9 differ`)));
    }),
  );
}

/** This exact design as a Wavefunction: the world's measurement with the showcase's harmony and lightness. */
function designCode() {
  return encodeProject({ name: `Pair, world ${worldNumber()}`, ...palette(), state: 'random', stateSeed: 7, measureSeed: site.seed });
}

const listOf = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/** Step 6: the hang tag, its fingerprint (SHA-256 of the Wavefunction) and the link into the Atelier. */
function renderTag(p, held) {
  const code = designCode();
  $('pairTagWorld').textContent = worldNumber();
  $('pairTagRules').textContent = pair.match ? `${held} of 6, matched` : `${held} of 6`;
  const names = PANELS.filter((x) => p.differ.includes(x.id)).map((x) => x.name);
  $('pairTagDiffer').textContent = pair.match ? 'none, the feet were forced to match' : names.length ? listOf(names) : 'none in this world';
  $('pairAtelier').href = `studio.html#${code}`;
  const ticket = ++printTicket;
  const show = (text) => ticket === printTicket && ($('pairPrint').textContent = text);
  try {
    crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(code))
      .then((buf) => show(Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')))
      .catch(() => show('unavailable in this browser'));
  } catch {
    show('unavailable in this browser'); // SubtleCrypto needs a secure context
  }
}

const lch = (hex) => {
  const c = hexToOklch(hex);
  return `oklch(${c.L.toFixed(3)} ${c.C.toFixed(3)} ${c.h.toFixed(1)})`;
};

/** The paint sheet: both feet and every panel's color for each, so an artist can mix paint from it. */
function paintSheet() {
  const pal = palette();
  const p = pairOf(pal, site.result.outcomes);
  const font = 'font-family="Anybody, Arial Narrow, Arial, sans-serif"';
  const mono = 'font-family="IBM Plex Mono, Menlo, monospace"';
  const foot = (colors, transform) =>
    `<g transform="${transform}">` +
    PANELS.map((x) => `<path d="${x.d}" fill="${colors.get(x.id)}" stroke="#eef0f4" stroke-width="3" stroke-linejoin="round"/>`).join('') +
    `</g>`;
  const rows = PANELS.map((x, i) => {
    const y = 420 + i * 50;
    const [l, r] = [p.left.get(x.id), p.right.get(x.id)];
    const differs = l !== r ? ' (differs)' : '';
    return (
      `<text x="60" y="${y + 24}" ${font} font-size="20" fill="#1d1f52">${xmlEscape(x.name + differs)}</text>` +
      `<rect x="380" y="${y}" width="34" height="34" rx="4" fill="${l}"/><text x="426" y="${y + 23}" ${mono} font-size="15" fill="#1d1f52">${l} ${lch(l)}</text>` +
      `<rect x="780" y="${y}" width="34" height="34" rx="4" fill="${r}"/><text x="826" y="${y + 23}" ${mono} font-size="15" fill="#1d1f52">${r} ${lch(r)}</text>`
    );
  }).join('');
  const title = xmlEscape(`Qontext Pair Production, world ${worldNumber()}`);
  const text =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">` +
    `<rect width="1200" height="900" fill="#eef0f4"/>` +
    `<text x="60" y="64" ${font} font-size="34" font-weight="800" fill="#1d1f52">${title}</text>` +
    `<text x="60" y="98" ${font} font-size="18" fill="#4b4e7c">Paint sheet. The left foot reads the rows, the right foot the columns. ${p.differ.length} of 9 panels differ.</text>` +
    foot(p.left, 'translate(570 110) scale(-0.9 0.9)') +
    foot(p.right, 'translate(630 110) scale(0.9)') +
    `<text x="380" y="404" ${font} font-size="17" fill="#4b4e7c">Left foot</text><text x="780" y="404" ${font} font-size="17" fill="#4b4e7c">Right foot</text>` +
    rows +
    `</svg>\n`;
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  const a = h('a', { href: url, download: `qontext-pair-world-${site.seed}.svg` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
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
  renderPaint(p, site.result.outcomes);
  if (!built) return;
  for (const l of logos) for (const el of [l.tile, l.cut, l.word]) el.setAttribute('fill', logo.ink);
  for (const side of ['L', 'R']) {
    const foot = side === 'L' || pair.match ? p.left : p.right;
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
  $('pairPanels').replaceChildren(
    ...PANELS.map((panel) => {
      const b = h('button', { type: 'button', 'data-panel': panel.id, 'aria-pressed': 'false' }, h('i', { 'aria-hidden': 'true' }), panel.name);
      legend.set(panel.id, b);
      return h('li', {}, b);
    }),
  );
  $('pairPanels').addEventListener('click', (e) => {
    const b = e.target.closest('[data-panel]');
    if (b) paint(b.dataset.panel);
  });
  $('pairSvg').addEventListener('click', (e) => {
    const el = e.target.closest('path[data-panel]');
    if (el) paint(el.dataset.panel);
  });
  $('pairPaintAll').addEventListener('click', paintRest);
  $('pairSheet').addEventListener('click', paintSheet);
  $('pairDrop').addEventListener('click', (e) => {
    const b = e.target.closest('[data-seed]');
    if (b) goToWorld(Number(b.dataset.seed));
  });
  const dropStep = $('pairSteps').querySelector('[data-step="5"]');
  whenNear(dropStep, () => {
    dropShown = true;
    renderDrop();
  }, '400px 0px');
  // Reaching the drop with nothing painted: the pair paints itself, so the drop and the tag have a pair to show.
  onVisible(dropStep, (seen) => {
    if (seen && pair.painted.size === 0) paintRest();
  }, '-45% 0px -45% 0px');
  $('pairMatch').addEventListener('click', toggleMatch);
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
  render();
  whenNear(sec, () => {
    build();
    render();
  }, '600px 0px');
  onWorld((kind) => {
    if (kind !== 'world') return;
    Object.assign(pair, { nudge: 0, d: 3, L: null, match: false });
    pair.painted.clear();
    render();
    renderDrop();
  });
}
