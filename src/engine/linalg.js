// Minimal complex linear algebra for small quantum systems. Complex numbers are [re, im].

export const cx = (re, im = 0) => [re, im];
export const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
export const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const cabs2 = (a) => a[0] * a[0] + a[1] * a[1];

export const PAULI = {
  I: [[cx(1), cx(0)], [cx(0), cx(1)]],
  X: [[cx(0), cx(1)], [cx(1), cx(0)]],
  Y: [[cx(0), cx(0, -1)], [cx(0, 1), cx(0)]],
  Z: [[cx(1), cx(0)], [cx(0), cx(-1)]],
};

export function kron(A, B) {
  const n = A.length;
  const m = B.length;
  const R = [];
  for (let i = 0; i < n * m; i++) {
    const row = [];
    for (let j = 0; j < n * m; j++) {
      row.push(cmul(A[Math.floor(i / m)][Math.floor(j / m)], B[i % m][j % m]));
    }
    R.push(row);
  }
  return R;
}

export function matmul(A, B) {
  return A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => cadd(s, cmul(a, B[k][j])), cx(0))));
}

export function matvec(A, v) {
  return A.map((row) => row.reduce((s, a, j) => cadd(s, cmul(a, v[j])), cx(0)));
}

export const norm2 = (v) => v.reduce((s, a) => s + cabs2(a), 0);

export function normalize(v) {
  const n = Math.sqrt(norm2(v));
  if (n === 0) throw new Error('Cannot normalize the zero vector');
  return v.map((z) => [z[0] / n, z[1] / n]);
}

/** Pauli string such as ['X', 'Z'] as a 4x4 matrix (first entry acts on qubit 1). */
export const pauliString = (p) => p.map((s) => PAULI[s]).reduce((acc, m) => kron(acc, m));
