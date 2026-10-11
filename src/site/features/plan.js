// The floor plan is a Mermin-Peres square: each room is an observable, each row and column a context.
// Pressing a row or column header reads the map that way.

import { GRID, opLabel } from '../../engine/index.js';
import { $, $$ } from '../../app/dom.js';
import { h } from '../lib.js';
import { tileOf } from '../world.js';
import { ROOMS } from '../rooms/index.js';

const header = (read, kind) => h('button', { type: 'button', class: 'hdr', 'data-read': read, 'aria-pressed': 'false' }, h('span', {}, h('b', {}, read), kind));

export function initPlan() {
  const plan = $('plan');
  const parts = [h('div', { 'aria-hidden': 'true' })];
  for (let c = 1; c <= 3; c++) parts.push(header(`C${c}`, 'column'));
  ROOMS.forEach((room, k) => {
    const r = Math.floor(k / 3);
    const c = k % 3;
    if (c === 0) parts.push(header(`R${r + 1}`, 'row'));
    parts.push(
      h(
        'div',
        { class: 'cellwrap', 'data-cell': room.tile },
        h('i', { class: 'tri row q', 'data-q': room.tile, 'data-q-ctx': 'row' }),
        h('i', { class: 'tri col q', 'data-q': room.tile, 'data-q-ctx': 'col' }),
        h('a', { class: 'cell', href: `#room-${room.id}` }, h('span', { class: 'name' }, room.name), h('span', { class: 'what' }, `${room.what}. Observable ${opLabel(GRID[r][c])}.`)),
      ),
    );
  });
  plan.replaceChildren(...parts);

  let active = null;
  plan.addEventListener('click', (e) => {
    const hdr = e.target.closest('.hdr');
    if (!hdr) return;
    active = active === hdr.dataset.read ? null : hdr.dataset.read;
    for (const x of $$('.hdr', plan)) x.setAttribute('aria-pressed', String(x.dataset.read === active));
    for (const w of $$('.cellwrap', plan)) {
      const [r, c] = tileOf(w.dataset.cell);
      const inside = !!active && (active[0] === 'R' ? r === Number(active[1]) - 1 : c === Number(active[1]) - 1);
      w.classList.toggle('dim', !!active && !inside);
      w.classList.toggle('full-row', inside && active[0] === 'R');
      w.classList.toggle('full-col', inside && active[0] === 'C');
    }
  });
}
