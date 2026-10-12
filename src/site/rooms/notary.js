// Notary: the provenance seal over the real run on ibm_kingston (typed out the first time it comes into view), and
// worlds drawn from its shots. A drawn world is one real measurement of each of the six contexts, painted in the
// visitor's colors. Hardware noise sometimes breaks a rule; the note names it instead of hiding it.

import { unpackPool, poolSummary, canonicalShots, CONTEXTS, rowValue, colValue, tileColor, freshSeed } from '../../engine/index.js';
import { IBM_RUN } from '../../app/ibm-run.js';
import { $ } from '../../app/dom.js';
import { reduced, whenNear } from '../lib.js';
import { site, onWorld } from '../world.js';

let pool = null;
let shot = null;
const run = () => (pool ||= unpackPool(IBM_RUN));

async function sealText() {
  const p = run();
  const s = poolSummary(p);
  let hash = 'unavailable in this browser';
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalShots(p)));
    hash = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    /* SubtleCrypto needs a secure context; the seal says so instead of failing */
  }
  return [
    'QONTEXT NOTARY SEAL',
    `backend        ${p.backend}`,
    'hardware       yes, IBM Quantum',
    `job            ${p.job_ids.join(', ')}`,
    `measured       ${p.created.slice(0, 10)}`,
    `shots          ${s.totalShots}`,
    `mermin score   ${s.mermin.total.toFixed(3)}   classical max 4`,
    `chsh value     ${s.chsh.S.toFixed(3)}   classical max 2`,
    `sha-256        ${hash}`,
  ].join('\n');
}

function type(el, text) {
  if (reduced()) {
    el.textContent = text;
    return;
  }
  let i = 0;
  el.classList.add('caret');
  const tick = () => {
    i = Math.min(text.length, i + 6);
    el.textContent = text.slice(0, i);
    if (i < text.length) requestAnimationFrame(tick);
    else el.classList.remove('caret');
  };
  tick();
}

const name = (ctx) => `${ctx.id[0] === 'R' ? 'row' : 'column'} ${ctx.id[1]}`;

/** Paints shot `k` of the run: tiles whose two readings differ are split on the diagonal, as everywhere on the site. */
function paint(k) {
  const p = run();
  shot = k;
  const out = {};
  for (const ctx of CONTEXTS) out[ctx.id] = p.contexts[ctx.id][k];
  const grid = $('realGrid');
  let html = '';
  let split = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const a = tileColor(site.palette, r, c, rowValue(out, r, c)).hex;
      const b = tileColor(site.palette, r, c, colValue(out, r, c)).hex;
      if (a !== b) split++;
      html += `<i style="background:${a === b ? a : `linear-gradient(135deg,${a} 0 50%,${b} 50% 100%)`}"></i>`;
    }
  }
  grid.innerHTML = html;
  grid.dataset.shot = String(k);
  const broken = CONTEXTS.filter((ctx) => ctx.sign * out[ctx.id].reduce((x, v) => x * v, 1) !== 1).map(name);
  const held = `${6 - broken.length} of 6 rules held`;
  const why = broken.length ? `: the chip slipped on ${broken.join(' and ')}` : '';
  $('realNote').textContent =
    `Shot ${k + 1} of ${p.shots.toLocaleString('en')} from ${p.backend}. ${held}${why}. ${split} ${split === 1 ? 'tile shows' : 'tiles show'} two colors.`;
  grid.setAttribute('aria-label', `A world from shot ${k + 1} of the ibm_kingston run: ${held}, ${split} tiles with two colors`);
}

export default {
  id: 'notary',
  init() {
    const el = $('seal');
    sealText().then((text) => whenNear(el, () => type(el, text), '0px', 0.3));
    $('realDraw').addEventListener('click', () => paint(freshSeed() % run().shots));
    onWorld((kind) => kind === 'world' && shot !== null && paint(shot));
  },
  paint() {},
};
