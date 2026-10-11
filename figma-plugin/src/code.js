// Qontext for Figma. Creates a contextual grid, a "Qontext" variable collection with Row and Column
// modes (each tile variable holds its row reading in Row mode and its column reading in Column mode),
// and optional paint styles for the harmony.

import {
  sanitizeProject, paletteOf, makeState, measureAll, mulberry32, hashSeed, freshSeed, tileColor, harmony,
  rowValue, colValue, GRID, opAscii, normalizeHex,
} from '../../src/engine/index.js';

figma.showUI(__html__, { width: 340, height: 560, themeColors: true });

function rgb(hex) {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function collapseFor(project, seed) {
  const pal = paletteOf(project);
  const out = measureAll(makeState(project.state, project.stateSeed), mulberry32(hashSeed(seed, project.stateSeed)));
  const tiles = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      tiles.push({
        id: `r${r + 1}c${c + 1}`,
        r,
        c,
        op: opAscii(GRID[r][c]),
        row: tileColor(pal, r, c, rowValue(out, r, c)).hex,
        col: tileColor(pal, r, c, colValue(out, r, c)).hex,
      });
    }
  }
  return { pal, tiles, harmony: harmony(pal).map((x) => x.hex) };
}

async function createGrid(project, seed, data) {
  const S = 120;
  const gap = 8;
  const frame = figma.createFrame();
  frame.name = `Qontext grid · ${project.name} · seed ${seed}`;
  frame.resize(3 * S + 2 * gap + 32, 3 * S + 2 * gap + 32);
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  let font = null;
  try {
    font = { family: 'Inter', style: 'Medium' };
    await figma.loadFontAsync(font);
  } catch {
    font = null;
  }
  for (const t of data.tiles) {
    const x = 16 + t.c * (S + gap);
    const y = 16 + t.r * (S + gap);
    const tri = (name, path, hex) => {
      const v = figma.createVector();
      v.name = name;
      v.vectorPaths = [{ windingRule: 'NONZERO', data: path }];
      v.fills = [{ type: 'SOLID', color: rgb(hex) }];
      v.strokes = [];
      v.x = x;
      v.y = y;
      frame.appendChild(v);
      return v;
    };
    tri(`${t.id} row`, `M 0 0 L ${S} 0 L 0 ${S} Z`, t.row);
    tri(`${t.id} col`, `M ${S} 0 L ${S} ${S} L 0 ${S} Z`, t.col);
    if (font) {
      const label = figma.createText();
      label.fontName = font;
      label.characters = t.op;
      label.fontSize = 13;
      label.x = x + 8;
      label.y = y + S - 22;
      frame.appendChild(label);
    }
  }
  figma.currentPage.appendChild(frame);
  return frame;
}

function createVariable(name, collection, type) {
  try {
    return figma.variables.createVariable(name, collection, type);
  } catch {
    return figma.variables.createVariable(name, collection.id, type);
  }
}

function createVariables(project, data) {
  const coll = figma.variables.createVariableCollection(`Qontext · ${project.name}`);
  const rowMode = coll.modes[0].modeId;
  coll.renameMode(rowMode, 'Row');
  const colMode = coll.addMode('Column');
  for (const t of data.tiles) {
    const v = createVariable(`grid/${t.id}`, coll, 'COLOR');
    v.description = `Observable ${t.op}. Row mode = row reading, Column mode = column reading.`;
    v.setValueForMode(rowMode, rgb(t.row));
    v.setValueForMode(colMode, rgb(t.col));
  }
  data.harmony.forEach((hex, i) => {
    const v = createVariable(`harmony/${i + 1}`, coll, 'COLOR');
    v.setValueForMode(rowMode, rgb(hex));
    v.setValueForMode(colMode, rgb(hex));
  });
  return coll;
}

function createStyles(project, data) {
  data.harmony.forEach((hex, i) => {
    const s = figma.createPaintStyle();
    s.name = `Qontext/${project.name}/harmony ${i + 1}`;
    s.paints = [{ type: 'SOLID', color: rgb(hex) }];
  });
}

figma.ui.onmessage = async (msg) => {
  if (!msg || msg.type !== 'create') {
    if (msg && msg.type === 'close') figma.closePlugin();
    return;
  }
  try {
    const project = sanitizeProject(msg.project || {});
    const seed = Number.isFinite(msg.seed) ? msg.seed >>> 0 : freshSeed();
    const data = collapseFor(project, seed);
    const made = [];
    if (msg.grid) {
      const frame = await createGrid(project, seed, data);
      figma.currentPage.selection = [frame];
      figma.viewport.scrollAndZoomIntoView([frame]);
      made.push('grid');
    }
    if (msg.variables) {
      createVariables(project, data);
      made.push('variables with Row and Column modes');
    }
    if (msg.styles) {
      createStyles(project, data);
      made.push('paint styles');
    }
    figma.notify(made.length ? `Qontext created ${made.join(', ')} (seed ${seed})` : 'Nothing selected to create');
    figma.ui.postMessage({ type: 'done', seed });
  } catch (e) {
    figma.notify(`Qontext: ${e && e.message ? e.message : e}`, { error: true });
    figma.ui.postMessage({ type: 'error', message: String(e && e.message ? e.message : e) });
  }
};
