// Lining the voice up with the script: the voice's pauses mark where sentences and scenes begin.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alignToPauses, syllables } from '../../film/scripts/align.mjs';

const script2 = JSON.parse(readFileSync(new URL('../../film/src/script.json', import.meta.url), 'utf8'));

const script = {
  scenes: [
    { id: 'a', sentences: ['One two three four.', 'Five six seven.'] },
    { id: 'b', sentences: ['Eight nine ten eleven twelve.', 'Thirteen.'] },
  ],
};
// Speech from 0.4 s; sentence gaps at 2.0 s and 6.6 s; a scene gap at 4.0 s; voice ends at 7.6 s, file at 8 s.
const pauses = [
  { startMs: 1900, endMs: 2200 },
  { startMs: 3800, endMs: 4600 },
  { startMs: 6500, endMs: 6800 },
];
const opts = { speechStartMs: 400, speechEndMs: 7600, durationMs: 8000 };

test('each sentence starts where the voice comes back after a pause', () => {
  const t = alignToPauses(script, pauses, opts);
  assert.equal(t.source, 'voice');
  const starts = t.scenes.flatMap((s) => s.sentences.map((x) => x.startMs));
  assert.deepEqual(starts, [400, 2200, 4600, 6800]);
  const ends = t.scenes.flatMap((s) => s.sentences.map((x) => x.endMs));
  assert.deepEqual(ends, [1900, 3800, 6500, 7600]);
});

test('a scene begins in the middle of the pause before it, and the last one runs to the end', () => {
  const t = alignToPauses(script, pauses, opts);
  assert.deepEqual(t.scenes.map((s) => [s.startMs, s.endMs]), [[0, 4200], [4200, 8000]]);
  assert.equal(t.durationMs, 8000);
});

test('an extra pause inside a sentence is passed over', () => {
  const extra = [...pauses.slice(0, 2), { startMs: 5200, endMs: 5400 }, pauses[2]];
  const t = alignToPauses(script, extra, opts);
  assert.equal(t.source, 'voice');
  assert.deepEqual(t.scenes.flatMap((s) => s.sentences.map((x) => x.startMs)), [400, 2200, 4600, 6800]);
});

test('too few pauses: times each sentence by its share of the voice instead, and says so', () => {
  const t = alignToPauses(script, pauses.slice(0, 1), opts);
  assert.equal(t.source, 'estimate-in-voice');
  const all = t.scenes.flatMap((s) => s.sentences);
  assert.equal(all[0].startMs, 400);
  assert.equal(all.at(-1).endMs, 7600);
  for (let i = 1; i < all.length; i++) assert.ok(all[i].startMs >= all[i - 1].endMs);
  assert.equal(t.durationMs, 8000);
});

test('on a real take, every sentence comes out at a believable speaking rate', () => {
  // The first two scenes of the chosen take: its real pauses (start ms, length ms) between 0 and 34.8 s.
  const real = [[310, 330], [1200, 610], [4790, 590], [6280, 380], [7910, 200], [9130, 650], [10590, 590], [11700, 570], [17660, 620],
    [18390, 200], [19680, 470], [20990, 200], [21870, 590], [25720, 490], [28050, 530], [32330, 360]].map(([a, d]) => ({ startMs: a, endMs: a + d }));
  const two = { scenes: script2.scenes.slice(0, 2) };
  const t = alignToPauses(two, real, { speechStartMs: 0, speechEndMs: 34820, durationMs: 34820 });
  // Each sentence's syllables per second stays near the take's own average (a misplaced break makes one
  // sentence a blur and its neighbour a crawl), and the scene break lands on one of the long breaths.
  const all = t.scenes.flatMap((x) => x.sentences);
  const rates = all.map((s) => syllables(s.text) / ((s.endMs - s.startMs) / 1000));
  const mean = rates.reduce((a, b) => a + b) / rates.length;
  all.forEach((s, i) => assert.ok(rates[i] > 0.55 * mean && rates[i] < 1.6 * mean, `${(rates[i] / mean).toFixed(2)} times the average: ${s.text}`));
  assert.equal(t.scenes[1].startMs, Math.round((11700 + 12270) / 2));
});
