// Mach-Zehnder interferometer for color. A color is a wave: hue is its phase, OKLCH chroma its amplitude.

import { hexToOklch, oklch, wrapHue } from './color.js';

/**
 * Mixes two colors through a 50:50 beam splitter after shifting B by phiDeg.
 * Returns two output ports. Chroma energy (sum of squared amplitudes) is conserved.
 */
export function interfere(hexA, hexB, phiDeg) {
  const A = hexToOklch(hexA);
  const B = hexToOklch(hexB);
  const za = [A.C * Math.cos((A.h * Math.PI) / 180), A.C * Math.sin((A.h * Math.PI) / 180)];
  const ph = ((B.h + phiDeg) * Math.PI) / 180;
  const zb = [B.C * Math.cos(ph), B.C * Math.sin(ph)];
  const k = Math.SQRT1_2;
  const o1 = [(za[0] + zb[0]) * k, (za[1] + zb[1]) * k];
  const o2 = [(za[0] - zb[0]) * k, (za[1] - zb[1]) * k];
  const L = (A.L + B.L) / 2;
  const port = (o) => {
    const amp = Math.hypot(o[0], o[1]);
    const hue = wrapHue((Math.atan2(o[1], o[0]) * 180) / Math.PI);
    return { ...oklch(L, amp, hue), amp };
  };
  const e1 = o1[0] ** 2 + o1[1] ** 2;
  const e2 = o2[0] ** 2 + o2[1] ** 2;
  return {
    port1: port(o1),
    port2: port(o2),
    energyIn: A.C ** 2 + B.C ** 2,
    energyOut: e1 + e2,
    share1: e1 + e2 > 0 ? e1 / (e1 + e2) : 0.5,
  };
}

/** Port 1 colors across a full phase sweep, for drawing an interference fringe. */
export function fringe(hexA, hexB, steps = 36) {
  const out = [];
  for (let i = 0; i <= steps; i++) out.push(interfere(hexA, hexB, (360 * i) / steps).port1.hex);
  return out;
}
