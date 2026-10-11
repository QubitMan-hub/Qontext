// Lines the chosen voice take up with the script. ffmpeg finds the pauses in public/voice.mp3; each sentence
// boundary is matched to the pause nearest where an even reading pace would put it (a small dynamic program, so
// extra pauses inside sentences are passed over). With too few pauses it falls back to timing each sentence by its
// share of the voice, and says so. Writes src/timing.json.
//
//   node scripts/align.mjs            align public/voice.mp3
//   node scripts/align.mjs --estimate write an estimate with no voice (for building scenes first)

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { estimateTiming } from '../src/timing.js';

const sentencesOf = (script) => script.scenes.flatMap((s, i) => s.sentences.map((text) => ({ text, scene: i })));

/** The estimate, squeezed into the stretch of the file where there is speech. */
function estimateIn(script, { speechStartMs, speechEndMs }) {
  const t = estimateTiming(script, { durationMs: speechEndMs - speechStartMs });
  const flat = t.scenes.flatMap((s) => s.sentences);
  return flat.map((s) => ({ text: s.text, startMs: s.startMs + speechStartMs, endMs: s.endMs + speechStartMs }));
}

function build(script, sentences, sceneStarts, durationMs, source) {
  let k = 0;
  const scenes = script.scenes.map((scene, i) => {
    const own = scene.sentences.map(() => sentences[k++]);
    return { id: scene.id, startMs: sceneStarts[i], endMs: i + 1 < script.scenes.length ? sceneStarts[i + 1] : durationMs, sentences: own };
  });
  return { source, durationMs, scenes };
}

/**
 * Timing from detected pauses ({ startMs, endMs }, in order, leading and trailing silence excluded).
 * `speechStartMs`/`speechEndMs` bound the speech; `durationMs` is the whole file.
 */
export function alignToPauses(script, pauses, { speechStartMs, speechEndMs, durationMs }) {
  const flat = sentencesOf(script);
  const expected = estimateIn(script, { speechStartMs, speechEndMs });
  const B = flat.length - 1;
  const P = pauses.length;

  if (P < B) {
    const sentences = expected.map((s) => ({ text: s.text, startMs: Math.round(s.startMs), endMs: Math.round(s.endMs) }));
    sentences[0].startMs = speechStartMs;
    sentences.at(-1).endMs = speechEndMs;
    const starts = script.scenes.map((_, i) => {
      if (i === 0) return 0;
      const first = flat.findIndex((s) => s.scene === i);
      return Math.round((sentences[first - 1].endMs + sentences[first].startMs) / 2);
    });
    return build(script, sentences, starts, durationMs, 'estimate-in-voice');
  }

  // cost[b][p]: boundary b (after sentence b) placed at pause p. Near where the pace expects it, and longer pauses
  // are slightly preferred, since speakers breathe between sentences more than inside them.
  const mid = (p) => (p.startMs + p.endMs) / 2;
  const cost = (b, p) => Math.abs(mid(pauses[p]) - expected[b + 1].startMs) / 1000 - (0.5 * (pauses[p].endMs - pauses[p].startMs)) / 1000;
  const best = Array.from({ length: B }, () => new Array(P).fill(Infinity));
  const from = Array.from({ length: B }, () => new Array(P).fill(-1));
  for (let p = 0; p < P; p++) best[0][p] = cost(0, p);
  for (let b = 1; b < B; b++) {
    let runMin = Infinity;
    let runArg = -1;
    for (let p = b; p < P; p++) {
      if (best[b - 1][p - 1] < runMin) {
        runMin = best[b - 1][p - 1];
        runArg = p - 1;
      }
      best[b][p] = runMin + cost(b, p);
      from[b][p] = runArg;
    }
  }
  let p = best[B - 1].indexOf(Math.min(...best[B - 1]));
  const chosen = new Array(B);
  for (let b = B - 1; b >= 0; b--) {
    chosen[b] = pauses[p];
    p = from[b][p];
  }

  const sentences = flat.map((s, i) => ({
    text: s.text,
    startMs: i === 0 ? speechStartMs : chosen[i - 1].endMs,
    endMs: i === B ? speechEndMs : chosen[i].startMs,
  }));
  const starts = script.scenes.map((_, i) => {
    if (i === 0) return 0;
    const first = flat.findIndex((s) => s.scene === i);
    return Math.round(mid(chosen[first - 1]));
  });
  return build(script, sentences, starts, durationMs, 'voice');
}

/** Pauses and speech bounds from ffmpeg's silence detector. */
export function detect(file) {
  const durationMs = Math.round(Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString()) * 1000);
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-35dB:d=0.18', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const silences = [];
  let open = null;
  for (const line of log.split('\n')) {
    const s = /silence_start: ([\d.]+)/.exec(line);
    const e = /silence_end: ([\d.]+)/.exec(line);
    if (s) open = Math.round(Number(s[1]) * 1000);
    if (e && open !== null) {
      silences.push({ startMs: open, endMs: Math.round(Number(e[1]) * 1000) });
      open = null;
    }
  }
  if (open !== null) silences.push({ startMs: open, endMs: durationMs });
  const lead = silences[0] && silences[0].startMs <= 50 ? silences.shift() : null;
  const tail = silences.at(-1) && silences.at(-1).endMs >= durationMs - 50 ? silences.pop() : null;
  return { pauses: silences, speechStartMs: lead ? lead.endMs : 0, speechEndMs: tail ? tail.startMs : durationMs, durationMs };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = (p) => fileURLToPath(new URL(p, import.meta.url));
  const script = JSON.parse(readFileSync(here('../src/script.json'), 'utf8'));
  const voice = here('../public/voice.mp3');
  let timing;
  if (process.argv.includes('--estimate') || !existsSync(voice)) {
    timing = estimateTiming(script, { durationMs: 154000 });
    console.log('No voice: wrote an estimate at 154 s.');
  } else {
    const found = detect(voice);
    timing = alignToPauses(script, found.pauses, found);
    console.log(`${found.pauses.length} pauses for ${sentencesOf(script).length - 1} sentence breaks; timing from ${timing.source}.`);
  }
  writeFileSync(here('../src/timing.json'), JSON.stringify(timing, null, 2) + '\n');
}
