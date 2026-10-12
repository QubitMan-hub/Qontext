// Fringe: two colors meet at a beam splitter. The needle moves with a transform; text changes per whole degree.
// Wave B starts as wave A's opposite, so the band shows interference at its clearest: somewhere on it port 1
// cancels to gray, and half a turn later it holds all the color.

import { interfere, normalizeHex, hexToOklch, oklch } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { reduced } from '../lib.js';
import { site } from '../world.js';
import { onScroll } from '../scroll.js';

const state = { phi: 90, touched: false, shown: null, bandWidth: 0 };

function paintBand() {
  const a = $('fA').value;
  const b = $('fB').value;
  const stops = [];
  for (let i = 0; i <= 36; i++) stops.push(`${interfere(a, b, i * 10).port1.hex} ${((i / 36) * 100).toFixed(1)}%`);
  $('band').style.background = `linear-gradient(90deg, ${stops.join(',')})`;
  state.shown = null;
  needle();
}

function needle() {
  // Kept on the band at both ends, so the needle never hides off its edge.
  const x = Math.max(0, Math.min(state.bandWidth - 3, (state.phi / 360) * state.bandWidth - 1.5));
  $('needle').style.transform = `translateX(${x.toFixed(1)}px)`;
  const deg = Math.round(state.phi);
  if (deg === state.shown) return;
  state.shown = deg;
  const r = interfere($('fA').value, $('fB').value, state.phi);
  $('band').setAttribute('aria-valuenow', String(deg));
  $('port1').style.background = r.port1.hex;
  $('port2').style.background = r.port2.hex;
  $('port1t').textContent = `Port 1, ${Math.round(r.share1 * 100)}%`;
  $('port2t').textContent = `Port 2, ${Math.round((1 - r.share1) * 100)}%`;
  $('fEnergy').textContent = `Phase ${deg}°. Whatever color leaves port 1 turns up in port 2, so the total never changes.`;
}

function set(phi) {
  state.phi = Math.max(0, Math.min(360, phi));
  needle();
}

export default {
  id: 'fringe',
  init(article) {
    const band = $('band');
    state.bandWidth = band.clientWidth;
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(() => {
        state.bandWidth = band.clientWidth;
        needle();
      }).observe(band);
    }
    const from = (e) => {
      const r = band.getBoundingClientRect();
      state.touched = true;
      set(((e.clientX - r.left) / r.width) * 360);
    };
    band.addEventListener('pointerdown', (e) => {
      band.setPointerCapture(e.pointerId);
      from(e);
    });
    band.addEventListener('pointermove', (e) => (e.buttons || e.pointerType === 'mouse') && from(e));
    band.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 30 : 5;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(state.phi + step);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(state.phi - step);
      else return;
      e.preventDefault();
      state.touched = true;
    });
    $('fA').addEventListener('input', paintBand);
    $('fB').addEventListener('input', paintBand);
    onScroll(article, (p) => {
      if (!state.touched && !reduced()) set((p - 0.2) * 600);
    });
  },
  paint() {
    const a = normalizeHex(site.result.harmony[0]);
    const c = hexToOklch(a);
    $('fA').value = a;
    $('fB').value = normalizeHex(oklch(c.L, c.C, c.h + 180).hex);
    paintBand();
  },
};
