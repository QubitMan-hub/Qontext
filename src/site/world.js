// The visitor's world (one Observer collapse that colors the whole site) and the observation system that keeps
// swatches in superposition until they are looked at.
//
// Performance notes: swatches only animate while they are near the viewport, and the shimmer is an opacity
// animation on a pseudo-element, so the compositor runs it without touching the main thread. The count of
// swatches still waiting is tracked, never queried from the DOM.

import { collapse, cssVariables } from '../runtime/qontext-runtime.js';
import { tileColor, fixLightness, INKS, freshSeed, hashSeed, roundSatisfied, contextualTiles, encodeProject, oklch, hexToOklch } from '../engine/index.js';
import { fmtInt } from './lib.js';

const WORLD_KEY = 'qontext-site-world';
const listeners = new Set();

export const site = { seed: 0, palette: null, result: null, waiting: 0, paper: '#eef0f4' };

export const onWorld = (fn) => listeners.add(fn);
const emit = (kind) => {
  for (const fn of listeners) {
    try {
      fn(kind);
    } catch (e) {
      console.error(e);
    }
  }
};

export const worldNumber = (seed = site.seed) => fmtInt(seed);
export const tileOf = (id) => [Number(id[1]) - 1, Number(id[3]) - 1];
export const newSeed = () => 1 + (freshSeed() % 9999999);

/** A palette for a world: its own base phase, a triad, and a lightness Bouncer has cleared for dark text. */
function paletteFor(seed) {
  const pal = { base: hashSeed(seed, 11) % 360, d: 3, L: 0.76, C: 0.13 };
  const L = fixLightness(pal, INKS.dark);
  if (L !== null) pal.L = L;
  return pal;
}

export function wavefunction() {
  return encodeProject({ name: `World ${worldNumber()}`, ...site.palette, state: 'random', stateSeed: 7, measureSeed: site.seed });
}

export function initialSeed() {
  try {
    const v = Number(window.sessionStorage.getItem(WORLD_KEY));
    if (Number.isInteger(v) && v > 0 && v < 1e7) return v;
  } catch {
    /* storage blocked */
  }
  return newSeed();
}

function remember(seed) {
  try {
    window.sessionStorage.setItem(WORLD_KEY, String(seed));
  } catch {
    /* storage blocked: the world will not survive a reload */
  }
}

let paperL = 0.95;
const toneCache = new Map();

/** A superposed outcome, washed toward the paper so collapsed colors read as the stronger state. */
function washed(hex) {
  const c = hexToOklch(hex);
  return oklch(c.L + (paperL - c.L) * 0.35, c.C * 0.6, c.h).hex;
}

/** The color of a tile token in a context, and its two washed outcomes. Cached per world and theme. */
export function tones(id, ctx) {
  const key = `${id}|${ctx}`;
  let t = toneCache.get(key);
  if (!t) {
    const [r, c] = tileOf(id);
    const tile = site.result.tiles[id];
    t = { tone: ctx === 'col' ? tile.col : tile.row, a: washed(tileColor(site.palette, r, c, 1).hex), b: washed(tileColor(site.palette, r, c, -1).hex) };
    toneCache.set(key, t);
  }
  return t;
}

function contextOf(el) {
  if (el.dataset.qCtx) return el.dataset.qCtx;
  const host = el.closest('[data-q-context]');
  return host ? host.dataset.qContext : 'row';
}

function tone(el) {
  const t = tones(el.dataset.q, contextOf(el));
  el.style.setProperty('--tone', t.tone);
  el.style.setProperty('--tone-a', t.a);
  el.style.setProperty('--tone-b', t.b);
}

/* ---------- observation ---------- */

let nearIO = null;
let seenIO = null;

function collapseEl(el) {
  if (!el.classList.contains('sup')) return;
  el.classList.remove('sup', 'live');
  el.classList.add('seen');
  site.waiting--;
  nearIO.unobserve(el);
  seenIO.unobserve(el);
  emit('observe');
}

function observers() {
  if (nearIO || typeof IntersectionObserver !== 'function') return;
  nearIO = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('live', e.isIntersecting);
  }, { rootMargin: '300px 0px' });
  seenIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) collapseEl(e.target);
  }, { threshold: 0.5 });
}

/** Tints and starts observing swatches under `root` (call again for swatches built later). */
export function adopt(root = document) {
  observers();
  for (const el of root.querySelectorAll('.q[data-q]')) {
    tone(el);
    if (el.classList.contains('sup') || el.classList.contains('seen')) continue;
    el.classList.add('sup');
    site.waiting++;
    if (nearIO) {
      nearIO.observe(el);
      seenIO.observe(el);
    } else collapseEl(el);
  }
  emit('observe');
}

/** Many Worlds: every swatch goes back into superposition and is observed again. */
export function resuperpose() {
  observers();
  for (const el of document.querySelectorAll('.q[data-q]')) {
    tone(el);
    if (el.classList.contains('seen')) {
      el.classList.remove('seen');
      el.classList.add('sup');
      site.waiting++;
      nearIO.observe(el);
      seenIO.observe(el);
    }
  }
  emit('observe');
}

/* ---------- world ---------- */

// The two papers, as in site.css. Known here so boot never has to force a style calculation to read them.
const PAPER = { light: '#eef0f4', dark: '#121433' };

function theme() {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'light' || forced === 'dark') return forced;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function readPaper() {
  site.paper = PAPER[theme()];
  paperL = hexToOklch(site.paper).L;
  toneCache.clear();
}

/** Starts (or replaces) the world and tells every listener. */
export function setWorld(seed) {
  readPaper();
  site.seed = seed;
  site.palette = paletteFor(seed);
  site.result = collapse({ ...site.palette, state: 'random', stateSeed: 7, seed });
  remember(seed);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(cssVariables(site.result))) root.style.setProperty(k, v);
  for (const el of document.querySelectorAll('.q[data-q]')) tone(el);
  emit('world');
}

/** Re-tints for a theme change (washed outcomes depend on the paper color). */
export function retheme() {
  readPaper();
  for (const el of document.querySelectorAll('.q[data-q]')) tone(el);
  emit('theme');
}

export function proof() {
  const out = site.result.outcomes;
  return { rules: roundSatisfied(out), changing: contextualTiles(out).length };
}
