import {
  SHAPE_SETS, analyzeShape, findKsColoring, bestAttempt, projectPoint, toObj, harmony, oklch, hashSeed,
} from '../../engine/index.js';
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

function geometry(size) {
  const R = size * 0.36;
  const tips = [];
  A.vectors.forEach((v, i) => {
    for (const s of [1, -1]) {
      const p = projectPoint(v.map((x) => x * s), { yaw, pitch, w: w4, scale: R });
      tips.push({ i, s, x: size / 2 + p[0], y: size / 2 - p[1], z: p[2] });
    }
  });
  return tips;
}

function colorsForDraw() {
  const pal = palette();
  const cols = harmony({ ...pal, L: Math.min(0.75, Math.max(0.55, pal.L)), C: Math.max(0.12, pal.C) }).map((c) => c.hex);
  const lit = oklch(Math.min(0.7, Math.max(0.55, pal.L)), Math.max(0.16, pal.C * 1.3), pal.base).hex;
  return { cols, lit };
}

function draw() {
  const cv = $('shapeCanvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const css = cv.clientWidth || 400;
  const size = Math.round(css * dpr);
  if (cv.width !== size) {
    cv.width = size;
    cv.height = size;
  }
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const tips = geometry(size);
  const tip = (i, s) => tips[2 * i + (s > 0 ? 0 : 1)];
  const ink2 = cssVar('--ink-2') || '#5a596b';
  const bad = cssVar('--bad') || '#b3261e';
  const paper = cssVar('--panel') || '#ffffff';
  const { cols, lit } = colorsForDraw();
  const depthAlpha = (z) => 0.35 + 0.65 * ((z + 1) / 2);

  ctx.lineCap = 'round';
  for (let i = 0; i < A.n; i++) {
    const a = tip(i, 1);
    const b = tip(i, -1);
    ctx.strokeStyle = ink2;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const broken = new Set(attempt.broken);
  A.bases.forEach((basis, k) => {
    const isBroken = broken.has(k);
    ctx.strokeStyle = isBroken ? bad : cols[k % cols.length];
    ctx.lineWidth = (isBroken ? 2.6 : 1.4) * dpr;
    ctx.setLineDash(isBroken ? [6 * dpr, 4 * dpr] : []);
    ctx.globalAlpha = isBroken ? 0.95 : 0.55;
    ctx.beginPath();
    for (let x = 0; x < basis.length; x++) {
      for (let y = x + 1; y < basis.length; y++) {
        const p = tip(basis[x], 1);
        const q = tip(basis[y], 1);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
      }
    }
    ctx.stroke();
  });
  ctx.setLineDash([]);
  for (const t of tips.slice().sort((a, b) => a.z - b.z)) {
    const on = attempt.coloring[t.i] === 1;
    ctx.globalAlpha = depthAlpha(Math.max(-1, Math.min(1, t.z / (size * 0.36))));
    ctx.beginPath();
    ctx.arc(t.x, t.y, (on ? 6 : 3.5) * dpr, 0, Math.PI * 2);
    ctx.fillStyle = on ? lit : ink2;
    ctx.fill();
    if (on) {
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = paper;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
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
  const size = 600;
  const tips = geometry(size);
  const tip = (i) => tips[2 * i];
  const { cols, lit } = colorsForDraw();
  const broken = new Set(attempt.broken);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`, `  <title>Qontext Shape Pack: ${A.set.name}</title>`];
  for (let i = 0; i < A.n; i++) {
    const a = tips[2 * i];
    const b = tips[2 * i + 1];
    out.push(`  <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#8a899b" stroke-opacity="0.3"/>`);
  }
  A.bases.forEach((basis, k) => {
    const color = broken.has(k) ? '#b3261e' : cols[k % cols.length];
    for (let x = 0; x < basis.length; x++) {
      for (let y = x + 1; y < basis.length; y++) {
        const p = tip(basis[x]);
        const q = tip(basis[y]);
        out.push(`  <line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}" stroke="${color}" stroke-width="${broken.has(k) ? 3 : 1.6}"${broken.has(k) ? ' stroke-dasharray="7 5"' : ''}/>`);
      }
    }
  });
  for (const t of tips) {
    const on = attempt.coloring[t.i] === 1;
    out.push(`  <circle cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" r="${on ? 7 : 4}" fill="${on ? lit : '#8a899b'}"/>`);
  }
  out.push('</svg>');
  return out.join('\n') + '\n';
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
  $('shapeName').textContent = `${A.set.name} · ${A.dim}D · ${A.set.year}`;
  $('shapeN').textContent = A.n;
  $('shapeB').textContent = A.bases.length;
  $('shapeP').textContent = A.pairs.length;
  $('shapeKs').textContent = ks.coloring ? 'exists' : 'impossible';
  $('shapeBest').textContent = `${attempt.satisfied} of ${A.bases.length} sets`;
  $('yuohCard').hidden = A.set.id !== 'yuoh13';
  $('shapeTry').disabled = !!ks.coloring;
  const { cols, lit } = colorsForDraw();
  $('shapeKey').innerHTML =
    `<span><i style="background:${lit}"></i>lit direction</span>` +
    '<span><i style="background:var(--ink-2)"></i>unlit direction</span>' +
    `<span><i style="background:${cols[0]}"></i>complete perpendicular set</span>` +
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
