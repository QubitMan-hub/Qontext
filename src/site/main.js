// Qontext website entry point.
//
// Boot does only what the first screen needs: the world, the badge, the hero and the observers. Every room and
// every heavy feature (poster, film) wakes up when the visitor is about to reach it.

import { setWorld, initialSeed, adopt } from './world.js';
import { initHero } from './hero.js';
import { initRooms } from './rooms/index.js';
import { initNav } from './features/nav.js';
import { initPlan } from './features/plan.js';
import { initIdea } from './features/idea.js';
import { initTallies } from './features/tallies.js';
import { initPhase } from './features/phase.js';
import { initFrame } from './features/frame.js';
import { initFilm } from './features/film.js';
import { initWorlds } from './features/worlds.js';
import { initTraverse } from './features/traverse.js';
// Typefaces are self-hosted @font-face rules in the page's CSS (src/fonts.css) with font-display: swap, so they
// never block the first paint.

function boot() {
  initPhase();
  setWorld(initialSeed());
  initRooms();
  initNav();
  initPlan();
  initIdea();
  initTallies();
  initFrame();
  initFilm();
  initWorlds();
  initTraverse();
  adopt(document);
  initHero();
  window.addEventListener('error', (e) => console.error('Qontext site error', e.error || e.message));
  performance.mark('qontext:ready');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
