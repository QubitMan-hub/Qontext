// The hero field: a wall of split tiles in superposition. A measurement wave collapses them on arrival, the
// pointer keeps them collapsed where it passes, and away from it they drift back into superposition.
//
// How it stays fast:
// - The field repeats every six tiles (three rows and three columns of the square, two reading contexts), so
//   each layer is one small SVG tile that CSS repeats. Nothing is drawn per frame, nothing is redrawn on
//   resize, and the triangles stay sharp at any pixel density.
// - The shimmer is two of those layers fading in and out. Only opacity animates, so the compositor runs it,
//   and it pauses when the hero is off screen.
// - Only the collapse lives on a canvas. It is hidden while nothing is collapsed, only tiles whose visible
//   level changed are redrawn, and the loop runs only while something is collapsing or decaying.
// - The canvas is sized with headroom, so the headline reflowing under the pointer never forces a resize.
// - Sizes come from a ResizeObserver, which reports after the browser's own layout: the hero never forces
//   one, not even on the first frame.

import { site, onWorld, tones } from './world.js';
import { mulberry32 } from '../engine/index.js';
import { reduced } from './lib.js';

const TILE = 30;
const GAP = 2;
const PERIOD = 6;
const RADIUS = 150;
const DECAY = 3.2;
const STEPS = 8;
const HEADROOM = 1.2;

// Which shimmer layer a tile belongs to (0 or 1; 2 stays still). Shuffled once so no stripes appear.
const GROUP = (() => {
  const rng = mulberry32(42);
  const order = Array.from({ length: PERIOD * PERIOD }, (_, k) => k).sort(() => rng() - 0.5);
  const g = new Array(PERIOD * PERIOD);
  order.forEach((cell, k) => (g[cell] = k % 3));
  return g;
})();

const idAt = (i, j) => `r${(j % 3) + 1}c${(i % 3) + 1}`;
const ctxAt = (i, j) => ((i + j) % 2 ? 'col' : 'row');

let hero;
let field;
let layers = [];
let canvas;
let ctx;
let tiles = [];
let dpr = 1;
let width = 0;
let height = 0;
let stale = true;
let box = null;
let pendingWave = null;
let pointer = null;
let wave = null;
let raf = null;
let last = 0;
let onstage = true;

/* ---------- the superposed field: CSS patterns ---------- */

/** One period of the field as an SVG data URL. `pick(i, j)` returns [upper, lower] colors or null. */
function pattern(pick) {
  const s = TILE - GAP;
  let body = '';
  for (let j = 0; j < PERIOD; j++) {
    for (let i = 0; i < PERIOD; i++) {
      const p = pick(i, j);
      if (!p) continue;
      const x = i * TILE;
      const y = j * TILE;
      // The full square in the lower color, then the upper triangle on top: no seam along the diagonal.
      body += `<path fill="${p[1]}" d="M${x} ${y}h${s}v${s}h-${s}z"/><path fill="${p[0]}" d="M${x} ${y}h${s}L${x} ${y + s}z"/>`;
    }
  }
  const size = TILE * PERIOD;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function paintPatterns() {
  const tone = (i, j) => tones(idAt(i, j), ctxAt(i, j));
  if (reduced()) {
    // At rest the field is shown measured: every tile in the color its context reads.
    field.style.backgroundImage = pattern((i, j) => [tone(i, j).tone, tone(i, j).tone]);
    for (const l of layers) l.style.backgroundImage = 'none';
    return;
  }
  field.style.backgroundImage = pattern((i, j) => [tone(i, j).a, tone(i, j).b]);
  layers.forEach((l, k) => {
    l.style.backgroundImage = pattern((i, j) => (GROUP[(j % PERIOD) * PERIOD + (i % PERIOD)] === k ? [tone(i, j).b, tone(i, j).a] : null));
  });
}

/* ---------- the collapse: one canvas, drawn only where something changed ---------- */

/** Sizes the canvas to cover the hero (with headroom) and rebuilds the tile list, keeping each tile's level. */
function sizeCanvas() {
  width = Math.ceil(box.width);
  height = Math.ceil(box.height * HEADROOM);
  dpr = Math.min(1.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = Math.ceil(width / TILE) + 1;
  const rows = Math.ceil(height / TILE) + 1;
  const old = new Map(tiles.map((t) => [`${t.i},${t.j}`, t.level]));
  tiles = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      tiles.push({ i, j, id: idAt(i, j), ctx: ctxAt(i, j), x: i * TILE, y: j * TILE, level: old.get(`${i},${j}`) ?? 0, drawn: 0, waved: false });
    }
  }
  stale = false;
}

/** True when the canvas no longer covers the hero. */
const outgrown = (w, hh) => Math.ceil(w) !== width || Math.ceil(hh) > height;

/** Makes the canvas ready to draw. False until the hero's size is known. */
function show() {
  if (!box) return false;
  if (stale) sizeCanvas();
  canvas.hidden = false;
  return true;
}

function drawTile(t, step) {
  ctx.clearRect(t.x - 0.5, t.y - 0.5, TILE, TILE);
  if (step > 0) {
    const tile = site.result.tiles[t.id];
    ctx.globalAlpha = step / STEPS;
    ctx.fillStyle = t.ctx === 'col' ? tile.col : tile.row;
    ctx.fillRect(t.x, t.y, TILE - GAP, TILE - GAP);
  }
  t.drawn = step;
}

function frame(time) {
  raf = null;
  const now = time / 1000;
  const dt = last ? Math.min(0.05, now - last) : 0.016;
  last = now;
  let lit = false;
  let moving = false;
  const front = wave ? (now - wave.t0) * wave.speed : -1;
  for (const t of tiles) {
    const cx = t.x + TILE / 2;
    const cy = t.y + TILE / 2;
    if (wave && !t.waved && Math.hypot(cx - wave.x, cy - wave.y) < front) {
      t.level = 1;
      t.waved = true;
    }
    const before = t.level;
    if (pointer && Math.abs(cx - pointer.x) < RADIUS && Math.abs(cy - pointer.y) < RADIUS && Math.hypot(cx - pointer.x, cy - pointer.y) < RADIUS) {
      t.level = t.level > 0.995 ? 1 : t.level + (1 - t.level) * Math.min(1, dt * 14);
    } else if (t.level > 0) {
      t.level = Math.max(0, t.level - dt / DECAY);
    }
    if (t.level !== before) moving = true;
    const step = Math.round(t.level * STEPS);
    if (step !== t.drawn) drawTile(t, step);
    if (t.level > 0) lit = true;
  }
  if (wave && front > Math.hypot(width, height)) wave = null;
  // A resting pointer over settled tiles needs no frames; the next move wakes the loop.
  if (moving || wave) schedule();
  else {
    last = 0;
    if (!lit) canvas.hidden = true; // everything is back in superposition: the canvas costs nothing until needed
  }
}

function schedule() {
  if (!raf && onstage && !document.hidden) raf = requestAnimationFrame(frame);
}

/** A measurement wave from (x, y) in hero coordinates. */
export function measureWave(x, y) {
  if (reduced() || !canvas) return;
  if (!show()) {
    pendingWave = [x, y];
    return;
  }
  for (const t of tiles) t.waved = false;
  wave = { x, y, t0: performance.now() / 1000, speed: 1100 };
  schedule();
}

/* ---------- the headline ---------- */

function initHeadline() {
  if (reduced()) return;
  const words = Array.from(hero.querySelectorAll('#heroTitle .w'));
  words.forEach((w, i) => {
    w.style.setProperty('--wd', '55');
    setTimeout(() => w.style.setProperty('--wd', '100'), 120 + i * 70);
  });
  let centers = null;
  const measureWords = () => {
    centers = words.map((w) => {
      const r = w.getBoundingClientRect();
      return [r.left + r.width / 2 + window.scrollX, r.top + r.height / 2 + window.scrollY];
    });
  };
  let at = null;
  let queued = false;
  hero.addEventListener('pointermove', (e) => {
    at = [e.pageX, e.pageY];
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!centers) measureWords();
      words.forEach((w, k) => {
        const d = Math.abs(at[0] - centers[k][0]) + Math.abs(at[1] - centers[k][1]) * 0.6;
        w.style.setProperty('--wd', String(Math.round(150 - 70 * Math.min(1, d / 420))));
      });
    });
  });
  hero.addEventListener('pointerleave', () => words.forEach((w) => w.style.setProperty('--wd', '100')));
  window.addEventListener('resize', () => (centers = null));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => (centers = null));
}

/* ---------- wiring ---------- */

export function initHero() {
  hero = document.getElementById('hero');
  field = document.getElementById('field');
  const make = (tag, cls) => {
    const el = document.createElement(tag);
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    field.append(el);
    return el;
  };
  layers = [make('div', 'field-layer s0'), make('div', 'field-layer s1')];
  canvas = make('canvas', 'field-measure');
  canvas.hidden = true;
  ctx = canvas.getContext('2d');
  paintPatterns();

  // The hero's page position is read once per visit of the pointer, not on every move (the headline reflows
  // under the pointer, so a read per move would force a layout per move).
  let origin = null;
  const local = (e) => {
    if (!origin) {
      const r = hero.getBoundingClientRect();
      origin = { x: r.left + window.scrollX, y: r.top + window.scrollY };
    }
    return { x: e.pageX - origin.x, y: e.pageY - origin.y };
  };
  const hint = document.getElementById('heroHint');
  hero.addEventListener('pointerenter', () => (origin = null));
  hero.addEventListener('pointermove', (e) => {
    if (reduced() || !show()) return;
    pointer = local(e);
    if (!hint.hidden) hint.hidden = true;
    schedule();
  });
  hero.addEventListener('pointerleave', () => {
    pointer = null;
    schedule(); // let the tiles under it drift back
  });
  hero.addEventListener('pointerdown', (e) => {
    origin = null;
    const p = local(e);
    measureWave(p.x, p.y);
  });
  // Off screen the shimmer pauses (CSS) and the loop stops; the decay resumes when the hero is back.
  new IntersectionObserver((es) => {
    onstage = es[es.length - 1].isIntersecting;
    hero.classList.toggle('offstage', !onstage);
    if (onstage) schedule();
    else pointer = null;
  }).observe(hero);
  document.addEventListener('visibilitychange', () => !document.hidden && schedule());
  const measured = (w, hh) => {
    const first = !box;
    if (!first && !outgrown(w, hh)) return;
    box = { width: w, height: hh };
    stale = true;
    // The arrival wave starts 30% across and 45% down, as soon as the hero's size is known.
    if (first) measureWave(...(pendingWave || [w * 0.3, hh * 0.45]));
    else if (!canvas.hidden) {
      show();
      schedule();
    }
  };
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver((entries) => {
      const r = entries[entries.length - 1].contentRect;
      measured(r.width, r.height);
    }).observe(hero);
  } else requestAnimationFrame(() => measured(hero.clientWidth, hero.clientHeight));
  onWorld((kind) => {
    if (kind !== 'world' && kind !== 'theme') return;
    paintPatterns();
    for (const t of tiles) t.drawn = -1; // collapsed colors changed too
    if (!canvas.hidden) schedule();
  });
  initHeadline();
}
