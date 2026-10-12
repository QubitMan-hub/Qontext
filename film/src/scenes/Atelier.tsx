// The Atelier, recorded in step with the voice. The camera visits what each sentence names: the rooms, the
// Wavefunction code, Bouncer turning a failing ink back into a pass, then Handoff and the Walk-By print.
import React from "react";
import { useSceneClock, type SceneTiming } from "../clock";
import { Stage } from "../parts";
import { ClipFrame } from "../parts/ClipFrame";

export const Atelier: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentenceAt } = useSceneClock(scene);
  const focus = [
    { at: 0, x: 800, y: 450, zoom: 1 },
    { at: sentenceAt(2) + 2300, x: 1204, y: 300, zoom: 1.9 }, // the Wavefunction code
    { at: sentenceAt(3) + 700, x: 1204, y: 756, zoom: 2.1 }, // Bouncer
    { at: sentenceAt(4) + 500, x: 616, y: 420, zoom: 1.45 }, // Handoff's export
    { at: sentenceAt(4) + 3600, x: 616, y: 640, zoom: 1.45 }, // the Walk-By print
  ];
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <ClipFrame src="clips/atelier.mp4" ms={ms} focus={focus} title="Qontext Atelier" />
      </div>
    </Stage>
  );
};
