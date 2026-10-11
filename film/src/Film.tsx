import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "./Captions";
import { f, type SceneTiming, type Timing } from "./clock";
import { C, loadFonts } from "./theme";
import script from "./script.json";
import timingJson from "./timing.json";
import { SCENES } from "./scenes";

loadFonts();
export const timing = timingJson as Timing;
export const TAIL_MS = 2200; // the outro holds after the last word

/** Each scene arrives with a short fade, the way a measured tile settles: quick, no overshoot. */
const Enter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(frame, [0, 7], [0, 1], { extrapolateRight: "clamp" }) }}>{children}</AbsoluteFill>;
};

export const Film: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {timing.scenes.map((scene: SceneTiming, i: number) => {
        const Scene = SCENES[scene.id];
        const from = f(scene.startMs, fps);
        const to = i === timing.scenes.length - 1 ? durationInFrames : f(scene.endMs, fps);
        return (
          <Sequence key={scene.id} name={script.scenes[i].chapter} from={from} durationInFrames={to - from}>
            <Enter>
              <Scene scene={scene} />
            </Enter>
          </Sequence>
        );
      })}
      <Captions timing={timing} />
      {timing.source !== "estimate" ? <Audio src={staticFile("voice.mp3")} /> : null}
    </AbsoluteFill>
  );
};
