// Moving through the site. Three things answer to where the visitor is:
//
// Wall Wash   the walls take on a little of each room's own tile color, cross-fading between rooms.
// Compass     a pocket floor plan that appears in the rooms: unvisited rooms are still split between both
//             outcomes, visited rooms have collapsed, and any room is one press away. The brand mark in the
//             bar mirrors it on every screen size.
// Thresholds  each room's name enters the way its physics behaves: Janus flips, Mermin's Dare lands on plus
//             and minus, Unity Wheel turns, Fringe ripples, Pentacle draws in star order, Spooky Pair arrives
//             from both ends at once, Unpaintables never settles the same way twice, Notary stamps, Observer
//             collapses.
//
// All of it is driven by IntersectionObserver (no scroll handlers), animates only opacity and transform, and
// sits still under reduced motion.

import { mulberry32 } from '../../engine/index.js';
import { $$ } from '../../app/dom.js';
import { h, reduced } from '../lib.js';
import { site, onWorld, tones } from '../world.js';
import { ROOMS } from '../rooms/index.js';

const KINDS = { janus: 'flip', dare: 'sign', wheel: 'phase', fringe: 'wave', pentacle: 'star', spooky: 'pair', unpaintables: 'scatter', notary: 'stamp', observer: 'collapse' };
const byId = new Map(ROOMS.map((r) => [r.id, r]));
const visited = new Set();
let current = null;
let wash = null;
let washFront = 0;
let compass = null;
const cells = new Map();

const contextOf = (id) => document.getElementById(`room-${id}`).dataset.qContext;

/* ---------- Wall Wash ---------- */

function initWash() {
  wash = h('div', { class: 'wash', 'aria-hidden': 'true' }, h('i'), h('i'));
  document.body.prepend(wash);
}

function paintWash() {
  const layers = wash.children;
  const room = current && byId.get(current);
  const nav = document.getElementById('top');
  if (!room) {
    for (const l of layers) l.classList.remove('on');
    nav.style.removeProperty('--c');
    return;
  }
  const tone = site.result.tiles[room.tile][contextOf(room.id)];
  nav.style.setProperty('--c', tone);
  const next = layers[1 - washFront];
  if (layers[washFront].classList.contains('on') && layers[washFront].style.getPropertyValue('--c') === tone) return;
  next.style.setProperty('--c', tone);
  next.classList.add('on');
  layers[washFront].classList.remove('on');
  washFront = 1 - washFront;
}

/* ---------- Compass ---------- */

function initCompass() {
  const links = ROOMS.map((room) => {
    const a = h('a', { href: `#room-${room.id}`, class: 'cmp', 'aria-label': room.name });
    cells.set(room.id, a);
    return a;
  });
  compass = h('nav', { class: 'compass', id: 'compass', 'aria-label': 'Rooms' }, h('div', { class: 'cmp-grid' }, links), h('span', { class: 'cmp-name', 'aria-hidden': 'true' }));
  document.body.append(compass);
}

function paintCompass() {
  const inRooms = !!(current && byId.has(current));
  compass.classList.toggle('on', inRooms);
  compass.toggleAttribute('inert', !inRooms);
  for (const room of ROOMS) {
    const a = cells.get(room.id);
    const t = tones(room.tile, contextOf(room.id));
    a.style.setProperty('--tone', t.tone);
    a.style.setProperty('--tone-a', t.a);
    a.style.setProperty('--tone-b', t.b);
    a.classList.toggle('seen', visited.has(room.id));
    if (room.id === current) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  }
  if (inRooms) compass.lastElementChild.textContent = byId.get(current).name;
  // The brand mark is the same map in miniature: where you are, and where you have been.
  const mark = document.getElementById('navMark');
  mark.classList.toggle('rooms', inRooms);
  Array.from(mark.children).forEach((cell, k) => {
    const id = ROOMS[k].id;
    cell.classList.toggle('here', inRooms && id === current);
    cell.classList.toggle('seen', visited.has(id));
  });
}

/* ---------- Thresholds ---------- */

/** Splits a wall label into letters. Screen readers get the plain name; the letters are decoration. */
function split(h2, id) {
  const name = h2.textContent.trim();
  const letters = name.replace(/\s+/g, '').length;
  const rng = mulberry32(site.seed + letters);
  const shuffled = Array.from({ length: letters }, (_, i) => i).sort(() => rng() - 0.5);
  let i = 0;
  const words = name.split(/\s+/).map((word) =>
    h(
      'span',
      { class: 'wd' },
      Array.from(word, (ch) => {
        const k = i++;
        const mirror = Math.min(k, letters - 1 - k);
        const vars = {
          flip: { '--o': k },
          sign: { '--o': k, '--s': k % 2 ? 1 : -1 },
          phase: { '--o': k },
          wave: { '--o': k, '--s': Math.sin(k * 1.1).toFixed(2) },
          star: { '--o': (k * 2) % letters },
          pair: { '--o': mirror, '--s': k < letters / 2 ? -1 : 1 },
          scatter: { '--o': shuffled.indexOf(k), '--dx': (rng() * 2 - 1).toFixed(2), '--dy': (rng() * 2 - 1).toFixed(2) },
          stamp: { '--o': k },
          collapse: { '--o': Math.abs(k - (letters - 1) / 2).toFixed(1) },
        }[KINDS[id]];
        return h('span', { class: 'ch', style: vars }, ch);
      }),
    ),
  );
  const parts = [];
  words.forEach((w, k) => parts.push(...(k ? [' ', w] : [w])));
  h2.replaceChildren(h('span', { class: 'sr-only' }, name), h('span', { 'aria-hidden': 'true' }, parts));
  h2.dataset.threshold = KINDS[id];
}

function initThresholds() {
  if (reduced() || typeof IntersectionObserver !== 'function') return;
  document.documentElement.classList.add('thresholds');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.closest('.room').classList.add('in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  for (const room of ROOMS) {
    const h2 = document.getElementById(`t-${room.id}`);
    split(h2, room.id);
    io.observe(h2);
  }
}

/* ---------- where the visitor is ---------- */

function arrive(id) {
  if (id === current) return;
  current = id;
  if (byId.has(id)) visited.add(id);
  const navId = byId.has(id) ? 'room-janus' : id;
  for (const a of $$('#links a')) a.setAttribute('aria-current', String(a.getAttribute('href') === `#${navId}`));
  paintWash();
  paintCompass();
}

export function initTraverse() {
  initWash();
  initCompass();
  initThresholds();
  paintCompass();
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) arrive(e.target.id.replace(/^room-/, ''));
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const el of $$('main > section, main > article')) io.observe(el);
  }
  onWorld((kind) => {
    if (kind === 'theme') paintCompass();
    if (kind !== 'world') return;
    // A new world puts every room back into superposition, except the one the visitor is standing in.
    visited.clear();
    if (current && byId.has(current)) visited.add(current);
    paintWash();
    paintCompass();
  });
}
