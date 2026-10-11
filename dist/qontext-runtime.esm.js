// src/engine/random.js
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashSeed(...parts) {
  let h = 2166136261;
  for (const part of parts) {
    const n = Number.isFinite(part) ? Math.trunc(part) : 0;
    const words = [n >>> 0, Math.floor(n / 4294967296) >>> 0];
    for (const w of words) {
      for (let s = 0; s < 32; s += 8) {
        h ^= w >>> s & 255;
        h = Math.imul(h, 16777619) >>> 0;
      }
    }
  }
  return h >>> 0;
}
function gaussian(rng) {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function freshSeed() {
  try {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0];
  } catch {
    return Math.floor(Math.random() * 4294967296) >>> 0;
  }
}

// src/engine/text.js
var CONTROL = (c) => c < 32 || c >= 127 && c < 160 || c === 8232 || c === 8233;
function oneLine(s) {
  return Array.from(String(s ?? ""), (ch) => CONTROL(ch.codePointAt(0)) ? " " : ch).join("").replace(/\s+/g, " ").trim();
}

// src/engine/color.js
var clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
var wrapHue = (h) => (h % 360 + 360) % 360;
function oklchToLinear(L, C, h) {
  const hr = h * Math.PI / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}
var inGamut = (lin, eps = 1e-4) => lin.every((x) => x >= -eps && x <= 1 + eps);
var encode = (x) => x <= 31308e-7 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
var decode = (x) => x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
function linToHex(lin) {
  return "#" + lin.map((x) => Math.round(clamp(encode(clamp(x, 0, 1)), 0, 1) * 255).toString(16).padStart(2, "0")).join("");
}
function oklch(L, C, h) {
  L = clamp(L, 0, 1);
  C = Math.max(0, C);
  h = wrapHue(h);
  let lin = oklchToLinear(L, C, h);
  let clipped = false;
  if (!inGamut(lin)) {
    clipped = true;
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear(L, mid, h))) lo = mid;
      else hi = mid;
    }
    C = lo;
    lin = oklchToLinear(L, C, h);
  }
  lin = lin.map((x) => clamp(x, 0, 1));
  return { L, C, h, lin, hex: linToHex(lin), clipped };
}
var HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
var isHex = (s) => typeof s === "string" && HEX_RE.test(s.trim());
function normalizeHex(s) {
  const m = HEX_RE.exec(String(s).trim());
  if (!m) throw new Error(`Not a hex color: ${s}`);
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return "#" + h;
}
function hexToLin(hex2) {
  const n = parseInt(normalizeHex(hex2).slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => decode(v / 255));
}
var relativeLuminance = (lin) => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
function wcagContrast(linA, linB) {
  const a = relativeLuminance(linA);
  const b = relativeLuminance(linB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function apcaContrast(textLin, bgLin) {
  const y = (lin) => {
    const enc = lin.map((x) => encode(clamp(x, 0, 1)));
    let Y = 0.2126729 * enc[0] ** 2.4 + 0.7151522 * enc[1] ** 2.4 + 0.072175 * enc[2] ** 2.4;
    if (Y < 0.022) Y += (0.022 - Y) ** 1.414;
    return Y;
  };
  const Yt = y(textLin);
  const Yb = y(bgLin);
  if (Math.abs(Yb - Yt) < 5e-4) return 0;
  let out;
  if (Yb > Yt) {
    const sapc = (Yb ** 0.56 - Yt ** 0.57) * 1.14;
    out = sapc < 0.1 ? 0 : sapc - 0.027;
  } else {
    const sapc = (Yb ** 0.65 - Yt ** 0.62) * 1.14;
    out = sapc > -0.1 ? 0 : sapc + 0.027;
  }
  return out * 100;
}

// src/engine/linalg.js
var cx = (re, im = 0) => [re, im];
var cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
var cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
var cabs2 = (a) => a[0] * a[0] + a[1] * a[1];
var PAULI = {
  I: [[cx(1), cx(0)], [cx(0), cx(1)]],
  X: [[cx(0), cx(1)], [cx(1), cx(0)]],
  Y: [[cx(0), cx(0, -1)], [cx(0, 1), cx(0)]],
  Z: [[cx(1), cx(0)], [cx(0), cx(-1)]]
};
function kron(A, B) {
  const n = A.length;
  const m = B.length;
  const R = [];
  for (let i = 0; i < n * m; i++) {
    const row = [];
    for (let j = 0; j < n * m; j++) {
      row.push(cmul(A[Math.floor(i / m)][Math.floor(j / m)], B[i % m][j % m]));
    }
    R.push(row);
  }
  return R;
}
function matmul(A, B) {
  return A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => cadd(s, cmul(a, B[k][j])), cx(0))));
}
function matvec(A, v) {
  return A.map((row) => row.reduce((s, a, j) => cadd(s, cmul(a, v[j])), cx(0)));
}
var norm2 = (v) => v.reduce((s, a) => s + cabs2(a), 0);
function normalize(v) {
  const n = Math.sqrt(norm2(v));
  if (n === 0) throw new Error("Cannot normalize the zero vector");
  return v.map((z) => [z[0] / n, z[1] / n]);
}
var pauliString = (p) => p.map((s) => PAULI[s]).reduce((acc, m) => kron(acc, m));

// src/engine/mermin.js
var collapseSeed = (measureSeed, stateSeed, count = 1, visitor = 0) => hashSeed(measureSeed, stateSeed, count, visitor);
var GRID = [
  [["X", "I"], ["I", "X"], ["X", "X"]],
  [["I", "Z"], ["Z", "I"], ["Z", "Z"]],
  [["X", "Z"], ["Z", "X"], ["Y", "Y"]]
];
function opAscii(p) {
  const parts = [];
  if (p[0] !== "I") parts.push(p[0] + "1");
  if (p[1] !== "I") parts.push(p[1] + "2");
  return parts.join(" ");
}
function buildContexts() {
  const list = [];
  for (let r = 0; r < 3; r++) list.push({ id: `R${r + 1}`, kind: "row", index: r, cells: [[r, 0], [r, 1], [r, 2]] });
  for (let c = 0; c < 3; c++) list.push({ id: `C${c + 1}`, kind: "col", index: c, cells: [[0, c], [1, c], [2, c]] });
  for (const ctx of list) {
    const ops = ctx.cells.map(([r, c]) => pauliString(GRID[r][c]));
    ctx.A = ops[0];
    ctx.B = ops[1];
    ctx.C = ops[2];
    const AB = matmul(ops[0], ops[1]);
    let sign = 0;
    for (let i = 0; i < 4 && !sign; i++) {
      for (let j = 0; j < 4 && !sign; j++) {
        const z = AB[i][j];
        if (Math.hypot(z[0], z[1]) > 1e-9) {
          const w = ops[2][i][j];
          sign = Math.sign(w[0] * z[0] + w[1] * z[1]);
        }
      }
    }
    ctx.sign = sign;
  }
  return list;
}
var CONTEXTS = buildContexts();
var CONTEXT_IDS = CONTEXTS.map((c) => c.id);
var contextById = Object.fromEntries(CONTEXTS.map((c) => [c.id, c]));
var STATE_KINDS = ["random", "bell", "zero"];
function makeState(kind, seed = 7) {
  if (kind === "bell") {
    const k = Math.SQRT1_2;
    return [cx(k), cx(0), cx(0), cx(k)];
  }
  if (kind === "zero") return [cx(1), cx(0), cx(0), cx(0)];
  const rng = mulberry32(Math.imul(seed >>> 0, 9301) + 49297);
  return normalize([0, 1, 2, 3].map(() => cx(gaussian(rng), gaussian(rng))));
}
function halfProject(M, a, v) {
  const Mv = matvec(M, v);
  return v.map((z, i) => [(z[0] + a * Mv[i][0]) / 2, (z[1] + a * Mv[i][1]) / 2]);
}
function contextProbs(ctx, psi) {
  const out = [];
  for (const a of [1, -1]) {
    for (const b of [1, -1]) {
      const u = halfProject(ctx.A, a, halfProject(ctx.B, b, psi));
      out.push({ a, b, c: ctx.sign * a * b, p: norm2(u) });
    }
  }
  return out;
}
function sampleContext(ctx, psi, rng) {
  const probs = contextProbs(ctx, psi);
  const x = rng();
  let acc = 0;
  for (const o2 of probs) {
    acc += o2.p;
    if (x < acc) return [o2.a, o2.b, o2.c];
  }
  const o = probs[probs.length - 1];
  return [o.a, o.b, o.c];
}
function measureAll(psi, rng, draw = null) {
  const out = {};
  for (const ctx of CONTEXTS) {
    const shot = draw ? draw(ctx.id) : null;
    out[ctx.id] = shot ? shot.slice() : sampleContext(ctx, psi, rng);
  }
  return out;
}
var rowValue = (out, r, c) => out[`R${r + 1}`][c];
var colValue = (out, r, c) => out[`C${c + 1}`][r];

// src/engine/kcbs.js
var KCBS_QUANTUM_MAX = Math.sqrt(5);
function buildVectors() {
  const c = Math.cos(Math.PI / 5);
  const ct2 = c / (1 + c);
  const ct = Math.sqrt(ct2);
  const st = Math.sqrt(1 - ct2);
  const v = [];
  for (let j = 0; j < 5; j++) {
    const ang = 4 * Math.PI * j / 5;
    v.push([ct, st * Math.cos(ang), st * Math.sin(ang)]);
  }
  return v;
}
var KCBS_VECTORS = buildVectors();

// src/engine/chsh.js
var TSIRELSON = 2 * Math.SQRT2;
var SETTING_KEYS = ["a0b0", "a0b1", "a1b0", "a1b1"];

// src/engine/harmony.js
function harmony({ base, d, L, C }) {
  const out = [];
  for (let k = 0; k < d; k++) out.push(oklch(L, C, base + k * 360 / d));
  return out;
}
function tileHue({ base, d }, r, c, v) {
  return base + (r * 3 + c) % d * 360 / d + (v < 0 ? 180 : 0);
}
var tileColor = (palette, r, c, v) => oklch(palette.L, palette.C, tileHue(palette, r, c, v));

// src/engine/shapes.js
var R2 = Math.SQRT2;
function permsWithSigns(base) {
  const perms = /* @__PURE__ */ new Set();
  const out = [];
  const permute = (arr, k) => {
    if (k === arr.length) {
      const key = arr.join(",");
      if (!perms.has(key)) {
        perms.add(key);
        out.push(arr.slice());
      }
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      permute(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  permute(base.slice(), 0);
  const signed = [];
  for (const p of out) {
    for (let m = 0; m < 1 << p.length; m++) signed.push(p.map((x, i) => m >> i & 1 ? -x : x));
  }
  return signed;
}
function uniqueRays(vectors) {
  const out = [];
  for (const v of vectors) {
    const n = Math.hypot(...v);
    if (n === 0) continue;
    let u = v.map((x) => x / n);
    const first = u.find((x) => Math.abs(x) > 1e-9);
    if (first < 0) u = u.map((x) => -x);
    if (!out.some((w) => w.every((x, i) => Math.abs(x - u[i]) < 1e-9))) out.push(u);
  }
  return out;
}
var SHAPE_SETS = {
  yuoh13: {
    id: "yuoh13",
    name: "Yu-Oh 13",
    dim: 3,
    year: 2012,
    vectors: uniqueRays([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, -1],
      [1, 0, 1],
      [1, 0, -1],
      [1, 1, 0],
      [1, -1, 0],
      [1, 1, 1],
      [-1, 1, 1],
      [1, -1, 1],
      [1, 1, -1]
    ])
  },
  peres33: {
    id: "peres33",
    name: "Peres 33",
    dim: 3,
    year: 1991,
    vectors: uniqueRays([
      ...permsWithSigns([0, 0, 1]),
      ...permsWithSigns([0, 1, 1]),
      ...permsWithSigns([0, 1, R2]),
      ...permsWithSigns([1, 1, R2])
    ])
  },
  cabello18: {
    id: "cabello18",
    name: "Cabello 18",
    dim: 4,
    year: 1996,
    vectors: uniqueRays([
      [0, 0, 0, 1],
      [0, 0, 1, 0],
      [1, 1, 0, 0],
      [1, -1, 0, 0],
      [0, 1, 0, 0],
      [1, 0, 1, 0],
      [1, 0, -1, 0],
      [1, -1, 1, -1],
      [1, -1, -1, 1],
      [0, 0, 1, 1],
      [1, 1, 1, 1],
      [0, 1, 0, -1],
      [1, 0, 0, 1],
      [1, 0, 0, -1],
      [0, 1, -1, 0],
      [1, 1, -1, 1],
      [1, 1, 1, -1],
      [-1, 1, 1, 1]
    ])
  }
};
var YU_OH_QUANTUM = 25 / 3;

// src/engine/pool.js
var POOL_FORMAT = "qontext-pool/1";
var MAX_POOL_SHOTS_PER_CONTEXT = 2e5;
var PoolError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "PoolError";
  }
};
var isPm1 = (v) => v === 1 || v === -1;
function validatePool(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) throw new PoolError("A pool must be a JSON object.");
  if (o.format !== void 0 && o.format !== POOL_FORMAT) {
    throw new PoolError(`Unsupported pool format "${o.format}". Expected "${POOL_FORMAT}".`);
  }
  if (!o.contexts || typeof o.contexts !== "object") {
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
  if (o.chsh !== void 0 && o.chsh !== null) {
    for (const key of SETTING_KEYS) {
      const arr = o.chsh[key];
      if (!Array.isArray(arr) || arr.length === 0) throw new PoolError(`CHSH setting ${key} has no shots.`);
      for (const s of arr) {
        if (!Array.isArray(s) || s.length !== 2 || !s.every(isPm1)) throw new PoolError(`Each CHSH shot in ${key} must be two values, each 1 or -1.`);
      }
    }
  }
  for (const k of ["backend", "created"]) {
    if (o[k] !== void 0 && typeof o[k] !== "string") throw new PoolError(`"${k}" must be a string.`);
  }
  if (o.job_ids !== void 0 && (!Array.isArray(o.job_ids) || !o.job_ids.every((x) => typeof x === "string"))) {
    throw new PoolError('"job_ids" must be a list of strings.');
  }
  return o;
}

// src/engine/project.js
var PROJECT_VERSION = 1;
var DEFAULT_PROJECT = Object.freeze({
  version: PROJECT_VERSION,
  name: "Untitled system",
  base: 200,
  d: 3,
  L: 0.72,
  C: 0.13,
  state: "random",
  stateSeed: 7,
  measureSeed: 1,
  ink: "dark",
  view: "split",
  mixA: "#1fa39a",
  mixB: "#e0664f",
  phi: 0,
  tilt: 0,
  turn: 0,
  shape: "peres33",
  styleA: 0,
  styleB: 0
});
var num = (v, lo, hi, dflt, step) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  const c = clamp(n, lo, hi);
  return step ? Math.round(c / step) * step : c;
};
var oneOf = (v, list, dflt) => list.includes(v) ? v : dflt;
var hex = (v, dflt) => isHex(v) ? normalizeHex(v) : dflt;
function sanitizeProject(input = {}) {
  const p = input && typeof input === "object" ? input : {};
  const D = DEFAULT_PROJECT;
  return {
    version: PROJECT_VERSION,
    name: typeof p.name === "string" && oneLine(p.name) ? Array.from(oneLine(p.name)).slice(0, 80).join("") : D.name,
    base: num(p.base, 0, 359.999, D.base),
    d: num(p.d, 2, 8, D.d, 1),
    L: num(p.L, 0.2, 0.97, D.L),
    C: num(p.C, 0, 0.32, D.C),
    state: oneOf(p.state, STATE_KINDS, D.state),
    stateSeed: num(p.stateSeed, 0, 4294967295, D.stateSeed, 1),
    measureSeed: num(p.measureSeed, 0, 4294967295, D.measureSeed, 1),
    ink: oneOf(p.ink, ["dark", "light"], D.ink),
    view: oneOf(p.view, ["split", "rows", "cols"], D.view),
    mixA: hex(p.mixA, D.mixA),
    mixB: hex(p.mixB, D.mixB),
    phi: num(p.phi, 0, 360, D.phi),
    tilt: num(p.tilt, 0, 90, D.tilt),
    turn: num(p.turn, 0, 360, D.turn),
    shape: oneOf(p.shape, ["yuoh13", "peres33", "cabello18"], D.shape),
    styleA: num(p.styleA, 0, 1, D.styleA, 1),
    styleB: num(p.styleB, 0, 1, D.styleB, 1)
  };
}
var paletteOf = (p) => ({ base: p.base, d: p.d, L: p.L, C: p.C });

// src/runtime/qontext-runtime.js
var VERSION = "1.1.0";
var VISITOR_KEY = "qontext-visitor-seed";
function poolDraw(pool, seed) {
  const p = validatePool(pool);
  return (id) => {
    const arr = p.contexts[id];
    return arr[hashSeed(seed, id.charCodeAt(0), id.charCodeAt(1)) % arr.length];
  };
}
function collapse(options = {}) {
  const project = sanitizeProject(options);
  const seed = Number.isFinite(options.seed) ? options.seed >>> 0 : freshSeed();
  const pal = paletteOf(project);
  const psi = makeState(project.state, project.stateSeed);
  const out = measureAll(psi, mulberry32(collapseSeed(seed, project.stateSeed, 1, 0)), options.pool ? poolDraw(options.pool, seed) : null);
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
        col: tileColor(pal, r, c, cv).hex
      };
    }
  }
  return { version: VERSION, seed, project, harmony: harmony(pal).map((x) => x.hex), tiles, outcomes: out };
}
function resolveTile(result, tileId, context = "row") {
  const t = result && result.tiles && result.tiles[tileId];
  if (!t) return null;
  return context === "col" ? t.col : t.row;
}
function cssVariables(result, prefix = "q") {
  const vars = {};
  result.harmony.forEach((h, i) => vars[`--${prefix}-harmony-${i + 1}`] = h);
  for (const [id, t] of Object.entries(result.tiles)) {
    vars[`--${prefix}-${id}-row`] = t.row;
    vars[`--${prefix}-${id}-col`] = t.col;
  }
  return vars;
}
function fromTokens(tokens) {
  const root = tokens && tokens.qontext;
  if (!root || !root.grid) throw new Error("Not a Qontext token file");
  const tiles = {};
  for (const [id, t] of Object.entries(root.grid)) {
    const row = t.row && t.row.$value;
    const col = t.col && t.col.$value;
    if (!/^r[1-3]c[1-3]$/.test(id) || !isHex(row) || !isHex(col)) throw new Error(`Invalid tile ${id}`);
    tiles[id] = { op: (t.$description || "").replace("Observable ", ""), row: normalizeHex(row), col: normalizeHex(col) };
  }
  const harm = Object.values(root.harmony || {}).map((h) => normalizeHex(h.$value));
  return { version: VERSION, seed: null, project: null, harmony: harm, tiles };
}
function bind(result, root = document) {
  const nodes = root.querySelectorAll ? root.querySelectorAll("[data-q-tile]") : [];
  let n = 0;
  for (const el of nodes) {
    const ctxEl = el.closest("[data-q-context]");
    const context = (el.getAttribute("data-q-context") || ctxEl && ctxEl.getAttribute("data-q-context") || "row").trim();
    const color = resolveTile(result, el.getAttribute("data-q-tile"), context);
    if (!color) continue;
    el.style.setProperty(el.getAttribute("data-q-prop") || "background-color", color);
    el.setAttribute("data-q-value", color);
    n++;
  }
  return n;
}
var observer = null;
function apply(result, { target, prefix = "q", observe = false } = {}) {
  const el = target || document.documentElement;
  for (const [k, v] of Object.entries(cssVariables(result, prefix))) el.style.setProperty(k, v);
  bind(result, document);
  if (observe && typeof MutationObserver === "function") {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => bind(result, document));
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-q-tile", "data-q-context"] });
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
function start(options = {}) {
  const result = collapse({ ...options, seed: Number.isFinite(options.seed) ? options.seed : visitorSeed() });
  apply(result, { observe: options.observe !== false, prefix: options.prefix || "q" });
  try {
    document.dispatchEvent(new CustomEvent("qontext:collapse", { detail: result }));
  } catch {
  }
  return result;
}
var contrast = {
  wcag: (a, b) => wcagContrast(hexToLin(a), hexToLin(b)),
  apca: (text, bg) => apcaContrast(hexToLin(text), hexToLin(bg))
};
if (typeof document !== "undefined" && document.currentScript && document.currentScript.hasAttribute("data-qontext")) {
  const script = document.currentScript;
  const run = () => {
    let opts = {};
    try {
      opts = JSON.parse(script.getAttribute("data-qontext") || "{}");
    } catch {
      console.warn("Qontext: data-qontext is not valid JSON, using defaults");
    }
    start(opts);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
}
export {
  VERSION,
  apply,
  bind,
  collapse,
  contrast,
  cssVariables,
  fromTokens,
  resolveTile,
  start
};
