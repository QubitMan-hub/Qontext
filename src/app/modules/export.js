import {
  buildExportData, toCss, toTokens, toTailwind, toSvgGrid, guardReport, INKS, encodeProject, decodeProject,
  DEFAULT_PROJECT, lenticularView, rowValue, colValue, tileColor, clamp, inkFor,
} from '../../engine/index.js';
import { $, $$, copyText, esc, pressOne, toast } from '../dom.js';
import { store, palette, setProject, replaceProject } from '../store.js';
import { currentProbs } from './penta.js';
import { reach } from '../guide.js';

let fmt = 'css';
const FILES = { css: ['css', 'text/css'], tokens: ['tokens.json', 'application/json'], tailwind: ['tailwind.js', 'text/javascript'], svg: ['svg', 'image/svg+xml'] };
const PAUSED = 'Exporting is paused until text reads on every color. Press Fix it for me.';

function data() {
  return buildExportData(palette(), store.out, currentProbs(), { name: store.project.name });
}

function blocked() {
  return !guardReport(palette(), INKS[store.project.ink]).exportable;
}

function renderLenticular() {
  const lpi = clamp(Number($('lpi').value) || 40, 10, 150);
  const dpi = clamp(Number($('dpi').value) || 600, 150, 1200);
  const inches = clamp(Number($('inches').value) || 4, 1, 8);
  const size = Math.min(4800, Math.round(inches * dpi));
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');
  const pal = palette();
  const cell = size / 3;
  for (let x = 0; x < size; x++) {
    const view = lenticularView(x, lpi, dpi);
    const c = Math.min(2, Math.floor(x / cell));
    for (let r = 0; r < 3; r++) {
      const v = view === 0 ? rowValue(store.out, r, c) : colValue(store.out, r, c);
      ctx.fillStyle = tileColor(pal, r, c, v).hex;
      ctx.fillRect(x, Math.round(r * cell), 1, Math.ceil(cell));
    }
  }
  // A 1:1 detail of a tile whose row and column readings differ, scaled 2x, so the strips are visible.
  // The full image is downscaled on screen, which blends the strips together.
  let target = [0, 0];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (rowValue(store.out, r, c) !== colValue(store.out, r, c) && target[2] === undefined) target = [r, c, true];
  const crop = Math.min(120, Math.floor(cell));
  const sx = Math.round(target[1] * cell + cell / 2 - crop / 2);
  const sy = Math.round(target[0] * cell + cell / 2 - crop / 2);
  const detail = document.createElement('canvas');
  detail.width = crop * 2;
  detail.height = crop * 2;
  const dctx = detail.getContext('2d');
  dctx.imageSmoothingEnabled = false;
  dctx.drawImage(cv, sx, sy, crop, crop, 0, 0, crop * 2, crop * 2);
  let url;
  let detailUrl;
  try {
    url = cv.toDataURL('image/png');
    detailUrl = detail.toDataURL('image/png');
  } catch {
    toast('This browser could not render the print file');
    return;
  }
  const img = new Image();
  img.alt = 'Interlaced lenticular print file';
  img.src = url;
  const zoom = new Image();
  zoom.alt = 'Detail of the interlaced strips at twice actual size';
  zoom.src = detailUrl;
  zoom.className = 'zoom';
  const out = $('lentiOut');
  const fig = (el, caption) => {
    const f = document.createElement('figure');
    const cap = document.createElement('figcaption');
    cap.className = 'muted tiny';
    cap.textContent = caption;
    f.append(el, cap);
    return f;
  };
  const tileName = `r${target[0] + 1}c${target[1] + 1}`;
  out.replaceChildren(
    fig(img, 'Print file (screen preview blends the strips). Right-click or long-press to save, print at the DPI above, laminate under the lens sheet.'),
    fig(zoom, target[2] ? `Detail of tile ${tileName} at 2x: row reading and column reading alternate under each lens.` : 'Detail at 2x. This collapse has no tile that changes with context, so measure again for strips.'),
  );
  $('lentiInfo').textContent = `${size} × ${size} px, ${(dpi / lpi / 2).toFixed(1)} px per view strip`;
}

/** A file name from the design's name: "Spring launch" -> qontext-spring-launch.css */
function fileName() {
  const slug = store.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design';
  return `qontext-${slug}.${FILES[fmt][0]}`;
}

function download() {
  if (blocked()) {
    toast(PAUSED);
    return;
  }
  try {
    const url = URL.createObjectURL(new Blob([$('exportOut').value], { type: FILES[fmt][1] }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName();
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Downloaded ${a.download}`);
    reach('export');
  } catch {
    toast('This browser blocked the download. Use Copy instead.');
  }
}

/** The harmony, then every tile split on the diagonal into its row color and its column color. */
function renderSwatches() {
  const d = data();
  const harm = d.harmony.map((hex) => `<div class="sw-h" style="background:${hex};color:${inkFor(hex)}"><span>${esc(hex)}</span></div>`).join('');
  const tiles = d.tiles
    .map((t) => `<div class="sw-t" style="--row:${t.row};--col:${t.col}" title="${esc(t.id)}: row ${esc(t.row)}, column ${esc(t.col)}"></div>`)
    .join('');
  $('handoffSwatches').innerHTML = `<div class="sw-harm">${harm}</div><div class="sw-grid" role="img" aria-label="Nine squares, each split into its row color and its column color">${tiles}</div>`;
}

export function init() {
  for (const b of $$('[data-fmt]')) {
    b.addEventListener('click', () => {
      fmt = b.dataset.fmt;
      pressOne($$('[data-fmt]'), b);
      render();
    });
  }
  $('copyBtn').addEventListener('click', () => {
    if (blocked()) {
      toast(PAUSED);
      return;
    }
    copyText($('exportOut').value, $('exportOut'));
    reach('export');
  });
  $('downloadBtn').addEventListener('click', download);
  $('handoffFix').addEventListener('click', () => $('cgFix').click());
  $('projName').addEventListener('change', (e) => setProject({ name: e.target.value }));
  $('projCopy').addEventListener('click', () => copyText($('projCode').value, $('projCode')));
  $('projLoad').addEventListener('click', () => {
    try {
      replaceProject(decodeProject($('projCode').value));
      toast('Design opened');
    } catch (e) {
      toast(e.message);
    }
  });
  $('projReset').addEventListener('click', () => {
    replaceProject(DEFAULT_PROJECT);
    toast('Started over with the default design');
  });
  $('lentiBtn').addEventListener('click', renderLenticular);
}

export function render() {
  const d = data();
  const text = fmt === 'css' ? toCss(d) : fmt === 'tokens' ? toTokens(d) : fmt === 'tailwind' ? toTailwind(d) : toSvgGrid(d);
  $('exportOut').value = text;
  renderSwatches();
  const isBlocked = blocked();
  $('copyBtn').disabled = isBlocked;
  $('downloadBtn').disabled = isBlocked;
  $('handoffBlock').hidden = !isBlocked;
  $('exportNote').textContent = isBlocked ? '' : `Ready as ${fileName()}`;
  if (document.activeElement !== $('projName')) $('projName').value = store.project.name;
  const code = encodeProject(store.project);
  if (document.activeElement !== $('projCode')) $('projCode').value = code;
  $('projShort').textContent = `${code.slice(0, 18)}…${code.slice(-6)}`;
}
