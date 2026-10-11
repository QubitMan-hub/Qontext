// The hero field of undecided tiles, a sheet in an Albers frame, the name, and where to go next.
import React from "react";
import { tileColor } from "../../../src/engine/index.js";
import { useSceneClock, type SceneTiming } from "../clock";
import { Stage, Tile, breath, ease } from "../parts";
import { C, FONT, world } from "../theme";

const W = world(10);
const COLS = 16;
const ROWS = 8;
const tile = 120;

export const Outro: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentenceAt } = useSceneClock(scene);
  const sheet = ease(ms, 0, 500);
  const line2 = ease(ms, sentenceAt(1), 400);
  const line3 = ease(ms, sentenceAt(2), 400);
  // Tiles near the middle settle first, as if the sheet's arrival measured them.
  const settle = (r: number, c: number) => ease(ms, 300 + 90 * Math.hypot(c - COLS / 2, r - ROWS / 2), 260);
  return (
    <Stage background={C.paper}>
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${COLS}, ${tile}px)`, gap: 0, justifyContent: "center" }}>
        {Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (_, c) => {
            const a = tileColor(W.palette, r % 3, c % 3, 1).hex as string;
            const b = tileColor(W.palette, r % 3, c % 3, -1).hex as string;
            const s = settle(r, c);
            return <Tile key={`${r}-${c}`} size={tile} color={(r + c) % 2 ? a : b} a={a} b={b} split={1 - s} breathe={breath(ms + (r * COLS + c) * 170)} radius={0} />;
          }),
        )}
      </div>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ padding: 20, background: tileColor(W.palette, 0, 0, 1).hex, borderRadius: 6, opacity: sheet, transform: `scale(${0.97 + 0.03 * sheet})` }}>
          <div style={{ padding: 14, background: tileColor(W.palette, 1, 1, -1).hex, borderRadius: 3 }}>
            <div style={{ background: C.sheet, padding: "56px 80px", display: "grid", gap: 22, minWidth: 980, borderRadius: 2 }}>
              <div style={{ fontFamily: FONT.display, fontWeight: 850, fontSize: 150, letterSpacing: "-0.02em", lineHeight: 0.95, color: C.ink }}>Qontext</div>
              <div style={{ fontFamily: FONT.body, fontSize: 44, color: C.ink, opacity: line2 }}>Colors that depend on how you look at them.</div>
              <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: line3 }}>
                <span style={{ background: C.ink, color: C.paper, borderRadius: 6, padding: "18px 30px", fontFamily: FONT.display, fontWeight: 600, fontSize: 36 }}>Open the Atelier</span>
                <span style={{ fontFamily: FONT.display, fontSize: 30, color: C.ink2 }}>github.com/QubitMan-hub/Qontext</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
};
