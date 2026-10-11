// The sticky bar and the full-screen menu. The world badge shows the visitor's world and its nine tiles.

import { $, $$ } from '../../app/dom.js';
import { site, onWorld, worldNumber } from '../world.js';

function paintBadge() {
  const marks = $$('#navMark i');
  let i = 0;
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) marks[i++].style.background = site.result.tiles[`r${r}c${c}`].row;
  $('worldNum').textContent = worldNumber();
  $('heroWorld').textContent = worldNumber();
}

export function initNav() {
  const menu = $('menu');
  const btn = $('menuBtn');
  const open = (on) => {
    menu.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    document.body.classList.toggle('locked', on);
    if (on) menu.querySelector('a').focus();
    else btn.focus();
  };
  btn.addEventListener('click', () => open(true));
  $('menuClose').addEventListener('click', () => open(false));
  menu.addEventListener('click', (e) => e.target.closest('a') && open(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !menu.hidden && open(false));
  paintBadge();
  onWorld((kind) => kind === 'world' && paintBadge());
}
