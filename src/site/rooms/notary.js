// Notary: a provenance seal over the example pool, typed out the first time it comes into view.

import { examplePool, poolSummary, canonicalShots } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { reduced, whenNear } from '../lib.js';

async function sealText() {
  const pool = examplePool({ seed: 7 });
  const s = poolSummary(pool);
  let hash = 'unavailable in this browser';
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalShots(pool)));
    hash = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    /* SubtleCrypto needs a secure context; the seal says so instead of failing */
  }
  return [
    'QONTEXT NOTARY SEAL',
    `backend        ${pool.backend}`,
    'hardware       no, simulated example',
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

export default {
  id: 'notary',
  init() {
    const el = $('seal');
    sealText().then((text) => whenNear(el, () => type(el, text), '0px', 0.3));
  },
  paint() {},
};
