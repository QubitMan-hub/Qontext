import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTEXTS, GRID, QUANTUM_SCORE, CLASSICAL_SCORE_MAX, makeState, contextProbs, sampleContext, measureAll,
  merminScore, expectedScore, classicalOptimum, classicalCheck, rowValue, colValue, roundSatisfied, opLabel, opAscii,
  KCBS_VECTORS, kcbsProbs, kcbsSum, kcbsClassicalMax, KCBS_QUANTUM_MAX, KCBS_CLASSICAL_MAX,
  correlation, chshValue, idealCorrelations, chshClassicalMax, TSIRELSON, samplePair, chshFromShots, winRate,
  mulberry32, hashSeed, STATE_KINDS, contextualTiles,
} from '../../src/engine/index.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('context signs: all rows and first two columns +1, third column -1', () => {
  assert.deepEqual(CONTEXTS.map((c) => [c.id, c.sign]), [
    ['R1', 1], ['R2', 1], ['R3', 1], ['C1', 1], ['C2', 1], ['C3', -1],
  ]);
});

test('observables in each context commute (A B = B A)', () => {
  for (const ctx of CONTEXTS) {
    const ops = [ctx.A, ctx.B, ctx.C];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const X = ops[i];
        const Y = ops[j];
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            let xy = [0, 0];
            let yx = [0, 0];
            for (let k = 0; k < 4; k++) {
              xy = [xy[0] + X[r][k][0] * Y[k][c][0] - X[r][k][1] * Y[k][c][1], xy[1] + X[r][k][0] * Y[k][c][1] + X[r][k][1] * Y[k][c][0]];
              yx = [yx[0] + Y[r][k][0] * X[k][c][0] - Y[r][k][1] * X[k][c][1], yx[1] + Y[r][k][0] * X[k][c][1] + Y[r][k][1] * X[k][c][0]];
            }
            close(xy[0], yx[0]);
            close(xy[1], yx[1]);
          }
        }
      }
    }
  }
});

test('context probabilities form a distribution for many states', () => {
  for (let seed = 0; seed < 50; seed++) {
    const psi = makeState('random', seed);
    for (const ctx of CONTEXTS) {
      const ps = contextProbs(ctx, psi);
      close(ps.reduce((s, o) => s + o.p, 0), 1, 1e-9);
      assert.ok(ps.every((o) => o.p >= -1e-12));
    }
  }
});

test('every sampled round satisfies all six product rules', () => {
  for (const kind of STATE_KINDS) {
    const psi = makeState(kind, 11);
    const rng = mulberry32(5);
    for (let i = 0; i < 300; i++) assert.equal(roundSatisfied(measureAll(psi, rng)), 6);
  }
});

test('expected Mermin score is exactly 6 for every state', () => {
  for (let seed = 0; seed < 25; seed++) close(expectedScore(makeState('random', seed)), QUANTUM_SCORE, 1e-9);
  close(expectedScore(makeState('bell')), 6, 1e-9);
});

/** <O> for each of the nine tiles, from the marginals of the row contexts. */
const tileExpectations = (psi) =>
  CONTEXTS.filter((c) => c.kind === 'row').flatMap((ctx) => {
    const probs = contextProbs(ctx, psi);
    return [0, 1, 2].map((k) => probs.reduce((s, o) => s + o.p * [o.a, o.b, o.c][k], 0));
  });

test('the row and column readings differ on an odd number of tiles, every round', () => {
  for (const kind of STATE_KINDS) {
    const psi = makeState(kind, 3);
    const rng = mulberry32(11);
    for (let i = 0; i < 2000; i++) assert.equal(contextualTiles(measureAll(psi, rng)).length % 2, 1);
  }
});

test('expected differing tiles is half the sum of 1 - <O>^2, between 3 and 4 (the paper, section 4)', () => {
  let lo = Infinity;
  let hi = -Infinity;
  for (let seed = 1; seed <= 3000; seed++) {
    const e = tileExpectations(makeState('random', seed)).reduce((s, x) => s + (1 - x * x) / 2, 0);
    lo = Math.min(lo, e);
    hi = Math.max(hi, e);
  }
  assert.ok(lo >= 3 - 1e-9 && hi <= 4 + 1e-9, `${lo} .. ${hi}`);
  // The ends: a Bell state gives exactly 3, |0> (x) |+i> exactly 4.
  close(tileExpectations(makeState('bell')).reduce((s, x) => s + (1 - x * x) / 2, 0), 3);
  const k = Math.SQRT1_2;
  close(tileExpectations([[k, 0], [0, k], [0, 0], [0, 0]]).reduce((s, x) => s + (1 - x * x) / 2, 0), 4);
  // And the simulation agrees with the formula.
  const psi = makeState('random', 7);
  const rng = mulberry32(5);
  let total = 0;
  for (let i = 0; i < 20000; i++) total += contextualTiles(measureAll(psi, rng)).length;
  const predicted = tileExpectations(psi).reduce((s, x) => s + (1 - x * x) / 2, 0);
  assert.ok(Math.abs(total / 20000 - predicted) < 0.03, `${total / 20000} vs ${predicted}`);
});

test('classical optimum by exhaustive search: 5 of 6 rules, score 4', () => {
  const opt = classicalOptimum();
  assert.equal(opt.maxSatisfied, 5);
  assert.equal(opt.maxScore, CLASSICAL_SCORE_MAX);
});

test('classicalCheck on all +1 breaks only the third column', () => {
  const res = classicalCheck([[1, 1, 1], [1, 1, 1], [1, 1, 1]]);
  assert.equal(res.satisfied, 5);
  assert.deepEqual(res.perContext.filter((x) => !x.ok).map((x) => x.id), ['C3']);
});

test('row and column readings index the right tiles', () => {
  const out = { R1: [1, 1, 1], R2: [1, -1, -1], R3: [-1, 1, -1], C1: [1, 1, -1], C2: [1, -1, 1], C3: [-1, 1, 1] };
  assert.equal(rowValue(out, 1, 2), -1);
  assert.equal(colValue(out, 0, 2), -1);
  assert.equal(colValue(out, 2, 0), -1);
});

test('sampling statistics match exact probabilities', () => {
  const psi = makeState('random', 3);
  const ctx = CONTEXTS[5];
  const probs = contextProbs(ctx, psi);
  const rng = mulberry32(99);
  const counts = new Map();
  const N = 40000;
  for (let i = 0; i < N; i++) {
    const [a, b] = sampleContext(ctx, psi, rng);
    counts.set(`${a}${b}`, (counts.get(`${a}${b}`) || 0) + 1);
  }
  for (const o of probs) close((counts.get(`${o.a}${o.b}`) || 0) / N, o.p, 0.012);
});

test('merminScore from noisy shots lands between classical and quantum', () => {
  const psi = makeState('random', 7);
  const rng = mulberry32(1);
  const shots = {};
  for (const ctx of CONTEXTS) {
    shots[ctx.id] = [];
    for (let i = 0; i < 2000; i++) shots[ctx.id].push(sampleContext(ctx, psi, rng).map((v) => (rng() < 0.03 ? -v : v)));
  }
  const { total } = merminScore(shots);
  assert.ok(total > 4 && total < 6, `score ${total}`);
});

test('labels', () => {
  assert.equal(opLabel(GRID[2][0]), 'X₁Z₂');
  assert.equal(opAscii(GRID[0][1]), 'X2');
  assert.equal(opAscii(GRID[2][2]), 'Y1 Y2');
});

test('KCBS: neighbours orthogonal, unit length, sum sqrt(5) at tilt 0', () => {
  for (let j = 0; j < 5; j++) {
    const a = KCBS_VECTORS[j];
    const b = KCBS_VECTORS[(j + 1) % 5];
    close(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], 0, 1e-12);
    close(Math.hypot(...a), 1, 1e-12);
  }
  close(kcbsSum(kcbsProbs(0, 0)), KCBS_QUANTUM_MAX, 1e-12);
  assert.equal(kcbsClassicalMax(), KCBS_CLASSICAL_MAX);
});

test('KCBS: the optimal state is the maximum over a grid of states', () => {
  let best = 0;
  for (let t = 0; t <= 90; t += 3) for (let p = 0; p < 360; p += 15) best = Math.max(best, kcbsSum(kcbsProbs(t, p)));
  close(best, Math.sqrt(5), 1e-9);
});

test('CHSH: ideal S = 2 sqrt 2, classical max 2, win rates', () => {
  close(chshValue(idealCorrelations()), TSIRELSON, 1e-12);
  assert.equal(chshClassicalMax(), 2);
  close(winRate(TSIRELSON), 0.5 + Math.SQRT2 / 4, 1e-12);
  close(winRate(2), 0.75, 1e-12);
  close(correlation(0, 0), Math.SQRT1_2, 1e-12);
});

test('CHSH: sampled pairs reproduce S', () => {
  const rng = mulberry32(2024);
  const shots = { a0b0: [], a0b1: [], a1b0: [], a1b1: [] };
  for (let i = 0; i < 20000; i++) {
    shots.a0b0.push(samplePair(0, 0, rng));
    shots.a0b1.push(samplePair(0, 1, rng));
    shots.a1b0.push(samplePair(1, 0, rng));
    shots.a1b1.push(samplePair(1, 1, rng));
  }
  const { S } = chshFromShots(shots);
  close(S, TSIRELSON, 0.05);
});

test('hashSeed is deterministic and spreads', () => {
  assert.equal(hashSeed(1, 2, 3), hashSeed(1, 2, 3));
  assert.notEqual(hashSeed(1, 2, 3), hashSeed(1, 2, 4));
  assert.ok(hashSeed(2 ** 40, -5) >= 0);
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 10; i++) assert.equal(a(), b());
});
