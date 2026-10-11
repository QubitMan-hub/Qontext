// Entangled Assets: two assets share a Bell pair. Each picks a style (measurement setting);
// the accent each receives is its outcome. Correlations follow the CHSH game.

export const CHSH_CLASSICAL_MAX = 2;
export const TSIRELSON = 2 * Math.SQRT2;
export const SETTING_KEYS = ['a0b0', 'a0b1', 'a1b0', 'a1b1'];

/** Measurement angles in the X-Z plane, degrees. Optimal for the Bell state. */
export const CHSH_ANGLES = { a: [0, 90], b: [45, -45] };

/** Correlation E(x, y) = cos(theta_a - theta_b) for the Bell state with real-plane measurements. */
export function correlation(x, y, angles = CHSH_ANGLES) {
  return Math.cos(((angles.a[x] - angles.b[y]) * Math.PI) / 180);
}

/** One entangled pair: outcomes [oa, ob] for settings x, y. */
export function samplePair(x, y, rng, angles = CHSH_ANGLES) {
  const E = correlation(x, y, angles);
  const oa = rng() < 0.5 ? 1 : -1;
  const ob = rng() < (1 + E) / 2 ? oa : -oa;
  return [oa, ob];
}

/** S = E00 + E01 + E10 - E11. */
export function chshValue(E) {
  return E.a0b0 + E.a0b1 + E.a1b0 - E.a1b1;
}

export function idealCorrelations(angles = CHSH_ANGLES) {
  return {
    a0b0: correlation(0, 0, angles),
    a0b1: correlation(0, 1, angles),
    a1b0: correlation(1, 0, angles),
    a1b1: correlation(1, 1, angles),
  };
}

/** Correlations and S from recorded shots: { a0b0: [[oa, ob], ...], ... }. */
export function chshFromShots(shots) {
  const E = {};
  const n = {};
  for (const key of SETTING_KEYS) {
    const arr = shots[key] || [];
    n[key] = arr.length;
    E[key] = arr.length ? arr.reduce((s, [a, b]) => s + a * b, 0) / arr.length : 0;
  }
  return { E, n, S: chshValue(E) };
}

/** Win probability of the CHSH game: players win unless x = y = 1 requires disagreement. */
export const winRate = (S) => 0.5 + S / 8;

/** Brute force over all deterministic local strategies. */
export function chshClassicalMax() {
  let best = -Infinity;
  for (let m = 0; m < 16; m++) {
    const a = [m & 1 ? -1 : 1, m & 2 ? -1 : 1];
    const b = [m & 4 ? -1 : 1, m & 8 ? -1 : 1];
    best = Math.max(best, a[0] * b[0] + a[0] * b[1] + a[1] * b[0] - a[1] * b[1]);
  }
  return best;
}

export const STYLE_NAMES = ['Calm', 'Bold'];
