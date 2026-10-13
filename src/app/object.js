// Real-object preview: local images only. Three-by-three regions map directly to Janus tiles.
import { rowValue, colValue, tileColor, contextualTiles } from '../engine/index.js';
import { store, palette, remeasure, subscribe } from './store.js';

const $ = (id) => document.getElementById(id);
let photo = null;
let imageUrl = null;
let opacity = 0.55;
let view = 'pair';
let active = new Set(Array.from({ length: 9 }, (_, i) => i));

function paint(canvas, context) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!photo) return;
  ctx.drawImage(photo, 0, 0, w, h);
  const pal = palette();
  ctx.globalAlpha = opacity;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (!active.has(r * 3 + c)) continue;
    const value = context === 'row' ? rowValue(store.out, r, c) : colValue(store.out, r, c);
    ctx.fillStyle = tileColor(pal, r, c, value).hex;
    ctx.fillRect(Math.round(c * w / 3), Math.round(r * h / 3),
      Math.round((c + 1) * w / 3) - Math.round(c * w / 3),
      Math.round((r + 1) * h / 3) - Math.round(r * h / 3));
  }
  ctx.globalAlpha = 1;
}

function render() {
  if (!$('object-row')) return;
  $('object-row-wrap').hidden = view === 'column';
  $('object-col-wrap').hidden = view === 'row';
  if (photo) {
    paint($('object-row'), 'row');
    paint($('object-col'), 'col');
  }
  const differences = contextualTiles(store.out).length;
  $('object-status').textContent = photo
    ? `${differences} of 9 contextual outcomes differ. ${active.size} image regions selected. Colors are preview overlays, not automatic object segmentation.`
    : 'Upload a photo to preview contextual colors. Your image stays on this device.';
  for (const b of document.querySelectorAll('[data-object-view]')) {
    b.setAttribute('aria-pressed', String(b.dataset.objectView === view));
  }
  for (const b of document.querySelectorAll('[data-object-tile]')) {
    b.setAttribute('aria-pressed', String(active.has(Number(b.dataset.objectTile))));
  }
}

function save(canvas, name) {
  if (!photo) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qontext-${name}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

export function init() {
  const input = $('object-upload');
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) {
      $('object-status').textContent = 'Choose an image under 12 MB.';
      input.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = url;
      photo = img;
      const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
      for (const id of ['object-row', 'object-col']) {
        $(id).width = Math.max(1, Math.round(img.naturalWidth * scale));
        $(id).height = Math.max(1, Math.round(img.naturalHeight * scale));
      }
      render();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      $('object-status').textContent = 'Could not open this image.';
    };
    img.src = url;
  });
  $('object-opacity').addEventListener('input', (e) => {
    opacity = Number(e.target.value) / 100;
    $('object-opacity-value').textContent = `${e.target.value}%`;
    render();
  });
  $('object-reshuffle').addEventListener('click', remeasure);
  for (const b of document.querySelectorAll('[data-object-view]')) {
    b.addEventListener('click', () => { view = b.dataset.objectView; render(); });
  }
  for (const b of document.querySelectorAll('[data-object-tile]')) {
    b.addEventListener('click', () => {
      const i = Number(b.dataset.objectTile);
      if (active.has(i)) active.delete(i);
      else active.add(i);
      render();
    });
  }
  $('object-download-row').addEventListener('click', () => save($('object-row'), 'row'));
  $('object-download-col').addEventListener('click', () => save($('object-col'), 'column'));
  subscribe(render);
  render();
}
