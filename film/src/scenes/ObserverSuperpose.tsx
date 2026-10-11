// Observer: one line in a page, then three visitors' windows, each a different world. Superpose: a plain sketch
// of a design tool's variable list, every tile with a Row color and a Column color.
import React from "react";
import { tileColor, rowValue, colValue } from "../../../src/engine/index.js";
import { useSceneClock, type SceneTiming } from "../clock";
import { Label, Stage, Tile, Window, WallName, ease } from "../parts";
import { C, FONT, world } from "../theme";

const LINE = '<script src="qontext-runtime.min.js"></script>';
const VISITORS = [4207311, 6611093, 1839920].map(world);
const fmt = (n: number) => n.toLocaleString("en-US");

const Site: React.FC<{ w: ReturnType<typeof world>; size: number }> = ({ w, size }) => {
  const out = w.result.outcomes;
  const t = size / 3 - 8;
  return (
    <div style={{ display: "grid", gap: 14, padding: 22 }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 30, color: C.ink }}>World {fmt(w.seed)}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${t}px)`, gap: 8 }}>
        {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <Tile key={`${r}${c}`} size={t} color={tileColor(w.palette, r, c, rowValue(out, r, c)).hex} radius={4} />))}
      </div>
    </div>
  );
};

export const ObserverSuperpose: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentence, sentenceAt } = useSceneClock(scene);
  if (sentence < 4) {
    const typed = LINE.slice(0, Math.round(LINE.length * ease(ms, sentenceAt(1), 1100)));
    const three = ease(ms, sentenceAt(2), 500);
    return (
      <Stage>
        <div style={{ position: "absolute", left: 120, top: 70 }}>
          <WallName ms={ms} at={sentenceAt(1)}>Observer</WallName>
        </div>
        <div style={{ position: "absolute", left: 120, right: 120, top: 290, display: "grid", gap: 40, justifyItems: "center" }}>
          <div style={{ fontFamily: FONT.code, fontSize: 34, color: C.ink, background: C.sheet, border: `1px solid ${C.rule}`, borderRadius: 8, padding: "18px 26px", minWidth: 980, opacity: ease(ms, sentenceAt(1), 250) }}>
            {typed}<span style={{ opacity: Math.floor(ms / 400) % 2 ? 0 : 1 }}>|</span>
          </div>
          <div style={{ display: "flex", gap: 36, opacity: three, transform: `translateY(${(1 - three) * 30}px)` }}>
            {VISITORS.map((w, i) => (
              <Window key={w.seed} width={480} height={430} title={`Visitor ${i + 1}`}>
                <Site w={w} size={430} />
              </Window>
            ))}
          </div>
          <Label style={{ opacity: ease(ms, sentenceAt(3), 300) }}>No server. No tracking. Twelve kilobytes.</Label>
        </div>
      </Stage>
    );
  }
  const w = VISITORS[0];
  const out = w.result.outcomes;
  const rows = [[0, 0], [0, 1], [1, 1], [2, 2]];
  return (
    <Stage>
      <div style={{ position: "absolute", left: 120, top: 70 }}>
        <WallName ms={ms} at={sentenceAt(5)}>Superpose</WallName>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "grid", justifyItems: "center", opacity: ease(ms, sentenceAt(5), 400) }}>
        <div style={{ width: 1100, background: C.sheet, border: `1px solid ${C.rule}`, borderRadius: 10, overflow: "hidden", fontFamily: FONT.display, color: C.ink }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 260px 260px", padding: "16px 28px", background: C.paper2, fontSize: 26, fontWeight: 600, color: C.ink2 }}>
            <span>Variable</span><span>Row</span><span>Column</span>
          </div>
          {rows.map(([r, c]) => (
            <div key={`${r}${c}`} style={{ display: "grid", gridTemplateColumns: "1fr 260px 260px", alignItems: "center", padding: "16px 28px", borderTop: `1px solid ${C.rule}`, fontSize: 28 }}>
              <span style={{ fontFamily: FONT.code, fontSize: 26 }}>q / r{r + 1}c{c + 1}</span>
              {[rowValue(out, r, c), colValue(out, r, c)].map((v, k) => {
                const hex = tileColor(w.palette, r, c, v).hex as string;
                return (
                  <span key={k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 4, background: hex }} />
                    <span style={{ fontFamily: FONT.code, fontSize: 22, color: C.ink2 }}>{hex}</span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <Label style={{ marginTop: 22 }}>A Figma plugin: one variable collection, a Row mode and a Column mode.</Label>
      </div>
    </Stage>
  );
};
