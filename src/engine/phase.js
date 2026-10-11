// Phase Dial: light and dark are two points on one turn. Each chrome token passes through the Mach-Zehnder
// model Fringe uses, with the dial angle as the phase difference between the arms: lightness follows the
// intensity at one port, cos²(φ/2), and the two values' chroma add as waves with relative phase φ − 180°.
// That cross term is why the two half-turns pass through different dusks.
//
// Bouncer then makes text readable at every angle. Any wall reads at 4.58 : 1 or better with pure black or pure
// white, so: if the walls sit on both sides of the dead band, move them together just far enough that one of
// the two works on all of them; then move each text color's lightness away from the walls until it reads.

import { hexToLin, hexToOklch, linToOklab, oklch, relativeLuminance } from './color.js';

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

const AA = 4.5;
const TEXT = ['ink', 'ink2', 'ok', 'no'];
const WALLS = ['paper', 'paper2', 'sheet'];
const STEP = 0.005;
const cache = new Map();

/** The Wall Wash of one tile on a paper: 84% paper, 16% tile, mixed in OKLab like CSS color-mix. */
export function washOf(paperHex, tileHex) {
  const [L1, a1, b1] = linToOklab(hexToLin(paperHex));
  const [L2, a2, b2] = linToOklab(hexToLin(tileHex));
  const a = 0.84 * a1 + 0.16 * a2;
  const b = 0.84 * b1 + 0.16 * b2;
  return oklch(0.84 * L1 + 0.16 * L2, Math.hypot(a, b), (Math.atan2(b, a) * 180) / Math.PI).hex;
}

const lum = (hex) => relativeLuminance(hexToLin(hex));

/** The lowest WCAG contrast of text with luminance `y` on any wall. */
function worst(y, walls) {
  let min = Infinity;
  for (const w of walls) min = Math.min(min, (Math.max(y, w) + 0.05) / (Math.min(y, w) + 0.05));
  return min;
}

/** The luminance of every surface text sits on: paper, paper-2, sheet and each tile's wash. */
const wallsOf = (t, washes) => [...WALLS.map((k) => lum(t[k])), ...washes.map((w) => lum(washOf(t.paper, w)))];

/** 'dark' when pure black reads on every wall, else 'light' when pure white does, else null. */
function sideFor(walls) {
  const black = worst(0, walls);
  const white = worst(1, walls);
  if (Math.max(black, white) < AA) return null;
  return black >= white ? 'dark' : 'light';
}

/** Moves one text color's lightness away from the walls until it reads, keeping its hue. */
function readable(hex, side, walls) {
  if (worst(lum(hex), walls) >= AA) return hex;
  const c = hexToOklch(hex);
  const dir = side === 'dark' ? -1 : 1;
  for (let L = c.L + dir * STEP; L > 0 && L < 1; L += dir * STEP) {
    const next = oklch(L, c.C, c.h).hex;
    if (worst(lum(next), walls) >= AA) return next;
  }
  return side === 'dark' ? '#000000' : '#ffffff';
}

/**
 * The chrome at one dial angle, after Bouncer. `washes` are the tile colors the Wall Wash can mix in.
 * Returns the eight tokens, the page's scheme ('light' when the text is dark) and the worst text contrast.
 */
export function phaseTheme(deg, washes = []) {
  const d = normalizeDeg(deg);
  const key = `${d}|${washes.join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const t = {};
  for (const k of Object.keys(PHASE_POINTS.light)) t[k] = phaseMix(PHASE_POINTS.light[k], PHASE_POINTS.dark[k], d);

  let walls = wallsOf(t, washes);
  let side = sideFor(walls);
  // The walls straddle the dead band: move them together, the shortest way out.
  const first = hexToOklch(t.paper).L >= 0.58 ? 1 : -1;
  for (let k = 1; !side && k <= 200; k++) {
    for (const dir of [first, -first]) {
      const moved = { ...t };
      for (const w of WALLS) {
        const c = hexToOklch(t[w]);
        moved[w] = oklch(c.L + dir * k * STEP, c.C, c.h).hex;
      }
      const next = wallsOf(moved, washes);
      if (sideFor(next)) {
        Object.assign(t, moved);
        walls = next;
        side = sideFor(next);
        break;
      }
    }
  }
  // Ink that already reads keeps its side (black or white then reads too); otherwise text takes the side that does.
  if (worst(lum(t.ink), walls) >= AA) side = hexToOklch(t.ink).L < 0.5 ? 'dark' : 'light';
  for (const k of TEXT) t[k] = readable(t[k], side, walls);
  const minContrast = Math.min(...TEXT.map((k) => worst(lum(t[k]), walls)));
  const out = { deg: d, tokens: t, scheme: side === 'dark' ? 'light' : 'dark', minContrast };
  if (cache.size > 4096) cache.clear();
  cache.set(key, out);
  return out;
}
