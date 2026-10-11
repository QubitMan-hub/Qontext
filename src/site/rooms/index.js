// The nine rooms, in floor-plan order. A room sleeps until a visitor is about to reach it: only then is its
// exhibit built, wired and painted.

import { $ } from '../../app/dom.js';
import { whenNear } from '../lib.js';
import { onWorld } from '../world.js';
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

export function initRooms() {
  for (const room of ROOMS) {
    const article = $(`room-${room.id}`);
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
