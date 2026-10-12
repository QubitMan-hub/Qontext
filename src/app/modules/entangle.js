import {
  samplePair, chshFromShots, idealCorrelations, chshValue, winRate, assetAccent, mulberry32, hashSeed, freshSeed,
  SETTING_KEYS, STYLE_NAMES, TSIRELSON, CHSH_CLASSICAL_MAX, legibleOn,
} from '../../engine/index.js';
import { $, sign } from '../dom.js';
import { store, palette, setProject } from '../store.js';

let pairSeed = 1;
let current = null;
let gallery = [];
let simShots = null;

function simulateShots() {
  const rng = mulberry32(hashSeed(store.project.measureSeed, 77));
  const shots = {};
  SETTING_KEYS.forEach((key, i) => {
    shots[key] = [];
    for (let k = 0; k < 4000; k++) shots[key].push(samplePair(i >> 1, i & 1, rng));
  });
  return shots;
}

function draw(x, y, rng) {
  const key = SETTING_KEYS[x * 2 + y];
  const recorded = store.usePool && store.drawer ? store.drawer.chsh(key) : null;
  return recorded ? recorded.slice() : samplePair(x, y, rng);
}

function collapse() {
  const rng = mulberry32(hashSeed(pairSeed++, freshSeed()));
  const { styleA, styleB } = store.project;
  current = { x: styleA, y: styleB, out: draw(styleA, styleB, rng) };
  gallery = [];
  for (let i = 0; i < 12; i++) {
    const x = rng() < 0.5 ? 0 : 1;
    const y = rng() < 0.5 ? 0 : 1;
    gallery.push({ x, y, out: draw(x, y, rng) });
  }
}

export function init() {
  $('styleA').addEventListener('change', (e) => {
    setProject({ styleA: Number(e.target.value) });
    collapse();
    render();
  });
  $('styleB').addEventListener('change', (e) => {
    setProject({ styleB: Number(e.target.value) });
    collapse();
    render();
  });
  $('pairBtn').addEventListener('click', () => {
    collapse();
    render();
  });
}

function paintAsset(prefix, outcome, style, dark) {
  const acc = assetAccent(palette(), outcome, style, dark);
  // Bouncer: the poster keeps the accent's hue and the word on it reads at 4.5 : 1 or better.
  const fill = legibleOn(acc.hex);
  const poster = $(`${prefix}Bar`);
  poster.style.background = fill.fill;
  poster.style.color = fill.ink;
  $(`${prefix}Word`).textContent = STYLE_NAMES[style];
  $(`${prefix}Out`).textContent = `${STYLE_NAMES[style]}, ${sign(outcome)}, ${acc.hex}`;
}

export function render(kind) {
  if (!current || kind === 'pool') collapse();
  if (!simShots) simShots = simulateShots();
  const { styleA, styleB } = store.project;
  $('styleA').value = String(styleA);
  $('styleB').value = String(styleB);
  paintAsset('assetA', current.out[0], current.x, false);
  paintAsset('assetB', current.out[1], current.y, true);

  const pal = palette();
  $('pairs').innerHTML = gallery
    .map((g) => {
      const a = assetAccent(pal, g.out[0], g.x, false).hex;
      const b = assetAccent(pal, g.out[1], g.y, true).hex;
      const same = g.out[0] === g.out[1];
      return `<div class="pair"><div class="sw2" role="img" aria-label="${STYLE_NAMES[g.x]} and ${STYLE_NAMES[g.y]}, ${same ? 'match' : 'clash'}"><span style="background:${a}"></span><span style="background:${b}"></span></div>${STYLE_NAMES[g.x]} / ${STYLE_NAMES[g.y]}, ${same ? 'match' : 'clash'}</div>`;
    })
    .join('');

  const fromPool = !!(store.usePool && store.pool && store.pool.chsh);
  const res = chshFromShots(fromPool ? store.pool.chsh : simShots);
  const ideal = idealCorrelations();
  $('chshS').textContent = res.S.toFixed(2);
  $('chshFill').style.width = `${Math.max(0, Math.min(100, (res.S / TSIRELSON) * 100))}%`;
  $('chshMeter').setAttribute('aria-valuenow', res.S.toFixed(3));
  const beyond = res.S > CHSH_CLASSICAL_MAX;
  const pill = $('chshPill');
  pill.className = `pill ${beyond ? 'good' : 'bad'}`;
  pill.textContent = beyond ? 'Beyond classical' : 'Within classical';
  $('chshWin').textContent = `${(winRate(res.S) * 100).toFixed(1)}%`;
  $('chshSource').textContent = fromPool
    ? `Measured on ${store.pool.backend || 'hardware'}.`
    : `Exact simulation, 4,000 pairs per style combination. Ideal value ${chshValue(ideal).toFixed(3)}.`;
  $('chshTable').innerHTML = SETTING_KEYS.map((key, i) => {
    const pIdeal = (1 + ideal[key]) / 2;
    const pMeas = (1 + res.E[key]) / 2;
    return `<tr><td>${STYLE_NAMES[i >> 1]} / ${STYLE_NAMES[i & 1]}</td><td>${(pIdeal * 100).toFixed(1)}% match</td><td>${(pMeas * 100).toFixed(1)}%</td></tr>`;
  }).join('');
}
