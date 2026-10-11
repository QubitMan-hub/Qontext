// When each scene and sentence of the film plays. The real timing comes from the voice track (scripts/align.mjs);
// until a take is chosen, this estimate lets every scene be built and checked against a sensible clock.

const SENTENCE_GAP_MS = 260;
const SCENE_GAP_MS = 700;

const words = (s) => s.split(/\s+/).filter(Boolean).length;

/**
 * Times the script at a relaxed explainer pace (165 words a minute), with short pauses between sentences and
 * longer ones between scenes. With `durationMs`, everything is stretched to fill exactly that length.
 */
export function estimateTiming(script, { wpm = 165, durationMs } = {}) {
  const msPerWord = 60000 / wpm;
  const raw = script.scenes.map((scene, i) => ({
    id: scene.id,
    lead: i === 0 ? 0 : SCENE_GAP_MS,
    sentences: scene.sentences.map((text, k) => ({ text, lead: k === 0 ? 0 : SENTENCE_GAP_MS, len: words(text) * msPerWord })),
  }));
  const total = raw.reduce((sum, s) => sum + s.lead + s.sentences.reduce((a, x) => a + x.lead + x.len, 0), 0);
  const k = durationMs ? durationMs / total : 1;
  let at = 0;
  const scenes = raw.map((scene) => {
    const startMs = Math.round(at);
    at += scene.lead * k;
    const sentences = scene.sentences.map((s) => {
      at += s.lead * k;
      const start = Math.round(at);
      at += s.len * k;
      return { text: s.text, startMs: start, endMs: Math.round(at) };
    });
    return { id: scene.id, startMs, endMs: Math.round(at), sentences };
  });
  // Scenes meet exactly: each one ends where the next begins.
  for (let i = 0; i < scenes.length - 1; i++) scenes[i].endMs = scenes[i + 1].startMs;
  return { source: 'estimate', durationMs: scenes.at(-1).endMs, scenes };
}

const PAGE_CHARS = 90;

/**
 * A long sentence shown as two or more caption pages, split at the comma or colon nearest the middle (a space if
 * there is none), each page on screen for its share of the sentence's time.
 */
export function captionPages(sentence) {
  const out = [];
  const split = (text) => {
    if (text.length <= PAGE_CHARS) return [text];
    const mid = text.length / 2;
    let best = -1;
    for (let i = 0; i < text.length; i++) if ((text[i] === ',' || text[i] === ':') && text[i + 1] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    // Keep the comma or colon on the first page; a plain space is dropped.
    const cut = best < 0 ? text.lastIndexOf(' ', mid) : best + 1;
    return [...split(text.slice(0, cut)), ...split(text.slice(cut + 1))];
  };
  const parts = split(sentence.text);
  const total = parts.reduce((n, p) => n + p.length, 0);
  let at = sentence.startMs;
  parts.forEach((text, i) => {
    const end = i === parts.length - 1 ? sentence.endMs : Math.round(at + ((sentence.endMs - sentence.startMs) * text.length) / total);
    out.push({ text, startMs: Math.round(at), endMs: end });
    at = end;
  });
  return out;
}
