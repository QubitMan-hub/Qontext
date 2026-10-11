// Harmony as quantum phase: a d-level system's phases are the d-th roots of unity, evenly spaced hues.

import { oklch } from './color.js';

export const HARMONY_NAMES = {
  2: 'Complementary',
  3: 'Triadic',
  4: 'Tetradic',
  5: 'Pentadic',
  6: 'Hexadic',
  7: 'Heptadic',
  8: 'Octadic',
};

/** The d harmony colors for a palette { base, d, L, C }. */
export function harmony({ base, d, L, C }) {
  const out = [];
  for (let k = 0; k < d; k++) out.push(oklch(L, C, base + (k * 360) / d));
  return out;
}

/** Hue of grid tile (r, c) for measured value v: harmony phase of the tile, flipped 180 degrees for -1. */
export function tileHue({ base, d }, r, c, v) {
  return base + (((r * 3 + c) % d) * 360) / d + (v < 0 ? 180 : 0);
}

export const tileColor = (palette, r, c, v) => oklch(palette.L, palette.C, tileHue(palette, r, c, v));

/** All 18 colors a grid tile can take (9 tiles x 2 outcomes). */
export function allTileColors(palette) {
  const out = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (const v of [1, -1]) out.push(tileColor(palette, r, c, v));
  return out;
}

/** Pentagram colors: hues 144 degrees apart so linked (exclusive) events never look alike. Chroma tracks probability. */
export function pentaColors(palette, probs) {
  return probs.map((p, j) => oklch(palette.L, Math.min(0.3, palette.C * (0.35 + 1.4 * p)), palette.base + 144 * j));
}

/** Entangled asset accent: outcome flips the hue, style (setting) changes chroma. */
export function assetAccent(palette, outcome, style, dark) {
  const L = dark ? Math.min(0.82, Math.max(0.62, palette.L)) : Math.min(0.62, Math.max(0.42, palette.L - 0.1));
  const C = style === 1 ? Math.min(0.3, palette.C * 1.6 + 0.02) : palette.C * 0.7;
  return oklch(L, C, palette.base + (outcome < 0 ? 180 : 0));
}
