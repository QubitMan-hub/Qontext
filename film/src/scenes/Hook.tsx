// One square, two colors. It starts as one flat color; when the question is asked it splits on the diagonal into
// both outcomes, breathing between them; then the two true colors are named underneath.
import React from "react";
import { contextualTiles, tileColor, rowValue, colValue } from "../../../src/engine/index.js";
import { useSceneClock, type SceneTiming } from "../clock";
import { Label, Stage, Tile, breath, ease } from "../parts";
import { C, FONT, world } from "../theme";

const W = world(1);
const out = W.result.outcomes;
// The first tile whose row reading and column reading differ.
const [r, c] = (contextualTiles(out)[0] ?? [0, 0]) as [number, number];
const ROW = tileColor(W.palette, r, c, rowValue(out, r, c)).hex as string;
const COL = tileColor(W.palette, r, c, colValue(out, r, c)).hex as string;

export const Hook: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentenceAt } = useSceneClock(scene);
  const split = ease(ms, sentenceAt(1), 500);
  const named = ease(ms, sentenceAt(3), 400);
  const size = 560;
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", alignContent: "center", gap: 40 }}>
        <Tile size={size} color={ROW} a={ROW} b={COL} split={split} breathe={breath(ms)} radius={8} style={{ transform: `scale(${0.96 + 0.04 * ease(ms, 0, 400)})` }} />
        <div style={{ display: "flex", gap: 56, opacity: named, transform: `translateY(${(1 - named) * 12}px)` }}>
          {[ROW, COL].map((hex, i) => (
            <div key={hex + i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 34, height: 34, borderRadius: 4, background: hex }} />
              <Label style={{ color: C.ink }}>{i === 0 ? "true color one" : "true color two"}</Label>
              <span style={{ fontFamily: FONT.code, fontSize: 26, color: C.ink2 }}>{hex}</span>
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
};
