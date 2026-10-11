import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHAPE_SETS, analyzeShape, findKsColoring, bestAttempt, yuOhQuantum, yuOhClassicalMax, YU_OH_QUANTUM,
  YU_OH_CLASSICAL, projectPoint, toObj, mulberry32, gaussian,
} from '../../src/engine/index.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('Peres 33: 33 rays, 16 bases, 72 orthogonal pairs, no classical coloring', () => {
  const A = analyzeShape(SHAPE_SETS.peres33);
  assert.equal(A.n, 33);
  assert.equal(A.bases.length, 16);
  assert.equal(A.pairs.length, 72);
  assert.equal(findKsColoring(A).coloring, null);
});

test('Cabello 18: 9 bases, each vector in exactly two, no classical coloring', () => {
  const A = analyzeShape(SHAPE_SETS.cabello18);
  assert.equal(A.n, 18);
  assert.equal(A.bases.length, 9);
  assert.ok(A.basesOf.every((b) => b.length === 2));
  assert.equal(findKsColoring(A).coloring, null);
});

test('Yu-Oh 13: colorable, but quantum value 25/3 for every state beats classical 8', () => {
  const A = analyzeShape(SHAPE_SETS.yuoh13);
  assert.equal(A.n, 13);
  assert.equal(A.pairs.length, 24);
  const { coloring } = findKsColoring(A);
  assert.ok(coloring);
  for (const b of A.bases) assert.equal(b.filter((i) => coloring[i] === 1).length, 1);
  for (const [i, j] of A.pairs) assert.ok(!(coloring[i] === 1 && coloring[j] === 1));
  assert.equal(yuOhClassicalMax(A), YU_OH_CLASSICAL);
  const rng = mulberry32(8);
  for (let k = 0; k < 20; k++) close(yuOhQuantum(A, [gaussian(rng), gaussian(rng), gaussian(rng)]), YU_OH_QUANTUM, 1e-9);
});

test('bestAttempt never places two orthogonal 1s and leaves at least one broken basis for KS sets', () => {
  for (const id of ['peres33', 'cabello18']) {
    const A = analyzeShape(SHAPE_SETS[id]);
    const att = bestAttempt(A, 3, 300);
    for (const [i, j] of A.pairs) assert.ok(!(att.coloring[i] === 1 && att.coloring[j] === 1));
    assert.ok(att.broken.length >= 1);
    assert.equal(att.satisfied + att.broken.length, A.bases.length);
  }
});

test('projection and OBJ export', () => {
  const p = projectPoint([1, 0, 0], { yaw: Math.PI / 2, pitch: 0 });
  close(p[0], 0, 1e-12);
  const q = projectPoint([0.5, 0.5, 0.5, 0.5], { yaw: 0, pitch: 0, w: 0.3 });
  assert.equal(q.length, 3);
  const obj = toObj(analyzeShape(SHAPE_SETS.yuoh13));
  assert.equal(obj.split('\n').filter((l) => l.startsWith('v ')).length, 26);
  assert.ok(obj.includes('\nl '));
});
