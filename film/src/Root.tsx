import React from "react";
import { Composition } from "remotion";
import { Film, TAIL_MS, timing } from "./Film";

export const RemotionRoot: React.FC = () => (
  <Composition id="Film" component={Film} fps={30} width={1920} height={1080} durationInFrames={Math.ceil(((timing.durationMs + TAIL_MS) / 1000) * 30)} />
);
