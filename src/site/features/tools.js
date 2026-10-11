// Take it home: the Probe terminal types itself once, and the Walk-By preview shifts like a lenticular print.

import { tileColor, rowValue, colValue } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { h, reduced, whenNear } from '../lib.js';
import { site, onWorld } from '../world.js';
import { onScroll } from '../scroll.js';

const TERM = [
  ['$ ', "pip install './python[ibm]'"],
  ['$ ', 'qontext-probe --noisy'],
  ['', 'Backend: aer simulator (noisy)'],
  ['', '  R1: rule held on  90.0% of 512 shots'],
  ['', '  C3: rule held on  89.5% of 512 shots'],
  ['', 'Mermin score 4.684  (classical max 4, quantum ideal 6)'],
  ['', 'CHSH value   2.547  (classical max 2, quantum max 2.828)'],
  ['', 'Pool written to qontext_pool.json. Load it in Notary.'],
  ['$ ', 'qontext-probe --ibm least_busy'],
];

/** Writes the session line by line: commands are typed, output appears a line at a time. */
function typeTerm(el) {
  el.replaceChildren();
  const animate = !reduced();
  let i = 0;
  const next = () => {
    if (i >= TERM.length) return;
    const [prompt, text] = TERM[i];
    if (i > 0) el.append('\n');
    if (prompt) el.append(h('span', { class: 'p' }, prompt));
    const node = document.createTextNode('');
    el.append(node);
    let ch = 0;
    const tick = () => {
      ch = prompt && animate ? ch + 2 : text.length;
      node.data = text.slice(0, ch);
      if (ch < text.length) setTimeout(tick, 28);
      else {
        i++;
        if (animate) setTimeout(next, prompt ? 420 : 140);
        else next();
      }
    };
    tick();
  };
  next();
}

function paintWalkBy() {
  const out = site.result.outcomes;
  const grid = (view) => {
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(h('i', { style: { background: tileColor(site.palette, r, c, view === 'rows' ? rowValue(out, r, c) : colValue(out, r, c)).hex } }));
    return cells;
  };
  $('wbRows').replaceChildren(...grid('rows'));
  $('wbCols').replaceChildren(...grid('cols'));
}

function initWalkBy() {
  const wb = $('walkby');
  const cols = $('wbCols');
  let shown = -1;
  const set = (f) => {
    const shift = Math.round(Math.max(0, Math.min(1, f)) * 48);
    if (shift === shown) return;
    shown = shift;
    cols.style.opacity = String(Math.max(0, Math.min(1, (f - 0.25) / 0.5)));
    wb.style.setProperty('--shift', `${shift}px`);
  };
  wb.addEventListener('pointermove', (e) => {
    const r = wb.getBoundingClientRect();
    set((e.clientX - r.left) / r.width);
  });
  onScroll(wb, set);
  paintWalkBy();
  onWorld((kind) => kind === 'world' && paintWalkBy());
}

export function initTools() {
  const term = $('term');
  whenNear(term, () => typeTerm(term), '0px', 0.4);
  whenNear($('tools'), initWalkBy, '600px 0px');
}
