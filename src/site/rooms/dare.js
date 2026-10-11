// Mermin's Dare: try to satisfy all six rules with fixed values. Five is the ceiling; quantum gets six.

import { GRID, CONTEXTS, opLabel, rowValue, colValue, classicalCheck, tileColor } from '../../engine/index.js';
import { $, $$ } from '../../app/dom.js';
import { h, sgn } from '../lib.js';
import { site } from '../world.js';

const fresh = () => [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
const state = { values: fresh(), quantum: false };

function paint() {
  const out = site.result.outcomes;
  $$('#dgrid button').forEach((b, k) => {
    const r = Math.floor(k / 3);
    const c = k % 3;
    const label = opLabel(GRID[r][c]);
    if (state.quantum) {
      const rv = rowValue(out, r, c);
      const cv = colValue(out, r, c);
      b.className = 'q-split';
      b.style.background = `linear-gradient(135deg, ${tileColor(site.palette, r, c, rv).hex} 0 50%, ${tileColor(site.palette, r, c, cv).hex} 50% 100%)`;
      // The visible text is the name (so voice control can say it); the hidden part explains it.
      b.replaceChildren(`${sgn(rv)}/${sgn(cv)}`, h('small', {}, label), h('span', { class: 'sr-only' }, ': row reading, then column reading'));
    } else {
      const v = state.values[r][c];
      b.className = v < 0 ? 'neg' : '';
      b.style.background = '';
      b.replaceChildren(sgn(v), h('small', {}, label), h('span', { class: 'sr-only' }, ', press to flip'));
    }
  });
  let rules;
  if (state.quantum) {
    rules = CONTEXTS.map((ctx) => {
      const [a, b, c] = out[ctx.id];
      return { id: ctx.id, product: a * b * c, required: ctx.sign, ok: a * b * c === ctx.sign };
    });
    $('dVerdict').textContent = `${rules.filter((x) => x.ok).length} of 6. Each tile was read in its own context.`;
  } else {
    const res = classicalCheck(state.values);
    rules = res.perContext;
    $('dVerdict').textContent = res.satisfied === 5 ? '5 of 6. That is the ceiling.' : `${res.satisfied} of 6 rules hold`;
  }
  $('dRules').replaceChildren(...rules.map((x) => h('span', {}, `${x.id} needs ${sgn(x.required)}`, h('b', { class: x.ok ? 'yes' : 'nope' }, sgn(x.product)))));
}

export default {
  id: 'dare',
  init() {
    $('dgrid').replaceChildren(...Array.from({ length: 9 }, () => h('button', { type: 'button' })));
    $('dgrid').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (state.quantum) state.quantum = false;
      else {
        const k = $$('#dgrid button').indexOf(b);
        state.values[Math.floor(k / 3)][k % 3] *= -1;
      }
      paint();
    });
    $('dQuantum').addEventListener('click', () => {
      state.quantum = true;
      paint();
    });
    $('dReset').addEventListener('click', () => {
      state.values = fresh();
      state.quantum = false;
      paint();
    });
  },
  paint,
};
