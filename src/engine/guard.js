// Contrast Guard: a contextual tile can show either of two colors, so text on it must pass against all of them.

import { apcaContrast, bestInk, hexToLin, hexToOklch, oklch, wcagContrast } from './color.js';
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

/** The ink (from INKS) that reads best on one fill. */
export function inkFor(fillHex) {
  return bestInk([hexToLin(fillHex)], hexToLin(INKS.dark), hexToLin(INKS.light)).ink === 'dark' ? INKS.dark : INKS.light;
}

/**
 * A fill that text can sit on. Fills that already reach `target` with one of the two inks come back unchanged;
 * mid-tones, where neither ink reaches it, move in OKLCH lightness (hue kept) by the smallest step that does.
 * Returns { fill, ink, ratio }.
 */
export function legibleOn(fillHex, target = WCAG_AA) {
  const rate = (hex) => {
    const ink = inkFor(hex);
    return { fill: hex, ink, ratio: wcagContrast(hexToLin(ink), hexToLin(hex)) };
  };
  const start = rate(fillHex);
  if (start.ratio >= target) return start;
  const { L, C, h } = hexToOklch(fillHex);
  for (let step = 0.01; step <= 1; step += 0.01) {
    for (const dir of [1, -1]) {
      const next = L + dir * step;
      if (next < 0 || next > 1) continue;
      const r = rate(oklch(next, C, h).hex);
      if (r.ratio >= target) return r;
    }
  }
  return start;
}
