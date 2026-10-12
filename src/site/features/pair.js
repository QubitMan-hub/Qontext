// Pair Production: a sneaker drop, start to finish. The pair stands in a vitrine that stays pinned while six
// steps scroll past. The left foot reads the visitor's grid by its rows, the right foot by its columns.
//
// Each foot is a studio photo of a plain white sneaker with its nine panels traced from the photo's seams. A
// panel's color is laid over the photo with a multiply blend, so the leather's own shading, stitching and laces
// show through, all on the visitor's device. The section sleeps until a visitor is near; the SVG is built once
// from text nodes, and after that only fill and stop-color attributes change.

import { oklch, hexToOklch, hexToLin, wcagContrast, harmony, INKS, WCAG_AA, encodeProject, xmlEscape } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { h, svg, whenNear, onVisible, reduced } from '../lib.js';
import { collapse } from '../../runtime/qontext-runtime.js';
import { goToWorld } from './worlds.js';
import { site, onWorld, worldNumber, paletteFor } from '../world.js';
import { PANELS, PHOTO, pairOf, footValues, pairChecks, dropSeeds } from '../pair-shape.js';

/** What the visitor has done to the pair in this world. A new world starts it over. */
export const pair = { nudge: 0, d: 3, L: null, painted: new Set(), match: false };

const W = PHOTO.width;
const H = PHOTO.height;
// The two feet stacked in the vitrine, the left one mirrored so the pair stands toes out.
const SIDES = { L: { y: 80, flip: true, caption: 'Left foot reads the rows' }, R: { y: 800, flip: false, caption: 'Right foot reads the columns' } };
const paths = { L: new Map(), R: new Map() };
const stops = { L: new Map(), R: new Map() };
const legend = new Map();
let built = false;
let dropShown = false;
let printTicket = 0;
let step = 1;
const GLASS_L = 0.27;

/** The world's palette with the showcase's own harmony and lightness on top. */
export function palette() {
  const p = site.palette;
  // Hue wraps round: a Wavefunction keeps 0 to 360, and would stop a turn that passes the top of the wheel.
  return { base: (p.base + pair.nudge + 360) % 360, d: pair.d, L: pair.L ?? p.L, C: p.C };
}

/** Shared by the vitrine and the drop: the shoe's outline as a clip, and the soft shadow it stands on. */
function defineShared(root) {
  const defs = svg(
    'defs',
    {},
    svg('clipPath', { id: 'pairSil', clipPathUnits: 'userSpaceOnUse' }, svg('path', { d: PHOTO.silhouette })),
    svg('radialGradient', { id: 'pairFloor' }, svg('stop', { offset: '0', 'stop-color': '#000', 'stop-opacity': '0.6' }), svg('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': '0' })),
  );
  root.append(svg('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false', class: 'pair-defs' }, defs));
}

/** One foot: shadow, photo clipped to the shoe, and the nine panels multiplied over it. */
function foot(transform, fillFor, side = null) {
  const g = svg('g', { transform, ...(side ? { 'data-side': side } : {}) });
  g.append(svg('ellipse', { class: 'floor', cx: W / 2, cy: H - 26, rx: W * 0.5, ry: 34, fill: 'url(#pairFloor)' }));
  const body = svg('g', { class: 'shoe', 'clip-path': 'url(#pairSil)' }, svg('image', { href: PHOTO.src, width: W, height: H, preserveAspectRatio: 'none' }));
  for (const p of PANELS) {
    const el = svg('path', { class: 'pnl', d: p.d, 'data-panel': p.id, fill: fillFor(p.id) });
    if (side) paths[side].set(p.id, el);
    body.append(el);
  }
  g.append(body);
  return g;
}

function gradient(defs, side, id) {
  const a = svg('stop', { offset: '0.5' });
  const b = svg('stop', { offset: '0.5' });
  defs.append(svg('linearGradient', { id: `pg-${side}-${id}`, x1: 0, y1: 0, x2: 1, y2: 1 }, a, b));
  stops[side].set(id, [a, b]);
}

function build() {
  const root = $('pairSvg');
  const defs = svg('defs');
  root.append(defs);
  for (const side of ['L', 'R']) {
    const s = SIDES[side];
    for (const p of PANELS) gradient(defs, side, p.id);
    root.append(svg('text', { class: 'caption', x: 28, y: s.y - 26 }, s.caption));
    const g = foot(`translate(${s.flip ? W : 0} ${s.y})${s.flip ? ' scale(-1 1)' : ''}`, (id) => `url(#pg-${side}-${id})`, side);
    root.append(g);
  }
  built = true;
}

/** An unmeasured outcome: a pale tint of it, so an unpainted shoe looks white with a hint of both colors, and
 * painting is the moment it comes to full color. */
function washed(hex) {
  const c = hexToOklch(hex);
  return oklch(c.L + (0.97 - c.L) * 0.62, c.C * 0.42, c.h).hex;
}

/** A color as it shows on a panel: multiplied by that panel's white leather (measured from the photo). */
function onLeather(hex, id) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * PHOTO.shade[id]));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const ratio = (ink, fill) => wcagContrast(hexToLin(ink), hexToLin(fill));

/**
 * Bouncer on the print: sizes, names and numbers get printed on a sneaker, and a panel can come out in either of
 * its two colors. Print takes whichever of the two inks reads better on the weakest of all 18 colors, as they
 * show on the leather. Returns { ink, ratio, colors }.
 */
function printInk(both) {
  const colors = PANELS.flatMap((p) => both.get(p.id).map((c) => onLeather(c, p.id)));
  const rate = (ink) => Math.min(...colors.map((c) => ratio(ink, c)));
  const dark = rate(INKS.dark);
  const light = rate(INKS.light);
  return dark >= light ? { ink: INKS.dark, ratio: dark, colors } : { ink: INKS.light, ratio: light, colors };
}

/** Step 2 and step 3: the harmony's chips and the print's contrast. */
function renderControls(pal, print) {
  $('pairLight').value = String(Math.round(pal.L * 100));
  $('pairLightOut').textContent = pal.L.toFixed(2);
  $('pairTurn').value = String(pair.nudge);
  $('pairTurnOut').textContent = `${pair.nudge}°`;
  for (const b of $('pairD').children) b.setAttribute('aria-pressed', String(Number(b.dataset.d) === pair.d));
  $('pairHarmony').replaceChildren(...harmony(pal).map((c) => h('li', { class: 'chip' }, h('i', { style: { background: c.hex } }), h('code', {}, c.hex))));
  const shown = Math.floor(print.ratio * 10) / 10;
  const ok = print.ratio >= WCAG_AA;
  $('pairInkRatio').textContent = `${shown.toFixed(1)} : 1`;
  $('pairFix').hidden = ok;
  const which = print.ink === INKS.dark ? 'Dark ink' : 'Light ink';
  $('pairInkNote').textContent = ok
    ? `${which} reads on every color this pair can take. Bouncer lets it ship.`
    : `${which} is too faint on some panel. Fix moves every color's lightness together until it reads.`;
  const stage = $('pairStage');
  stage.dataset.colors = print.colors.join(' ');
  stage.dataset.ink = print.ink;
}

/** Fix: the lightness closest to today's at which print reads on every panel, in 0.01 steps. */
function fix() {
  const pal = palette();
  const reads = (L) => printInk(pairOf({ ...pal, L }, site.result.outcomes).both).ratio >= WCAG_AA;
  for (let step = 0; step <= 60; step++) {
    for (const dir of [1, -1]) {
      const L = Math.round((pal.L + dir * step * 0.01) * 100) / 100;
      if (L >= 0.35 && L <= 0.92 && reads(L)) {
        pair.L = L;
        render();
        return;
      }
    }
  }
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
  const root = svg('svg', { viewBox: `0 0 ${W * 2 + 60} ${H}`, 'aria-hidden': 'true', focusable: 'false' });
  root.append(foot(`translate(${W} 0) scale(-1 1)`, (id) => p.left.get(id)), foot(`translate(${W + 60} 0)`, (id) => p.right.get(id)));
  return { root, differ: p.differ.length };
}

/** Step 5: twelve pairs from twelve other worlds, picked from this one, so the wall stays put until a roll. */
function renderDrop() {
  if (!dropShown) return;
  $('pairDrop').replaceChildren(
    ...dropSeeds(site.seed).map((seed) => {
      const { root, differ } = miniPair(seed);
      // Named by its own words, so voice control users can say what they see.
      return h('li', {}, h('button', { type: 'button', 'data-seed': seed }, root, h('span', { class: 'sr-only' }, 'Make it yours: '), h('span', { class: 'w' }, `World ${worldNumber(seed)}`), ' ', h('span', { class: 'd' }, `${differ} of 9 differ`)));
    }),
  );
}

/** This exact design as a Wavefunction: the world's measurement with the showcase's harmony and lightness. */
function designCode() {
  return encodeProject({ name: `Pair, world ${worldNumber()}`, ...palette(), state: 'random', stateSeed: 7, measureSeed: site.seed });
}

const listOf = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/** Step 6: the hang tag, its fingerprint (SHA-256 of the Wavefunction), and the links to Turntable and the Atelier. */
function renderTag(p, held) {
  const code = designCode();
  $('pairTagWorld').textContent = worldNumber();
  $('pairTagRules').textContent = pair.match ? `${held} of 6, matched` : `${held} of 6`;
  const names = PANELS.filter((x) => p.differ.includes(x.id)).map((x) => x.name);
  $('pairTagDiffer').textContent = pair.match ? 'none, the feet were forced to match' : names.length ? listOf(names) : 'none in this world';
  $('pairTurntable').href = `turntable.html#${code}`;
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

/** The photo as a data URL, drawn through a canvas (the page's policy allows images from the site, not fetches). */
async function photoData() {
  const img = new Image();
  img.src = PHOTO.src;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  cv.getContext('2d').drawImage(img, 0, 0);
  return cv.toDataURL('image/jpeg', 0.9);
}

/** The paint sheet: both feet, painted, and every panel's color for each, so an artist can mix paint from it. */
async function paintSheet() {
  const pal = palette();
  const p = pairOf(pal, site.result.outcomes);
  let photo = '';
  try {
    photo = await photoData();
  } catch {
    /* no photo: the sheet still has every color */
  }
  const font = 'font-family="Anybody, Arial Narrow, Arial, sans-serif"';
  const mono = 'font-family="IBM Plex Mono, Menlo, monospace"';
  const scale = 540 / W;
  const sheetFoot = (colors, x, flip) =>
    `<g transform="translate(${x} 120) scale(${flip ? -scale : scale} ${scale})">` +
    `<clipPath id="sil${flip ? 'L' : 'R'}"><path d="${PHOTO.silhouette}"/></clipPath>` +
    `<g clip-path="url(#sil${flip ? 'L' : 'R'})">` +
    (photo ? `<image href="${photo}" width="${W}" height="${H}"/>` : `<path d="${PHOTO.silhouette}" fill="#ffffff"/>`) +
    PANELS.map((x) => `<path d="${x.d}" fill="${colors.get(x.id)}" style="mix-blend-mode:multiply"/>`).join('') +
    `</g></g>`;
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
    sheetFoot(p.left, 590, true) +
    sheetFoot(p.right, 610, false) +
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
  renderControls(pal, printInk(p.both));
  renderPaint(p, site.result.outcomes);
  if (!built) return;
  for (const side of ['L', 'R']) {
    const foot = side === 'L' || pair.match ? p.left : p.right;
    for (const panel of PANELS) {
      const [a, b] = stops[side].get(panel.id);
      const [plus, minus] = p.both.get(panel.id);
      // In step 3 every panel shows both of its outcomes at full strength: they are what print must read on.
      const full = step === 3;
      a.setAttribute('stop-color', full ? plus : washed(plus));
      b.setAttribute('stop-color', full ? minus : washed(minus));
      paths[side].get(panel.id).setAttribute('fill', pair.painted.has(panel.id) ? foot.get(panel.id) : `url(#pg-${side}-${panel.id})`);
    }
  }
}

/** The step in the middle of the screen is the one the pair answers to. */
function setStep(n, steps) {
  if (n === step) return;
  step = n;
  for (const li of steps) li.classList.toggle('on', Number(li.dataset.step) === n);
  $('pairStage').dataset.step = String(n);
  render();
}

function followSteps() {
  const steps = [...$('pairSteps').children];
  steps[0].classList.add('on');
  if (typeof IntersectionObserver !== 'function') return;
  // A thin band just under the middle of the screen; on a phone that is just below the pinned vitrine.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) setStep(Number(e.target.dataset.step), steps);
  }, { rootMargin: '-52% 0px -40% 0px' });
  for (const li of steps) io.observe(li);
}

export function initPair() {
  const sec = $('pair');
  if (!sec) return;
  defineShared(sec);
  followSteps();
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
