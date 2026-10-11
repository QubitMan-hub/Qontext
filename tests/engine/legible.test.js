// Bouncer for single fills: whatever accent a collapse produces, text on it must stay readable.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inkFor, legibleOn, oklch, hexToLin, wcagContrast, INKS } from '../../src/engine/index.js';

const ratio = (a, b) => wcagContrast(hexToLin(a), hexToLin(b));

test('inkFor picks whichever ink reads better', () => {
  assert.equal(inkFor('#ffffff'), INKS.dark);
  assert.equal(inkFor('#000000'), INKS.light);
  // Around 20% luminance the old fixed threshold picked white at about 3.9:1; dark ink does better here.
  const mid = '#9a8f7c';
  assert.ok(ratio(inkFor(mid), mid) >= Math.max(ratio(INKS.dark, mid), ratio(INKS.light, mid)) - 1e-9);
});

test('legibleOn leaves fills that already pass untouched', () => {
  for (const hex of ['#f4f4f4', '#1d1f52', '#ffd84d']) {
    const r = legibleOn(hex);
    assert.equal(r.fill, hex);
    assert.ok(r.ratio >= 4.5);
  }
});

test('legibleOn moves a mid-tone just far enough, keeping its hue', () => {
  const mid = oklch(0.595, 0.14, 30).hex; // about 4.4:1 with either ink
  assert.ok(Math.max(ratio(INKS.dark, mid), ratio(INKS.light, mid)) < 4.5, 'fixture must start unreadable');
  const r = legibleOn(mid);
  assert.notEqual(r.fill, mid);
  assert.ok(ratio(r.ink, r.fill) >= 4.5);
  assert.equal(r.ratio, ratio(r.ink, r.fill));
});

test('every accent the engine can make becomes readable', () => {
  for (let h = 0; h < 360; h += 7) {
    for (const L of [0.45, 0.55, 0.6, 0.65, 0.7]) {
      for (const C of [0.05, 0.12, 0.2]) {
        const r = legibleOn(oklch(L, C, h).hex);
        assert.ok(r.ratio >= 4.5, `${oklch(L, C, h).hex} -> ${r.fill} at ${r.ratio}`);
      }
    }
  }
});
