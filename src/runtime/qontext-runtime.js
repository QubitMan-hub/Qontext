// Qontext theme runtime: contextual color for production websites.
//
//   <script src="qontext-runtime.min.js" data-qontext='{"base":200,"d":3,"L":0.72,"C":0.13}'></script>
//   <section data-q-context="row"> <div data-q-tile="r1c1">...</div> </section>
//
// Each visitor gets their own collapse (stable for the browser session). Every collapse obeys all
// six Mermin-Peres rules. Colors are also exposed as CSS custom properties: --q-r1c1-row, --q-r1c1-col,
// --q-harmony-1 and so on. No network calls, no dependencies.

import {
  sanitizeProject, paletteOf, makeState, measureAll, mulberry32, hashSeed, freshSeed, tileColor, harmony,
  rowValue, colValue, GRID, opAscii, validatePool, wcagContrast, apcaContrast, hexToLin, isHex, normalizeHex,
} from '../engine/index.js';

export const VERSION = '1.0.0';
const VISITOR_KEY = 'qontext-visitor-seed';

function poolDraw(pool, seed) {
  const p = validatePool(pool);
  return (id) => {
    const arr = p.contexts[id];
    return arr[hashSeed(seed, id.charCodeAt(0), id.charCodeAt(1)) % arr.length];
  };
}

/** One collapse of a design. Options: project fields (base, d, L, C, state, stateSeed), seed, pool. */
export function collapse(options = {}) {
  const project = sanitizeProject(options);
  const seed = Number.isFinite(options.seed) ? options.seed >>> 0 : freshSeed();
  const pal = paletteOf(project);
  const psi = makeState(project.state, project.stateSeed);
  const out = measureAll(psi, mulberry32(hashSeed(seed, project.stateSeed)), options.pool ? poolDraw(options.pool, seed) : null);
  const tiles = {};
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rv = rowValue(out, r, c);
      const cv = colValue(out, r, c);
      tiles[`r${r + 1}c${c + 1}`] = {
        op: opAscii(GRID[r][c]),
        rowValue: rv,
        colValue: cv,
        row: tileColor(pal, r, c, rv).hex,
        col: tileColor(pal, r, c, cv).hex,
      };
    }
  }
  return { version: VERSION, seed, project, harmony: harmony(pal).map((x) => x.hex), tiles, outcomes: out };
}

/** The color of a tile in a context ('row' or 'col'), or null for an unknown tile. */
export function resolveTile(result, tileId, context = 'row') {
  const t = result && result.tiles && result.tiles[tileId];
  if (!t) return null;
  return context === 'col' ? t.col : t.row;
}

/** CSS custom properties for a result. */
export function cssVariables(result, prefix = 'q') {
  const vars = {};
  result.harmony.forEach((h, i) => (vars[`--${prefix}-harmony-${i + 1}`] = h));
  for (const [id, t] of Object.entries(result.tiles)) {
    vars[`--${prefix}-${id}-row`] = t.row;
    vars[`--${prefix}-${id}-col`] = t.col;
  }
  return vars;
}

/** Builds a result from W3C design tokens exported by Qontext Studio (a fixed collapse). */
export function fromTokens(tokens) {
  const root = tokens && tokens.qontext;
  if (!root || !root.grid) throw new Error('Not a Qontext token file');
  const tiles = {};
  for (const [id, t] of Object.entries(root.grid)) {
    const row = t.row && t.row.$value;
    const col = t.col && t.col.$value;
    if (!/^r[1-3]c[1-3]$/.test(id) || !isHex(row) || !isHex(col)) throw new Error(`Invalid tile ${id}`);
    tiles[id] = { op: (t.$description || '').replace('Observable ', ''), row: normalizeHex(row), col: normalizeHex(col) };
  }
  const harm = Object.values(root.harmony || {}).map((h) => normalizeHex(h.$value));
  return { version: VERSION, seed: null, project: null, harmony: harm, tiles };
}

/** Colors every [data-q-tile] under `root` by the nearest [data-q-context] ancestor (default row). */
export function bind(result, root = document) {
  const nodes = root.querySelectorAll ? root.querySelectorAll('[data-q-tile]') : [];
  let n = 0;
  for (const el of nodes) {
    const ctxEl = el.closest('[data-q-context]');
    const context = (el.getAttribute('data-q-context') || (ctxEl && ctxEl.getAttribute('data-q-context')) || 'row').trim();
    const color = resolveTile(result, el.getAttribute('data-q-tile'), context);
    if (!color) continue;
    el.style.setProperty(el.getAttribute('data-q-prop') || 'background-color', color);
    el.setAttribute('data-q-value', color);
    n++;
  }
  return n;
}

let observer = null;

/** Sets CSS variables on `target`, binds tiles, and optionally keeps binding as the DOM changes. */
export function apply(result, { target, prefix = 'q', observe = false } = {}) {
  const el = target || document.documentElement;
  for (const [k, v] of Object.entries(cssVariables(result, prefix))) el.style.setProperty(k, v);
  bind(result, document);
  if (observe && typeof MutationObserver === 'function') {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => bind(result, document));
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-q-tile', 'data-q-context'] });
  }
  return result;
}

function visitorSeed() {
  try {
    const s = window.sessionStorage.getItem(VISITOR_KEY);
    if (s !== null && Number.isFinite(Number(s))) return Number(s) >>> 0;
    const fresh = freshSeed();
    window.sessionStorage.setItem(VISITOR_KEY, String(fresh));
    return fresh;
  } catch {
    return freshSeed();
  }
}

/** Collapses for this visitor (stable per session unless `seed` is given), applies and announces it. */
export function start(options = {}) {
  const result = collapse({ ...options, seed: Number.isFinite(options.seed) ? options.seed : visitorSeed() });
  apply(result, { observe: options.observe !== false, prefix: options.prefix || 'q' });
  try {
    document.dispatchEvent(new CustomEvent('qontext:collapse', { detail: result }));
  } catch {
    /* CustomEvent unavailable */
  }
  return result;
}

export const contrast = {
  wcag: (a, b) => wcagContrast(hexToLin(a), hexToLin(b)),
  apca: (text, bg) => apcaContrast(hexToLin(text), hexToLin(bg)),
};

// Auto-start from <script data-qontext='{...}'>.
if (typeof document !== 'undefined' && document.currentScript && document.currentScript.hasAttribute('data-qontext')) {
  const script = document.currentScript;
  const run = () => {
    let opts = {};
    try {
      opts = JSON.parse(script.getAttribute('data-qontext') || '{}');
    } catch {
      console.warn('Qontext: data-qontext is not valid JSON, using defaults');
    }
    start(opts);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
}
