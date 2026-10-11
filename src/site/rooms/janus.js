// Janus: one tile, two true colors. The reading flips from rows to columns halfway through the room.

import { GRID, opLabel, rowValue, colValue, tileColor, makeState, measureAll, mulberry32, collapseSeed } from '../../engine/index.js';
import { $, $$ } from '../../app/dom.js';
import { h, inkOn, reduced, sgn } from '../lib.js';
import { site } from '../world.js';
import { onScroll } from '../scroll.js';

const state = { mode: 'auto', reading: 'rows', out: null, round: 0 };

function paint(animate) {
  const out = state.out || site.result.outcomes;
  $$('#jgrid .jtile').forEach((el, k) => {
    const r = Math.floor(k / 3);
    const c = k % 3;
    const v = state.reading === 'rows' ? rowValue(out, r, c) : colValue(out, r, c);
    const col = tileColor(site.palette, r, c, v);
    const apply = () => {
      el.style.background = col.hex;
      el.style.color = inkOn(col);
      el.querySelector('small').textContent = `${state.reading === 'rows' ? 'row' : 'column'} ${sgn(v)}`;
    };
    if (animate && !reduced()) {
      el.classList.remove('flipping');
      void el.offsetWidth;
      setTimeout(() => el.classList.add('flipping'), k * 45);
      setTimeout(apply, k * 45 + 280);
    } else apply();
  });
  let changes = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (rowValue(out, r, c) !== colValue(out, r, c)) changes++;
  $('jCap').textContent = `Reading by ${state.reading}. ${changes} of 9 tiles change color when the reading changes.${state.mode === 'auto' ? ' Keep scrolling to flip the reading.' : ''}`;
}

export default {
  id: 'janus',
  init(article) {
    $('jgrid').replaceChildren(...GRID.flat().map((p) => h('div', { class: 'jtile' }, h('span', {}, opLabel(p), h('small')))));
    for (const b of $$('[data-jread]')) {
      b.addEventListener('click', () => {
        state.mode = b.dataset.jread;
        $$('[data-jread]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        const flip = state.mode !== 'auto' && state.mode !== state.reading;
        if (flip) state.reading = state.mode;
        paint(flip);
      });
    }
    $('jMeasure').addEventListener('click', () => {
      state.round++;
      state.out = measureAll(makeState('random', 7), mulberry32(collapseSeed(site.seed, 7, 1 + state.round, 0)));
      paint(true);
    });
    onScroll(article, (p) => {
      if (state.mode !== 'auto') return;
      const next = p < 0.52 ? 'rows' : 'cols';
      if (next !== state.reading) {
        state.reading = next;
        paint(true);
      }
    });
  },
  paint() {
    state.out = null;
    paint(false);
  },
};
