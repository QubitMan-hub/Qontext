import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collapse } from '../../src/runtime/qontext-runtime.js';
import { contextualTiles } from '../../src/engine/index.js';
import { PANELS, BANDS, ZONES, pairOf, pairChecks, footValues, dropSeeds } from '../../src/site/pair-shape.js';

const PAL = { base: 200, d: 3, L: 0.72, C: 0.13 };

test('the nine panels are the nine tiles, once each', () => {
  assert.equal(PANELS.length, 9);
  assert.equal(new Set(PANELS.map((p) => `${p.r}${p.c}`)).size, 9);
  assert.equal(new Set(PANELS.map((p) => p.id)).size, 9);
  const stripe = PANELS.find((p) => p.id === 'stripe');
  assert.deepEqual([stripe.r, stripe.c], [1, 1]);
  assert.equal(BANDS.length, 3);
  assert.equal(ZONES.length, 3);
  for (const p of PANELS) assert.match(p.d, /^M[\d. ,LCQZlcqzHVhvAa-]+$/);
});

test('a quantum pair follows all six rules and differs exactly on the contextual tiles', () => {
  for (const seed of [1, 7, 5690984, 4227792]) {
    const out = collapse({ ...PAL, state: 'random', stateSeed: 7, seed }).outcomes;
    const { left, right } = footValues(out);
    assert.equal(pairChecks(left, right).filter((x) => x.ok).length, 6);
    const pair = pairOf(PAL, out);
    assert.equal(pair.differ.length, contextualTiles(out).length);
    for (const p of PANELS) {
      assert.equal(pair.left.get(p.id) !== pair.right.get(p.id), pair.differ.includes(p.id));
      assert.ok(pair.both.get(p.id).includes(pair.left.get(p.id)));
      assert.ok(pair.both.get(p.id).includes(pair.right.get(p.id)));
    }
  }
});

test('the checks name bands on the left foot and zones on the right', () => {
  const out = collapse({ ...PAL, state: 'random', stateSeed: 7, seed: 3 }).outcomes;
  const { left, right } = footValues(out);
  const checks = pairChecks(left, right);
  assert.deepEqual(checks.map((x) => x.ctx), ['R1', 'R2', 'R3', 'C1', 'C2', 'C3']);
  assert.match(checks[0].label, /Top band/);
  assert.match(checks[5].label, /Heel zone/);
});

test('a matching pair (any fixed paint job) passes at most 5 of 6', () => {
  let best = 0;
  for (let mask = 0; mask < 512; mask++) {
    const v = [0, 1, 2].map((r) => [0, 1, 2].map((c) => ((mask >> (r * 3 + c)) & 1 ? -1 : 1)));
    best = Math.max(best, pairChecks(v, v).filter((x) => x.ok).length);
  }
  assert.equal(best, 5);
});

test('the drop is twelve other worlds, the same every time', () => {
  const a = dropSeeds(4227792);
  assert.equal(a.length, 12);
  assert.equal(new Set(a).size, 12);
  assert.ok(!a.includes(4227792));
  assert.ok(a.every((s) => Number.isInteger(s) && s >= 1 && s <= 9999999));
  assert.deepEqual(dropSeeds(4227792), a);
  assert.notDeepEqual(dropSeeds(4227793), a);
});
