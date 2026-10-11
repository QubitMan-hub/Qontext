// The hero field: a wall of split tiles in superposition. A measurement wave collapses them on arrival,
// your pointer keeps them collapsed where it passes, and away from it they drift back into superposition.

import { tileColor, hexToLin, encode } from '../engine/index.js';
import { $, $$, reducedMotion } from '../app/dom.js';
import { site, onWorld } from './world.js';

const TILE = 30;
const GAP = 2;
const RADIUS = 150;
const DECAY = 6.5;

let canvas;
let ctx;
let tiles = [];
let cols = 0;
let rows = 0;
let dpr = 1;
let pointer = null;
let raf = null;
let visible = true;
let last = 0;
let wave = null;
let paper = [238, 240, 244];

const rgb = (hex) => hexToLin(hex).map((x) => encode(x) * 255);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, alpha = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;

function readPaper() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) paper = rgb(v);
}

function colorTiles() {
  const { palette, result } = site;
  for (const t of tiles) {
    const id = `r${t.r + 1}c${t.c + 1}`;
    t.a = rgb(tileColor(palette, t.r, t.c, 1).hex);
    t.b = rgb(tileColor(palette, t.r, t.c, -1).hex);
    t.m = rgb(result.tiles[id][t.ctx]);
  }
}

function layout() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  cols = Math.ceil(rect.width / TILE) + 1;
  rows = Math.ceil(rect.height / TILE) + 1;
  const old = new Map(tiles.map((t) => [`${t.i},${t.j}`, t.level]));
  tiles = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      tiles.push({
        i, j, r: j % 3, c: i % 3, ctx: (i + j) % 2 ? 'col' : 'row',
        x: i * TILE, y: j * TILE, phase: ((i * 7 + j * 13) % 17) / 17 * Math.PI * 2,
        level: old.get(`${i},${j}`) ?? 0,
      });
    }
  }
  colorTiles();
}

function draw(t, time) {
  const s = (TILE - GAP) * dpr;
  for (const tile of tiles) {
    const x = tile.x * dpr;
    const y = tile.y * dpr;
    const osc = 0.5 + 0.5 * Math.sin(time * 1.4 + tile.phase);
    // Superposed: the two outcomes trade places across the diagonal, washed toward the paper.
    const supA = mix(mix(tile.a, tile.b, osc), paper, 0.42);
    const supB = mix(mix(tile.b, tile.a, osc), paper, 0.42);
    const L = tile.level;
    const upper = mix(supA, tile.m, L);
    const lower = mix(supB, tile.m, L);
    ctx.fillStyle = css(upper, 0.55 + 0.45 * L);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y + s);
    ctx.fill();
    ctx.fillStyle = css(lower, 0.55 + 0.45 * L);
    ctx.beginPath();
    ctx.moveTo(x + s, y);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x, y + s);
    ctx.fill();
  }
}

function step(time) {
  const now = time / 1000;
  const dt = last ? Math.min(0.05, now - last) : 0;
  last = now;
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  for (const t of tiles) {
    const cx = t.x + TILE / 2;
    const cy = t.y + TILE / 2;
    if (wave) {
      const d = Math.hypot(cx - wave.x, cy - wave.y);
      if (d < (now - wave.t0) * wave.speed && !t.waved) {
        t.level = 1;
        t.waved = true;
      }
    }
    if (pointer && Math.hypot(cx - pointer.x, cy - pointer.y) < RADIUS) t.level += (1 - t.level) * Math.min(1, dt * 14);
    else t.level = Math.max(0, t.level - dt / DECAY);
  }
  if (wave && (now - wave.t0) * wave.speed > Math.hypot(W, H)) wave = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(dt, now);
  raf = visible && !document.hidden ? requestAnimationFrame(step) : null;
}

function start() {
  if (!raf && visible && !document.hidden && !reducedMotion()) {
    last = 0;
    raf = requestAnimationFrame(step);
  }
}

function staticFrame() {
  for (const t of tiles) t.level = 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(0, 0);
}

/** A measurement wave from (x, y) in canvas coordinates. */
export function measureWave(x, y) {
  for (const t of tiles) t.waved = false;
  wave = { x, y, t0: performance.now() / 1000, speed: 1100 };
  start();
}

function initHeadline() {
  const words = $$('#heroTitle .w');
  if (reducedMotion()) return;
  words.forEach((w, i) => {
    w.style.setProperty('--wd', '55');
    setTimeout(() => w.style.setProperty('--wd', '100'), 120 + i * 70);
  });
  const hero = $('hero');
  hero.addEventListener('pointermove', (e) => {
    for (const w of words) {
      const r = w.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2)) + Math.abs(e.clientY - (r.top + r.height / 2)) * 0.6;
      w.style.setProperty('--wd', String(Math.round(150 - 70 * Math.min(1, d / 420))));
    }
  });
  hero.addEventListener('pointerleave', () => words.forEach((w) => w.style.setProperty('--wd', '100')));
}

export function initHero() {
  canvas = $('field');
  ctx = canvas.getContext('2d');
  readPaper();
  layout();
  const hero = $('hero');
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  hero.addEventListener('pointermove', (e) => {
    pointer = toCanvas(e);
    $('heroHint').hidden = true;
    start();
  });
  hero.addEventListener('pointerleave', () => {
    pointer = null;
  });
  hero.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    measureWave(p.x, p.y);
  });
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
  }).observe(hero);
  document.addEventListener('visibilitychange', start);
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      layout();
      if (reducedMotion()) staticFrame();
    }).observe(canvas);
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', readPaper);
  onWorld((kind) => {
    if (kind !== 'world') return;
    readPaper();
    colorTiles();
    if (reducedMotion()) staticFrame();
  });
  initHeadline();
  if (reducedMotion()) {
    staticFrame();
    return;
  }
  const r = canvas.getBoundingClientRect();
  measureWave(r.width * 0.3, r.height * 0.45);
}
