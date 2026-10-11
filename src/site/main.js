// Qontext website entry point.
//
// Boot does only what the first screen needs: the world, the badge, the hero and the observers. Every room and
// every heavy feature (poster, terminal, film) wakes up when the visitor is about to reach it.

import { setWorld, initialSeed, adopt, retheme } from './world.js';
import { initHero } from './hero.js';
import { initRooms } from './rooms/index.js';
import { initNav } from './features/nav.js';
import { initPlan } from './features/plan.js';
import { initIdea } from './features/idea.js';
import { initFirsts } from './features/firsts.js';
import { initFrame } from './features/frame.js';
import { initTools } from './features/tools.js';
import { initFilm } from './features/film.js';
import { initWorlds } from './features/worlds.js';
import { initTraverse } from './features/traverse.js';
import { h } from './lib.js';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,300..900&family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap';

/** Typefaces load without blocking the first paint; until they arrive the fallback stack is used. */
function loadFonts() {
  if (document.querySelector('link[data-fonts]')) return;
  document.head.append(h('link', { rel: 'stylesheet', href: FONTS, 'data-fonts': '' }));
}

function boot() {
  loadFonts();
  setWorld(initialSeed());
  initRooms();
  initNav();
  initPlan();
  initIdea();
  initFirsts();
  initFrame();
  initTools();
  initFilm();
  initWorlds();
  initTraverse();
  adopt(document);
  initHero();
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
  } catch {
    /* old browsers: the theme is read once */
  }
  window.addEventListener('error', (e) => console.error('Qontext site error', e.error || e.message));
  performance.mark('qontext:ready');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
