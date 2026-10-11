// Albers first: one small color on two grounds looks like two colors, and a bridge shows it is one. Then the
// Qontext grid: undecided tiles, and one tile read along its row and then down its column, really changing.
import React from "react";
import { contextualTiles, tileColor, rowValue, colValue, oklch } from "../../../src/engine/index.js";
import { useSceneClock, type SceneTiming } from "../clock";
import { Label, Stage, Tile, breath, ease } from "../parts";
import { C, FONT, world } from "../theme";

const W = world(2);
const out = W.result.outcomes;
// The tile the scene reads both ways: one whose row and column readings really differ.
const [PR, PC] = (contextualTiles(out)[0] ?? [1, 1]) as [number, number];
const color = (r: number, c: number, v: number) => tileColor(W.palette, r, c, v).hex as string;
const base = W.palette.base;
const CORE = oklch(0.6, 0.06, base + 90).hex as string;
const GROUNDS = [oklch(0.32, 0.09, base + 200).hex as string, oklch(0.86, 0.07, base + 20).hex as string];

const Albers: React.FC<{ ms: number; bridge: number }> = ({ ms, bridge }) => (
  <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", width: 1120, height: 560, borderRadius: 8, overflow: "hidden", opacity: ease(ms, 0, 400) }}>
    {GROUNDS.map((g) => (
      <div key={g} style={{ background: g, display: "grid", placeItems: "center" }}>
        <div style={{ width: 190, height: 190, background: CORE }} />
      </div>
    ))}
    <div style={{ position: "absolute", left: 280 + 95, top: 280 - 34, height: 68, width: 370 * bridge, background: CORE }} />
  </div>
);

export const Idea: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentenceAt, lengthMs } = useSceneClock(scene);
  const albersOut = ease(ms, sentenceAt(2), 450);
  const gridIn = ease(ms, sentenceAt(2) + 200, 450);
  const decide = ease(ms, sentenceAt(5), 400);
  const half = sentenceAt(5) + (lengthMs - sentenceAt(5)) * 0.45;
  const reading: "row" | "col" = ms < half ? "row" : "col";
  const size = 150;
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 1 - albersOut, transform: `translateX(${-albersOut * 120}px)` }}>
        <div style={{ display: "grid", gap: 22, justifyItems: "start" }}>
          <Albers ms={ms} bridge={ease(ms, sentenceAt(1), 700)} />
          <Label>Josef Albers, Interaction of Color, 1963. Both small squares are {CORE}.</Label>
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 120, opacity: gridIn }}>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(3, ${size}px)`, gap: 12 }}>
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => {
              const inLine = decide > 0 && (reading === "row" ? r === PR : c === PC);
              const v = reading === "row" ? rowValue(out, r, c) : colValue(out, r, c);
              return (
                <Tile key={`${r}${c}`} size={size} color={color(r, c, v)} a={color(r, c, 1)} b={color(r, c, -1)} split={inLine ? 0 : 1} breathe={breath(ms + (r * 3 + c) * 300)}
                  style={{ outline: r === PR && c === PC && decide > 0 ? `4px solid ${C.ink}` : "none", outlineOffset: 4 }} />
              );
            }),
          )}
          {decide > 0 ? (
            <div style={{ position: "absolute", border: `3px dashed ${C.ink}`, borderRadius: 10, opacity: decide,
              ...(reading === "row" ? { left: -14, right: -14, top: PR * (size + 12) - 14, height: size + 28 } : { top: -14, bottom: -14, left: PC * (size + 12) - 14, width: size + 28 }) }} />
          ) : null}
        </div>
        <div style={{ display: "grid", gap: 24, opacity: decide }}>
          <Tile size={300} color={reading === "row" ? color(PR, PC, rowValue(out, PR, PC)) : color(PR, PC, colValue(out, PR, PC))} radius={8} />
          <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 40, color: C.ink }}>{reading === "row" ? "Read along its row" : "Read down its column"}</div>
          <div style={{ fontFamily: FONT.code, fontSize: 28, color: C.ink2 }}>
            {reading === "row" ? color(PR, PC, rowValue(out, PR, PC)) : color(PR, PC, colValue(out, PR, PC))}
          </div>
        </div>
      </div>
    </Stage>
  );
};
