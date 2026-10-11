// Firsts, the floor plan's tallies and the footer proof. World facts change per world; the waiting count
// changes per observation, so it is written at most once a frame.

import { rowValue, colValue, guardReport, INKS } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { h, perFrame } from '../lib.js';
import { site, onWorld, worldNumber, proof } from '../world.js';

function firstContextual() {
  const out = site.result.outcomes;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (rowValue(out, r, c) !== colValue(out, r, c)) return `r${r + 1}c${c + 1}`;
  return 'r1c1';
}

function paintWorld() {
  const { rules, changing } = proof();
  $('f1').textContent = `World ${worldNumber()}`;
  const tile = firstContextual();
  const t = site.result.tiles[tile];
  $('f3').replaceChildren(h('i', { style: { background: t.row } }), h('i', { style: { background: t.col } }), h('span', {}, `${tile}: ${t.row} in rooms read by rows, ${t.col} in rooms read by columns`));
  $('f6').textContent = `${rules} of 6`;
  $('planRules').textContent = `${rules} of 6`;
  $('planDiff').textContent = `${changing} of 9`;
  const rep = guardReport(site.palette, INKS.dark);
  $('bouncerLive').textContent = `In your world, dark text reaches at least ${rep.minWcag.toFixed(1)} : 1 on every tile color. Bouncer lets it through.`;
  paintWaiting();
}

function paintWaiting() {
  const { rules, changing } = proof();
  $('f2').textContent = `${site.waiting} swatches still waiting`;
  $('proof').replaceChildren(
    'In world ', h('strong', {}, worldNumber()), ', ',
    h('strong', {}, `${rules} of 6`), ' Mermin-Peres rules hold, ',
    h('strong', {}, `${changing} of 9`), ' tiles change color with context, and ',
    h('strong', {}, site.waiting), ' swatches are still waiting for you to look at them.',
  );
}

export function initFirsts() {
  const waiting = perFrame(paintWaiting);
  paintWorld();
  onWorld((kind) => {
    if (kind === 'world') paintWorld();
    else if (kind === 'observe') waiting();
  });
}
