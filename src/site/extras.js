// Navigation, floor plan, the idea, firsts, your framed world, tools, film and Many Worlds.

import { GRID, opLabel, oklch, tileColor, rowValue, colValue, guardReport, INKS } from '../engine/index.js';
import { $, $$, copyText, esc, reducedMotion, toast } from '../app/dom.js';
import { site, onWorld, setWorld, superposeAll, newSeed, worldNumber, waiting, proof, wavefunction, tileOf } from './world.js';
import { measureWave } from './hero.js';
import chapters from './film-chapters.json';
import { onScroll } from './scroll.js';

const ROOMS = [
  ['janus', 'Janus', 'One tile, two true colors'],
  ['dare', "Mermin's Dare", 'The puzzle no one can finish'],
  ['wheel', 'Unity Wheel', 'Harmony as quantum phase'],
  ['fringe', 'Fringe', 'Mix color like light waves'],
  ['pentacle', 'Pentacle', 'Five colors that never collide'],
  ['spooky', 'Spooky Pair', 'Two assets, one entangled pair'],
  ['unpaintables', 'Unpaintables', 'Shapes no coloring can finish'],
  ['notary', 'Notary', 'Proof it came from a quantum computer'],
  ['observer', 'Observer', 'This website runs on it'],
];

/* ---------- nav ---------- */
function initNav() {
  const menu = $('menu');
  const btn = $('menuBtn');
  const open = (on) => {
    menu.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    document.body.style.overflow = on ? 'hidden' : '';
    if (on) menu.querySelector('a').focus();
    else btn.focus();
  };
  btn.addEventListener('click', () => open(true));
  $('menuClose').addEventListener('click', () => open(false));
  menu.addEventListener('click', (e) => e.target.closest('a') && open(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !menu.hidden && open(false));

  const links = new Map($$('#links a').map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.id.startsWith('room-') ? 'room-janus' : e.target.id;
        for (const [k, a] of links) a.setAttribute('aria-current', String(k === id));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const el of $$('main > section, main > article')) io.observe(el);
}

function paintMark() {
  const marks = $$('#navMark i');
  let i = 0;
  for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) marks[i++].style.background = site.result.tiles[`r${r}c${c}`].row;
  $('worldNum').textContent = worldNumber();
  $('heroWorld').textContent = worldNumber();
}

/* ---------- the idea ---------- */
function paintIdea() {
  const b = site.palette.base;
  const core = oklch(0.6, 0.06, b + 90).hex;
  const halves = $$('#albers > div');
  halves[0].style.background = oklch(0.38, 0.12, b).hex;
  halves[1].style.background = oklch(0.88, 0.07, b + 180).hex;
  for (const c of $$('#albers .core')) c.style.background = core;
  $('albersHex').textContent = core;
}

/* ---------- floor plan ---------- */
function initPlan() {
  const plan = $('plan');
  const parts = ['<div aria-hidden="true"></div>'];
  for (let c = 1; c <= 3; c++) parts.push(`<button type="button" class="hdr" data-read="C${c}" aria-pressed="false"><span><b>C${c}</b>column</span></button>`);
  ROOMS.forEach(([id, name, what], k) => {
    const r = Math.floor(k / 3);
    const c = k % 3;
    if (c === 0) parts.push(`<button type="button" class="hdr" data-read="R${r + 1}" aria-pressed="false"><span><b>R${r + 1}</b>row</span></button>`);
    const tile = `r${r + 1}c${c + 1}`;
    parts.push(
      `<div class="cellwrap" data-cell="${tile}"><i class="tri row q" data-q="${tile}" data-q-ctx="row"></i><i class="tri col q" data-q="${tile}" data-q-ctx="col"></i>` +
        `<a class="cell" href="#room-${id}"><span class="name">${esc(name)}</span><span class="what">${esc(what)}. Observable ${esc(opLabel(GRID[r][c]))}.</span></a></div>`,
    );
  });
  plan.innerHTML = parts.join('');
  let active = null;
  plan.addEventListener('click', (e) => {
    const h = e.target.closest('.hdr');
    if (!h) return;
    active = active === h.dataset.read ? null : h.dataset.read;
    for (const x of $$('.hdr', plan)) x.setAttribute('aria-pressed', String(x.dataset.read === active));
    for (const w of $$('.cellwrap', plan)) {
      const [r, c] = tileOf(w.dataset.cell);
      const inside = active && (active[0] === 'R' ? r === Number(active[1]) - 1 : c === Number(active[1]) - 1);
      w.classList.toggle('dim', !!active && !inside);
      w.classList.toggle('full-row', !!inside && active[0] === 'R');
      w.classList.toggle('full-col', !!inside && active[0] === 'C');
    }
  });
}

/* ---------- firsts, proof ---------- */
function paintFirsts() {
  const { rules, changing } = proof();
  $('f1').textContent = `World ${worldNumber()}`;
  $('f2').textContent = `${waiting()} swatches still waiting`;
  const out = site.result.outcomes;
  let tile = 'r1c1';
  for (let r = 0; r < 3 && tile === 'r1c1'; r++) for (let c = 0; c < 3; c++) if (rowValue(out, r, c) !== colValue(out, r, c)) { tile = `r${r + 1}c${c + 1}`; break; }
  const t = site.result.tiles[tile];
  $('f3').innerHTML = `<i style="background:${t.row}"></i><i style="background:${t.col}"></i><span>${tile}: ${t.row} in rooms read by rows, ${t.col} in rooms read by columns</span>`;
  $('f6').textContent = `${rules} of 6`;
  $('planRules').textContent = `${rules} of 6`;
  $('planDiff').textContent = `${changing} of 9`;
  $('proof').innerHTML = `In world <strong>${worldNumber()}</strong>, <strong>${rules} of 6</strong> Mermin-Peres rules hold, <strong>${changing} of 9</strong> tiles change color with context, and <strong>${waiting()}</strong> swatches are still waiting for you to look at them.`;
  const rep = guardReport(site.palette, INKS.dark);
  $('bouncerLive').textContent = `In your world, dark text reaches at least ${rep.minWcag.toFixed(1)} : 1 on every tile color. Bouncer lets it through.`;
}

/* ---------- your world, framed ---------- */
function poster() {
  const cv = document.createElement('canvas');
  cv.width = 1080;
  cv.height = 1350;
  const g = cv.getContext('2d');
  const pal = site.palette;
  const h = site.result.harmony;
  const t = site.result.tiles;
  g.fillStyle = '#eef0f4';
  g.fillRect(0, 0, 1080, 1350);
  const squares = [h[2], t.r3c3.col, t.r2c2.row, h[0]];
  squares.forEach((col, k) => {
    g.fillStyle = col;
    g.fillRect(90 + 90 * k, 90 + 135 * k, 900 - 180 * k, 900 - 180 * k);
  });
  const out = site.result.outcomes;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = 810 + c * 60;
      const y = 1080 + r * 60;
      g.fillStyle = tileColor(pal, r, c, rowValue(out, r, c)).hex;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 56, y);
      g.lineTo(x, y + 56);
      g.fill();
      g.fillStyle = tileColor(pal, r, c, colValue(out, r, c)).hex;
      g.beginPath();
      g.moveTo(x + 56, y);
      g.lineTo(x + 56, y + 56);
      g.lineTo(x, y + 56);
      g.fill();
    }
  }
  g.fillStyle = '#1d1f52';
  g.font = '850 86px Anybody, "Arial Narrow", Arial, sans-serif';
  g.fillText(`World ${worldNumber()}`, 90, 1150);
  g.font = '500 30px "Instrument Sans", Arial, sans-serif';
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  g.fillText(`Collapsed ${date}. ${proof().rules} of 6 rules hold.`, 90, 1205);
  g.fillText('Qontext, color that depends on how you read it.', 90, 1250);
  return cv.toDataURL('image/png');
}

function paintFrame() {
  try {
    $('poster').src = poster();
  } catch {
    $('poster').alt = 'This browser could not draw the poster.';
  }
  const code = wavefunction();
  $('wf').textContent = code;
  $('editWorld').href = `studio.html#${code}`;
}

/* ---------- tools ---------- */
const TERM = [
  ['$ ', "pip install './python[ibm]'"],
  ['$ ', 'qontext-probe --noisy'],
  ['', 'Backend: aer simulator (noisy)'],
  ['', '  R1: rule held on  90.0% of 512 shots'],
  ['', '  C3: rule held on  89.5% of 512 shots'],
  ['', 'Mermin score 4.684  (classical max 4, quantum ideal 6)'],
  ['', 'CHSH value   2.547  (classical max 2, quantum max 2.828)'],
  ['', 'Pool written to qontext_pool.json. Load it in Notary.'],
  ['$ ', 'qontext-probe --ibm least_busy'],
];

function initTerm() {
  const el = $('term');
  const full = TERM.map(([p, t]) => (p ? `<span class="p">${esc(p)}</span>${esc(t)}` : esc(t))).join('\n');
  if (reducedMotion()) {
    el.innerHTML = full;
    return;
  }
  let started = false;
  new IntersectionObserver((es) => {
    if (!es[0].isIntersecting || started) return;
    started = true;
    let line = 0;
    let ch = 0;
    const tick = () => {
      if (line >= TERM.length) return;
      const [p, t] = TERM[line];
      ch += p ? 2 : t.length;
      const done = TERM.slice(0, line).map(([pp, tt]) => (pp ? `<span class="p">${esc(pp)}</span>${esc(tt)}` : esc(tt)));
      const cur = (p ? `<span class="p">${esc(p)}</span>` : '') + esc(t.slice(0, ch));
      el.innerHTML = [...done, cur].join('\n');
      if (ch >= t.length) {
        line++;
        ch = 0;
        setTimeout(tick, p ? 420 : 140);
      } else setTimeout(tick, 28);
    };
    tick();
  }, { threshold: 0.4 }).observe(el);
}

function paintWalkBy() {
  const out = site.result.outcomes;
  const pal = site.palette;
  const grid = (view) => {
    let s = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s += `<i style="background:${tileColor(pal, r, c, view === 'rows' ? rowValue(out, r, c) : colValue(out, r, c)).hex}"></i>`;
    return s;
  };
  $('wbRows').innerHTML = grid('rows');
  $('wbCols').innerHTML = grid('cols');
}

function initWalkBy() {
  const wb = $('walkby');
  const set = (f) => {
    $('wbCols').style.opacity = String(Math.max(0, Math.min(1, (f - 0.25) / 0.5)));
    wb.style.setProperty('--shift', `${Math.round(f * 48)}px`);
  };
  wb.addEventListener('pointermove', (e) => {
    const r = wb.getBoundingClientRect();
    set((e.clientX - r.left) / r.width);
  });
  onScroll(wb, (p) => set(p));
}

/* ---------- film ---------- */
// Written by scripts/record-film.py from the real recording, so the times always match the film.
export const CHAPTERS = chapters;

function initFilm() {
  const v = $('video');
  $('chapters').innerHTML = CHAPTERS.map(([t, name]) => `<li><button type="button" data-t="${t}">${esc(name)}<span>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</span></button></li>`).join('');
  $('chapters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-t]');
    if (!b) return;
    v.currentTime = Number(b.dataset.t);
    v.play().catch(() => {});
  });
  v.addEventListener('timeupdate', () => {
    let cur = 0;
    CHAPTERS.forEach(([t], i) => (v.currentTime >= t ? (cur = i) : null));
    $$('#chapters button').forEach((b, i) => b.setAttribute('aria-current', String(i === cur)));
  });
  const fail = () => {
    $('filmNote').textContent = 'The film file is not included in this copy of the site. It lives at media/qontext-film.mp4 in the repository.';
  };
  v.addEventListener('error', fail, true);
  v.querySelector('source').addEventListener('error', fail);
}

/* ---------- Many Worlds ---------- */
let switching = false;

export function manyWorlds() {
  if (switching) return;
  const seed = newSeed();
  const apply = () => {
    setWorld(seed);
    superposeAll();
    const hero = $('field').getBoundingClientRect();
    measureWave(hero.width * 0.5, hero.height * 0.5);
    toast(`Welcome to world ${worldNumber(seed)}`);
  };
  if (reducedMotion()) {
    apply();
    return;
  }
  switching = true;
  const cv = document.createElement('canvas');
  cv.className = 'wipe';
  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  document.body.appendChild(cv);
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  const S = 56;
  const colorsFor = () => {
    const pal = site.palette;
    const list = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) list.push([tileColor(pal, r, c, 1).hex, tileColor(pal, r, c, -1).hex]);
    return list;
  };
  let cols = colorsFor();
  let applied = false;
  const t0 = performance.now();
  const frame = (now) => {
    const p = Math.min(1, (now - t0) / 1100);
    if (p >= 0.5 && !applied) {
      applied = true;
      apply();
      cols = colorsFor();
    }
    g.clearRect(0, 0, W, H);
    const front = (p < 0.5 ? p * 2 : (p - 0.5) * 2) * (W + H);
    for (let y = 0; y < H + S; y += S) {
      for (let x = 0; x < W + S; x += S) {
        const d = x + y;
        const covered = p < 0.5 ? d < front : d >= front;
        if (!covered) continue;
        const k = ((x / S) % 3) + 3 * ((y / S) % 3);
        const [a, b] = cols[k];
        g.fillStyle = a;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + S, y);
        g.lineTo(x, y + S);
        g.fill();
        g.fillStyle = b;
        g.beginPath();
        g.moveTo(x + S, y);
        g.lineTo(x + S, y + S);
        g.lineTo(x, y + S);
        g.fill();
      }
    }
    if (p < 1) requestAnimationFrame(frame);
    else {
      cv.remove();
      switching = false;
    }
  };
  requestAnimationFrame(frame);
}

export function initExtras() {
  initNav();
  initPlan();
  initTerm();
  initWalkBy();
  initFilm();
  $('worldBtn').addEventListener('click', manyWorlds);
  for (const b of $$('[data-many]')) b.addEventListener('click', manyWorlds);
  $('wfCopy').addEventListener('click', () => copyText(wavefunction(), null));
  const paint = () => {
    paintMark();
    paintIdea();
    paintFirsts();
    paintFrame();
    paintWalkBy();
  };
  paint();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintFrame);
  onWorld((kind) => {
    if (kind === 'world') paint();
    else paintFirsts();
  });
}

