// Shape Packs: Kochen-Specker style vector sets turned into geometry with built-in coloring rules.
//
// A classical (noncontextual) model must assign 1 to exactly one vector in every basis and never
// assign 1 to two orthogonal vectors. Peres 33 and Cabello 18 admit no such coloring. Yu-Oh 13 does,
// but violates a state-independent inequality: quantum 25/3 for every state against a classical 8.

import { mulberry32 } from './random.js';

const R2 = Math.SQRT2;

function permsWithSigns(base) {
  const perms = new Set();
  const out = [];
  const permute = (arr, k) => {
    if (k === arr.length) {
      const key = arr.join(',');
      if (!perms.has(key)) {
        perms.add(key);
        out.push(arr.slice());
      }
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      permute(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  permute(base.slice(), 0);
  const signed = [];
  for (const p of out) {
    for (let m = 0; m < 1 << p.length; m++) signed.push(p.map((x, i) => ((m >> i) & 1 ? -x : x)));
  }
  return signed;
}

/** Unit vectors, one per ray (sign-canonical: first nonzero component positive), duplicates removed. */
export function uniqueRays(vectors) {
  const out = [];
  for (const v of vectors) {
    const n = Math.hypot(...v);
    if (n === 0) continue;
    let u = v.map((x) => x / n);
    const first = u.find((x) => Math.abs(x) > 1e-9);
    if (first < 0) u = u.map((x) => -x);
    if (!out.some((w) => w.every((x, i) => Math.abs(x - u[i]) < 1e-9))) out.push(u);
  }
  return out;
}

export const SHAPE_SETS = {
  yuoh13: {
    id: 'yuoh13',
    name: 'Yu-Oh 13',
    dim: 3,
    year: 2012,
    vectors: uniqueRays([
      [1, 0, 0], [0, 1, 0], [0, 0, 1],
      [0, 1, 1], [0, 1, -1], [1, 0, 1], [1, 0, -1], [1, 1, 0], [1, -1, 0],
      [1, 1, 1], [-1, 1, 1], [1, -1, 1], [1, 1, -1],
    ]),
  },
  peres33: {
    id: 'peres33',
    name: 'Peres 33',
    dim: 3,
    year: 1991,
    vectors: uniqueRays([
      ...permsWithSigns([0, 0, 1]),
      ...permsWithSigns([0, 1, 1]),
      ...permsWithSigns([0, 1, R2]),
      ...permsWithSigns([1, 1, R2]),
    ]),
  },
  cabello18: {
    id: 'cabello18',
    name: 'Cabello 18',
    dim: 4,
    year: 1996,
    vectors: uniqueRays([
      [0, 0, 0, 1], [0, 0, 1, 0], [1, 1, 0, 0], [1, -1, 0, 0], [0, 1, 0, 0], [1, 0, 1, 0],
      [1, 0, -1, 0], [1, -1, 1, -1], [1, -1, -1, 1], [0, 0, 1, 1], [1, 1, 1, 1], [0, 1, 0, -1],
      [1, 0, 0, 1], [1, 0, 0, -1], [0, 1, -1, 0], [1, 1, -1, 1], [1, 1, 1, -1], [-1, 1, 1, 1],
    ]),
  },
};

export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

function combinations(n, k, start = 0, prefix = [], out = []) {
  if (prefix.length === k) {
    out.push(prefix.slice());
    return out;
  }
  for (let i = start; i < n; i++) {
    prefix.push(i);
    combinations(n, k, i + 1, prefix, out);
    prefix.pop();
  }
  return out;
}

/** Orthogonality graph and complete bases of a vector set. */
export function analyzeShape(set) {
  const V = set.vectors;
  const n = V.length;
  const orth = V.map((a) => V.map((b) => Math.abs(dot(a, b)) < 1e-9));
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (orth[i][j]) pairs.push([i, j]);
  const bases = combinations(n, set.dim).filter((cmb) => {
    for (let i = 0; i < cmb.length; i++) for (let j = i + 1; j < cmb.length; j++) if (!orth[cmb[i]][cmb[j]]) return false;
    return true;
  });
  const basesOf = V.map((_, i) => bases.map((b, k) => (b.includes(i) ? k : -1)).filter((k) => k >= 0));
  return { set, n, dim: set.dim, vectors: V, orth, pairs, bases, basesOf };
}

/**
 * Exhaustive search for a Kochen-Specker coloring. Returns { coloring | null, nodes }.
 * Constraint propagation: a 1 forces all orthogonal neighbours to 0; a basis with all but one at 0
 * forces the last to 1.
 */
export function findKsColoring(A, nodeLimit = 5e6) {
  const { n, orth, bases, basesOf } = A;
  const col = new Array(n).fill(-1);
  let nodes = 0;
  const order = [...Array(n).keys()].sort((a, b) => basesOf[b].length - basesOf[a].length);

  function propagate(trail) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < n; i++) {
        if (col[i] !== 1) continue;
        for (let j = 0; j < n; j++) {
          if (!orth[i][j]) continue;
          if (col[j] === 1) return false;
          if (col[j] === -1) {
            col[j] = 0;
            trail.push(j);
            changed = true;
          }
        }
      }
      for (const b of bases) {
        let ones = 0;
        let free = -1;
        let frees = 0;
        for (const i of b) {
          if (col[i] === 1) ones++;
          else if (col[i] === -1) {
            free = i;
            frees++;
          }
        }
        if (ones > 1) return false;
        if (ones === 0 && frees === 0) return false;
        if (ones === 0 && frees === 1) {
          col[free] = 1;
          trail.push(free);
          changed = true;
        }
      }
    }
    return true;
  }

  function solve() {
    nodes++;
    if (nodes > nodeLimit) throw new Error('Search limit reached');
    const i = order.find((k) => col[k] === -1);
    if (i === undefined) return true;
    for (const v of [1, 0]) {
      const trail = [i];
      col[i] = v;
      if (propagate(trail) && solve()) return true;
      for (const t of trail) col[t] = -1;
    }
    return false;
  }

  const ok = solve();
  return { coloring: ok ? col.slice() : null, nodes };
}

/**
 * Best classical attempt by randomized greedy search: never two orthogonal 1s, as many bases as
 * possible with exactly one 1. Returns { coloring, broken: [basis indices], satisfied }.
 */
export function bestAttempt(A, seed = 1, tries = 400) {
  const rng = mulberry32(seed);
  let best = null;
  for (let t = 0; t < tries; t++) {
    const order = [...Array(A.n).keys()];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const col = new Array(A.n).fill(0);
    const covered = new Array(A.bases.length).fill(false);
    for (const i of order) {
      if (A.orth[i].some((o, j) => o && col[j] === 1)) continue;
      if (A.basesOf[i].some((k) => !covered[k]) || A.basesOf[i].length === 0) {
        col[i] = 1;
        for (const k of A.basesOf[i]) covered[k] = true;
      }
    }
    const broken = covered.map((c, k) => (c ? -1 : k)).filter((k) => k >= 0);
    if (!best || broken.length < best.broken.length) best = { coloring: col, broken, satisfied: A.bases.length - broken.length };
    if (best.broken.length === 0) break;
  }
  return best;
}

/** Yu-Oh value for a real state psi (dimension 3): sum <A_v> - (1/4) sum over ordered orthogonal pairs <A_u A_v>. */
export function yuOhQuantum(A, psi) {
  const n = Math.hypot(...psi);
  const s = psi.map((x) => x / n);
  const p = A.vectors.map((v) => dot(v, s) ** 2);
  const single = p.reduce((acc, x) => acc + (1 - 2 * x), 0);
  const pair = A.pairs.reduce((acc, [i, j]) => acc + (1 - 2 * p[i] - 2 * p[j]), 0);
  return single - 0.5 * pair;
}

/** Classical maximum of the Yu-Oh expression by brute force over all +-1 assignments. */
export function yuOhClassicalMax(A) {
  let best = -Infinity;
  for (let m = 0; m < 1 << A.n; m++) {
    const a = (i) => ((m >> i) & 1 ? -1 : 1);
    let s = 0;
    for (let i = 0; i < A.n; i++) s += a(i);
    let pair = 0;
    for (const [i, j] of A.pairs) pair += a(i) * a(j);
    best = Math.max(best, s - 0.5 * pair);
  }
  return best;
}

export const YU_OH_QUANTUM = 25 / 3;
export const YU_OH_CLASSICAL = 8;

/** Rotation in the plane of axes i, j of an n-dimensional point. */
export function rotatePlane(p, i, j, angle) {
  const q = p.slice();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  q[i] = c * p[i] - s * p[j];
  q[j] = s * p[i] + c * p[j];
  return q;
}

/**
 * Projects a 3D or 4D point to screen space. 4D points are first rotated in the x-w plane by `w`
 * and then perspective-projected from 4D to 3D. Returns [x, y, depth].
 */
export function projectPoint(p, { yaw, pitch, w = 0, scale = 1 }) {
  let q = p.slice();
  if (q.length === 4) {
    q = rotatePlane(q, 0, 3, w);
    const k = 1 / (2.2 - q[3]);
    q = [q[0] * k * 1.6, q[1] * k * 1.6, q[2] * k * 1.6];
  }
  q = rotatePlane(q, 0, 2, yaw);
  q = rotatePlane(q, 1, 2, pitch);
  return [q[0] * scale, q[1] * scale, q[2]];
}

/** Wavefront OBJ of the shape: one vertex per ray tip (both directions) and line segments for basis edges. */
export function toObj(A, name = 'qontext-shape') {
  const lines = [`# Qontext Shape Pack: ${A.set.name}`, `o ${name}`];
  const pts = [];
  for (const v of A.vectors) {
    const p3 = v.length === 4 ? projectPoint(v, { yaw: 0, pitch: 0, w: 0.6 }) : v;
    pts.push(p3, p3.map((x) => -x));
  }
  for (const p of pts) lines.push(`v ${p[0].toFixed(6)} ${p[1].toFixed(6)} ${(p[2] ?? 0).toFixed(6)}`);
  for (const b of A.bases) {
    for (let i = 0; i < b.length; i++) {
      for (let j = i + 1; j < b.length; j++) lines.push(`l ${2 * b[i] + 1} ${2 * b[j] + 1}`);
    }
  }
  return lines.join('\n') + '\n';
}
