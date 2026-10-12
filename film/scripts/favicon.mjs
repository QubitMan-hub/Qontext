// The favicon: the same split tile as the link-preview card and the app icon, as a tiny SVG.
import { writeFileSync } from 'node:fs';
import { contextualTiles, tileColor, rowValue, colValue, fixLightness, INKS, hashSeed } from '../../src/engine/index.js';
import { collapse } from '../../src/runtime/qontext-runtime.js';

const palette = { base: hashSeed(1, 11) % 360, d: 3, L: 0.76, C: 0.13 };
const L = fixLightness(palette, INKS.dark);
if (L !== null) palette.L = L;
const out = collapse({ ...palette, state: 'random', stateSeed: 7, seed: 1 }).outcomes;
const [r, c] = contextualTiles(out)[0] ?? [0, 0];
const a = tileColor(palette, r, c, rowValue(out, r, c)).hex;
const b = tileColor(palette, r, c, colValue(out, r, c)).hex;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><title>Qontext</title><path d="M4 2h24a2 2 0 0 1 2 2L2 30V4a2 2 0 0 1 2-2z" fill="${a}"/><path d="M30 4v24a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="${b}"/></svg>\n`;
writeFileSync(new URL('../../src/site/public/favicon.svg', import.meta.url), svg);
console.log('favicon', a, b);
