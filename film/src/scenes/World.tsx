// Your own world: the real site, recorded in step with the voice. The camera leans in on the world's number when
// the voice says "That's your world", then pulls back for the Many Worlds switch and the scroll.
import React from "react";
import { useSceneClock, type SceneTiming } from "../clock";
import { Stage } from "../parts";
import { ClipFrame } from "../parts/ClipFrame";

export const World: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentenceAt } = useSceneClock(scene);
  const focus = [
    { at: 0, x: 800, y: 450, zoom: 1 },
    { at: sentenceAt(2), x: 1089, y: 120, zoom: 2.1 },
    { at: sentenceAt(3) + 300, x: 800, y: 450, zoom: 1 },
  ];
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <ClipFrame src="clips/world.mp4" ms={ms} focus={focus} title="Qontext website" />
      </div>
    </Stage>
  );
};
