import React from "react";
import { Composition } from "remotion";
import { Film, TAIL_MS, timing } from "./Film";
import { Card, Icon } from "./Cards";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Film" component={Film} fps={30} width={1920} height={1080} durationInFrames={Math.ceil(((timing.durationMs + TAIL_MS) / 1000) * 30)} />
    <Composition id="Card" component={Card} fps={30} width={1200} height={630} durationInFrames={1} />
    <Composition id="Icon" component={Icon} fps={30} width={180} height={180} durationInFrames={1} />
  </>
);
