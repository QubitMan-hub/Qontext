// Scenes are placed on the timeline by the voice's timing. Inside a scene, these helpers say how far along the
// scene is and which sentence is being spoken, so a visual can change exactly when the voice names it.
import { useCurrentFrame, useVideoConfig } from "remotion";

export type Sentence = { text: string; startMs: number; endMs: number };
export type SceneTiming = { id: string; startMs: number; endMs: number; sentences: Sentence[] };
export type Timing = { source: string; durationMs: number; scenes: SceneTiming[] };

export function useSceneClock(scene: SceneTiming) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000; // since this scene started
  const sentenceAt = (i: number) => scene.sentences[Math.min(i, scene.sentences.length - 1)].startMs - scene.startMs;
  let sentence = 0;
  scene.sentences.forEach((s, i) => {
    if (ms >= s.startMs - scene.startMs) sentence = i;
  });
  const lengthMs = scene.endMs - scene.startMs;
  return { frame, fps, ms, sentence, sentenceAt, lengthMs, progress: Math.min(1, ms / lengthMs) };
}

/** Frames from milliseconds. */
export const f = (ms: number, fps: number) => Math.round((ms / 1000) * fps);
