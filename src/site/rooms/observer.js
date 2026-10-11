// Observer: the runtime this page runs on, showing the visitor's live CSS variables.

import { $ } from '../../app/dom.js';
import { h } from '../lib.js';
import { site } from '../world.js';

export default {
  id: 'observer',
  init() {},
  paint() {
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
    $('obsVars').replaceChildren(...vars.map(([k, v]) => h('div', {}, h('i', { style: { background: v } }), `${k}: ${v}`)));
  },
};
