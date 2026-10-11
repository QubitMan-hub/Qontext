import { GRID, opLabel, opAscii, classicalCheck, classicalOptimum } from '../../engine/index.js';
import { $, esc, sign } from '../dom.js';

let values = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
const OPT = classicalOptimum();

export function init() {
  $('learnOpt').textContent = String(OPT.maxSatisfied);
  $('learnReset').addEventListener('click', () => {
    values = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
    render();
  });
  $('learnBest').addEventListener('click', () => {
    // A 5-of-6 assignment: everything +1 breaks only the third column. Flip one tile to move the break around.
    values = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
    const r = Math.floor(Math.random() * 3);
    values[r][2] = -1;
    values[r][0] = -1;
    render();
  });
  $('cgrid').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-r]');
    if (!b) return;
    const r = Number(b.dataset.r);
    const c = Number(b.dataset.c);
    values[r][c] *= -1;
    render();
    $(`cl${r}${c}`).focus();
  });
}

export function render() {
  let html = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const v = values[r][c];
      html += `<button type="button" id="cl${r}${c}" data-r="${r}" data-c="${c}" class="${v < 0 ? 'neg' : ''}" aria-label="${esc(opAscii(GRID[r][c]))}, value ${v > 0 ? 'plus one' : 'minus one'}"><span>${sign(v)}<small>${esc(opLabel(GRID[r][c]))}</small></span></button>`;
    }
  }
  $('cgrid').innerHTML = html;
  const res = classicalCheck(values);
  $('rules').innerHTML = res.perContext
    .map((x) => `<div><span>${x.id} needs ${sign(x.required)}</span><span class="${x.ok ? 'ok' : 'no'}">${sign(x.product)} ${x.ok ? '✓' : '✗'}</span></div>`)
    .join('');
  $('learnVerdict').textContent = `${res.satisfied} of 6 rules satisfied`;
  $('learnNote').textContent =
    res.satisfied === OPT.maxSatisfied
      ? 'That is the best any fixed coloring can ever do. Six out of six is impossible classically, and the computer checked all 512 options to prove it.'
      : `Keep flipping. The best possible is ${OPT.maxSatisfied} of 6, never 6.`;
}
