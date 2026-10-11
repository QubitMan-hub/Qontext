// Phase Dial: light at 0 degrees, dark at 180, every angle between a Mach-Zehnder blend of the two themes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PHASE_POINTS, phaseMix, phaseTheme, washOf, normalizeDeg, allTileColors, hexToLin, wcagContrast } from '../../src/engine/index.js';

const TOKENS = ['paper', 'paper2', 'sheet', 'ink', 'ink2', 'rule', 'ok', 'no'];

test('phaseMix returns the light value at 0 and the dark value at 180', () => {
  for (const k of TOKENS) {
    const { [k]: l } = PHASE_POINTS.light;
    const { [k]: d } = PHASE_POINTS.dark;
    assert.equal(phaseMix(l, d, 0), l, k);
    assert.equal(phaseMix(l, d, 180), d, k);
  }
});

test('phaseMix repeats every turn', () => {
  for (const k of TOKENS) {
    const l = PHASE_POINTS.light[k];
    const d = PHASE_POINTS.dark[k];
    assert.equal(phaseMix(l, d, 360), phaseMix(l, d, 0), k);
    assert.equal(phaseMix(l, d, -90), phaseMix(l, d, 270), k);
  }
});

test('the two dusks differ: the interference is real', () => {
  const { paper: l } = PHASE_POINTS.light;
  const { paper: d } = PHASE_POINTS.dark;
  assert.notEqual(phaseMix(l, d, 90), phaseMix(l, d, 270));
});

test('normalizeDeg rounds and wraps to a whole degree', () => {
  for (const [input, want] of [[0, 0], [359.6, 0], [-5, 355], [720, 0], [89.4, 89], [999, 279]]) assert.equal(normalizeDeg(input), want, String(input));
  assert.equal(normalizeDeg(NaN), 0);
});

test('the CSS fallback matches PHASE_POINTS', () => {
  const css = readFileSync(new URL('../../src/site/site.css', import.meta.url), 'utf8');
  const block = (start) => css.slice(css.indexOf(start), css.indexOf('}', css.indexOf(start)));
  const read = (text) => {
    const v = (name) => (new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(text) || [])[1];
    return { paper: v('paper'), paper2: v('paper-2'), sheet: v('sheet'), ink: v('ink'), ink2: v('ink-2'), rule: v('rule'), ok: v('ok'), no: v('no') };
  };
  assert.deepEqual(read(block(':root {')), PHASE_POINTS.light);
  assert.deepEqual(read(block(':root[data-theme="dark"]')), PHASE_POINTS.dark);
});

const ratio = (a, b) => wcagContrast(hexToLin(a), hexToLin(b));
const TEXT = ['ink', 'ink2', 'ok', 'no'];

test('phaseTheme at 0 and 180 is exactly today\'s theme', () => {
  assert.deepEqual(phaseTheme(0).tokens, PHASE_POINTS.light);
  assert.deepEqual(phaseTheme(180).tokens, PHASE_POINTS.dark);
  assert.equal(phaseTheme(0).scheme, 'light');
  assert.equal(phaseTheme(180).scheme, 'dark');
});

test('Bouncer proves text at every whole degree, on every wall, in every world', () => {
  const palettes = [];
  // Every 45 degrees of base hue, from a deep saturated world to the site's usual one to a pale one.
  for (let base = 0; base < 360; base += 45) for (const [L, C] of [[0.62, 0.2], [0.76, 0.13], [0.84, 0.06]]) palettes.push({ base, d: 3, L, C });
  palettes.push(null); // no world yet: paper, paper-2 and sheet only
  for (const pal of palettes) {
    const washes = pal ? allTileColors(pal).map((c) => c.hex) : [];
    for (let deg = 0; deg < 360; deg++) {
      const { tokens: t, minContrast } = phaseTheme(deg, washes);
      const walls = [t.paper, t.paper2, t.sheet, ...washes.map((w) => washOf(t.paper, w))];
      for (const k of TEXT) {
        for (const wall of walls) {
          const r = ratio(t[k], wall);
          if (r < 4.5) assert.fail(`${deg} degrees, palette ${JSON.stringify(pal)}: ${k} ${t[k]} on ${wall} is ${r.toFixed(2)} : 1`);
        }
      }
      assert.ok(minContrast >= 4.5);
    }
  }
});

test('Bouncer leaves a token alone wherever the blend already reads', () => {
  const L = PHASE_POINTS.light;
  const D = PHASE_POINTS.dark;
  let untouched = 0;
  for (let deg = 0; deg < 360; deg++) {
    const walls = ['paper', 'paper2', 'sheet'].map((k) => phaseMix(L[k], D[k], deg));
    const ink = phaseMix(L.ink, D.ink, deg);
    if (walls.every((w) => ratio(ink, w) >= 4.5)) {
      assert.equal(phaseTheme(deg).tokens.ink, ink, `${deg} degrees`);
      untouched++;
    }
  }
  assert.ok(untouched > 100, 'most angles need no help');
});

test('the scheme flips with the ink', () => {
  for (let deg = 0; deg < 360; deg++) {
    const { tokens, scheme } = phaseTheme(deg);
    const darkText = ratio(tokens.ink, '#000000') < ratio(tokens.ink, '#ffffff');
    assert.equal(scheme, darkText ? 'light' : 'dark', `${deg} degrees`);
  }
});
