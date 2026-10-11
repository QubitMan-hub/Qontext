import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collapse, resolveTile, cssVariables, fromTokens, contrast, VERSION } from '../../src/runtime/qontext-runtime.js';
import { CONTEXTS, buildExportData, toTokens, kcbsProbs, examplePool } from '../../src/engine/index.js';

test('collapse is deterministic per seed and obeys every rule', () => {
  const a = collapse({ base: 120, d: 4, seed: 99 });
  const b = collapse({ base: 120, d: 4, seed: 99 });
  assert.deepEqual(a.tiles, b.tiles);
  assert.equal(a.harmony.length, 4);
  for (const ctx of CONTEXTS) {
    const [x, y, z] = a.outcomes[ctx.id];
    assert.equal(ctx.sign * x * y * z, 1);
  }
  let differs = false;
  for (let s = 0; s < 20 && !differs; s++) differs = JSON.stringify(collapse({ seed: s }).tiles) !== JSON.stringify(a.tiles);
  assert.ok(differs);
  assert.equal(VERSION, '1.1.0');
});

test('collapse can draw from a hardware pool', () => {
  const r = collapse({ seed: 5, pool: examplePool({ shots: 16 }) });
  assert.equal(Object.keys(r.tiles).length, 9);
});

test('resolveTile and cssVariables', () => {
  const r = collapse({ seed: 1 });
  assert.equal(resolveTile(r, 'r2c3', 'col'), r.tiles.r2c3.col);
  assert.equal(resolveTile(r, 'r2c3', 'row'), r.tiles.r2c3.row);
  assert.equal(resolveTile(r, 'r9c9', 'row'), null);
  const vars = cssVariables(r, 'brand');
  assert.equal(Object.keys(vars).length, 3 + 18);
  assert.equal(vars['--brand-r1c1-row'], r.tiles.r1c1.row);
});

test('fromTokens reads Studio token exports', () => {
  const r = collapse({ seed: 3 });
  const data = buildExportData({ base: 200, d: 3, L: 0.72, C: 0.13 }, r.outcomes, kcbsProbs(0, 0));
  const back = fromTokens(JSON.parse(toTokens(data)));
  assert.equal(back.tiles.r1c1.row, data.tiles[0].row);
  assert.equal(back.harmony.length, 3);
  assert.throws(() => fromTokens({}), /token/);
});

test('contrast helpers', () => {
  assert.ok(Math.abs(contrast.wcag('#000', '#fff') - 21) < 1e-9);
  assert.ok(contrast.apca('#000000', '#ffffff') > 100);
});

import { collapseSeed, makeState, measureAll, mulberry32, encodeProject, decodeProject } from '../../src/engine/index.js';

test('a world means the same in the runtime, the site and the Atelier', () => {
  const r = collapse({ base: 77, stateSeed: 9, seed: 123456 });
  const atelier = measureAll(makeState('random', 9), mulberry32(collapseSeed(123456, 9, 1, 0)));
  assert.deepEqual(r.outcomes, atelier);
  const code = encodeProject({ base: 77, stateSeed: 9, measureSeed: 123456 });
  assert.match(code, /^[A-Za-z0-9._-]+$/, 'wavefunction codes must be valid URL fragment tokens');
  assert.equal(decodeProject(code).measureSeed, 123456);
});
