// Contrast Guard: a contextual tile can show either of two colors, so text on it must pass against all of them.

import { apcaContrast, hexToLin, wcagContrast } from './color.js';
import { allTileColors } from './harmony.js';

export const INKS = { dark: '#14131c', light: '#ffffff' };
export const WCAG_AA = 4.5;
export const WCAG_AA_LARGE = 3;
export const APCA_BODY = 60;

/** Worst-case WCAG ratio and APCA |Lc| for `inkHex` text over every color the grid can show. */
export function guardReport(palette, inkHex) {
  const ink = hexToLin(inkHex);
  let minWcag = Infinity;
  let minApca = Infinity;
  let worst = null;
  for (const col of allTileColors(palette)) {
    const w = wcagContrast(ink, col.lin);
    const a = Math.abs(apcaContrast(ink, col.lin));
    if (w < minWcag) {
      minWcag = w;
      worst = col.hex;
    }
    minApca = Math.min(minApca, a);
  }
  const level = minWcag >= WCAG_AA ? 'pass' : minWcag >= WCAG_AA_LARGE ? 'large-only' : 'fail';
  return { minWcag, minApca, worst, level, exportable: level !== 'fail' };
}

/**
 * The lightness closest to the palette's current value at which `inkHex` reaches `target` (WCAG)
 * on every grid color, searched in 0.01 steps. Returns null when no lightness works.
 */
export function fixLightness(palette, inkHex, target = WCAG_AA) {
  if (guardReport(palette, inkHex).minWcag >= target) return palette.L;
  for (let step = 1; step <= 80; step++) {
    for (const dir of [1, -1]) {
      const L = Math.round((palette.L + dir * step * 0.01) * 100) / 100;
      if (L < 0.2 || L > 0.97) continue;
      if (guardReport({ ...palette, L }, inkHex).minWcag >= target) return L;
    }
  }
  return null;
}
