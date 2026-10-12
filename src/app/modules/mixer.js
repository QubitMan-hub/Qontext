import { interfere, fringe } from '../../engine/index.js';
import { $, toast } from '../dom.js';
import { store, setProject } from '../store.js';

export function init() {
  $('mixA').addEventListener('input', (e) => setProject({ mixA: e.target.value }));
  $('mixB').addEventListener('input', (e) => setProject({ mixB: e.target.value }));
  $('phiIn').addEventListener('input', (e) => setProject({ phi: parseFloat(e.target.value) }));
  $('mixSwap').addEventListener('click', () => setProject({ mixA: store.project.mixB, mixB: store.project.mixA }));
  // The band is the dial too: press or drag along it to set the phase.
  const band = $('fringe');
  const turn = (e) => {
    const r = band.getBoundingClientRect();
    setProject({ phi: Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 360) });
  };
  band.addEventListener('pointerdown', (e) => {
    band.setPointerCapture(e.pointerId);
    turn(e);
  });
  band.addEventListener('pointermove', (e) => {
    if (band.hasPointerCapture(e.pointerId)) turn(e);
  });
  $('mixToHarm').addEventListener('click', () => {
    const r = interfere(store.project.mixA, store.project.mixB, store.project.phi);
    if (r.port1.amp < 0.01) {
      toast('Port 1 is nearly gray, so it has no phase to use');
      return;
    }
    setProject({ base: Math.round(r.port1.h) });
    toast(`The Unity Wheel now starts at ${Math.round(r.port1.h)}°`);
  });
}

export function render() {
  const { mixA, mixB, phi } = store.project;
  $('mixA').value = mixA;
  $('mixB').value = mixB;
  $('phiIn').value = phi;
  $('phiVal').textContent = `${Math.round(phi)}°`;
  const r = interfere(mixA, mixB, phi);
  $('outA').style.background = r.port1.hex;
  $('outB').style.background = r.port2.hex;
  $('outAtxt').textContent = `Port 1, ${r.port1.hex}, strength ${r.port1.amp.toFixed(3)}`;
  $('outBtxt').textContent = `Port 2, ${r.port2.hex}, strength ${r.port2.amp.toFixed(3)}`;
  $('eIn').textContent = r.energyIn.toFixed(4);
  $('eOut').textContent = r.energyOut.toFixed(4);
  $('eShare').textContent = `${Math.round(r.share1 * 100)}%`;
  const cols = fringe(mixA, mixB, 36);
  $('fringe').style.background = `linear-gradient(90deg, ${cols.map((c, i) => `${c} ${((i / 36) * 100).toFixed(1)}%`).join(',')})`;
  $('fringeMk').style.left = `calc(${(phi / 360) * 100}% - 1.5px)`;
}
