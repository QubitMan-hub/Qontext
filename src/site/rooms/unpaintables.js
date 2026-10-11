// Unpaintables: Kochen-Specker shapes. The broken set pulses at 30 frames a second, only while the canvas is
// on screen; scrolling and dragging turn the shape. Shape analysis runs once per shape and is cached.

import { SHAPE_SETS, analyzeShape, findKsColoring, bestAttempt, hashSeed, harmony, oklch } from '../../engine/index.js';
import { drawShape } from '../../shared/shape-render.js';
import { $, $$ } from '../../app/dom.js';
import { h, onVisible, reduced } from '../lib.js';
import { site } from '../world.js';
import { onScroll } from '../scroll.js';

const FRAME_MS = 1000 / 30;
const state = { id: 'peres33', A: null, ks: null, attempt: null, yaw: 0.6, drag: 0, pitch: -0.4, w: 0.3, visible: false, raf: null, last: 0 };
const cache = new Map();
let cv;
let ctx;
let colors = null;

function load() {
  if (!cache.has(state.id)) {
    const A = analyzeShape(SHAPE_SETS[state.id]);
    cache.set(state.id, { A, ks: findKsColoring(A) });
  }
  ({ A: state.A, ks: state.ks } = cache.get(state.id));
  const A = state.A;
  state.attempt = state.ks.coloring ? { coloring: state.ks.coloring, broken: [], satisfied: A.bases.length } : bestAttempt(A, hashSeed(site.seed, A.n), 300);
  const fact = (label, value) => h('div', {}, h('span', {}, label), h('b', {}, value));
  $('uFacts').replaceChildren(
    fact('Directions', A.n),
    fact('Perpendicular sets', A.bases.length),
    fact('Classical coloring', state.ks.coloring ? 'exists' : 'impossible'),
    fact('Best attempt', `${state.attempt.satisfied} of ${A.bases.length}`),
  );
  $('uCap').textContent = state.ks.coloring
    ? 'Yu-Oh 13 can be colored, and the coloring is shown. It breaks a different rule: every quantum state scores 25/3 on its inequality, above the classical 8.'
    : `No coloring exists; the computer searched ${state.ks.nodes} branches to prove it. The dashed set is where this attempt breaks. Scroll or drag to turn the shape.`;
}

/** Colors depend on the world and the theme, so they are read once per change, not per frame. */
function readColors() {
  const pal = site.palette;
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  colors = {
    sets: harmony({ ...pal, L: Math.min(0.72, Math.max(0.55, pal.L)), C: Math.max(0.13, pal.C) }).map((c) => c.hex),
    lit: oklch(0.62, 0.2, pal.base).hex,
    unlit: v('--ink-2', '#4b4e7c'),
    broken: v('--no', '#b4232c'),
    halo: v('--sheet', '#ffffff'),
  };
}

function draw(time = 0) {
  if (!colors || !state.A) return;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const size = Math.round((cv.clientWidth || 320) * dpr);
  if (cv.width !== size) {
    cv.width = size;
    cv.height = size;
  }
  drawShape(ctx, state.A, state.attempt, {
    size,
    dpr,
    view: { yaw: state.yaw + state.drag, pitch: state.pitch, w: state.w },
    colors,
    pulse: reduced() ? 0.5 : 0.5 + 0.5 * Math.sin(time / 260),
  });
}

function loop(time) {
  state.raf = null;
  if (!state.visible || reduced()) return;
  if (time - state.last >= FRAME_MS) {
    state.last = time;
    draw(time);
  }
  state.raf = requestAnimationFrame(loop);
}

/** Redraws now unless the pulse loop is about to anyway. */
const redraw = () => !state.raf && draw(performance.now());

export default {
  id: 'unpaintables',
  init(article) {
    cv = $('uCanvas');
    ctx = cv.getContext('2d');
    for (const b of $$('[data-uset]')) {
      b.addEventListener('click', () => {
        state.id = b.dataset.uset;
        $$('[data-uset]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        load();
        redraw();
      });
    }
    let start = null;
    cv.addEventListener('pointerdown', (e) => {
      start = e.clientX - state.drag * 120;
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (start === null) return;
      state.drag = (e.clientX - start) / 120;
      redraw();
    });
    cv.addEventListener('pointerup', () => (start = null));
    onScroll(article, (p) => {
      state.yaw = 0.4 + p * Math.PI * 2;
      state.w = 0.2 + p * 1.6;
      redraw();
    });
    onVisible(cv, (on) => {
      state.visible = on;
      if (on && !state.raf && !reduced()) state.raf = requestAnimationFrame(loop);
    });
  },
  paint() {
    readColors();
    load();
    redraw();
  },
  theme() {
    readColors();
    redraw();
  },
};
