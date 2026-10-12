// Pair Production, as data: a low-top sneaker in nine panels, and the maths that paints a pair from a world.
//
// The nine panels are the nine tiles of the Mermin-Peres grid: three bands (rows) by three zones (columns).
// The left foot reads the grid by its rows, the right foot by its columns, so a panel can be one true color on
// one foot and another on the other. No DOM here: the section module draws it, and node:test checks it.

import { tileColor, rowValue, colValue, CONTEXTS, hashSeed } from '../engine/index.js';

export const BANDS = ['Top band', 'Body band', 'Sole band'];
export const ZONES = ['Toe zone', 'Mid zone', 'Heel zone'];

/** One shoe, toe to the right, in a 600 by 300 box. Panels share their edges, so seams are drawn as strokes. */
export const SHOE_VIEWBOX = '0 0 600 300';

export const PANELS = [
  // Top band
  { id: 'laces', name: 'Laces', r: 0, c: 0, d: 'M232 104 C280 116 330 132 372 150 C368 160 364 170 358 178 L282 153 L224 134 Z' },
  { id: 'tongue', name: 'Tongue', r: 0, c: 1, d: 'M166 108 C168 92 174 78 190 74 L212 72 C224 72 230 86 232 104 L224 134 L166 140 Z' },
  { id: 'collar', name: 'Collar', r: 0, c: 2, d: 'M48 104 C80 108 104 124 124 123 C144 122 158 112 166 108 L166 140 L140 146 C110 152 70 148 42 140 C44 128 46 116 48 104 Z' },
  // Body band
  { id: 'toebox', name: 'Toe box', r: 1, c: 0, d: 'M372 150 C440 158 520 166 556 182 C578 192 586 210 582 226 L440 220 L424 219 C370 198 320 168 282 153 L358 178 C364 170 368 160 372 150 Z' },
  { id: 'stripe', name: 'Stripe', r: 1, c: 1, d: 'M140 146 L166 140 L224 134 L282 153 C320 168 370 198 424 219 L300 214 C250 196 190 162 140 146 Z' },
  { id: 'heel', name: 'Heel counter', r: 1, c: 2, d: 'M42 140 C70 148 110 152 140 146 C190 162 250 196 300 214 L196 213 L34 212 C30 190 34 160 42 140 Z' },
  // Sole band
  { id: 'bumper', name: 'Toe bumper', r: 2, c: 0, d: 'M440 220 L582 226 C590 234 588 248 576 253 C560 259 520 260 452 261 Z' },
  { id: 'midsole', name: 'Midsole', r: 2, c: 1, d: 'M196 213 L300 214 L424 219 L440 220 L452 261 L180 262 Z' },
  { id: 'heelsole', name: 'Heel sole', r: 2, c: 2, d: 'M34 212 L196 213 L180 262 L60 262 C44 262 32 254 30 240 C29 228 31 218 34 212 Z' },
];

/** Where the logo sits on the stripe: a split tile and the word Qontext. */
export const LOGO = { x: 240, y: 173, size: 14 };

/** Laces across the lace panel, eyelets, a toe-cap seam and the tread under the sole. Decoration only. */
export const LACES = [0.14, 0.31, 0.48, 0.65, 0.82].map((t) => {
  const [x, y] = [228 + t * 137, 119 + t * 45];
  return `M${(x - 5).toFixed(1)} ${(y - 11).toFixed(1)} L${(x + 5).toFixed(1)} ${(y + 11).toFixed(1)}`;
});
export const SEAMS = ['M470 222 C484 200 508 190 540 194', 'M38 236 L578 240'];
export const TREAD = Array.from({ length: 36 }, (_, k) => `M${70 + k * 14} 254 L${66 + k * 14} 262`);

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
