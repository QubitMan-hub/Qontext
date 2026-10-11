// Phase Dial: light and dark are two points on one turn. Each chrome token passes through the Mach-Zehnder
// model Fringe uses, with the dial angle as the phase difference between the arms: lightness follows the
// intensity at one port, cos²(φ/2), and the two values' chroma add as waves with relative phase φ − 180°.
// That cross term is why the two half-turns pass through different dusks.

import { hexToOklch, oklch } from './color.js';

/** Today's light and dark chrome, as in src/site/site.css (a test keeps the two in step). */
export const PHASE_POINTS = {
  light: { paper: '#eef0f4', paper2: '#e2e5ee', sheet: '#fafbfd', ink: '#1d1f52', ink2: '#4b4e7c', rule: '#c8ccdc', ok: '#1a6e49', no: '#b4232c' },
  dark: { paper: '#121433', paper2: '#181a42', sheet: '#1c1f4a', ink: '#eceefb', ink2: '#aeb1d6', rule: '#33366c', ok: '#63d49c', no: '#ff8f86' },
};

/** Any angle as a whole degree from 0 to 359. Not-a-number becomes 0. */
export function normalizeDeg(deg) {
  const d = Math.round(Number(deg));
  return Number.isFinite(d) ? ((d % 360) + 360) % 360 : 0;
}

/** One token at one angle: the light value at 0°, the dark value at 180°, an interference blend between. */
export function phaseMix(lightHex, darkHex, deg) {
  const d = normalizeDeg(deg);
  if (d === 0) return lightHex;
  if (d === 180) return darkHex;
  const r = (d * Math.PI) / 180;
  const wa = Math.abs(Math.cos(r / 2));
  const wb = Math.abs(Math.sin(r / 2));
  const A = hexToOklch(lightHex);
  const B = hexToOklch(darkHex);
  const ta = (A.h * Math.PI) / 180;
  const tb = (B.h * Math.PI) / 180 + r - Math.PI;
  const x = wa * A.C * Math.cos(ta) + wb * B.C * Math.cos(tb);
  const y = wa * A.C * Math.sin(ta) + wb * B.C * Math.sin(tb);
  return oklch(wa * wa * A.L + wb * wb * B.L, Math.hypot(x, y), (Math.atan2(y, x) * 180) / Math.PI).hex;
}
