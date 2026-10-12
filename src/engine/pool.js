// Measurement pools: recorded shots from hardware (or simulation) that the Studio and runtime draw from.

import { CONTEXTS, CONTEXT_IDS, makeState, merminScore, sampleContext } from './mermin.js';
import { SETTING_KEYS, chshFromShots, samplePair } from './chsh.js';
import { mulberry32 } from './random.js';

export const POOL_FORMAT = 'qontext-pool/1';
export const MAX_POOL_SHOTS_PER_CONTEXT = 200000;

export class PoolError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PoolError';
  }
}

const isPm1 = (v) => v === 1 || v === -1;

/** Validates a pool object. Returns it unchanged or throws PoolError with a fix-it message. */
export function validatePool(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new PoolError('A pool must be a JSON object.');
  if (o.format !== undefined && o.format !== POOL_FORMAT) {
    throw new PoolError(`Unsupported pool format "${o.format}". Expected "${POOL_FORMAT}".`);
  }
  if (!o.contexts || typeof o.contexts !== 'object') {
    throw new PoolError('Missing "contexts". Use a file written by the qontext-hw runner.');
  }
  for (const id of CONTEXT_IDS) {
    const arr = o.contexts[id];
    if (!Array.isArray(arr) || arr.length === 0) throw new PoolError(`Context ${id} has no shots.`);
    if (arr.length > MAX_POOL_SHOTS_PER_CONTEXT) throw new PoolError(`Context ${id} has more than ${MAX_POOL_SHOTS_PER_CONTEXT} shots.`);
    for (const s of arr) {
      if (!Array.isArray(s) || s.length !== 3 || !s.every(isPm1)) {
        throw new PoolError(`Each shot in ${id} must be three values, each 1 or -1.`);
      }
    }
  }
  if (o.chsh !== undefined && o.chsh !== null) {
    for (const key of SETTING_KEYS) {
      const arr = o.chsh[key];
      if (!Array.isArray(arr) || arr.length === 0) throw new PoolError(`CHSH setting ${key} has no shots.`);
      for (const s of arr) {
        if (!Array.isArray(s) || s.length !== 2 || !s.every(isPm1)) throw new PoolError(`Each CHSH shot in ${key} must be two values, each 1 or -1.`);
      }
    }
  }
  for (const k of ['backend', 'created']) {
    if (o[k] !== undefined && typeof o[k] !== 'string') throw new PoolError(`"${k}" must be a string.`);
  }
  if (o.job_ids !== undefined && (!Array.isArray(o.job_ids) || !o.job_ids.every((x) => typeof x === 'string'))) {
    throw new PoolError('"job_ids" must be a list of strings.');
  }
  return o;
}

/** Parses JSON text into a validated pool. */
export function parsePool(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    throw new PoolError('That is not valid JSON.');
  }
  return validatePool(o);
}

export function poolSummary(pool) {
  const mermin = merminScore(pool.contexts);
  const chsh = pool.chsh ? chshFromShots(pool.chsh) : null;
  const totalShots =
    Object.values(pool.contexts).reduce((n, a) => n + a.length, 0) +
    (pool.chsh ? Object.values(pool.chsh).reduce((n, a) => n + a.length, 0) : 0);
  return { mermin, chsh, totalShots };
}

/** Cycling reader over a pool's shots, one cursor per context. */
export function poolDrawer(pool) {
  const cursor = {};
  const draw = (id) => {
    const arr = pool.contexts[id];
    if (!arr || !arr.length) return null;
    const i = (cursor[id] || 0) % arr.length;
    cursor[id] = i + 1;
    return arr[i];
  };
  draw.chsh = (key) => {
    const arr = pool.chsh && pool.chsh[key];
    if (!arr || !arr.length) return null;
    const i = (cursor[key] || 0) % arr.length;
    cursor[key] = i + 1;
    return arr[i];
  };
  return draw;
}

/** An example pool from exact simulation plus bit-flip noise. Always marked simulated. */
export function examplePool({ seed = 7, shots = 512, flip = 0.035, noiseSeed = 424242 } = {}) {
  const psi = makeState('random', seed);
  const rng = mulberry32(noiseSeed);
  const contexts = {};
  for (const ctx of CONTEXTS) {
    const arr = [];
    for (let i = 0; i < shots; i++) arr.push(sampleContext(ctx, psi, rng).map((v) => (rng() < flip ? -v : v)));
    contexts[ctx.id] = arr;
  }
  const chsh = {};
  SETTING_KEYS.forEach((key, idx) => {
    const x = idx >> 1;
    const y = idx & 1;
    const arr = [];
    for (let i = 0; i < shots; i++) arr.push(samplePair(x, y, rng).map((v) => (rng() < flip ? -v : v)));
    chsh[key] = arr;
  });
  return {
    format: POOL_FORMAT,
    backend: 'example (simulated noise)',
    simulated: true,
    job_ids: ['example-local'],
    created: new Date().toISOString(),
    shots,
    state_seed: seed,
    contexts,
    chsh,
  };
}

/** Canonical JSON of the shot data, used for the provenance hash. */
export function canonicalShots(pool) {
  return JSON.stringify({ contexts: pool.contexts, chsh: pool.chsh || null });
}

/* Packing: a pool's shots as bits (+1 is 0, -1 is 1), contexts then CHSH settings in a fixed order, in base64.
   A real run of 20,480 shots is 172 KB as JSON and about 9 KB packed, small enough to ship inside the page. */
const PACKED_FORMAT = 'qontext-pool-packed/1';
const META = ['format', 'backend', 'simulated', 'job_ids', 'created', 'shots', 'state_seed'];
const blocks = (pool) => [
  ...CONTEXTS.map((c) => [c.id, pool.contexts[c.id]]),
  ...(pool.chsh ? SETTING_KEYS.map((k) => [k, pool.chsh[k]]) : []),
];

export function packPool(pool) {
  const bits = [];
  const counts = {};
  for (const [id, shots] of blocks(pool)) {
    counts[id] = shots.length;
    for (const shot of shots) for (const v of shot) bits.push(v < 0 ? 1 : 0);
  }
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  bits.forEach((b, i) => (bytes[i >> 3] |= b << (i & 7)));
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  const meta = {};
  for (const k of META) if (k in pool) meta[k] = pool[k];
  return { format: PACKED_FORMAT, meta, counts, chsh: !!pool.chsh, bits: btoa(bin) };
}

export function unpackPool(packed) {
  if (!packed || packed.format !== PACKED_FORMAT) throw new PoolError('That is not a packed Qontext pool.');
  const bin = atob(packed.bits);
  let i = 0;
  const bit = () => ((bin.charCodeAt(i >> 3) >> (i++ & 7)) & 1 ? -1 : 1);
  const pool = { ...packed.meta, contexts: {} };
  if (packed.chsh) pool.chsh = {};
  const shape = [
    ...CONTEXTS.map((c) => [c.id, 3, 'contexts']),
    ...(packed.chsh ? SETTING_KEYS.map((k) => [k, 2, 'chsh']) : []),
  ];
  for (const [id, width, group] of shape) {
    const shots = [];
    for (let n = 0; n < packed.counts[id]; n++) shots.push(Array.from({ length: width }, bit));
    pool[group][id] = shots;
  }
  return validatePool(pool);
}
