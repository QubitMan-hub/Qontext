import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  oklch, hexToOklch, hexToLin, normalizeHex, isHex, wcagContrast, apcaContrast, bestInk, inGamut,
  oklchToLinear, simulateCvd, cvdFilterValues, interfere, fringe, harmony, tileColor, tileHue, allTileColors,
  pentaColors, assetAccent, HARMONY_NAMES, wrapHue,
} from '../../src/engine/index.js';

const close = (a, b, eps) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b} (eps ${eps})`);

test('hex normalization', () => {
  assert.equal(normalizeHex('#ABC'), '#aabbcc');
  assert.equal(normalizeHex('a1b2c3'), '#a1b2c3');
  assert.ok(isHex('#fff') && !isHex('#ggg') && !isHex(42));
  assert.throws(() => normalizeHex('blue'));
});

test('OKLCH round trip through sRGB hex', () => {
  for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#1fa39a', '#e0664f', '#808080', '#ffffff', '#000000']) {
    const c = hexToOklch(hex);
    assert.equal(oklch(c.L, c.C, c.h).hex, hex);
  }
});

test('known OKLab values: pure red', () => {
  const r = hexToOklch('#ff0000');
  close(r.L, 0.62796, 1e-4);
  close(r.C, 0.25768, 1e-4);
  close(r.h, 29.2339, 1e-3);
});

test('gamut mapping keeps every output in sRGB and preserves hue', () => {
  for (let h = 0; h < 360; h += 7.5) {
    for (const L of [0.3, 0.5, 0.7, 0.9]) {
      const c = oklch(L, 0.4, h);
      assert.ok(c.lin.every((x) => x >= 0 && x <= 1));
      assert.ok(inGamut(oklchToLinear(c.L, c.C, c.h)));
      if (c.C > 0.02) {
        const dh = Math.abs(((hexToOklch(c.hex).h - h + 540) % 360) - 180);
        assert.ok(dh < 2.5, `hue drift ${dh} at L ${L}, h ${h}`);
      }
    }
  }
});

test('WCAG contrast: black on white is 21, symmetric, same color is 1', () => {
  const black = hexToLin('#000000');
  const white = hexToLin('#ffffff');
  close(wcagContrast(black, white), 21, 1e-9);
  close(wcagContrast(white, black), 21, 1e-9);
  close(wcagContrast(white, white), 1, 1e-9);
  close(wcagContrast(hexToLin('#777777'), white), 4.48, 0.01);
});

test('APCA reference values', () => {
  const black = hexToLin('#000000');
  const white = hexToLin('#ffffff');
  close(apcaContrast(black, white), 106.04, 0.05);
  close(apcaContrast(white, black), -107.88, 0.05);
  close(apcaContrast(hexToLin('#888888'), hexToLin('#ffffff')), 63.06, 0.1);
  assert.equal(apcaContrast(white, white), 0);
});

test('bestInk picks the ink with the better worst case', () => {
  const lightBgs = ['#ffffff', '#f0f0f0'].map(hexToLin);
  assert.equal(bestInk(lightBgs, hexToLin('#111111'), hexToLin('#ffffff')).ink, 'dark');
  const darkBgs = ['#000000', '#202020'].map(hexToLin);
  assert.equal(bestInk(darkBgs, hexToLin('#111111'), hexToLin('#ffffff')).ink, 'light');
});

test('CVD simulation leaves grays unchanged and builds filter strings', () => {
  const g = hexToLin('#808080');
  for (const t of ['protan', 'deutan', 'tritan']) {
    simulateCvd(g, t).forEach((x, i) => close(x, g[i], 0.01));
    assert.equal(cvdFilterValues(t).split(/\s+/).length, 20);
  }
  assert.deepEqual(simulateCvd([0.2, 0.3, 0.4], 'none'), [0.2, 0.3, 0.4]);
});

test('interferometer conserves chroma energy at every phase', () => {
  for (let phi = 0; phi <= 360; phi += 15) {
    const r = interfere('#1fa39a', '#e0664f', phi);
    close(r.energyIn, r.energyOut, 1e-12);
    assert.ok(r.share1 >= 0 && r.share1 <= 1);
  }
});

test('identical inputs: full constructive in port 1 at phase 0, dark port 2', () => {
  const r = interfere('#3366cc', '#3366cc', 0);
  close(r.share1, 1, 1e-9);
  close(r.port2.amp, 0, 1e-9);
  const s = interfere('#3366cc', '#3366cc', 180);
  close(s.share1, 0, 1e-9);
  assert.equal(fringe('#3366cc', '#cc6633', 12).length, 13);
});

test('harmony spacing equals 360/d', () => {
  for (let d = 2; d <= 8; d++) {
    const cols = harmony({ base: 30, d, L: 0.7, C: 0.1 });
    assert.equal(cols.length, d);
    for (let k = 0; k < d; k++) close(cols[k].h, wrapHue(30 + (k * 360) / d), 1e-9);
    assert.ok(HARMONY_NAMES[d]);
  }
});

test('tile colors: -1 is the complement of +1', () => {
  const pal = { base: 200, d: 3, L: 0.72, C: 0.13 };
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) close(wrapHue(tileHue(pal, r, c, -1) - tileHue(pal, r, c, 1)), 180, 1e-9);
  }
  assert.equal(allTileColors(pal).length, 18);
  assert.match(tileColor(pal, 0, 0, 1).hex, /^#[0-9a-f]{6}$/);
});

test('pentagram neighbours sit 144 degrees apart', () => {
  const cols = pentaColors({ base: 10, d: 3, L: 0.7, C: 0.12 }, [0.447, 0.447, 0.447, 0.447, 0.447]);
  for (let j = 0; j < 5; j++) close(wrapHue(cols[(j + 1) % 5].h - cols[j].h), 144, 1e-9);
});

test('asset accents differ by outcome', () => {
  const pal = { base: 200, d: 3, L: 0.72, C: 0.13 };
  assert.notEqual(assetAccent(pal, 1, 0, false).hex, assetAccent(pal, -1, 0, false).hex);
  assert.notEqual(assetAccent(pal, 1, 1, true).hex, assetAccent(pal, 1, 0, true).hex);
});

import { guardReport, fixLightness, INKS, WCAG_AA } from '../../src/engine/index.js';

test('Contrast Guard: report and automatic lightness fix', () => {
  const pal = { base: 200, d: 3, L: 0.55, C: 0.13 };
  const before = guardReport(pal, INKS.dark);
  assert.ok(before.minWcag < WCAG_AA);
  assert.equal(before.level === 'pass', false);
  const L = fixLightness(pal, INKS.dark);
  assert.ok(L > pal.L);
  const after = guardReport({ ...pal, L }, INKS.dark);
  assert.ok(after.minWcag >= WCAG_AA);
  assert.equal(after.level, 'pass');
  assert.ok(after.minApca > 0);
  assert.equal(fixLightness({ ...pal, L }, INKS.dark), L);
  const light = fixLightness({ ...pal, L: 0.7 }, INKS.light);
  assert.ok(light !== null && light < 0.7);
});
