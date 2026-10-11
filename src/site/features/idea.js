// The idea: Albers' two identical squares, painted from the visitor's world.

import { oklch } from '../../engine/index.js';
import { $, $$ } from '../../app/dom.js';
import { site, onWorld } from '../world.js';

function paint() {
  const b = site.palette.base;
  const core = oklch(0.6, 0.06, b + 90).hex;
  const halves = $$('#albers > div');
  halves[0].style.background = oklch(0.38, 0.12, b).hex;
  halves[1].style.background = oklch(0.88, 0.07, b + 180).hex;
  for (const c of $$('#albers .core')) c.style.background = core;
  $('albersHex').textContent = core;
}

export function initIdea() {
  paint();
  onWorld((kind) => kind === 'world' && paint());
}
