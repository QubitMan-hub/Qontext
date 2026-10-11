// The film's script: one file feeds both the voice and the captions, so it must match the approved spec word for
// word, and it must read well aloud (no digits, symbols or em dashes for the voice to stumble on).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estimateTiming, captionPages } from '../../film/src/timing.js';

const script = JSON.parse(readFileSync(new URL('../../film/src/script.json', import.meta.url), 'utf8'));
const spec = readFileSync(new URL('../../docs/superpowers/specs/2026-10-12-film-design.md', import.meta.url), 'utf8');

test('ten scenes, in the spec order', () => {
  assert.deepEqual(script.scenes.map((s) => s.id), ['hook', 'idea', 'dare', 'world', 'rooms', 'phase', 'atelier', 'observer', 'probe', 'outro']);
  for (const s of script.scenes) assert.ok(s.chapter && s.sentences.length > 0, s.id);
});

test('the script is the approved narration, word for word', () => {
  const approved = spec.split('\n').filter((l) => l.startsWith('> ')).map((l) => l.slice(2));
  assert.deepEqual(script.scenes.map((s) => s.sentences.join(' ')), approved);
});

test('nothing for the voice to stumble on', () => {
  for (const s of script.scenes) {
    for (const line of s.sentences) {
      assert.doesNotMatch(line, /[0-9=+×÷^%<>—]/, line);
    }
  }
});

test('estimated timing is ordered and leaves no gaps', () => {
  const t = estimateTiming(script);
  assert.equal(t.source, 'estimate');
  let at = 0;
  for (const scene of t.scenes) {
    assert.equal(scene.startMs, at, scene.id);
    for (const s of scene.sentences) assert.ok(s.endMs > s.startMs, s.text);
    at = scene.endMs;
  }
  assert.equal(at, t.durationMs);
});

test('estimated timing can be stretched to a known voice length', () => {
  const t = estimateTiming(script, { durationMs: 154000 });
  assert.equal(t.durationMs, 154000);
  assert.equal(t.scenes.at(-1).endMs, 154000);
});

test('long sentences become caption pages that fit on screen and share the time', () => {
  for (const scene of estimateTiming(script).scenes) {
    for (const sentence of scene.sentences) {
      const pages = captionPages(sentence);
      assert.equal(pages.map((p) => p.text).join(' '), sentence.text);
      assert.equal(pages[0].startMs, sentence.startMs);
      assert.equal(pages.at(-1).endMs, sentence.endMs);
      for (const p of pages) assert.ok(p.text.length <= 90, `caption page too long: ${p.text}`);
    }
  }
});
