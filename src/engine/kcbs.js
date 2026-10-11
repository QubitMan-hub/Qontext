// KCBS: five qutrit projectors on a pentagon of exclusivity. Classical sum <= 2, quantum up to sqrt(5).

export const KCBS_CLASSICAL_MAX = 2;
export const KCBS_QUANTUM_MAX = Math.sqrt(5);

function buildVectors() {
  const c = Math.cos(Math.PI / 5);
  const ct2 = c / (1 + c);
  const ct = Math.sqrt(ct2);
  const st = Math.sqrt(1 - ct2);
  const v = [];
  for (let j = 0; j < 5; j++) {
    const ang = (4 * Math.PI * j) / 5;
    v.push([ct, st * Math.cos(ang), st * Math.sin(ang)]);
  }
  return v;
}

/** Unit vectors v_j with v_j orthogonal to v_(j+1 mod 5). */
export const KCBS_VECTORS = buildVectors();

/** Qutrit state from two angles (degrees). Tilt 0 is the optimal state. */
export function kcbsState(tiltDeg, turnDeg) {
  const t = (tiltDeg * Math.PI) / 180;
  const p = (turnDeg * Math.PI) / 180;
  return [Math.cos(t), Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p)];
}

/** Probability of each of the five events for a real qutrit state. */
export function kcbsProbs(tiltDeg, turnDeg) {
  const psi = kcbsState(tiltDeg, turnDeg);
  return KCBS_VECTORS.map((v) => {
    const d = v[0] * psi[0] + v[1] * psi[1] + v[2] * psi[2];
    return d * d;
  });
}

export const kcbsSum = (probs) => probs.reduce((a, b) => a + b, 0);

/** Brute-force classical maximum: deterministic 0/1 events, neighbours never both 1. */
export function kcbsClassicalMax() {
  let best = 0;
  for (let mask = 0; mask < 32; mask++) {
    let ok = true;
    for (let j = 0; j < 5; j++) if ((mask >> j) & 1 && (mask >> ((j + 1) % 5)) & 1) ok = false;
    if (ok) best = Math.max(best, [0, 1, 2, 3, 4].filter((j) => (mask >> j) & 1).length);
  }
  return best;
}
