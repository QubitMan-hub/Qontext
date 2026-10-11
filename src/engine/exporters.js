// Hand-off formats: CSS variables, W3C design tokens, Tailwind, SVG, and lenticular interlacing.

import { GRID, colValue, opAscii, rowValue } from './mermin.js';
import { HARMONY_NAMES, harmony, pentaColors, tileColor } from './harmony.js';

/** Everything an export needs, from a palette, one measurement round and pentagram probabilities. */
export function buildExportData(palette, out, pentaProbs, meta = {}) {
  const tiles = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const rv = rowValue(out, r, c);
      const cv = colValue(out, r, c);
      tiles.push({
        id: `r${r + 1}c${c + 1}`,
        r,
        c,
        op: opAscii(GRID[r][c]),
        rowValue: rv,
        colValue: cv,
        row: tileColor(palette, r, c, rv).hex,
        col: tileColor(palette, r, c, cv).hex,
      });
    }
  }
  return {
    meta: { name: meta.name || 'Qontext system', harmony: HARMONY_NAMES[palette.d], ...palette, ...meta },
    harmony: harmony(palette).map((c) => c.hex),
    tiles,
    penta: pentaColors(palette, pentaProbs).map((c) => c.hex),
  };
}

const header = (data) =>
  `Qontext · ${data.meta.name} · ${data.meta.harmony} harmony, base phase ${Math.round(data.meta.base)} deg`;

export function toCss(data, prefix = 'q') {
  const lines = [`/* ${header(data)} */`, ':root {'];
  data.harmony.forEach((h, i) => lines.push(`  --${prefix}-harmony-${i + 1}: ${h};`));
  lines.push('', '  /* Context Grid: every tile carries a row reading and a column reading */');
  for (const t of data.tiles) {
    lines.push(`  --${prefix}-${t.id}-row: ${t.row}; /* ${t.op} = ${t.rowValue > 0 ? '+1' : '-1'} */`);
    lines.push(`  --${prefix}-${t.id}-col: ${t.col}; /* ${t.op} = ${t.colValue > 0 ? '+1' : '-1'} */`);
  }
  lines.push('', '  /* Pentagram: neighbouring colors are exclusive */');
  data.penta.forEach((h, i) => lines.push(`  --${prefix}-penta-${i + 1}: ${h};`));
  lines.push('}', '', '/* Resolve each tile by its context */');
  for (const t of data.tiles) {
    lines.push(`[data-q-context="row"] [data-q-tile="${t.id}"] { background-color: var(--${prefix}-${t.id}-row); }`);
    lines.push(`[data-q-context="col"] [data-q-tile="${t.id}"] { background-color: var(--${prefix}-${t.id}-col); }`);
  }
  return lines.join('\n') + '\n';
}

/** W3C Design Tokens Community Group format. */
export function toTokens(data) {
  const o = {
    qontext: {
      $description: header(data),
      harmony: {},
      grid: {},
      pentagram: {},
    },
  };
  data.harmony.forEach((h, i) => (o.qontext.harmony[String(i + 1)] = { $type: 'color', $value: h }));
  for (const t of data.tiles) {
    o.qontext.grid[t.id] = {
      $description: `Observable ${t.op}`,
      row: { $type: 'color', $value: t.row },
      col: { $type: 'color', $value: t.col },
    };
  }
  data.penta.forEach((h, i) => (o.qontext.pentagram[String(i + 1)] = { $type: 'color', $value: h }));
  return JSON.stringify(o, null, 2) + '\n';
}

export function toTailwind(data) {
  const colors = { harmony: {}, grid: {}, penta: {} };
  data.harmony.forEach((h, i) => (colors.harmony[i + 1] = h));
  for (const t of data.tiles) {
    colors.grid[`${t.id}-row`] = t.row;
    colors.grid[`${t.id}-col`] = t.col;
  }
  data.penta.forEach((h, i) => (colors.penta[i + 1] = h));
  const body = JSON.stringify({ q: colors }, null, 2).split('\n').join('\n      ');
  return `// ${header(data)}\n// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: ${body},\n    },\n  },\n};\n`;
}

/** SVG of the split grid: upper-left triangle = row reading, lower-right = column reading. */
export function toSvgGrid(data, size = 300) {
  const s = size / 3;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    `  <title>${header(data)}</title>`,
  ];
  for (const t of data.tiles) {
    const x = t.c * s;
    const y = t.r * s;
    parts.push(`  <polygon points="${x},${y} ${x + s},${y} ${x},${y + s}" fill="${t.row}"/>`);
    parts.push(`  <polygon points="${x + s},${y} ${x + s},${y + s} ${x},${y + s}" fill="${t.col}"/>`);
  }
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}

/**
 * Which of two views a pixel column shows under a lenticular lens sheet.
 * lpi: lenses per inch, dpi: print resolution. Returns 0 (row view) or 1 (column view).
 */
export function lenticularView(x, lpi, dpi) {
  const phase = ((x * lpi) / dpi) % 1;
  return phase < 0.5 ? 0 : 1;
}

/** Pixel size for a lenticular print. */
export function lenticularSize(inches, dpi) {
  const px = Math.round(inches * dpi);
  return { width: px, height: px, pitchPx: dpi };
}
