// Phase Dial: light at 0 degrees, dark at 180, every angle between a Mach-Zehnder blend of the two themes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PHASE_POINTS, phaseMix, normalizeDeg } from '../../src/engine/index.js';

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
