import {
  SHAPE_SETS, analyzeShape, findKsColoring, bestAttempt, toObj, harmony, oklch, hashSeed,
} from '../../engine/index.js';
import { drawShape, shapeSvg } from '../../shared/shape-render.js';
import { $, $$, copyText, cssVar, pressOne, reducedMotion, toast } from '../dom.js';
import { store, palette, setProject } from '../store.js';

const cache = {};
let A = null;
let ks = null;
let attempt = null;
let attemptSeed = 1;
let yaw = 0.6;
let pitch = -0.45;
let w4 = 0.4;
let spinning = !reducedMotion();
let raf = null;
let last = 0;
let fmt = 'svg';
let visible = false;

function load(id) {
  if (!cache[id]) {
    const analysis = analyzeShape(SHAPE_SETS[id]);
    cache[id] = { A: analysis, ks: findKsColoring(analysis) };
  }
  A = cache[id].A;
  ks = cache[id].ks;
  newAttempt();
}

function newAttempt() {
  attempt = ks.coloring
    ? { coloring: ks.coloring, broken: [], satisfied: A.bases.length }
    : bestAttempt(A, hashSeed(attemptSeed++, A.n), 300);
}


function colorsForDraw() {
  const pal = palette();
  return {
    sets: harmony({ ...pal, L: Math.min(0.75, Math.max(0.55, pal.L)), C: Math.max(0.12, pal.C) }).map((c) => c.hex),
    lit: oklch(Math.min(0.7, Math.max(0.55, pal.L)), Math.max(0.16, pal.C * 1.3), pal.base).hex,
    unlit: cssVar('--ink-2') || '#4b4e7c',
    broken: cssVar('--bad') || '#b4232c',
    halo: cssVar('--panel') || '#ffffff',
  };
}

function draw() {
  const cv = $('shapeCanvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = Math.round((cv.clientWidth || 400) * dpr);
  if (cv.width !== size) {
    cv.width = size;
    cv.height = size;
  }
  drawShape(cv.getContext('2d'), A, attempt, { size, dpr, view: { yaw, pitch, w: w4 }, colors: colorsForDraw() });
}

function loop(t) {
  const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
  last = t;
  if (spinning) {
    yaw += dt * 0.35;
    if (A.dim === 4) w4 += dt * 0.25;
  }
  draw();
  raf = visible && spinning ? requestAnimationFrame(loop) : null;
}

function startLoop() {
  if (!raf && visible && spinning) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
}

function exportText() {
  if (fmt === 'obj') return toObj(A, A.set.id);
  if (fmt === 'json') {
    return JSON.stringify(
      {
        name: A.set.name,
        dimension: A.dim,
        vectors: A.vectors.map((v) => v.map((x) => Number(x.toFixed(6)))),
        bases: A.bases,
        classicalColoringExists: !!ks.coloring,
        attempt: { coloring: attempt.coloring, brokenBases: attempt.broken },
      },
      null,
      2,
    );
  }
  return shapeSvg(A, attempt, { yaw, pitch, w: w4 }, colorsForDraw());
}


export function init() {
  const cv = $('shapeCanvas');
  cv.tabIndex = 0;
  let drag = null;
  cv.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    yaw += (e.clientX - drag.x) * 0.01;
    pitch += (e.clientY - drag.y) * 0.01;
    drag = { x: e.clientX, y: e.clientY };
    if (!raf) draw();
  });
  const end = () => {
    drag = null;
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', (e) => {
    const step = 0.12;
    if (e.key === 'ArrowLeft') yaw -= step;
    else if (e.key === 'ArrowRight') yaw += step;
    else if (e.key === 'ArrowUp') pitch -= step;
    else if (e.key === 'ArrowDown') pitch += step;
    else return;
    e.preventDefault();
    if (!raf) draw();
  });
  for (const b of $$('[data-shape]')) b.addEventListener('click', () => setProject({ shape: b.dataset.shape }));
  for (const b of $$('[data-sfmt]')) {
    b.addEventListener('click', () => {
      fmt = b.dataset.sfmt;
      pressOne($$('[data-sfmt]'), b);
      $('shapeOut').value = exportText();
    });
  }
  $('shapeTry').addEventListener('click', () => {
    if (ks.coloring) {
      toast('This set has a valid coloring, shown already');
      return;
    }
    newAttempt();
    render();
  });
  $('shapeSpin').addEventListener('click', (e) => {
    spinning = !spinning;
    e.currentTarget.setAttribute('aria-pressed', String(spinning));
    e.currentTarget.textContent = spinning ? 'Pause rotation' : 'Resume rotation';
    if (spinning) startLoop();
  });
  $('shapeCopy').addEventListener('click', () => copyText($('shapeOut').value, $('shapeOut')));
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => visible && A && draw()).observe(cv);
}

export function setVisible(on) {
  visible = on;
  if (on) startLoop();
  else if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }
}

export function render() {
  const id = store.project.shape;
  if (!A || A.set.id !== id) load(id);
  pressOne($$('[data-shape]'), $$('[data-shape]').find((b) => b.dataset.shape === id));
  $('shapeSpin').textContent = spinning ? 'Pause rotation' : 'Resume rotation';
  $('shapeSpin').setAttribute('aria-pressed', String(spinning));
  $('shapeName').textContent = `${A.set.name}, ${A.dim}D, ${A.set.year}`;
  $('shapeN').textContent = A.n;
  $('shapeB').textContent = A.bases.length;
  $('shapeP').textContent = A.pairs.length;
  $('shapeKs').textContent = ks.coloring ? 'exists' : 'impossible';
  $('shapeBest').textContent = `${attempt.satisfied} of ${A.bases.length} sets`;
  $('yuohCard').hidden = A.set.id !== 'yuoh13';
  $('shapeTry').disabled = !!ks.coloring;
  const { sets, lit } = colorsForDraw();
  $('shapeKey').innerHTML =
    `<span><i style="background:${lit}"></i>lit direction</span>` +
    '<span><i style="background:var(--ink-2)"></i>unlit direction</span>' +
    `<span><i style="background:${sets[0]}"></i>complete perpendicular set</span>` +
    (attempt.broken.length ? '<span><i style="background:var(--bad)"></i>broken set</span>' : '');
  if (A.set.id === 'yuoh13') {
    $('shapeNote').textContent = 'A valid classical coloring exists for these 13 directions and is shown. Their contextuality shows up in the Yu-Oh inequality instead, and it holds for every quantum state.';
  } else {
    const parity = A.set.id === 'cabello18' ? ' Quick proof: 9 sets, each direction in exactly two, so the lit count would be both odd and even.' : '';
    $('shapeNote').textContent = `No classical coloring exists. An exhaustive search explored ${ks.nodes.toLocaleString()} branches and found none. This attempt still breaks ${attempt.broken.length} of ${A.bases.length} sets.${parity}`;
  }
  $('shapeOut').value = exportText();
  draw();
  startLoop();
}
