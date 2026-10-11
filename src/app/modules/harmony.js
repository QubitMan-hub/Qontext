import { harmony, oklch, HARMONY_NAMES, rgbaToOklab, kmeansOklab, sanitizeProject } from '../../engine/index.js';
import { $, esc, reducedMotion, storage, toast } from '../dom.js';
import { store, palette, setProject } from '../store.js';

const LIB_KEY = 'qontext-library-v1';
let raf = null;
let last = 0;

function loadLib() {
  const list = storage.get(LIB_KEY, []);
  return Array.isArray(list) ? list.map((p) => sanitizeProject(p)).slice(0, 24) : [];
}

function renderLib() {
  const list = loadLib();
  $('lib').innerHTML = list
    .map((p, i) => {
      let s = '';
      for (let k = 0; k < p.d; k++) s += `<i style="background:${oklch(p.L, p.C, p.base + (k * 360) / p.d).hex}"></i>`;
      return `<button type="button" data-lib="${i}" aria-label="Load saved harmony ${i + 1}: ${esc(HARMONY_NAMES[p.d])}, phase ${Math.round(p.base)}">${s}</button>`;
    })
    .join('');
  $('libNote').textContent = list.length ? `${list.length} saved in this browser.` : 'Saved in this browser only.';
}

function stopMotion() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  const b = $('motionBtn');
  b.setAttribute('aria-pressed', 'false');
  b.textContent = 'Start phase motion';
}

function tick(t) {
  const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
  last = t;
  setProject({ base: (store.project.base + dt * (reducedMotion() ? 6 : 24)) % 360 });
  raf = requestAnimationFrame(tick);
}

function extractFromImage(file) {
  if (!file.type.startsWith('image/')) {
    toast('Choose an image file');
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onerror = () => {
    URL.revokeObjectURL(url);
    toast('That image could not be read');
  };
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = 72;
    cv.height = 72;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 72, 72);
    URL.revokeObjectURL(url);
    const { clusters, dominant } = kmeansOklab(rgbaToOklab(ctx.getImageData(0, 0, 72, 72).data), 5);
    if (!dominant) {
      toast('That image is fully transparent');
      return;
    }
    $('imgChips').innerHTML = clusters
      .map((c) => {
        const col = oklch(c.L, c.C, c.h);
        return `<div class="chip"><div class="sw" style="background:${col.hex}"></div><div class="meta"><span>${col.hex}</span><span>${c === dominant ? 'dominant, ' : ''}${Math.round(c.share * 100)}%</span></div></div>`;
      })
      .join('');
    setProject({
      base: Math.round(dominant.h),
      L: Math.round(Math.min(0.9, Math.max(0.35, dominant.L)) * 100) / 100,
      C: Math.round(Math.min(0.25, Math.max(0.04, dominant.C)) * 1000) / 1000,
    });
    toast('Base phase set from your image');
  };
  img.src = url;
}

export function init() {
  const bind = (id, key, parse) => $(id).addEventListener('input', (e) => setProject({ [key]: parse(e.target.value) }));
  bind('dIn', 'd', (v) => parseInt(v, 10));
  bind('hIn', 'base', parseFloat);
  bind('lIn', 'L', parseFloat);
  bind('cIn', 'C', parseFloat);
  $('randBtn').addEventListener('click', () => setProject({ base: Math.floor(Math.random() * 360) }));
  $('motionBtn').addEventListener('click', (e) => {
    if (raf) {
      stopMotion();
      return;
    }
    last = 0;
    e.currentTarget.setAttribute('aria-pressed', 'true');
    e.currentTarget.textContent = 'Stop phase motion';
    raf = requestAnimationFrame(tick);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopMotion();
  });
  $('saveBtn').addEventListener('click', () => {
    const list = loadLib();
    list.unshift({ ...store.project });
    if (storage.set(LIB_KEY, list.slice(0, 24))) {
      renderLib();
      toast('Saved to library');
    } else toast('This browser blocks saving');
  });
  $('clearLib').addEventListener('click', () => {
    storage.remove(LIB_KEY);
    renderLib();
    toast('Library cleared');
  });
  $('lib').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lib]');
    if (!b) return;
    const p = loadLib()[Number(b.dataset.lib)];
    if (!p) return;
    setProject({ base: p.base, d: p.d, L: p.L, C: p.C });
    toast('Harmony loaded');
  });
  $('imgIn').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) extractFromImage(f);
  });
  renderLib();
}

export function render() {
  const p = store.project;
  const pal = palette();
  $('dIn').value = p.d;
  $('hIn').value = Math.round(p.base) % 360;
  $('lIn').value = p.L;
  $('cIn').value = p.C;
  $('dVal').textContent = p.d;
  $('hVal').textContent = `${Math.round(p.base) % 360}°`;
  $('lVal').textContent = p.L.toFixed(2);
  $('cVal').textContent = p.C.toFixed(3);
  const stops = [];
  for (let a = 0; a <= 360; a += 15) stops.push(`${oklch(p.L, Math.max(p.C, 0.08), a).hex} ${a}deg`);
  $('wheel').style.background = `conic-gradient(from 0deg, ${stops.join(',')})`;
  const cols = harmony(pal);
  $('wheelD').textContent = p.d;
  $('wheelName').textContent = HARMONY_NAMES[p.d];
  const pts = cols.map((c) => {
    const a = (c.h * Math.PI) / 180;
    return [100 + 82 * Math.sin(a), 100 - 82 * Math.cos(a)];
  });
  let svg = '';
  pts.forEach((q, i) => {
    const [x, y] = q.map((v) => v.toFixed(1));
    svg += `<circle cx="${x}" cy="${y}" r="11" fill="var(--paper)"/><circle cx="${x}" cy="${y}" r="8" fill="${cols[i].hex}" stroke="var(--ink)" stroke-width="1.5"/>`;
  });
  $('wheelSvg').innerHTML = svg;
  $('harmChips').innerHTML = cols
    .map((c, k) => `<div class="chip"><div class="sw" style="background:${c.hex}"></div><div class="meta"><span>${c.hex}</span><span>phase ${k}/${p.d}, ${Math.round(c.h)}°</span></div></div>`)
    .join('');
}

export const stop = stopMotion;
