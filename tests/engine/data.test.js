import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePool, parsePool, examplePool, poolSummary, poolDrawer, PoolError, canonicalShots,
  sanitizeProject, encodeProject, decodeProject, DEFAULT_PROJECT, paletteOf,
  buildExportData, toCss, toTokens, toTailwind, toSvgGrid, lenticularView, lenticularSize,
  measureAll, makeState, mulberry32, kcbsProbs, kmeansOklab, rgbaToOklab,
} from '../../src/engine/index.js';

test('example pool validates and scores between classical and quantum', () => {
  const pool = examplePool();
  assert.equal(validatePool(pool), pool);
  const s = poolSummary(pool);
  assert.ok(s.mermin.total > 4 && s.mermin.total < 6);
  assert.ok(s.chsh.S > 2 && s.chsh.S < 2.83);
  assert.equal(s.totalShots, 512 * 10);
  assert.equal(canonicalShots(pool), canonicalShots(JSON.parse(JSON.stringify(pool))));
});

test('pool validation rejects malformed input with readable messages', () => {
  assert.throws(() => validatePool(null), PoolError);
  assert.throws(() => validatePool({}), /contexts/);
  const p = examplePool({ shots: 4 });
  assert.throws(() => validatePool({ ...p, format: 'other/2' }), /Unsupported/);
  assert.throws(() => validatePool({ ...p, contexts: { ...p.contexts, R1: [[1, 0, 1]] } }), /R1/);
  assert.throws(() => validatePool({ ...p, chsh: { a0b0: [[1, 1]] } }), /a0b1/);
  assert.throws(() => validatePool({ ...p, job_ids: [1] }), /job_ids/);
  assert.throws(() => parsePool('{nope'), /valid JSON/);
  const { chsh: _omit, ...noChsh } = p;
  assert.ok(validatePool(noChsh));
});

test('pool drawer cycles through shots per context', () => {
  const p = examplePool({ shots: 3 });
  const draw = poolDrawer(p);
  const first = draw('R1');
  draw('R1');
  draw('R1');
  assert.deepEqual(draw('R1'), first);
  assert.equal(draw('nope'), null);
  assert.deepEqual(draw.chsh('a0b0'), p.chsh.a0b0[0]);
});

test('project sanitization clamps and defaults', () => {
  const p = sanitizeProject({ base: 999, d: 12.6, L: 'x', state: 'weird', mixA: '#ABC', shape: 'cabello18', name: '  Hi  ' });
  assert.equal(p.base, 359.999);
  assert.equal(p.d, 8);
  assert.equal(p.L, DEFAULT_PROJECT.L);
  assert.equal(p.state, 'random');
  assert.equal(p.mixA, '#aabbcc');
  assert.equal(p.shape, 'cabello18');
  assert.equal(p.name, 'Hi');
  assert.deepEqual(sanitizeProject(undefined), sanitizeProject({}));
  assert.deepEqual(Object.keys(paletteOf(p)), ['base', 'd', 'L', 'C']);
});

test('project codes round trip, including unicode names', () => {
  const p = sanitizeProject({ name: 'Brand Ω système', base: 123.5, d: 5 });
  const code = encodeProject(p);
  assert.match(code, /^QX1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeProject(code), p);
  assert.deepEqual(decodeProject(JSON.stringify(p)), p);
  assert.throws(() => decodeProject('hello'), /QX1/);
  assert.throws(() => decodeProject('QX1.!!!!'), /QX1/);
});

test('exports are complete and well formed', () => {
  const pal = { base: 200, d: 3, L: 0.72, C: 0.13 };
  const out = measureAll(makeState('random', 7), mulberry32(1));
  const data = buildExportData(pal, out, kcbsProbs(0, 0), { name: 'Test' });
  assert.equal(data.tiles.length, 9);
  assert.equal(data.harmony.length, 3);
  assert.equal(data.penta.length, 5);
  const css = toCss(data);
  assert.equal((css.match(/--q-r\dc\d-(row|col):/g) || []).length, 18);
  const tokens = JSON.parse(toTokens(data));
  assert.equal(tokens.qontext.grid.r3c3.row.$type, 'color');
  assert.ok(toTailwind(data).includes('module.exports'));
  const svg = toSvgGrid(data);
  assert.equal((svg.match(/<polygon/g) || []).length, 18);
});

test('lenticular interlacing alternates views across each lens', () => {
  const views = [];
  for (let x = 0; x < 30; x++) views.push(lenticularView(x, 40, 600));
  assert.deepEqual(views.slice(0, 15), [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(lenticularSize(4, 600), { width: 2400, height: 2400, pitchPx: 600 });
});

test('k-means finds two clear clusters', () => {
  const data = [];
  for (let i = 0; i < 60; i++) data.push(255, 0, 0, 255);
  for (let i = 0; i < 40; i++) data.push(0, 0, 255, 255);
  data.push(0, 255, 0, 0);
  const px = rgbaToOklab(data);
  assert.equal(px.length, 100);
  const { clusters, dominant } = kmeansOklab(px, 2);
  assert.equal(clusters.length, 2);
  assert.ok(Math.abs(clusters[0].share - 0.6) < 1e-9);
  assert.ok(dominant);
  assert.deepEqual(kmeansOklab([], 3), { clusters: [], dominant: null });
});

import { readFileSync } from 'node:fs';

test('contract: the pool written by the Python runner validates in JavaScript', () => {
  const pool = parsePool(readFileSync(new URL('../../examples/sample-pool-noisy.json', import.meta.url), 'utf8'));
  const s = poolSummary(pool);
  assert.equal(pool.format, 'qontext-pool/1');
  assert.ok(s.mermin.total > 4, `mermin ${s.mermin.total}`);
  assert.ok(s.chsh.S > 2, `chsh ${s.chsh.S}`);
});

test('contract: the JSON schema lists every context and setting the engine uses', () => {
  const schema = JSON.parse(readFileSync(new URL('../../schema/qontext-pool.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(schema.properties.contexts.required, ['R1', 'R2', 'R3', 'C1', 'C2', 'C3']);
  assert.deepEqual(schema.properties.chsh.required, ['a0b0', 'a0b1', 'a1b0', 'a1b1']);
  assert.equal(schema.properties.format.const, 'qontext-pool/1');
});
