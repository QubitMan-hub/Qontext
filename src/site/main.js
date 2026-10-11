// Qontext website entry point. The order matters: the world exists before anything paints, and every
// swatch is built before observation starts.

import { setWorld, initialSeed, superposeAll, toneAll } from './world.js';
import { initHero } from './hero.js';
import { initRooms } from './rooms.js';
import { initExtras } from './extras.js';

/** Sizes each wall label so its longest word fits the column at the widest the scroll animation reaches. */
function fitWalls() {
  for (const h of document.querySelectorAll('.room-name')) {
    if (!h.querySelector('.wd')) h.innerHTML = h.textContent.split(' ').map((w) => `<span class="wd">${w}</span>`).join(' ');
    h.style.removeProperty('--fit');
    const avail = h.clientWidth;
    const prev = h.style.fontVariationSettings;
    h.style.animation = 'none';
    h.style.fontVariationSettings = '"wdth" 125';
    const widest = Math.max(...Array.from(h.querySelectorAll('.wd'), (s) => s.getBoundingClientRect().width));
    h.style.fontVariationSettings = prev;
    h.style.animation = '';
    if (widest > avail) {
      const size = parseFloat(getComputedStyle(h).fontSize);
      h.style.setProperty('--fit', `${Math.floor(size * (avail / widest) * 0.97)}px`);
    }
  }
}

function boot() {
  document.documentElement.lang = document.documentElement.lang || 'en';
  setWorld(initialSeed());
  initRooms();
  initExtras();
  toneAll();
  superposeAll();
  initHero();
  fitWalls();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWalls);
  let t = null;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(fitWalls, 150);
  });
  window.addEventListener('error', (e) => console.error('Qontext site error', e.error || e.message));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
