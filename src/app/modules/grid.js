import {
  GRID, CONTEXTS, opLabel, opAscii, rowValue, colValue, contextualTiles, roundSatisfied, tileColor,
  guardReport, fixLightness, INKS, merminScore, measureAll, makeState, mulberry32,
} from '../../engine/index.js';
import { $, $$, esc, pressOne, reducedMotion, sign, toast } from '../dom.js';
import { store, palette, setProject, remeasure, collapseSeed } from '../store.js';

let focus = null;

function build() {
  const g = $('qgrid');
  const parts = ['<div></div>'];
  for (let c = 0; c < 3; c++) {
    parts.push(`<button type="button" class="ctx" id="ctxC${c + 1}" data-ctx="C${c + 1}" aria-pressed="false" aria-label="Column ${c + 1}, product must be ${c === 2 ? 'minus one' : 'plus one'}"><span><b>C${c + 1}</b>× = ${c === 2 ? '−1' : '+1'}</span></button>`);
  }
  for (let r = 0; r < 3; r++) {
    parts.push(`<button type="button" class="ctx" id="ctxR${r + 1}" data-ctx="R${r + 1}" aria-pressed="false" aria-label="Row ${r + 1}, product must be plus one"><span><b>R${r + 1}</b>× = +1</span></button>`);
    for (let c = 0; c < 3; c++) {
      parts.push(`<div class="cell" id="cell${r}${c}" role="img"><div><div class="op">${esc(opLabel(GRID[r][c]))}</div><div class="vals" id="vals${r}${c}"></div></div></div>`);
    }
  }
  g.innerHTML = parts.join('');
  for (const b of $$('.ctx', g)) {
    b.addEventListener('mouseenter', () => {
      focus = b.dataset.ctx;
      render();
    });
    b.addEventListener('mouseleave', () => {
      focus = null;
      render();
    });
    b.addEventListener('click', () => {
      focus = focus === b.dataset.ctx ? null : b.dataset.ctx;
      render();
    });
    b.addEventListener('focus', () => {
      focus = b.dataset.ctx;
      render();
    });
    b.addEventListener('blur', () => {
      focus = null;
      render();
    });
  }
}

export function init() {
  build();
  $('measure').addEventListener('click', remeasure);
  for (const b of $$('[data-view]')) {
    b.addEventListener('click', () => setProject({ view: b.dataset.view }));
  }
  $('stateSel').addEventListener('change', (e) => setProject({ state: e.target.value }, { remeasure: true }));
  $('stateSeed').addEventListener('change', (e) => setProject({ stateSeed: e.target.value }, { remeasure: true }));
  $('inkSel').addEventListener('change', (e) => setProject({ ink: e.target.value }));
  $('cgFix').addEventListener('click', () => {
    const pal = palette();
    const startInk = store.project.ink;
    let L = fixLightness(pal, INKS[startInk]);
    let ink = startInk;
    if (L === null) {
      ink = ink === 'dark' ? 'light' : 'dark';
      L = fixLightness(pal, INKS[ink]);
    }
    if (L === null) {
      toast('No lightness passes at this chroma. Lower the amplitude in Harmony.');
      return;
    }
    if (L === pal.L && ink === startInk) {
      toast('Already passing');
      return;
    }
    setProject({ L, ink });
    toast(`Lightness set to ${L.toFixed(2)}${ink !== startInk ? `, switched to ${ink} ink` : ''}`);
  });
}

function renderMeter() {
  let score;
  let note;
  if (store.usePool && store.pool) {
    score = merminScore(store.pool.contexts).total;
    const n = Object.values(store.pool.contexts).reduce((a, x) => a + x.length, 0);
    note = `Measured on ${store.pool.backend || 'hardware'} over ${n} shots. Any fixed coloring tops out at 4.`;
  } else {
    score = 6;
    note = 'Exact simulation: every rule holds on every shot. Any fixed coloring tops out at 4.';
  }
  $('gridScore').textContent = score.toFixed(2);
  $('gridFill').style.width = `${Math.max(0, Math.min(100, (score / 6) * 100))}%`;
  $('gridMeter').setAttribute('aria-valuenow', score.toFixed(2));
  const pill = $('gridPill');
  pill.className = `pill ${score > 4 ? 'good' : 'bad'}`;
  pill.textContent = score > 4 ? 'Beyond classical' : 'Within classical';
  $('gridScoreNote').textContent = note;
}

function renderGuard() {
  const rep = guardReport(palette(), INKS[store.project.ink]);
  $('cgWcag').textContent = `${rep.minWcag.toFixed(2)} : 1`;
  $('cgApca').textContent = `Lc ${rep.minApca.toFixed(0)}`;
  const p = $('cgPill');
  if (rep.level === 'pass') {
    p.className = 'pill good';
    p.textContent = 'Passes WCAG AA for text';
  } else if (rep.level === 'large-only') {
    p.className = 'pill warn';
    p.textContent = 'Large text only (3:1)';
  } else {
    p.className = 'pill bad';
    p.textContent = 'Fails. Exports are blocked';
  }
}

function renderVisitors() {
  const pal = palette();
  const psi = makeState(store.project.state, store.project.stateSeed);
  let html = '';
  for (let k = 0; k < 6; k++) {
    const o = measureAll(psi, mulberry32(collapseSeed(store.count, k + 1)));
    let cells = '';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const a = tileColor(pal, r, c, rowValue(o, r, c)).hex;
        const b = tileColor(pal, r, c, colValue(o, r, c)).hex;
        cells += `<span style="background:linear-gradient(135deg,${a} 0 50%,${b} 50% 100%)"></span>`;
      }
    }
    html += `<div class="visitor"><div class="mini" role="img" aria-label="Visitor ${k + 1} collapse">${cells}</div>visitor ${k + 1}</div>`;
  }
  $('visitors').innerHTML = html;
}

export function renderBrand() {
  const pal = palette();
  const marks = $$('#brandMark i');
  let i = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) marks[i++].style.background = tileColor(pal, r, c, rowValue(store.out, r, c)).hex;
}

export function render(kind) {
  if (kind === 'measure' && !reducedMotion()) {
    for (let k = 0; k < 9; k++) {
      const el = $(`cell${Math.floor(k / 3)}${k % 3}`);
      el.classList.remove('flipping');
      void el.offsetWidth;
      el.style.animationDelay = `${k * 35}ms`;
      el.classList.add('flipping');
    }
  }
  const pal = palette();
  const p = store.project;
  const ink = INKS[p.ink];
  const out = store.out;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const el = $(`cell${r}${c}`);
      const rv = rowValue(out, r, c);
      const cv = colValue(out, r, c);
      const rc = tileColor(pal, r, c, rv).hex;
      const cc = tileColor(pal, r, c, cv).hex;
      el.style.background = p.view === 'rows' ? rc : p.view === 'cols' ? cc : `linear-gradient(135deg,${rc} 0 50%,${cc} 50% 100%)`;
      el.style.color = ink;
      $(`vals${r}${c}`).textContent =
        p.view === 'rows' ? `row ${sign(rv)}` : p.view === 'cols' ? `col ${sign(cv)}` : `row ${sign(rv)}, col ${sign(cv)}`;
      el.setAttribute('aria-label', `${opAscii(GRID[r][c])}: row reading ${sign(rv)} ${rc}, column reading ${sign(cv)} ${cc}`);
      el.classList.toggle('diff', rv !== cv && p.view === 'split');
      let dim = false;
      if (focus) {
        const i = Number(focus[1]) - 1;
        dim = focus[0] === 'R' ? r !== i : c !== i;
      }
      el.classList.toggle('dim', dim);
    }
  }
  for (const ctx of CONTEXTS) {
    const b = $(`ctx${ctx.id}`);
    const [a, bb, c] = out[ctx.id];
    b.setAttribute('aria-pressed', String(focus === ctx.id));
    b.classList.toggle('flag', ctx.sign * a * bb * c !== 1);
  }
  pressOne($$('[data-view]'), $$('[data-view]').find((b) => b.dataset.view === p.view));
  $('stateSel').value = p.state;
  $('stateSeed').value = p.stateSeed;
  $('stateSeed').disabled = p.state !== 'random';
  $('inkSel').value = p.ink;
  const diff = contextualTiles(out).length;
  const held = roundSatisfied(out);
  $('legend').innerHTML =
    '<span><i style="background:linear-gradient(135deg,var(--ink) 0 50%,transparent 50%)"></i>upper left: read with its row</span>' +
    '<span><i style="background:linear-gradient(135deg,transparent 0 50%,var(--ink) 50%)"></i>lower right: read with its column</span>' +
    `<span>Measurement ${store.count}, ${diff} of 9 tiles change color with context${held < 6 ? `, ${6 - held} rule broken by hardware noise` : ''}</span>`;
  $('poolStatus').textContent =
    store.pool && store.usePool
      ? `Drawing collapses from ${store.pool.backend || 'a pool'}${store.pool.simulated ? ' (simulated example)' : ''}.`
      : store.pool
        ? 'Pool loaded but not in use. Exact simulation in your browser.'
        : 'Exact simulation in your browser.';
  renderMeter();
  renderGuard();
  renderVisitors();
}
