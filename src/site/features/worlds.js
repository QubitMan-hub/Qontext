// Many Worlds: a wipe of split tiles crosses the screen, the world is replaced while it is covered, and every
// swatch goes back into superposition to be observed again.

import { tileColor } from '../../engine/index.js';
import { $$, toast } from '../../app/dom.js';
import { reduced } from '../lib.js';
import { site, setWorld, resuperpose, newSeed, worldNumber } from '../world.js';
import { measureWave } from '../hero.js';

const S = 56;
const DURATION = 1100;
let switching = false;

function tileColors() {
  const list = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) list.push([tileColor(site.palette, r, c, 1).hex, tileColor(site.palette, r, c, -1).hex]);
  return list;
}

function apply(seed) {
  setWorld(seed);
  resuperpose();
  const hero = document.getElementById('hero');
  measureWave(hero.clientWidth * 0.5, hero.clientHeight * 0.5);
  toast(`Welcome to world ${worldNumber(seed)}`);
}

function manyWorlds() {
  if (switching) return;
  const seed = newSeed();
  if (reduced()) {
    apply(seed);
    return;
  }
  switching = true;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.className = 'wipe';
  cv.setAttribute('aria-hidden', 'true');
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  document.body.append(cv);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  let cols = tileColors();
  let applied = false;
  const t0 = performance.now();
  const frame = (now) => {
    const p = Math.min(1, (now - t0) / DURATION);
    if (p >= 0.5 && !applied) {
      applied = true;
      apply(seed);
      cols = tileColors();
    }
    g.clearRect(0, 0, W, H);
    const front = (p < 0.5 ? p * 2 : (p - 0.5) * 2) * (W + H);
    // One path per color: 18 fills a frame, however many tiles cover the screen.
    const paths = new Map();
    const add = (color) => {
      if (!paths.has(color)) paths.set(color, new Path2D());
      return paths.get(color);
    };
    for (let y = 0, j = 0; y < H + S; y += S, j++) {
      for (let x = 0, i = 0; x < W + S; x += S, i++) {
        const covered = p < 0.5 ? x + y < front : x + y >= front;
        if (!covered) continue;
        const [a, b] = cols[(i % 3) + 3 * (j % 3)];
        const up = add(a);
        up.moveTo(x, y);
        up.lineTo(x + S, y);
        up.lineTo(x, y + S);
        up.closePath();
        const down = add(b);
        down.moveTo(x + S, y);
        down.lineTo(x + S, y + S);
        down.lineTo(x, y + S);
        down.closePath();
      }
    }
    for (const [color, path] of paths) {
      g.fillStyle = color;
      g.fill(path);
    }
    if (p < 1) requestAnimationFrame(frame);
    else {
      cv.remove();
      switching = false;
    }
  };
  requestAnimationFrame(frame);
}

export function initWorlds() {
  for (const b of $$('#worldBtn, [data-many]')) b.addEventListener('click', manyWorlds);
}
