import { kcbsProbs, kcbsSum, pentaColors, relativeLuminance, KCBS_QUANTUM_MAX, KCBS_CLASSICAL_MAX } from '../../engine/index.js';
import { $ } from '../dom.js';
import { store, palette, setProject } from '../store.js';

export function init() {
  $('tIn').addEventListener('input', (e) => setProject({ tilt: parseFloat(e.target.value) }));
  $('pIn').addEventListener('input', (e) => setProject({ turn: parseFloat(e.target.value) }));
  $('kcbsBound').style.left = `${(KCBS_CLASSICAL_MAX / KCBS_QUANTUM_MAX) * 100}%`;
}

export function render() {
  const { tilt, turn } = store.project;
  $('tIn').value = tilt;
  $('pIn').value = turn;
  $('tVal').textContent = `${Math.round(tilt)}°`;
  $('pVal').textContent = `${Math.round(turn)}°`;
  const probs = kcbsProbs(tilt, turn);
  const sum = kcbsSum(probs);
  const cols = pentaColors(palette(), probs);
  const pos = [0, 1, 2, 3, 4].map((j) => {
    const a = ((-90 + 144 * j) * Math.PI) / 180;
    return [150 + 106 * Math.cos(a), 154 + 106 * Math.sin(a)];
  });
  let svg = '<circle cx="150" cy="154" r="106" fill="none" stroke="var(--rule)" stroke-width="1"/>';
  for (let j = 0; j < 5; j++) {
    const a = pos[j];
    const b = pos[(j + 1) % 5];
    svg += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="var(--ink)" stroke-opacity="0.5" stroke-width="1.2"/>`;
  }
  for (let j = 0; j < 5; j++) {
    const a = pos[j];
    const ink = relativeLuminance(cols[j].lin) > 0.3 ? '#14131c' : '#ffffff';
    svg += `<circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="${(12 + 28 * probs[j]).toFixed(1)}" fill="${cols[j].hex}" stroke="var(--paper)" stroke-width="3"/>`;
    svg += `<text x="${a[0].toFixed(1)}" y="${(a[1] + 4).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="11" fill="${ink}">${probs[j].toFixed(2)}</text>`;
  }
  $('pentaSvg').innerHTML = svg;
  $('kcbsSum').textContent = sum.toFixed(3);
  $('kcbsFill').style.width = `${(sum / KCBS_QUANTUM_MAX) * 100}%`;
  $('kcbsMeter').setAttribute('aria-valuenow', sum.toFixed(3));
  const beyond = sum > KCBS_CLASSICAL_MAX + 1e-9;
  const pill = $('kcbsPill');
  pill.className = `pill ${beyond ? 'good' : 'bad'}`;
  pill.textContent = beyond ? 'Beyond classical' : 'Within classical';
  $('pentaChips').innerHTML = cols
    .map((c, j) => `<div class="chip"><div class="sw" style="background:${c.hex}"></div><div class="meta"><span>${c.hex}</span><span>event ${j + 1}, p ${probs[j].toFixed(2)}</span></div></div>`)
    .join('');
}

export const currentProbs = () => kcbsProbs(store.project.tilt, store.project.turn);
