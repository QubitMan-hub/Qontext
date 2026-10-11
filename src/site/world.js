// The visitor's world: one Observer collapse that colors the whole site, plus the observation system that
// keeps swatches in superposition until they are scrolled into view.

import { collapse, cssVariables } from '../runtime/qontext-runtime.js';
import {
  tileColor, fixLightness, INKS, freshSeed, hashSeed, roundSatisfied, contextualTiles, encodeProject,
} from '../engine/index.js';
import { $$ } from '../app/dom.js';

const WORLD_KEY = 'qontext-site-world';
const listeners = new Set();

export const site = { seed: 0, palette: null, result: null, observed: 0 };

export const onWorld = (fn) => listeners.add(fn);
export const worldNumber = (seed = site.seed) => seed.toLocaleString('en-US');
export const tileOf = (id) => [Number(id[1]) - 1, Number(id[3]) - 1];

/** A palette for a world: its own base phase, a triad, and a lightness Bouncer has cleared for dark text. */
export function paletteFor(seed) {
  const pal = { base: hashSeed(seed, 11) % 360, d: 3, L: 0.76, C: 0.13 };
  const L = fixLightness(pal, INKS.dark);
  if (L !== null) pal.L = L;
  return pal;
}

export function wavefunction() {
  return encodeProject({ name: `World ${worldNumber()}`, ...site.palette, state: 'random', stateSeed: 7, measureSeed: site.seed });
}

function readSession() {
  try {
    const v = Number(window.sessionStorage.getItem(WORLD_KEY));
    return Number.isInteger(v) && v > 0 && v < 1e7 ? v : null;
  } catch {
    return null;
  }
}

function writeSession(seed) {
  try {
    window.sessionStorage.setItem(WORLD_KEY, String(seed));
  } catch {
    /* storage blocked: the world simply will not survive a reload */
  }
}

export const newSeed = () => 1 + (freshSeed() % 9999999);

/** Tints every .q[data-q] element: --tone is its measured reading in its context, --tone-a/b the two outcomes. */
export function toneAll(root = document) {
  const { result, palette } = site;
  for (const el of $$('.q[data-q]', root)) {
    const id = el.dataset.q;
    const t = result.tiles[id];
    if (!t) continue;
    const [r, c] = tileOf(id);
    const ctxEl = el.closest('[data-q-context]');
    const ctx = el.dataset.qCtx || (ctxEl && ctxEl.dataset.qContext) || 'row';
    el.style.setProperty('--tone', ctx === 'col' ? t.col : t.row);
    el.style.setProperty('--tone-a', tileColor(palette, r, c, 1).hex);
    el.style.setProperty('--tone-b', tileColor(palette, r, c, -1).hex);
  }
}

let io = null;

export function waiting() {
  return $$('.q.sup').length;
}

function collapseEl(el) {
  if (!el.classList.contains('sup')) return;
  el.classList.remove('sup');
  el.classList.add('seen');
  site.observed++;
  for (const fn of listeners) fn('observe');
}

/** Puts every swatch back into superposition; the ones you can see collapse as soon as they are observed. */
export function superposeAll() {
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            collapseEl(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
  }
  for (const el of $$('.q[data-q]')) {
    el.classList.remove('seen');
    el.classList.add('sup');
    io.observe(el);
  }
}

/** Starts (or replaces) the world. */
export function setWorld(seed) {
  site.seed = seed;
  site.palette = paletteFor(seed);
  site.result = collapse({ ...site.palette, state: 'random', stateSeed: 7, seed });
  writeSession(seed);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(cssVariables(site.result))) root.style.setProperty(k, v);
  toneAll();
  for (const fn of listeners) fn('world');
}

export function initialSeed() {
  return readSession() || newSeed();
}

export function proof() {
  const out = site.result.outcomes;
  return { rules: roundSatisfied(out), changing: contextualTiles(out).length };
}
