// Pentacle: the KCBS star. The drawing is built once; scrolling only changes dash offsets and radii.

import { kcbsProbs, kcbsSum, pentaColors, KCBS_QUANTUM_MAX, KCBS_CLASSICAL_MAX } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { svg, inkOn, reduced } from '../lib.js';
import { site } from '../world.js';
import { onScroll } from '../scroll.js';

const CX = 150;
const CY = 156;
const R = 112;
const state = { draw: 1, tilt: 0, probs: [], cols: [] };
const pos = [0, 1, 2, 3, 4].map((j) => {
  const a = ((-90 + 144 * j) * Math.PI) / 180;
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
});
const len = Math.hypot(pos[0][0] - pos[1][0], pos[0][1] - pos[1][1]);
let lines = [];
let dots = [];
let labels = [];

function build() {
  lines = pos.map((a, j) => {
    const b = pos[(j + 1) % 5];
    return svg('line', { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1), stroke: 'var(--ink)', 'stroke-width': 1.6, 'stroke-dasharray': len.toFixed(1) });
  });
  dots = pos.map((a) => svg('circle', { cx: a[0].toFixed(1), cy: a[1].toFixed(1), r: 0, stroke: 'var(--sheet)', 'stroke-width': 3 }));
  labels = pos.map((a) => svg('text', { x: a[0].toFixed(1), y: (a[1] + 4).toFixed(1), 'text-anchor': 'middle', 'font-size': 11, 'font-family': 'IBM Plex Mono, monospace' }));
  $('pentaSvg').replaceChildren(svg('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: 'var(--rule)' }), ...lines, ...dots, ...labels);
}

/** Probabilities and colors: changes with the tilt and the world, not with scrolling. */
function values() {
  state.probs = kcbsProbs(state.tilt, 0);
  state.cols = pentaColors(site.palette, state.probs);
  state.probs.forEach((p, j) => {
    dots[j].setAttribute('fill', state.cols[j].hex);
    labels[j].setAttribute('fill', inkOn(state.cols[j]));
    labels[j].textContent = p.toFixed(2);
  });
  const sum = kcbsSum(state.probs);
  $('pentaSum').textContent = sum.toFixed(3);
  $('pentaFill').style.transform = `scaleX(${(sum / KCBS_QUANTUM_MAX).toFixed(4)})`;
  $('pentaTiltVal').textContent = `${state.tilt}°`;
  draw();
}

/** How much of the star is drawn: dash offsets and radii only. */
function draw() {
  for (let j = 0; j < 5; j++) {
    const shown = Math.max(0, Math.min(1, state.draw * 5 - j));
    lines[j].setAttribute('stroke-dashoffset', (len * (1 - shown)).toFixed(1));
    const grow = Math.max(0, Math.min(1, state.draw * 5 - j + 0.4));
    dots[j].setAttribute('r', ((12 + 30 * state.probs[j]) * grow).toFixed(1));
    labels[j].setAttribute('opacity', grow > 0.9 ? '1' : '0');
  }
}

export default {
  id: 'pentacle',
  init(article) {
    build();
    $('pentaBound').style.left = `${(KCBS_CLASSICAL_MAX / KCBS_QUANTUM_MAX) * 100}%`;
    $('pentaTilt').addEventListener('input', (e) => {
      state.tilt = Number(e.target.value);
      values();
    });
    onScroll(article, (p) => {
      const d = reduced() ? 1 : Math.max(0, Math.min(1, (p - 0.12) / 0.38));
      if (Math.abs(d - state.draw) < 0.005) return;
      state.draw = d;
      draw();
    });
  },
  paint: values,
};
