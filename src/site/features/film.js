// The film. Nothing is downloaded until the section is near: then the poster appears and chapters work.

import { $, $$ } from '../../app/dom.js';
import { h, whenNear } from '../lib.js';
// Written by scripts/film.py from the voice's own timing, so the chapters always match the film.
import chapters from '../film-chapters.json';

const stamp = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

export function initFilm() {
  const v = $('video');
  $('chapters').replaceChildren(...chapters.map(([t, name]) => h('li', {}, h('button', { type: 'button', 'data-t': t }, name, h('span', {}, stamp(t))))));
  $('chapters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-t]');
    if (!b) return;
    v.preload = 'auto';
    v.currentTime = Number(b.dataset.t);
    v.play().catch(() => {});
  });
  let current = -1;
  v.addEventListener('timeupdate', () => {
    let cur = 0;
    chapters.forEach(([t], i) => {
      if (v.currentTime >= t) cur = i;
    });
    if (cur === current) return;
    current = cur;
    $$('#chapters button').forEach((b, i) => b.setAttribute('aria-current', String(i === cur)));
  });
  const fail = () => {
    $('filmNote').textContent = 'The film file is not included in this copy of the site. It lives at media/qontext-film.mp4 in the repository.';
  };
  v.addEventListener('error', fail, true);
  v.querySelector('source').addEventListener('error', fail);
  whenNear(v, () => {
    v.poster = v.dataset.poster;
    v.preload = 'metadata';
  });
}
