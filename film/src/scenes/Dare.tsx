// Mermin's Dare. Fixed plus-or-minus boards flip by, and the score keeps landing on five. A counter runs through all
// five hundred and twelve boards: the best is five. Then quantum measures each tile in its own context: six.
import React from "react";
import { CONTEXTS, classicalCheck, rowValue, colValue, tileColor } from "../../../src/engine/index.js";
import { useSceneClock, type SceneTiming } from "../clock";
import { Label, Stage, Tile, WallName, ease } from "../parts";
import { C, FONT, world } from "../theme";

type Board = number[][];
const boardOf = (mask: number): Board => [0, 1, 2].map((r) => [0, 1, 2].map((c) => ((mask >> (r * 3 + c)) & 1 ? -1 : 1)));
const ALL = Array.from({ length: 512 }, (_, m) => boardOf(m));
const FIVES = ALL.filter((b) => classicalCheck(b).satisfied === 5);
const W = world(3);
const out = W.result.outcomes;
const outcomes = out as Record<string, number[]>;
const quantumOk = (CONTEXTS as unknown as { id: string; sign: number }[]).map((ctx) => outcomes[ctx.id].reduce((p, x) => p * x, 1) === ctx.sign);

const sign = (v: number) => (v > 0 ? "+1" : "−1");

const Rule: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: FONT.display, fontSize: 26, color: C.ink2 }}>
    <span style={{ width: 22, height: 22, borderRadius: 11, background: ok ? C.ok : "transparent", border: `3px solid ${ok ? C.ok : C.no}` }} />
    {label}
  </div>
);

export const Dare: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentenceAt } = useSceneClock(scene);
  const quantum = ms >= sentenceAt(7);
  const flipping = ms >= sentenceAt(3) && !quantum;
  const counting = ms >= sentenceAt(6) && !quantum;
  const step = Math.floor(Math.max(0, ms - sentenceAt(3)) / 420);
  const board: Board = flipping ? FIVES[(step * 7) % FIVES.length] : boardOf(0);
  const check = classicalCheck(board);
  const okById: Record<string, boolean> = quantum
    ? Object.fromEntries(CONTEXTS.map((c: { id: string }, i: number) => [c.id, quantumOk[i]]))
    : Object.fromEntries(check.perContext.map((p: { id: string; ok: boolean }) => [p.id, p.ok]));
  const score = quantum ? quantumOk.filter(Boolean).length : check.satisfied;
  const tried = counting ? Math.min(512, Math.round(512 * ease(ms, sentenceAt(6), 1600))) : 0;
  const size = 170;
  const boardIn = ease(ms, sentenceAt(2), 380);
  return (
    <Stage>
      <div style={{ position: "absolute", left: 120, top: 70 }}>
        <WallName ms={ms} at={sentenceAt(1)}>Mermin's Dare</WallName>
      </div>
      <div style={{ position: "absolute", left: 120, right: 120, top: 300, display: "flex", gap: 90, alignItems: "flex-start", justifyContent: "center", opacity: boardIn }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${size}px) auto`, gap: 12, alignItems: "center" }}>
          {[0, 1, 2].map((r) => (
            <React.Fragment key={r}>
              {[0, 1, 2].map((c) => {
                const rv = rowValue(out, r, c);
                const cv = colValue(out, r, c);
                const a = tileColor(W.palette, r, c, rv).hex;
                const b = tileColor(W.palette, r, c, cv).hex;
                return quantum ? (
                  <Tile key={c} size={size} color={a} a={a} b={b} split={1}>
                    <span style={{ fontFamily: FONT.code, fontSize: 30, color: "#16173a" }}>{sign(rv)} / {sign(cv)}</span>
                  </Tile>
                ) : (
                  <Tile key={c} size={size} color={board[r][c] > 0 ? C.sheet : C.ink} style={{ border: `1px solid ${C.rule}` }}>
                    <span style={{ fontFamily: FONT.code, fontSize: 44, color: board[r][c] > 0 ? C.ink : C.paper }}>{sign(board[r][c])}</span>
                  </Tile>
                );
              })}
              <Rule ok={okById[`R${r + 1}`]} label={`row ${r + 1}`} />
            </React.Fragment>
          ))}
          {[0, 1, 2].map((c) => (
            <div key={c} style={{ justifySelf: "center" }}>
              <Rule ok={okById[`C${c + 1}`]} label={`col ${c + 1}`} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: 18, alignContent: "start", minWidth: 380 }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 330, fontStretch: "56%", fontSize: 220, lineHeight: 0.9, color: quantum ? C.ok : C.ink }}>{score} of 6</div>
          <Label>{quantum ? "Quantum, every time" : "rules happy"}</Label>
          {counting ? (
            <div style={{ display: "grid", gap: 6, marginTop: 30 }}>
              <div style={{ fontFamily: FONT.code, fontSize: 40, color: C.ink }}>{tried} of 512 boards tried</div>
              <Label>best ever: 5 of 6</Label>
            </div>
          ) : null}
        </div>
      </div>
    </Stage>
  );
};
