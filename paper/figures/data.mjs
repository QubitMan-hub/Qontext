// The numbers behind the paper's figures, computed by the engine itself. Prints JSON.
// Usage, from the repository root: node paper/figures/data.mjs > paper/figures/data.json

import {
  GRID, opLabel, makeState, measureAll, mulberry32, collapseSeed, rowValue, colValue, contextualTiles, roundSatisfied,
  tileColor, guardReport, INKS, phaseTheme, classicalOptimum, harmony, CONTEXTS, contextProbs,
} from '../../src/engine/index.js';
import { paletteFor } from '../../src/site/world.js';
import { PANELS, pairOf, footValues } from '../../src/site/pair-shape.js';
import { collapse } from '../../src/runtime/qontext-runtime.js';

/** One measurement round of the site's state, the way the site measures a world. */
const round = (psi, seed) => measureAll(psi, mulberry32(collapseSeed(seed, 7, 1, 0)));

// Figure: one world read by rows and by columns.
const WORLD = 4227792;
const pal = paletteFor(WORLD);
const world = collapse({ ...pal, state: 'random', stateSeed: 7, seed: WORLD });
const grid = [0, 1, 2].map((r) => [0, 1, 2].map((c) => ({
  op: opLabel(GRID[r][c]).replace(/[₁]/g, '1').replace(/[₂]/g, '2'),
  row: tileColor(pal, r, c, rowValue(world.outcomes, r, c)).hex,
  col: tileColor(pal, r, c, colValue(world.outcomes, r, c)).hex,
  rv: rowValue(world.outcomes, r, c),
  cv: colValue(world.outcomes, r, c),
})));

/** <O> for each of the nine tiles, from the marginal of its row context. */
function expectations(psi) {
  const ev = [];
  for (const ctx of CONTEXTS.filter((x) => x.kind === 'row')) {
    const probs = contextProbs(ctx, psi);
    for (const k of [0, 1, 2]) ev.push(probs.reduce((s, o) => s + o.p * [o.a, o.b, o.c][k], 0));
  }
  return ev;
}

// Figure: how many tiles differ, over many worlds, for three states. A tile's two readings come from two
// independent runs, so it differs with probability (1 - <O>^2) / 2: the expected count is that, summed.
const N = 100000;
const differ = {};
for (const kind of ['random', 'bell', 'zero']) {
  const psi = makeState(kind, 7);
  const counts = Array(10).fill(0);
  let rules = 0;
  for (let s = 1; s <= N; s++) {
    const out = round(psi, s);
    counts[contextualTiles(out).length]++;
    rules += roundSatisfied(out);
  }
  const ev = expectations(psi);
  const mean = counts.reduce((sum, c, k) => sum + c * k, 0) / N;
  differ[kind] = { counts, meanRules: rules / N, mean, predicted: ev.reduce((sum, e) => sum + (1 - e * e) / 2, 0), ev };
}

// Figure: Bouncer. The weakest contrast of each ink over all 18 grid colors, as the palette's lightness moves.
const bouncer = [];
for (let L = 0.3; L <= 0.951; L += 0.005) {
  const p = { base: pal.base, d: 3, L, C: 0.13 };
  bouncer.push({ L: +L.toFixed(3), dark: guardReport(p, INKS.dark).minWcag, light: guardReport(p, INKS.light).minWcag });
}

// Figure: Phase Dial. The chrome and its weakest text contrast at every whole degree.
const phase = [];
for (let d = 0; d < 360; d++) {
  const t = phaseTheme(d);
  phase.push({ deg: d, paper: t.tokens.paper, ink: t.tokens.ink, min: t.minContrast });
}

// Pair Production: the pair for the same world, and the panels that differ.
const pair = pairOf({ ...pal, d: 3 }, world.outcomes);
const feet = footValues(world.outcomes);

console.log(JSON.stringify({
  world: WORLD, palette: pal, harmony: harmony({ ...pal, d: 3 }).map((x) => x.hex), grid,
  differ, N, bouncer, phase, classical: classicalOptimum(),
  pair: { left: Object.fromEntries(pair.left), right: Object.fromEntries(pair.right), differ: pair.differ, names: Object.fromEntries(PANELS.map((p) => [p.id, p.name])), feet },
}, null, 1));
