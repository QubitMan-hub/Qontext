// Pair Production, as data: a low-top sneaker in nine panels, and the maths that paints a pair from a world.
//
// The nine panels are the nine tiles of the Mermin-Peres grid: three bands (rows) by three zones (columns).
// The left foot reads the grid by its rows, the right foot by its columns, so a panel can be one true color on
// one foot and another on the other. No DOM here: the section module draws it, and node:test checks it.

import { tileColor, rowValue, colValue, CONTEXTS, hashSeed } from '../engine/index.js';
import { PHOTO } from './pair-photo.js';

export const BANDS = ['Top band', 'Body band', 'Sole band'];
export const ZONES = ['Toe zone', 'Mid zone', 'Heel zone'];

/**
 * One shoe: a studio photo of a plain white sneaker, toe to the right (PHOTO, made by scripts/pair_photo.py), and
 * its nine panels traced from the photo's own seams. The site lays each panel's color over the photo with a
 * multiply blend, so the leather's shading, stitching and laces show through. Everything else stays white.
 */
export { PHOTO };
export const SHOE_VIEWBOX = `0 0 ${PHOTO.width} ${PHOTO.height}`;

const NAMES = [
  ['laces', 'Laces'], ['tongue', 'Tongue'], ['collar', 'Collar'],
  ['toebox', 'Toe box'], ['stripe', 'Stripe'], ['heel', 'Heel counter'],
  ['bumper', 'Toe bumper'], ['midsole', 'Midsole'], ['heelsole', 'Heel sole'],
];
export const PANELS = NAMES.map(([id, name], k) => ({ id, name, r: Math.floor(k / 3), c: k % 3, d: PHOTO.panels[id] }));

/**
 * Where the logo sits on the stripe (photo pixels), and how bright the white leather is there (0 to 1). Colors
 * are multiplied by the leather, so Bouncer checks the logo against the stripe as it really shows.
 */
export const LOGO = { x: 446, y: 304, angle: -9, size: 46, shade: 0.87 };

/** Every grid value a world measured, as the two feet read them: rows on the left, columns on the right. */
export function footValues(outcomes) {
  const grid = (read) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => read(outcomes, r, c)));
  return { left: grid(rowValue), right: grid(colValue) };
}

/**
 * A pair painted from a palette and a world's outcomes. `both` is the two colors a panel can take (value +1
 * first), `differ` the panels whose feet disagree.
 */
export function pairOf(palette, outcomes) {
  const { left: lv, right: rv } = footValues(outcomes);
  const left = new Map();
  const right = new Map();
  const both = new Map();
  const differ = [];
  for (const p of PANELS) {
    left.set(p.id, tileColor(palette, p.r, p.c, lv[p.r][p.c]).hex);
    right.set(p.id, tileColor(palette, p.r, p.c, rv[p.r][p.c]).hex);
    both.set(p.id, [tileColor(palette, p.r, p.c, 1).hex, tileColor(palette, p.r, p.c, -1).hex]);
    if (lv[p.r][p.c] !== rv[p.r][p.c]) differ.push(p.id);
  }
  return { left, right, both, differ };
}

/**
 * The six rules, as a pair shows them: each band of the left foot (rows) and each zone of the right foot
 * (columns) must multiply to its context's sign. A panel at -1 is "flipped" (its color turned half way round).
 */
export function pairChecks(leftValues, rightValues) {
  return CONTEXTS.map((ctx) => {
    const values = ctx.kind === 'row' ? leftValues : rightValues;
    const product = ctx.cells.reduce((p, [r, c]) => p * values[r][c], 1);
    const where = ctx.kind === 'row' ? `${BANDS[ctx.index]}, left foot` : `${ZONES[ctx.index]}, right foot`;
    const rule = ctx.sign > 0 ? 'an even number flipped' : 'an odd number flipped';
    return { ctx: ctx.id, label: `${where}: ${rule}`, ok: product === ctx.sign };
  });
}

/** Twelve other worlds for the drop, picked from this world's number, so the wall stays put until a roll. */
export function dropSeeds(seed, n = 12) {
  const seeds = [];
  for (let k = 0; seeds.length < n; k++) {
    const s = (hashSeed(seed, 0x5e, k) % 9999999) + 1;
    if (s !== seed && !seeds.includes(s)) seeds.push(s);
  }
  return seeds;
}
