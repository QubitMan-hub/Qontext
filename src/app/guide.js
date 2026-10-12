// Wall cards and Eureka. Every room opens with a card in plain words: what it does, a real example, one
// "Try this" button and one small goal. Reaching a goal (Eureka) ticks it off, counts it in the header and
// throws a short burst of the design's own colors, unless the visitor asked for less motion.

import { $, $$, reducedMotion, storage, toast } from './dom.js';
import { store, palette, setProject } from './store.js';
import { allTileColors, contextualTiles, hexToOklch, interfere, oklch, kcbsProbs, kcbsSum } from '../engine/index.js';

const GOALS_KEY = 'qontext-goals-v1';
const TOTAL = 9;
const reached = new Set(storage.get(GOALS_KEY, []));
let ownFlip = false; // Mermin's Dare counts only flips the visitor made, not "Show me a best attempt"

const click = (id) => $(id).click();
const press = (sel) => document.querySelector(sel).click();

/** What each room's "Try this" button does: the room's own controls, so nothing here is a second code path. */
const TRY = {
  grid: () => click('measure'),
  learn: () => click('learnBest'),
  harmony: () => click('randBtn'),
  mixer: () => {
    // Input B becomes input A's opposite at the same strength, so the two can cancel completely.
    const a = hexToOklch(store.project.mixA);
    setProject({ mixB: oklch(a.L, a.C, a.h + 180).hex });
    toast('Input B is now the opposite of A. Turn the dial to find the gray.');
  },
  penta: () => setProject({ tilt: 35 + Math.round(Math.random() * 45), turn: Math.round(Math.random() * 360) }),
  entangle: () => click('pairBtn'),
  shapes: () => click('shapeTry'),
  export: () => {
    press('[data-fmt="css"]');
    click('copyBtn');
  },
};

/** When each goal is reached, read from the studio's state or from what the room shows. */
const GOAL = {
  grid: () => store.out && contextualTiles(store.out).length === 1,
  learn: () => ownFlip && $('learnVerdict').textContent.startsWith('5 of 6'),
  mixer: () => {
    const r = interfere(store.project.mixA, store.project.mixB, store.project.phi);
    return r.share1 < 0.03 || r.share1 > 0.97;
  },
  penta: () => kcbsSum(kcbsProbs(store.project.tilt, store.project.turn)) >= 2.235,
  entangle: () => {
    const a = $('assetAOut').textContent;
    const b = $('assetBOut').textContent;
    return a.startsWith('Bold') && b.startsWith('Bold') && a.includes('+1') !== b.includes('+1');
  },
  shapes: () => store.project.shape === 'yuoh13',
};

function paintGoals() {
  for (const g of $$('[data-goal]')) {
    const done = reached.has(g.dataset.goal);
    g.classList.toggle('done', done);
    g.querySelector('.goal-k').textContent = done ? 'Goal reached:' : 'Goal:';
  }
  $('eurekaN').textContent = String(reached.size);
}

/** A short burst of the design's eighteen tile colors from `el`. Transform and opacity only. */
function burst(el) {
  if (reducedMotion() || typeof el.animate !== 'function') return;
  const box = el.getBoundingClientRect();
  const cx = box.left + 18;
  const cy = box.top + box.height / 2;
  const layer = document.createElement('div');
  layer.className = 'burst';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  const colors = allTileColors(palette()).map((c) => c.hex);
  colors.forEach((hex, i) => {
    const bit = document.createElement('i');
    bit.style.background = hex;
    bit.style.left = `${cx}px`;
    bit.style.top = `${cy}px`;
    layer.append(bit);
    const angle = (i / colors.length) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 60 + Math.random() * 90;
    bit.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(1) rotate(${(i % 2 ? 1 : -1) * 160}deg)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 300, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' },
    );
  });
  setTimeout(() => layer.remove(), 1400);
}

/** Marks a goal reached, once. */
export function reach(tab) {
  if (reached.has(tab)) return;
  reached.add(tab);
  storage.set(GOALS_KEY, [...reached]);
  paintGoals();
  const goal = document.querySelector(`[data-goal="${tab}"]`);
  if (goal && !goal.closest('[hidden]')) burst(goal);
  toast(reached.size === TOTAL ? 'Eureka! All nine goals. You know the whole Atelier.' : `Eureka! ${reached.size} of ${TOTAL} goals.`);
}

/** Checks the goal of the room that is open. Called after every change. */
export function check() {
  const test = GOAL[store.tab];
  if (test && !reached.has(store.tab)) {
    try {
      if (test()) reach(store.tab);
    } catch {
      /* a room that has not drawn yet has nothing to check */
    }
  }
}

export function init() {
  for (const b of $$('[data-try]')) {
    b.addEventListener('click', () => {
      TRY[b.dataset.try]();
      // Room handlers run first; the goal is checked once the room has redrawn.
      setTimeout(check, 0);
    });
  }
  // Goals some rooms reach by a single action, not by a state to check.
  $('saveBtn').addEventListener('click', () => reach('harmony'));
  $('learnBest').addEventListener('click', () => (ownFlip = false));
  $('cgrid').addEventListener('click', () => {
    ownFlip = true;
    setTimeout(check, 0);
  });
  for (const id of ['pairBtn', 'styleA', 'styleB']) $(id).addEventListener(id === 'pairBtn' ? 'click' : 'change', () => setTimeout(check, 0));
  // Pentacle counts only the visitor's own turn of the knobs back to the top.
  for (const id of ['tIn', 'pIn']) $(id).addEventListener('input', () => setTimeout(check, 0));
  paintGoals();
}

/** Which kind of change can reach each room's goal (the others are reached by the visitor's own actions). */
const WHEN = { grid: 'measure', mixer: 'project', shapes: 'project' };

/** Called after each render, so a goal counts only when the visitor caused the change. */
export function afterRender(kind) {
  if (WHEN[store.tab] === kind) check();
}
