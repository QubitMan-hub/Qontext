// The Mermin-Peres square: nine two-qubit observables, six contexts, no classical value assignment.

import { cx, matmul, matvec, norm2, normalize, pauliString } from './linalg.js';
import { gaussian, mulberry32 } from './random.js';

/** GRID[r][c] = [pauli on qubit 1, pauli on qubit 2]. */
export const GRID = [
  [['X', 'I'], ['I', 'X'], ['X', 'X']],
  [['I', 'Z'], ['Z', 'I'], ['Z', 'Z']],
  [['X', 'Z'], ['Z', 'X'], ['Y', 'Y']],
];

export const QUANTUM_SCORE = 6;
export const CLASSICAL_SCORE_MAX = 4;

const SUB = ['₁', '₂'];
/** Human label for a grid observable, e.g. X1Z2 with subscript digits. */
export function opLabel(p) {
  const parts = [];
  if (p[0] !== 'I') parts.push(p[0] + SUB[0]);
  if (p[1] !== 'I') parts.push(p[1] + SUB[1]);
  return parts.join('');
}

/** Plain ASCII label, e.g. "X1 Z2", for exports and screen readers. */
export function opAscii(p) {
  const parts = [];
  if (p[0] !== 'I') parts.push(p[0] + '1');
  if (p[1] !== 'I') parts.push(p[1] + '2');
  return parts.join(' ');
}

function buildContexts() {
  const list = [];
  for (let r = 0; r < 3; r++) list.push({ id: `R${r + 1}`, kind: 'row', index: r, cells: [[r, 0], [r, 1], [r, 2]] });
  for (let c = 0; c < 3; c++) list.push({ id: `C${c + 1}`, kind: 'col', index: c, cells: [[0, c], [1, c], [2, c]] });
  for (const ctx of list) {
    const ops = ctx.cells.map(([r, c]) => pauliString(GRID[r][c]));
    ctx.A = ops[0];
    ctx.B = ops[1];
    ctx.C = ops[2];
    // The third observable equals sign * A * B. Find that sign from the matrices themselves.
    const AB = matmul(ops[0], ops[1]);
    let sign = 0;
    for (let i = 0; i < 4 && !sign; i++) {
      for (let j = 0; j < 4 && !sign; j++) {
        const z = AB[i][j];
        if (Math.hypot(z[0], z[1]) > 1e-9) {
          const w = ops[2][i][j];
          sign = Math.sign(w[0] * z[0] + w[1] * z[1]);
        }
      }
    }
    ctx.sign = sign;
  }
  return list;
}

/** Six contexts with their operators and required product sign (+1 or -1). */
export const CONTEXTS = buildContexts();
export const CONTEXT_IDS = CONTEXTS.map((c) => c.id);
export const contextById = Object.fromEntries(CONTEXTS.map((c) => [c.id, c]));

export const STATE_KINDS = ['random', 'bell', 'zero'];

/** Two-qubit state vector. 'random' is a seeded Haar-like random state. */
export function makeState(kind, seed = 7) {
  if (kind === 'bell') {
    const k = Math.SQRT1_2;
    return [cx(k), cx(0), cx(0), cx(k)];
  }
  if (kind === 'zero') return [cx(1), cx(0), cx(0), cx(0)];
  const rng = mulberry32(Math.imul(seed >>> 0, 9301) + 49297);
  return normalize([0, 1, 2, 3].map(() => cx(gaussian(rng), gaussian(rng))));
}

function halfProject(M, a, v) {
  const Mv = matvec(M, v);
  return v.map((z, i) => [(z[0] + a * Mv[i][0]) / 2, (z[1] + a * Mv[i][1]) / 2]);
}

/** Joint outcome probabilities for a context: [{a, b, c, p}] over the four (a, b) pairs. */
export function contextProbs(ctx, psi) {
  const out = [];
  for (const a of [1, -1]) {
    for (const b of [1, -1]) {
      const u = halfProject(ctx.A, a, halfProject(ctx.B, b, psi));
      out.push({ a, b, c: ctx.sign * a * b, p: norm2(u) });
    }
  }
  return out;
}

/** One measurement of a context: [a, b, c] with values +1 or -1. */
export function sampleContext(ctx, psi, rng) {
  const probs = contextProbs(ctx, psi);
  const x = rng();
  let acc = 0;
  for (const o of probs) {
    acc += o.p;
    if (x < acc) return [o.a, o.b, o.c];
  }
  const o = probs[probs.length - 1];
  return [o.a, o.b, o.c];
}

/**
 * Measures all six contexts. `draw(id)` may return a recorded shot (for hardware pools);
 * when it returns null the context is sampled exactly from `psi`.
 */
export function measureAll(psi, rng, draw = null) {
  const out = {};
  for (const ctx of CONTEXTS) {
    const shot = draw ? draw(ctx.id) : null;
    out[ctx.id] = shot ? shot.slice() : sampleContext(ctx, psi, rng);
  }
  return out;
}

export const rowValue = (out, r, c) => out[`R${r + 1}`][c];
export const colValue = (out, r, c) => out[`C${c + 1}`][r];

/** Number of contexts in a single round whose product rule held. */
export function roundSatisfied(out) {
  return CONTEXTS.filter((ctx) => {
    const [a, b, c] = out[ctx.id];
    return ctx.sign * a * b * c === 1;
  }).length;
}

/** Tiles whose row reading differs from their column reading in one round. */
export function contextualTiles(out) {
  const tiles = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (rowValue(out, r, c) !== colValue(out, r, c)) tiles.push([r, c]);
  return tiles;
}

/** Mermin score from recorded shots: sum over contexts of the mean signed product. */
export function merminScore(shotsByCtx) {
  let total = 0;
  const per = {};
  for (const ctx of CONTEXTS) {
    const shots = shotsByCtx[ctx.id] || [];
    if (!shots.length) {
      per[ctx.id] = null;
      continue;
    }
    let s = 0;
    let held = 0;
    for (const [a, b, c] of shots) {
      const v = ctx.sign * a * b * c;
      s += v;
      if (v === 1) held++;
    }
    per[ctx.id] = { mean: s / shots.length, held: held / shots.length, n: shots.length };
    total += s / shots.length;
  }
  return { total, per };
}

/** Exact expected Mermin score for a state (always 6 for ideal quantum mechanics). */
export function expectedScore(psi) {
  return CONTEXTS.reduce(
    (sum, ctx) => sum + contextProbs(ctx, psi).reduce((s, o) => s + o.p * ctx.sign * o.a * o.b * o.c, 0),
    0,
  );
}

/** Checks a fixed (classical) assignment: values[r][c] in {+1, -1}. */
export function classicalCheck(values) {
  const perContext = CONTEXTS.map((ctx) => {
    const product = ctx.cells.reduce((p, [r, c]) => p * values[r][c], 1);
    return { id: ctx.id, product, required: ctx.sign, ok: product === ctx.sign };
  });
  const satisfied = perContext.filter((x) => x.ok).length;
  return { satisfied, score: 2 * satisfied - 6, perContext };
}

/** Exhaustive search over all 512 fixed assignments. */
export function classicalOptimum() {
  let maxSatisfied = 0;
  for (let mask = 0; mask < 512; mask++) {
    const v = [0, 1, 2].map((r) => [0, 1, 2].map((c) => ((mask >> (r * 3 + c)) & 1 ? -1 : 1)));
    maxSatisfied = Math.max(maxSatisfied, classicalCheck(v).satisfied);
  }
  return { maxSatisfied, maxScore: 2 * maxSatisfied - 6 };
}
