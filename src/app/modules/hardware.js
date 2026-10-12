// Notary: colors from a real quantum computer. Load the results Probe wrote (or a practice example), see each of
// the six rules in plain words, and get a stamp whose fingerprint lets anyone check the results.

import { CONTEXTS, parsePool, examplePool, poolSummary, canonicalShots, PoolError } from '../../engine/index.js';
import { $, copyText, esc, toast } from '../dom.js';
import { store, setPool, setUsePool } from '../store.js';
import { reach } from '../guide.js';

let sealText = '';
const EMPTY = '<div class="stamp empty" aria-hidden="true"><span>Your stamp<br>appears here</span></div>';

async function sha256(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/** "R1" -> "Row 1 multiplies to +1" */
const ruleName = (ctx) => `${ctx.kind === 'row' ? 'Row' : 'Column'} ${ctx.index + 1} multiplies to ${ctx.sign > 0 ? '+1' : '−1'}`;

async function load(pool) {
  setPool(pool);
  const s = poolSummary(pool);
  const hash = await sha256(canonicalShots(pool));
  const where = `${pool.backend || 'unknown'}${pool.simulated ? ' (simulated, not real hardware)' : ''}`;
  const lines = [
    ['Measured on', where],
    ['Jobs', (pool.job_ids || []).join(', ') || '-'],
    ['When', pool.created || '-'],
    ['Measurements', String(s.totalShots)],
    ['Score', `${s.mermin.total.toFixed(3)} (ordinary limit 4)`],
    ['Linked coins', s.chsh ? `${s.chsh.S.toFixed(3)} (ordinary limit 2)` : 'not measured'],
    ['Fingerprint (SHA-256)', hash || 'unavailable in this browser'],
  ];
  sealText = ['Qontext Notary stamp', ...lines.map(([k, v]) => `${k}: ${v}`)].join('\n');
  const ring = 'Qontext Notary, measured and sealed, Qontext Notary, measured and sealed, ';
  $('seal').innerHTML =
    `<div class="stamp${pool.simulated ? ' sim' : ''}" aria-hidden="true"><svg viewBox="0 0 200 200"><defs><path id="stampRing" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0"/></defs>` +
    `<circle cx="100" cy="100" r="96"/><circle cx="100" cy="100" r="66"/><text><textPath href="#stampRing">${esc(ring)}</textPath></text></svg>` +
    `<div class="stamp-mid"><b>${s.mermin.total.toFixed(2)}</b><span>${pool.simulated ? 'practice run' : 'real hardware'}</span></div></div>` +
    `<dl class="seal-list">${lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  $('sealCopy').disabled = false;
  toast(pool.simulated ? 'Example loaded. This one is a practice run.' : 'Real hardware results loaded');
  reach('hardware');
}

function fail(e) {
  toast(e instanceof PoolError ? e.message : 'That file is not a Qontext results file');
}

function readFile(f) {
  if (!f) return;
  if (f.size > 50 * 1024 * 1024) {
    toast('Results files over 50 MB are not supported');
    return;
  }
  const rd = new FileReader();
  rd.onload = () => {
    try {
      load(parsePool(String(rd.result)));
    } catch (err) {
      fail(err);
    }
  };
  rd.onerror = () => toast('That file could not be read');
  rd.readAsText(f);
}

export function init() {
  $('poolExample').addEventListener('click', () => load(examplePool({ seed: store.project.stateSeed })));
  $('poolLoad').addEventListener('click', () => {
    try {
      load(parsePool($('poolText').value));
    } catch (e) {
      fail(e);
    }
  });
  $('poolFile').addEventListener('change', (e) => readFile(e.target.files && e.target.files[0]));
  const drop = $('poolDrop');
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    readFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
  });
  $('poolUse').addEventListener('change', (e) => {
    if (e.target.checked && !store.pool) {
      e.target.checked = false;
      toast('Load some results first');
      return;
    }
    setUsePool(e.target.checked);
  });
  $('poolClear').addEventListener('click', () => {
    setPool(null);
    sealText = '';
    $('seal').innerHTML = EMPTY;
    $('sealCopy').disabled = true;
    toast('Results put away. Colors come from the simulation again.');
  });
  $('sealCopy').addEventListener('click', () => copyText(sealText, null));
}

export function render() {
  $('poolUse').checked = store.usePool;
  $('poolResults').hidden = !store.pool;
  if (!store.pool) {
    $('poolTable').replaceChildren();
    $('hwScore').textContent = '-';
    $('hwFill').style.width = '0';
    $('hwPill').className = 'pill neutral';
    $('hwPill').textContent = 'No results yet';
    $('hwChsh').textContent = '-';
    return;
  }
  const s = poolSummary(store.pool);
  $('poolTable').innerHTML = CONTEXTS.map((ctx) => {
    const p = s.mermin.per[ctx.id];
    const pct = (p.held * 100).toFixed(1);
    return `<tr><td>${esc(ruleName(ctx))}</td><td>${p.n.toLocaleString('en')}</td><td><span class="kept"><span class="kept-bar" style="width:${pct}%"></span></span> ${pct}%</td></tr>`;
  }).join('');
  const m = s.mermin.total;
  $('hwScore').textContent = m.toFixed(2);
  $('hwFill').style.width = `${Math.max(0, Math.min(100, (m / 6) * 100))}%`;
  $('hwPill').className = `pill ${m > 4 ? 'good' : 'bad'}`;
  $('hwPill').textContent = m > 4 ? 'Beyond ordinary physics' : 'Within ordinary limits';
  $('hwChsh').textContent = s.chsh ? s.chsh.S.toFixed(3) : 'not measured';
}
