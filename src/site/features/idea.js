// The idea: Albers' two identical squares, painted from the visitor's world, and one tile read in two contexts.
// The tile is one whose readings really differ in this world. Every world has an odd number of those, so there is
// always at least one.

import { oklch, contextualTiles, opLabel, GRID } from '../../engine/index.js';
import { $, $$ } from '../../app/dom.js';
import { site, onWorld, tone } from '../world.js';

function pickJanus() {
  const [r, c] = contextualTiles(site.result.outcomes)[0];
  for (const half of $$('#janusBig .half')) {
    half.dataset.q = `r${r + 1}c${c + 1}`;
    tone(half);
  }
  $('janusTile').textContent = opLabel(GRID[r][c]);
}

function paint() {
  const b = site.palette.base;
  const core = oklch(0.6, 0.06, b + 90).hex;
  const halves = $$('#albers > div');
  halves[0].style.background = oklch(0.38, 0.12, b).hex;
  halves[1].style.background = oklch(0.88, 0.07, b + 180).hex;
  for (const c of $$('#albers .core')) c.style.background = core;
  $('albersHex').textContent = core;
  pickJanus();
}

export function initIdea() {
  paint();
  onWorld((kind) => kind === 'world' && paint());
}
