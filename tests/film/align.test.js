// Lining the voice up with the script: the voice's pauses mark where sentences and scenes begin.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignToPauses } from '../../film/scripts/align.mjs';

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
