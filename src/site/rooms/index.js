// The nine rooms, in floor-plan order. A room sleeps until a visitor is about to reach it: only then is its
// exhibit built, wired and painted. Strips and labels are cheap, so they exist from the start.

import { GRID, opLabel } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { h, whenNear } from '../lib.js';
import { onWorld, tileOf } from '../world.js';
import janus from './janus.js';
import dare from './dare.js';
import wheel from './wheel.js';
import fringe from './fringe.js';
import pentacle from './pentacle.js';
import spooky from './spooky.js';
import unpaintables from './unpaintables.js';
import notary from './notary.js';
import observer from './observer.js';

/** Room metadata shared by the floor plan, the menu, the Compass and Thresholds. */
export const ROOMS = [
  { id: 'janus', name: 'Janus', what: 'One tile, two true colors', module: janus },
  { id: 'dare', name: "Mermin's Dare", what: 'The puzzle no one can finish', module: dare },
  { id: 'wheel', name: 'Unity Wheel', what: 'Harmony as quantum phase', module: wheel },
  { id: 'fringe', name: 'Fringe', what: 'Mix color like light waves', module: fringe },
  { id: 'pentacle', name: 'Pentacle', what: 'Five colors that never collide', module: pentacle },
  { id: 'spooky', name: 'Spooky Pair', what: 'Two assets, one entangled pair', module: spooky },
  { id: 'unpaintables', name: 'Unpaintables', what: 'Shapes no coloring can finish', module: unpaintables },
  { id: 'notary', name: 'Notary', what: 'Proof it came from a quantum computer', module: notary },
  { id: 'observer', name: 'Observer', what: 'This website runs on it', module: observer },
].map((room, k) => ({ ...room, tile: `r${Math.floor(k / 3) + 1}c${(k % 3) + 1}` }));

const awake = new Set();

function strip(article) {
  const el = article.querySelector('[data-strip]');
  const cells = [];
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) cells.push(h('i', { class: 'q', 'data-q': `r${r}c${c}` }));
  el.replaceChildren(...cells);
  el.setAttribute('aria-hidden', 'true');
}

export function initRooms() {
  for (const room of ROOMS) {
    const article = $(`room-${room.id}`);
    const [r, c] = tileOf(room.tile);
    strip(article);
    const reading = article.dataset.qContext === 'col' ? 'columns' : 'rows';
    article.querySelector('[data-meta]').textContent = `Room ${opLabel(GRID[r][c])} on the floor plan. This room reads the grid by ${reading}; the strip above shows all nine tiles as it sees them.`;
    whenNear(
      article,
      () => {
        room.module.init(article);
        room.module.paint();
        awake.add(room.module);
        article.dataset.ready = '';
      },
      '600px 0px',
    );
  }
  onWorld((kind) => {
    for (const m of awake) {
      if (kind === 'world') m.paint();
      else if (kind === 'theme' && m.theme) m.theme();
    }
  });
}
