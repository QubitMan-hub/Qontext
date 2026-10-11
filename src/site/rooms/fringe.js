// Fringe: two colors meet at a beam splitter. The needle moves with a transform; text changes per whole degree.

import { interfere, normalizeHex } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { reduced } from '../lib.js';
import { site } from '../world.js';
import { onScroll } from '../scroll.js';

const state = { phi: 0, touched: false, shown: null, bandWidth: 0 };

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
  $('needle').style.transform = `translateX(${((state.phi / 360) * state.bandWidth - 1.5).toFixed(1)}px)`;
  const deg = Math.round(state.phi);
  if (deg === state.shown) return;
  state.shown = deg;
  const r = interfere($('fA').value, $('fB').value, state.phi);
  $('band').setAttribute('aria-valuenow', String(deg));
  $('port1').style.background = r.port1.hex;
  $('port2').style.background = r.port2.hex;
  $('port1t').textContent = `Port 1, ${Math.round(r.share1 * 100)}% of the energy`;
  $('port2t').textContent = `Port 2, ${Math.round((1 - r.share1) * 100)}%`;
  $('fEnergy').textContent = `Phase ${deg}°. Energy in ${r.energyIn.toFixed(4)}, out ${r.energyOut.toFixed(4)}.`;
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
    $('fA').value = normalizeHex(site.result.harmony[0]);
    $('fB').value = normalizeHex(site.result.harmony[1]);
    paintBand();
  },
};
