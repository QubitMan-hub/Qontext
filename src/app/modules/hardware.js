import { CONTEXTS, parsePool, examplePool, poolSummary, canonicalShots, PoolError } from '../../engine/index.js';
import { $, copyText, esc, sign, toast } from '../dom.js';
import { store, setPool, setUsePool } from '../store.js';

let sealText = '';

async function sha256(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

async function load(pool) {
  setPool(pool);
  const s = poolSummary(pool);
  const hash = await sha256(canonicalShots(pool));
  const lines = [
    ['backend', `${pool.backend || 'unknown'}${pool.simulated ? ' (simulated, not hardware)' : ''}`],
    ['jobs', (pool.job_ids || []).join(', ') || '-'],
    ['created', pool.created || '-'],
    ['shots', String(s.totalShots)],
    ['mermin score', `${s.mermin.total.toFixed(3)} (classical max 4)`],
    ['chsh value', s.chsh ? `${s.chsh.S.toFixed(3)} (classical max 2)` : 'not measured'],
    ['shots sha-256', hash || 'unavailable in this browser'],
  ];
  sealText = ['Qontext provenance seal', ...lines.map(([k, v]) => `${k}: ${v}`)].join('\n');
  $('seal').innerHTML = `<strong>Qontext provenance seal</strong>${lines.map(([k, v]) => `<span>${esc(k)}: ${esc(v)}</span>`).join('')}`;
  $('sealCopy').disabled = false;
  toast(pool.simulated ? 'Example pool loaded (simulated)' : 'Hardware pool loaded');
}

function fail(e) {
  toast(e instanceof PoolError ? e.message : 'That file is not a Qontext pool');
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
  $('poolFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast('Pool files over 50 MB are not supported');
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
  });
  $('poolUse').addEventListener('change', (e) => {
    if (e.target.checked && !store.pool) {
      e.target.checked = false;
      toast('Load a pool first');
      return;
    }
    setUsePool(e.target.checked);
  });
  $('poolClear').addEventListener('click', () => {
    setPool(null);
    sealText = '';
    $('seal').innerHTML = '<span class="muted">Load a pool to issue a seal.</span>';
    $('sealCopy').disabled = true;
    toast('Pool unloaded');
  });
  $('sealCopy').addEventListener('click', () => copyText(sealText, null));
}

export function render() {
  $('poolUse').checked = store.usePool;
  if (!store.pool) {
    $('poolTable').innerHTML = '<tr><td colspan="5" class="muted">No pool loaded yet.</td></tr>';
    $('hwScore').textContent = '-';
    $('hwFill').style.width = '0';
    $('hwPill').className = 'pill neutral';
    $('hwPill').textContent = 'No data';
    $('hwChsh').textContent = '-';
    return;
  }
  const s = poolSummary(store.pool);
  $('poolTable').innerHTML = CONTEXTS.map((ctx) => {
    const p = s.mermin.per[ctx.id];
    return `<tr><td class="mono">${ctx.id}</td><td class="mono">${sign(ctx.sign)}</td><td>${p.n}</td><td>${(p.held * 100).toFixed(1)}%</td><td>${p.mean.toFixed(3)}</td></tr>`;
  }).join('');
  const m = s.mermin.total;
  $('hwScore').textContent = m.toFixed(2);
  $('hwFill').style.width = `${Math.max(0, Math.min(100, (m / 6) * 100))}%`;
  $('hwPill').className = `pill ${m > 4 ? 'good' : 'bad'}`;
  $('hwPill').textContent = m > 4 ? 'Beyond classical' : 'Within classical';
  $('hwChsh').textContent = s.chsh ? s.chsh.S.toFixed(3) : 'not measured';
}
