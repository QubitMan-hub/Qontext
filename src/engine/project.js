// A Qontext project: every setting needed to reproduce a design, plus a portable project code.

import { isHex, normalizeHex, clamp } from './color.js';
import { STATE_KINDS } from './mermin.js';
import { oneLine } from './text.js';

export const PROJECT_VERSION = 1;

export const DEFAULT_PROJECT = Object.freeze({
  version: PROJECT_VERSION,
  name: 'Untitled system',
  base: 200,
  d: 3,
  L: 0.72,
  C: 0.13,
  state: 'random',
  stateSeed: 7,
  measureSeed: 1,
  ink: 'dark',
  view: 'split',
  mixA: '#1fa39a',
  mixB: '#e0664f',
  phi: 0,
  tilt: 0,
  turn: 0,
  shape: 'peres33',
  styleA: 0,
  styleB: 0,
});

const num = (v, lo, hi, dflt, step) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  const c = clamp(n, lo, hi);
  return step ? Math.round(c / step) * step : c;
};
const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt);
const hex = (v, dflt) => (isHex(v) ? normalizeHex(v) : dflt);

/** Returns a complete, valid project from any input, clamping or defaulting each field. */
export function sanitizeProject(input = {}) {
  const p = input && typeof input === 'object' ? input : {};
  const D = DEFAULT_PROJECT;
  return {
    version: PROJECT_VERSION,
    name: typeof p.name === 'string' && oneLine(p.name) ? Array.from(oneLine(p.name)).slice(0, 80).join('') : D.name,
    base: num(p.base, 0, 359.999, D.base),
    d: num(p.d, 2, 8, D.d, 1),
    L: num(p.L, 0.2, 0.97, D.L),
    C: num(p.C, 0, 0.32, D.C),
    state: oneOf(p.state, STATE_KINDS, D.state),
    stateSeed: num(p.stateSeed, 0, 4294967295, D.stateSeed, 1),
    measureSeed: num(p.measureSeed, 0, 4294967295, D.measureSeed, 1),
    ink: oneOf(p.ink, ['dark', 'light'], D.ink),
    view: oneOf(p.view, ['split', 'rows', 'cols'], D.view),
    mixA: hex(p.mixA, D.mixA),
    mixB: hex(p.mixB, D.mixB),
    phi: num(p.phi, 0, 360, D.phi),
    tilt: num(p.tilt, 0, 90, D.tilt),
    turn: num(p.turn, 0, 360, D.turn),
    shape: oneOf(p.shape, ['yuoh13', 'peres33', 'cabello18'], D.shape),
    styleA: num(p.styleA, 0, 1, D.styleA, 1),
    styleB: num(p.styleB, 0, 1, D.styleB, 1),
  };
}

export const paletteOf = (p) => ({ base: p.base, d: p.d, L: p.L, C: p.C });

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return globalThis.btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = globalThis.atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Compact, copyable project code: "QX1." + base64url(JSON). */
export function encodeProject(p) {
  return 'QX1.' + toBase64Url(JSON.stringify(sanitizeProject(p)));
}

/** Decodes a project code (or raw project JSON). Throws with a readable message on failure. */
export function decodeProject(code) {
  const s = String(code || '').trim();
  try {
    if (s.startsWith('{')) return sanitizeProject(JSON.parse(s));
    if (!s.startsWith('QX1.')) throw new Error();
    return sanitizeProject(JSON.parse(fromBase64Url(s.slice(4))));
  } catch {
    throw new Error('That is not a Qontext project code. Codes start with QX1.');
  }
}
