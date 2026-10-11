// Spooky Pair: the light and dark halves of the wall share one entangled pair. Their accents are measurement
// outcomes, and the running CHSH value shows they agree more often than any two independent rules could.

import { samplePair, assetAccent, legibleOn, SETTING_KEYS, chshValue, winRate, mulberry32, freshSeed } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { h, reduced, sgn } from '../lib.js';
import { site } from '../world.js';

const state = { rng: mulberry32(freshSeed()), shots: { a0b0: [], a0b1: [], a1b0: [], a1b1: [] }, last: null };

/** The thread joins the two accent bars across the seam. Measured only when the layout changes, never on scroll. */
function thread() {
  const box = $('spooky').getBoundingClientRect();
  const a = $('aBar').getBoundingClientRect();
  const b = $('bBar').getBoundingClientRect();
  const x1 = a.right - box.left;
  const y1 = a.top + a.height / 2 - box.top;
  const x2 = b.left - box.left;
  const y2 = b.top + b.height / 2 - box.top;
  const mx = (x1 + x2) / 2;
  $('thread').firstElementChild.setAttribute('d', `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
}

function paintAsset(prefix, outcome, style, dark) {
  const acc = assetAccent(site.palette, outcome, style, dark);
  // The bar shows the raw outcome; the button behind text is nudged by Bouncer until it reads at 4.5 : 1.
  const cta = legibleOn(acc.hex);
  $(`${prefix}Bar`).style.background = acc.hex;
  $(`${prefix}Cta`).style.background = cta.fill;
  $(`${prefix}Cta`).style.color = cta.ink;
  $(`${prefix}Out`).textContent = `${style ? 'Bold' : 'Calm'}, ${sgn(outcome)}`;
}

function paint() {
  if (!state.last) return;
  const { x, y, out } = state.last;
  paintAsset('a', out[0], x, false);
  paintAsset('b', out[1], y, true);
}

function tally() {
  const all = Object.values(state.shots).flat();
  const matched = all.filter(([a, b]) => a === b).length;
  let S = null;
  if (SETTING_KEYS.every((k) => state.shots[k].length >= 5)) {
    const E = {};
    for (const k of SETTING_KEYS) E[k] = state.shots[k].reduce((s, [a, b]) => s + a * b, 0) / state.shots[k].length;
    S = chshValue(E);
  }
  const cell = (label, value) => h('div', {}, label, h('b', {}, value));
  $('tally').replaceChildren(
    cell('Pairs measured', all.length),
    cell('Matched', `${all.length ? Math.round((matched / all.length) * 100) : 0}%`),
    cell('CHSH so far', S === null ? '-' : S.toFixed(2)),
    cell('Game win rate', S === null ? '-' : `${Math.round(winRate(S) * 100)}%`),
  );
}

function measure(animate = true) {
  const x = Number($('aStyle').value);
  const y = Number($('bStyle').value);
  const out = samplePair(x, y, state.rng);
  state.shots[SETTING_KEYS[x * 2 + y]].push(out);
  state.last = { x, y, out };
  paint();
  if (animate && !reduced()) {
    // One pulse runs along the thread: both bars changed in the same instant.
    const el = $('spooky');
    el.classList.remove('zap');
    void el.offsetWidth; // restart the animation
    el.classList.add('zap');
  }
}

export default {
  id: 'spooky',
  init() {
    $('pairBtn').addEventListener('click', () => {
      measure();
      tally();
    });
    $('pairMany').addEventListener('click', () => {
      for (let i = 0; i < 500; i++) {
        const x = state.rng() < 0.5 ? 0 : 1;
        const y = state.rng() < 0.5 ? 0 : 1;
        state.shots[SETTING_KEYS[x * 2 + y]].push(samplePair(x, y, state.rng));
      }
      measure();
      tally();
    });
    if (typeof ResizeObserver === 'function') new ResizeObserver(thread).observe($('spooky'));
    else thread();
    measure(false);
    tally();
  },
  paint,
};
