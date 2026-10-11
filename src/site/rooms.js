// The nine rooms. Each exhibit runs on the real engine and reacts to the visitor's world and to scrolling.

import {
  GRID, CONTEXTS, opLabel, rowValue, colValue, classicalCheck, tileColor, harmony, oklch, HARMONY_NAMES,
  interfere, kcbsProbs, kcbsSum, pentaColors, KCBS_QUANTUM_MAX, KCBS_CLASSICAL_MAX, samplePair, assetAccent,
  SETTING_KEYS, chshValue, winRate, mulberry32, hashSeed, freshSeed, SHAPE_SETS, analyzeShape, findKsColoring,
  bestAttempt, examplePool, poolSummary, canonicalShots, relativeLuminance, collapseSeed, makeState, measureAll,
  normalizeHex,
} from '../engine/index.js';
import { drawShape } from '../shared/shape-render.js';
import { $, $$, esc, reducedMotion } from '../app/dom.js';
import { site, onWorld, tileOf } from './world.js';
import { onScroll } from './scroll.js';

const sgn = (v) => (v > 0 ? '+1' : '−1');
const inkOn = (col) => (relativeLuminance(col.lin) > 0.28 ? '#16173a' : '#ffffff');
const ROOM_TILES = { janus: 'r1c1', dare: 'r1c2', wheel: 'r1c3', fringe: 'r2c1', pentacle: 'r2c2', spooky: 'r2c3', unpaintables: 'r3c1', notary: 'r3c2', observer: 'r3c3' };

/* ---------- strips and room labels ---------- */
function initStrips() {
  for (const [room, tile] of Object.entries(ROOM_TILES)) {
    const article = $(`room-${room}`);
    const strip = article.querySelector('[data-strip]');
    let html = '';
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) html += `<i class="q" data-q="r${r}c${c}"></i>`;
    strip.innerHTML = html;
    strip.setAttribute('aria-hidden', 'true');
    const [r, c] = tileOf(tile);
    const ctx = article.dataset.qContext === 'col' ? 'columns' : 'rows';
    article.querySelector('[data-meta]').textContent = `Room ${opLabel(GRID[r][c])} on the floor plan. This room reads the grid by ${ctx}; the strip above shows all nine tiles as it sees them.`;
  }
}

/* ---------- Janus ---------- */
const janus = { mode: 'auto', reading: 'rows', out: null, round: 0 };

function janusPaint(animate) {
  const pal = site.palette;
  const out = janus.out || site.result.outcomes;
  $$('#jgrid .jtile').forEach((el, k) => {
    const r = Math.floor(k / 3);
    const c = k % 3;
    const v = janus.reading === 'rows' ? rowValue(out, r, c) : colValue(out, r, c);
    const col = tileColor(pal, r, c, v);
    const apply = () => {
      el.style.background = col.hex;
      el.style.color = inkOn(col);
      el.querySelector('small').textContent = `${janus.reading === 'rows' ? 'row' : 'column'} ${sgn(v)}`;
    };
    if (animate && !reducedMotion()) {
      el.classList.remove('flipping');
      void el.offsetWidth;
      setTimeout(() => el.classList.add('flipping'), k * 45);
      setTimeout(apply, k * 45 + 280);
    } else apply();
  });
  const changes = [0, 1, 2].reduce((n, r) => n + [0, 1, 2].filter((c) => rowValue(out, r, c) !== colValue(out, r, c)).length, 0);
  $('jCap').textContent = `Reading by ${janus.reading}. ${changes} of 9 tiles change color when the reading changes.${janus.mode === 'auto' ? ' Keep scrolling to flip the reading.' : ''}`;
}

function initJanus() {
  $('jgrid').innerHTML = GRID.flat().map((p) => `<div class="jtile"><span>${esc(opLabel(p))}<small></small></span></div>`).join('');
  for (const b of $$('[data-jread]')) {
    b.addEventListener('click', () => {
      janus.mode = b.dataset.jread;
      $$('[data-jread]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (janus.mode !== 'auto' && janus.mode !== janus.reading) {
        janus.reading = janus.mode;
        janusPaint(true);
      } else janusPaint(false);
    });
  }
  $('jMeasure').addEventListener('click', () => {
    janus.round++;
    janus.out = measureAll(makeState('random', 7), mulberry32(collapseSeed(site.seed, 7, 1 + janus.round, 0)));
    janusPaint(true);
  });
  onScroll($('room-janus'), (p) => {
    if (janus.mode !== 'auto') return;
    const next = p < 0.52 ? 'rows' : 'cols';
    if (next !== janus.reading) {
      janus.reading = next;
      janusPaint(true);
    }
  });
}

/* ---------- Mermin's Dare ---------- */
const dare = { values: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], quantum: false };

function darePaint() {
  const pal = site.palette;
  const out = site.result.outcomes;
  $$('#dgrid button').forEach((b, k) => {
    const r = Math.floor(k / 3);
    const c = k % 3;
    const label = opLabel(GRID[r][c]);
    if (dare.quantum) {
      const rv = rowValue(out, r, c);
      const cv = colValue(out, r, c);
      const a = tileColor(pal, r, c, rv).hex;
      const bb = tileColor(pal, r, c, cv).hex;
      b.className = 'q';
      b.style.background = `linear-gradient(135deg, ${a} 0 50%, ${bb} 50% 100%)`;
      b.innerHTML = `${sgn(rv)}/${sgn(cv)}<small>${esc(label)}</small>`;
      b.setAttribute('aria-label', `${label}: row reading ${sgn(rv)}, column reading ${sgn(cv)}`);
    } else {
      const v = dare.values[r][c];
      b.className = v < 0 ? 'neg' : '';
      b.style.background = '';
      b.innerHTML = `${sgn(v)}<small>${esc(label)}</small>`;
      b.setAttribute('aria-label', `${label}, value ${v > 0 ? 'plus one' : 'minus one'}. Press to flip.`);
    }
  });
  let held;
  let rules;
  if (dare.quantum) {
    rules = CONTEXTS.map((ctx) => {
      const [a, b, c] = out[ctx.id];
      return { id: ctx.id, product: a * b * c, required: ctx.sign, ok: a * b * c === ctx.sign };
    });
    held = rules.filter((x) => x.ok).length;
    $('dVerdict').textContent = `${held} of 6. Each tile was read in its own context.`;
  } else {
    const res = classicalCheck(dare.values);
    rules = res.perContext;
    held = res.satisfied;
    $('dVerdict').textContent = held === 5 ? '5 of 6. That is the ceiling.' : `${held} of 6 rules hold`;
  }
  $('dRules').innerHTML = rules.map((x) => `<span>${x.id} needs ${sgn(x.required)}<b class="${x.ok ? 'yes' : 'nope'}">${sgn(x.product)}</b></span>`).join('');
}

function initDare() {
  $('dgrid').innerHTML = new Array(9).fill('<button type="button"></button>').join('');
  $('dgrid').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (dare.quantum) dare.quantum = false;
    else {
      const k = $$('#dgrid button').indexOf(b);
      dare.values[Math.floor(k / 3)][k % 3] *= -1;
    }
    darePaint();
  });
  $('dQuantum').addEventListener('click', () => {
    dare.quantum = true;
    darePaint();
  });
  $('dReset').addEventListener('click', () => {
    dare.values = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
    dare.quantum = false;
    darePaint();
  });
}

/* ---------- Unity Wheel ---------- */
const wheel = { d: 3, turn: 0 };

function arc(r0, r1, a0, a1) {
  const p = (r, a) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  return `M${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
}

function wheelRing() {
  const pal = site.palette;
  let s = '<g id="ring">';
  for (let k = 0; k < 72; k++) {
    const a0 = (k * 5 * Math.PI) / 180;
    const a1 = ((k + 1) * 5 + 0.4) * (Math.PI / 180);
    s += `<path d="${arc(70, 100, a0, a1)}" fill="${oklch(pal.L, Math.max(0.1, pal.C), k * 5 + 2.5).hex}"/>`;
  }
  s += '</g><g id="wheelPts"></g>';
  $('wheelSvg').innerHTML = s;
}

function wheelPaint() {
  const pal = { ...site.palette, d: wheel.d, base: site.palette.base + wheel.turn };
  const cols = harmony(pal);
  const pts = cols.map((c) => {
    const a = (c.h * Math.PI) / 180;
    return [85 * Math.sin(a), -85 * Math.cos(a)];
  });
  const poly = pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  $('wheelPts').innerHTML =
    `<polygon points="${poly}" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-linejoin="round"/>` +
    pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="10" fill="${cols[i].hex}" stroke="var(--sheet)" stroke-width="4"/>`).join('');
  $('wheelDVal').textContent = wheel.d;
  $('wheelCap').textContent = `${HARMONY_NAMES[wheel.d]} harmony. Base phase ${Math.round(((pal.base % 360) + 360) % 360)}°, turned ${Math.round(wheel.turn)}° by your scrolling.`;
  $('wheelChips').innerHTML = cols.map((c, k) => `<div class="chip"><i style="background:${c.hex}"></i><span>${c.hex}<br>phase ${k}/${wheel.d}</span></div>`).join('');
}

function initWheel() {
  $('wheelD').addEventListener('input', (e) => {
    wheel.d = Number(e.target.value);
    wheelPaint();
  });
  onScroll($('room-wheel'), (p) => {
    const turn = reducedMotion() ? 0 : p * 240;
    if (Math.abs(turn - wheel.turn) < 0.6) return;
    wheel.turn = turn;
    wheelPaint();
  });
}

/* ---------- Fringe ---------- */
const fringe = { phi: 0, touched: false };

function fringePaint() {
  const a = $('fA').value;
  const b = $('fB').value;
  const stops = [];
  for (let i = 0; i <= 36; i++) stops.push(`${interfere(a, b, i * 10).port1.hex} ${((i / 36) * 100).toFixed(1)}%`);
  $('band').style.background = `linear-gradient(90deg, ${stops.join(',')})`;
  fringeNeedle();
}

function fringeNeedle() {
  const a = $('fA').value;
  const b = $('fB').value;
  const r = interfere(a, b, fringe.phi);
  $('needle').style.left = `calc(${(fringe.phi / 360) * 100}% - 1.5px)`;
  $('band').setAttribute('aria-valuenow', String(Math.round(fringe.phi)));
  $('port1').style.background = r.port1.hex;
  $('port2').style.background = r.port2.hex;
  $('port1t').textContent = `Port 1, ${Math.round(r.share1 * 100)}% of the energy`;
  $('port2t').textContent = `Port 2, ${Math.round((1 - r.share1) * 100)}%`;
  $('fEnergy').textContent = `Phase ${Math.round(fringe.phi)}°. Energy in ${r.energyIn.toFixed(4)}, out ${r.energyOut.toFixed(4)}.`;
}

function initFringe() {
  const band = $('band');
  const setFrom = (e) => {
    const r = band.getBoundingClientRect();
    fringe.phi = Math.max(0, Math.min(360, ((e.clientX - r.left) / r.width) * 360));
    fringe.touched = true;
    fringeNeedle();
  };
  band.addEventListener('pointerdown', (e) => {
    band.setPointerCapture(e.pointerId);
    setFrom(e);
  });
  band.addEventListener('pointermove', (e) => {
    if (e.buttons || e.pointerType === 'mouse') setFrom(e);
  });
  band.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 30 : 5;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') fringe.phi = Math.min(360, fringe.phi + step);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') fringe.phi = Math.max(0, fringe.phi - step);
    else return;
    e.preventDefault();
    fringe.touched = true;
    fringeNeedle();
  });
  $('fA').addEventListener('input', fringePaint);
  $('fB').addEventListener('input', fringePaint);
  onScroll($('room-fringe'), (p) => {
    if (fringe.touched || reducedMotion()) return;
    fringe.phi = Math.max(0, Math.min(360, (p - 0.2) * 600));
    fringeNeedle();
  });
}

/* ---------- Pentacle ---------- */
const penta = { draw: 1, tilt: 0 };

function pentaPaint() {
  const probs = kcbsProbs(penta.tilt, 0);
  const cols = pentaColors(site.palette, probs);
  const pos = [0, 1, 2, 3, 4].map((j) => {
    const a = ((-90 + 144 * j) * Math.PI) / 180;
    return [150 + 112 * Math.cos(a), 156 + 112 * Math.sin(a)];
  });
  const len = Math.hypot(pos[0][0] - pos[1][0], pos[0][1] - pos[1][1]);
  let s = '<circle cx="150" cy="156" r="112" fill="none" stroke="var(--rule)"/>';
  for (let j = 0; j < 5; j++) {
    const a = pos[j];
    const b = pos[(j + 1) % 5];
    const shown = Math.max(0, Math.min(1, penta.draw * 5 - j));
    s += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="var(--ink)" stroke-width="1.6" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${(len * (1 - shown)).toFixed(1)}"/>`;
  }
  for (let j = 0; j < 5; j++) {
    const a = pos[j];
    const grow = Math.max(0, Math.min(1, penta.draw * 5 - j + 0.4));
    const r = (12 + 30 * probs[j]) * grow;
    s += `<circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="${r.toFixed(1)}" fill="${cols[j].hex}" stroke="var(--sheet)" stroke-width="3"/>`;
    if (grow > 0.9) s += `<text x="${a[0].toFixed(1)}" y="${(a[1] + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-family="IBM Plex Mono, monospace" fill="${inkOn(cols[j])}">${probs[j].toFixed(2)}</text>`;
  }
  $('pentaSvg').innerHTML = s;
  const sum = kcbsSum(probs);
  $('pentaSum').textContent = sum.toFixed(3);
  $('pentaFill').style.width = `${(sum / KCBS_QUANTUM_MAX) * 100}%`;
  $('pentaTiltVal').textContent = `${penta.tilt}°`;
}

function initPenta() {
  $('pentaBound').style.left = `${(KCBS_CLASSICAL_MAX / KCBS_QUANTUM_MAX) * 100}%`;
  $('pentaTilt').addEventListener('input', (e) => {
    penta.tilt = Number(e.target.value);
    pentaPaint();
  });
  onScroll($('room-pentacle'), (p) => {
    const d = reducedMotion() ? 1 : Math.max(0, Math.min(1, (p - 0.12) / 0.38));
    if (Math.abs(d - penta.draw) < 0.01) return;
    penta.draw = d;
    pentaPaint();
  });
}

/* ---------- Spooky Pair ---------- */
const spooky = { rng: mulberry32(freshSeed()), shots: { a0b0: [], a0b1: [], a1b0: [], a1b1: [] }, last: null };

function spookyThread() {
  const box = $('spooky').getBoundingClientRect();
  const a = $('assetA').getBoundingClientRect();
  const b = $('assetB').getBoundingClientRect();
  const x1 = a.left + a.width / 2 - box.left;
  const y1 = a.top + a.height / 2 - box.top;
  const x2 = b.left + b.width / 2 - box.left;
  const y2 = b.top + b.height / 2 - box.top;
  const mx = (x1 + x2) / 2;
  $('thread').querySelector('path').setAttribute('d', `M${x1} ${y1} C ${mx} ${y1 - 60}, ${mx} ${y2 + 60}, ${x2} ${y2}`);
}

function paintAsset(prefix, outcome, style, dark) {
  const acc = assetAccent(site.palette, outcome, style, dark);
  $(`${prefix}Bar`).style.background = acc.hex;
  $(`${prefix}Cta`).style.background = acc.hex;
  $(`${prefix}Cta`).style.color = inkOn(acc);
  $(`${prefix}Out`).textContent = `${style ? 'Bold' : 'Calm'}, ${sgn(outcome)}`;
}

function spookyTally() {
  const all = Object.values(spooky.shots).flat();
  const matched = all.filter(([a, b]) => a === b).length;
  const have = SETTING_KEYS.every((k) => spooky.shots[k].length >= 5);
  let S = null;
  if (have) {
    const E = {};
    for (const k of SETTING_KEYS) E[k] = spooky.shots[k].reduce((s, [a, b]) => s + a * b, 0) / spooky.shots[k].length;
    S = chshValue(E);
  }
  $('tally').innerHTML =
    `<div>Pairs measured<b>${all.length}</b></div>` +
    `<div>Matched<b>${all.length ? Math.round((matched / all.length) * 100) : 0}%</b></div>` +
    `<div>CHSH so far<b>${S === null ? '-' : S.toFixed(2)}</b></div>` +
    `<div>Game win rate<b>${S === null ? '-' : `${Math.round(winRate(S) * 100)}%`}</b></div>`;
  const f5 = document.getElementById('f5');
  if (f5) f5.textContent = S === null ? 'Measure some pairs' : `CHSH ${S.toFixed(2)} vs classical 2`;
}

function repaintPair() {
  if (!spooky.last) return;
  const { x, y, out } = spooky.last;
  paintAsset('a', out[0], x, false);
  paintAsset('b', out[1], y, true);
}

function measurePair(animate = true) {
  const x = Number($('aStyle').value);
  const y = Number($('bStyle').value);
  const out = samplePair(x, y, spooky.rng);
  spooky.shots[SETTING_KEYS[x * 2 + y]].push(out);
  spooky.last = { x, y, out };
  repaintPair();
  if (animate && !reducedMotion()) {
    for (const id of ['assetA', 'assetB']) {
      const el = $(id);
      el.classList.remove('zap');
      void el.offsetWidth;
      el.classList.add('zap');
    }
  }
}

function initSpooky() {
  $('pairBtn').addEventListener('click', () => {
    measurePair();
    spookyTally();
  });
  $('pairMany').addEventListener('click', () => {
    for (let i = 0; i < 500; i++) {
      const x = spooky.rng() < 0.5 ? 0 : 1;
      const y = spooky.rng() < 0.5 ? 0 : 1;
      spooky.shots[SETTING_KEYS[x * 2 + y]].push(samplePair(x, y, spooky.rng));
    }
    measurePair();
    spookyTally();
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(spookyThread).observe($('spooky'));
  spookyThread();
  measurePair(false);
  spookyTally();
}

/* ---------- Unpaintables ---------- */
const unp = { id: 'peres33', A: null, ks: null, attempt: null, yaw: 0.6, drag: 0, pitch: -0.4, w: 0.3, visible: false, raf: null, cache: {} };

function unpLoad() {
  if (!unp.cache[unp.id]) {
    const A = analyzeShape(SHAPE_SETS[unp.id]);
    unp.cache[unp.id] = { A, ks: findKsColoring(A) };
  }
  unp.A = unp.cache[unp.id].A;
  unp.ks = unp.cache[unp.id].ks;
  unp.attempt = unp.ks.coloring ? { coloring: unp.ks.coloring, broken: [], satisfied: unp.A.bases.length } : bestAttempt(unp.A, hashSeed(site.seed, unp.A.n), 300);
  const A = unp.A;
  $('uFacts').innerHTML =
    `<div><span>Directions</span><b>${A.n}</b></div><div><span>Perpendicular sets</span><b>${A.bases.length}</b></div>` +
    `<div><span>Classical coloring</span><b>${unp.ks.coloring ? 'exists' : 'impossible'}</b></div>` +
    `<div><span>Best attempt</span><b>${unp.attempt.satisfied} of ${A.bases.length}</b></div>`;
  $('uCap').textContent = unp.ks.coloring
    ? 'Yu-Oh 13 can be colored, and the coloring is shown. It breaks a different rule: every quantum state scores 25/3 on its inequality, above the classical 8.'
    : `No coloring exists; the computer searched ${unp.ks.nodes} branches to prove it. The dashed set is where this attempt breaks. Scroll or drag to turn the shape.`;
}

function unpDraw(time = 0) {
  const cv = $('uCanvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = Math.round((cv.clientWidth || 320) * dpr);
  if (cv.width !== size) {
    cv.width = size;
    cv.height = size;
  }
  const pal = site.palette;
  const sets = harmony({ ...pal, L: Math.min(0.72, Math.max(0.55, pal.L)), C: Math.max(0.13, pal.C) }).map((c) => c.hex);
  const styles = getComputedStyle(document.documentElement);
  drawShape(cv.getContext('2d'), unp.A, unp.attempt, {
    size,
    dpr,
    view: { yaw: unp.yaw + unp.drag, pitch: unp.pitch, w: unp.w },
    colors: { sets, lit: oklch(0.62, 0.2, pal.base).hex, unlit: styles.getPropertyValue('--ink-2').trim() || '#4b4e7c', broken: styles.getPropertyValue('--no').trim() || '#b4232c', halo: styles.getPropertyValue('--sheet').trim() || '#fff' },
    pulse: reducedMotion() ? 0.5 : 0.5 + 0.5 * Math.sin(time / 260),
  });
}

function unpLoop(t) {
  unpDraw(t);
  unp.raf = unp.visible && !reducedMotion() ? requestAnimationFrame(unpLoop) : null;
}

function initUnpaintables() {
  for (const b of $$('[data-uset]')) {
    b.addEventListener('click', () => {
      unp.id = b.dataset.uset;
      $$('[data-uset]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      unpLoad();
      unpDraw();
    });
  }
  const cv = $('uCanvas');
  let start = null;
  cv.addEventListener('pointerdown', (e) => {
    start = e.clientX - unp.drag * 120;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (start === null) return;
    unp.drag = (e.clientX - start) / 120;
    if (!unp.raf) unpDraw();
  });
  cv.addEventListener('pointerup', () => (start = null));
  onScroll($('room-unpaintables'), (p) => {
    unp.yaw = 0.4 + p * Math.PI * 2;
    unp.w = 0.2 + p * 1.6;
    if (!unp.raf) unpDraw();
  });
  new IntersectionObserver((es) => {
    unp.visible = es[0].isIntersecting;
    if (unp.visible && !unp.raf && !reducedMotion()) unp.raf = requestAnimationFrame(unpLoop);
  }).observe(cv);
  unpLoad();
  unpDraw();
}

/* ---------- Notary ---------- */
let sealText = '';
let sealTyped = false;

async function buildSeal() {
  const pool = examplePool({ seed: 7 });
  const s = poolSummary(pool);
  let hash = 'unavailable in this browser';
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalShots(pool)));
    hash = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    /* hashing unavailable */
  }
  sealText = [
    'QONTEXT NOTARY SEAL',
    `backend        ${pool.backend}`,
    'hardware       no, simulated example',
    `shots          ${s.totalShots}`,
    `mermin score   ${s.mermin.total.toFixed(3)}   classical max 4`,
    `chsh value     ${s.chsh.S.toFixed(3)}   classical max 2`,
    `sha-256        ${hash}`,
  ].join('\n');
}

function typeSeal() {
  if (sealTyped || !sealText) return;
  sealTyped = true;
  const el = $('seal');
  if (reducedMotion()) {
    el.textContent = sealText;
    return;
  }
  let i = 0;
  el.classList.add('caret');
  const tick = () => {
    i = Math.min(sealText.length, i + 6);
    el.textContent = sealText.slice(0, i);
    if (i < sealText.length) requestAnimationFrame(tick);
    else el.classList.remove('caret');
  };
  tick();
}

function initNotary() {
  buildSeal().then(() => {
    new IntersectionObserver((es) => es[0].isIntersecting && typeSeal(), { threshold: 0.3 }).observe($('seal'));
  });
}

/* ---------- Observer ---------- */
function observerPaint() {
  $('obsBase').textContent = String(site.palette.base);
  const t = site.result.tiles;
  const vars = [
    ['--q-harmony-1', site.result.harmony[0]],
    ['--q-harmony-2', site.result.harmony[1]],
    ['--q-r1c1-row', t.r1c1.row],
    ['--q-r1c1-col', t.r1c1.col],
    ['--q-r2c3-row', t.r2c3.row],
    ['--q-r3c3-col', t.r3c3.col],
  ];
  $('obsVars').innerHTML = vars.map(([k, v]) => `<div><i style="background:${v}"></i>${k}: ${v}</div>`).join('');
}

/* ---------- world changes ---------- */
function onWorldChange() {
  janus.out = null;
  janusPaint(true);
  darePaint();
  wheelRing();
  wheelPaint();
  const h = site.result.harmony;
  $('fA').value = normalizeHex(h[0]);
  $('fB').value = normalizeHex(h[1]);
  fringePaint();
  pentaPaint();
  repaintPair();
  unpLoad();
  unpDraw();
  observerPaint();
}

export function initRooms() {
  initStrips();
  initJanus();
  initDare();
  initWheel();
  initFringe();
  initPenta();
  initSpooky();
  initUnpaintables();
  initNotary();
  onWorldChange();
  onWorld((kind) => kind === 'world' && onWorldChange());
}
