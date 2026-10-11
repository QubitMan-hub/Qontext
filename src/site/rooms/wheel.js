// Unity Wheel: harmony as quantum phase. Scrolling turns the phase; only a transform changes per frame.

import { harmony, oklch, HARMONY_NAMES } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { h, svg, reduced } from '../lib.js';
import { site } from '../world.js';
import { onScroll } from '../scroll.js';

const state = { d: 3, turn: 0, shownStep: null };
let pts = null;

function arc(r0, r1, a0, a1) {
  const p = (r, a) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  return `M${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
}

/** The ring is absolute hue, so it is drawn once per world. The harmony points sit in a group we rotate. */
function build() {
  const pal = site.palette;
  const ring = svg('g', {});
  for (let k = 0; k < 72; k++) {
    ring.append(svg('path', { d: arc(70, 100, (k * 5 * Math.PI) / 180, ((k + 1) * 5 + 0.4) * (Math.PI / 180)), fill: oklch(pal.L, Math.max(0.1, pal.C), k * 5 + 2.5).hex }));
  }
  pts = svg('g', {});
  $('wheelSvg').replaceChildren(ring, pts);
  buildPoints();
}

function buildPoints() {
  const cols = harmony({ ...site.palette, d: state.d });
  const xy = cols.map((c) => [85 * Math.sin((c.h * Math.PI) / 180), -85 * Math.cos((c.h * Math.PI) / 180)]);
  pts.replaceChildren(
    svg('polygon', { points: xy.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' '), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
    ...xy.map((p, i) => svg('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 10, fill: cols[i].hex, stroke: 'var(--sheet)', 'stroke-width': 4 })),
  );
  state.shownStep = null;
  turn(state.turn);
}

/** Rotates the points; the chips and caption follow in 10 degree steps, so text changes rarely. */
function turn(deg) {
  state.turn = deg;
  pts.setAttribute('transform', `rotate(${deg.toFixed(1)})`);
  const step = Math.round(deg / 10);
  if (step === state.shownStep) return;
  state.shownStep = step;
  const pal = { ...site.palette, d: state.d, base: site.palette.base + step * 10 };
  const cols = harmony(pal);
  pts.querySelectorAll('circle').forEach((c, i) => c.setAttribute('fill', cols[i].hex));
  $('wheelDVal').textContent = state.d;
  $('wheelCap').textContent = `${HARMONY_NAMES[state.d]} harmony. Base phase ${Math.round(((pal.base % 360) + 360) % 360)}°, turned ${step * 10}° by your scrolling.`;
  $('wheelChips').replaceChildren(...cols.map((c, k) => h('div', { class: 'chip' }, h('i', { style: { background: c.hex } }), h('span', {}, c.hex, h('br'), `phase ${k}/${state.d}`))));
}

export default {
  id: 'wheel',
  init(article) {
    $('wheelD').addEventListener('input', (e) => {
      state.d = Number(e.target.value);
      buildPoints();
    });
    onScroll(article, (p) => {
      if (!pts || reduced()) return;
      const deg = p * 240;
      if (Math.abs(deg - state.turn) >= 0.5) turn(deg);
    });
  },
  paint() {
    build();
  },
};
