// Deterministic randomness. Every collapse in Qontext is reproducible from its seed.

/** Mulberry32: a small, fast 32-bit PRNG. Returns a function producing floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Combines any number of integers into one 32-bit seed (FNV-1a over 32-bit words). */
export function hashSeed(...parts) {
  let h = 0x811c9dc5;
  for (const part of parts) {
    const n = Number.isFinite(part) ? Math.trunc(part) : 0;
    const words = [n >>> 0, Math.floor(n / 4294967296) >>> 0];
    for (const w of words) {
      for (let s = 0; s < 32; s += 8) {
        h ^= (w >>> s) & 0xff;
        h = Math.imul(h, 0x01000193) >>> 0;
      }
    }
  }
  return h >>> 0;
}

/** Standard normal sample via Box-Muller. */
export function gaussian(rng) {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A fresh seed from the platform's crypto source when available. */
export function freshSeed() {
  try {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0];
  } catch {
    return Math.floor(Math.random() * 4294967296) >>> 0;
  }
}
