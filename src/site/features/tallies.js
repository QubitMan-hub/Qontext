// The floor plan's tallies and the footer proof. World facts change per world; the waiting count changes per
// observation, so it is written at most once a frame.

import { $ } from '../../app/dom.js';
import { h, perFrame } from '../lib.js';
import { site, onWorld, worldNumber, proof } from '../world.js';

function paintWorld() {
  const { rules, changing } = proof();
  $('planRules').textContent = `${rules} of 6`;
  $('planDiff').textContent = `${changing} of 9`;
  paintWaiting();
}

function paintWaiting() {
  const { rules, changing } = proof();
  $('planWaiting').textContent = String(site.waiting);
  $('proof').replaceChildren(
    'In world ', h('strong', {}, worldNumber()), ', ',
    h('strong', {}, `${rules} of 6`), ' Mermin-Peres rules hold, ',
    h('strong', {}, `${changing} of 9`), ' tiles change color with context, and ',
    h('strong', {}, site.waiting), ' swatches are still waiting for you to look at them.',
  );
}

export function initTallies() {
  const waiting = perFrame(paintWaiting);
  paintWorld();
  onWorld((kind) => {
    if (kind === 'world') paintWorld();
    else if (kind === 'observe') waiting();
  });
}
