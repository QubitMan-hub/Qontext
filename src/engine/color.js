// Color science: OKLCH <-> sRGB with gamut mapping, WCAG 2.2 contrast and APCA (W3 0.0.98G-4g).

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const wrapHue = (h) => ((h % 360) + 360) % 360;

/** OKLCH to linear sRGB (may be out of gamut). */
export function oklchToLinear(L, C, h) {
  const hr = (h * Math.PI) / 180;
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
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export const inGamut = (lin, eps = 1e-4) => lin.every((x) => x >= -eps && x <= 1 + eps);
export const encode = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
export const decode = (x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));

export function linToHex(lin) {
  return (
    '#' +
    lin
      .map((x) => Math.round(clamp(encode(clamp(x, 0, 1)), 0, 1) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * A color from OKLCH, gamut-mapped into sRGB by reducing chroma at constant lightness and hue
 * (binary search). Returns { L, C, h, lin, hex, clipped }.
 */
export function oklch(L, C, h) {
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

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const isHex = (s) => typeof s === 'string' && HEX_RE.test(s.trim());

/** Normalizes #abc / abc / #AABBCC to #aabbcc. Throws on invalid input. */
export function normalizeHex(s) {
  const m = HEX_RE.exec(String(s).trim());
  if (!m) throw new Error(`Not a hex color: ${s}`);
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return '#' + h;
}

export function hexToLin(hex) {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => decode(v / 255));
}

export function linToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function labToLch([L, a, b]) {
  return { L, C: Math.hypot(a, b), h: wrapHue((Math.atan2(b, a) * 180) / Math.PI) };
}

export const hexToOklch = (hex) => labToLch(linToOklab(hexToLin(hex)));

/** WCAG 2.x relative luminance from linear sRGB. */
export const relativeLuminance = (lin) => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];

/** WCAG 2.x contrast ratio, 1 to 21. Order does not matter. */
export function wcagContrast(linA, linB) {
  const a = relativeLuminance(linA);
  const b = relativeLuminance(linB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * APCA lightness contrast (Lc) for text on background, APCA-W3 0.0.98G-4g constants.
 * Positive for dark text on light background, negative for light on dark. Inputs are linear sRGB.
 */
export function apcaContrast(textLin, bgLin) {
  const y = (lin) => {
    const enc = lin.map((x) => encode(clamp(x, 0, 1)));
    let Y = 0.2126729 * enc[0] ** 2.4 + 0.7151522 * enc[1] ** 2.4 + 0.072175 * enc[2] ** 2.4;
    if (Y < 0.022) Y += (0.022 - Y) ** 1.414;
    return Y;
  };
  const Yt = y(textLin);
  const Yb = y(bgLin);
  if (Math.abs(Yb - Yt) < 0.0005) return 0;
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

/** Picks the ink (dark or light) with the better worst-case WCAG contrast over a set of backgrounds. */
export function bestInk(backgroundsLin, darkLin, lightLin) {
  const worst = (ink) => Math.min(...backgroundsLin.map((bg) => wcagContrast(ink, bg)));
  const d = worst(darkLin);
  const l = worst(lightLin);
  return d >= l ? { ink: 'dark', ratio: d } : { ink: 'light', ratio: l };
}
