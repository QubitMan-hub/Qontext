// Your world, framed: a poster of the visitor's world, drawn only when the section is near and encoded off
// the main thread (toBlob), plus the Wavefunction code that reopens this exact world in the Atelier.

import { tileColor, rowValue, colValue } from '../../engine/index.js';
import { $, copyText } from '../../app/dom.js';
import { whenNear } from '../lib.js';
import { site, onWorld, worldNumber, proof, wavefunction } from '../world.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let started = false;
let url = null;
let pending = 0;

function draw() {
  const cv = document.createElement('canvas');
  cv.width = 1080;
  cv.height = 1350;
  const g = cv.getContext('2d');
  const pal = site.palette;
  const hm = site.result.harmony;
  const t = site.result.tiles;
  const out = site.result.outcomes;
  g.fillStyle = '#eef0f4';
  g.fillRect(0, 0, 1080, 1350);
  [hm[2], t.r3c3.col, t.r2c2.row, hm[0]].forEach((col, k) => {
    g.fillStyle = col;
    g.fillRect(90 + 90 * k, 90 + 135 * k, 900 - 180 * k, 900 - 180 * k);
  });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = 810 + c * 60;
      const y = 1080 + r * 60;
      g.fillStyle = tileColor(pal, r, c, rowValue(out, r, c)).hex;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 56, y);
      g.lineTo(x, y + 56);
      g.fill();
      g.fillStyle = tileColor(pal, r, c, colValue(out, r, c)).hex;
      g.beginPath();
      g.moveTo(x + 56, y);
      g.lineTo(x + 56, y + 56);
      g.lineTo(x, y + 56);
      g.fill();
    }
  }
  const d = new Date();
  g.fillStyle = '#1d1f52';
  g.font = '850 86px Anybody, "Arial Narrow", Arial, sans-serif';
  g.fillText(`World ${worldNumber()}`, 90, 1150);
  g.font = '400 30px Literata, Georgia, serif';
  g.fillText(`Collapsed ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}. ${proof().rules} of 6 rules hold.`, 90, 1205);
  g.fillText('Qontext, color that depends on how you read it.', 90, 1250);
  return cv;
}

function paintPoster() {
  const img = $('poster');
  const ticket = ++pending;
  try {
    draw().toBlob((blob) => {
      if (!blob || ticket !== pending) return; // a newer world replaced this one while it encoded
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      img.src = url;
      img.hidden = false; // the frame holds its space until the first poster arrives
    }, 'image/png');
  } catch {
    img.alt = 'This browser could not draw the poster.';
    img.hidden = false;
  }
}

function paintCode() {
  const code = wavefunction();
  $('wf').textContent = code;
  $('editWorld').href = `studio.html#${code}`;
}

export function initFrame() {
  paintCode();
  $('wfCopy').addEventListener('click', () => copyText(wavefunction(), null));
  whenNear($('frame'), () => {
    started = true;
    // Draw once the typefaces are in, so the poster never bakes in a fallback font.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintPoster);
    else paintPoster();
  });
  onWorld((kind) => {
    if (kind !== 'world') return;
    paintCode();
    if (started) paintPoster();
  });
}
