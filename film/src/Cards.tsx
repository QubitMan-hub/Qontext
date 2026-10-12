// The site's link-preview card and app icon, drawn with the same engine and fonts as the film.
import React from "react";
import { AbsoluteFill } from "remotion";
import { contextualTiles, tileColor, rowValue, colValue } from "../../src/engine/index.js";
import { C, FONT, loadFonts, world } from "./theme";

loadFonts();
const W = world(1);
const out = W.result.outcomes;
const [r, c] = (contextualTiles(out)[0] ?? [0, 0]) as [number, number];
export const ROW = tileColor(W.palette, r, c, rowValue(out, r, c)).hex as string;
export const COL = tileColor(W.palette, r, c, colValue(out, r, c)).hex as string;

/** 1200 by 630: one tile split into its two true colors, the name, and one line. */
export const Card: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper, flexDirection: "row", alignItems: "center", gap: 70, padding: "0 90px" }}>
    <div style={{ width: 400, height: 400, borderRadius: 8, flex: "none", background: `linear-gradient(135deg, ${ROW} 50%, ${COL} 50%)` }} />
    <div style={{ display: "grid", gap: 26 }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 850, fontSize: 132, letterSpacing: "-0.02em", lineHeight: 0.95, color: C.ink }}>Qontext</div>
      <div style={{ fontFamily: FONT.body, fontSize: 40, lineHeight: 1.35, color: C.ink, maxWidth: 560 }}>One tile, two true colors. Color that depends on how you look at it.</div>
    </div>
  </AbsoluteFill>
);

/** 180 by 180 (Apple touch icon): the split tile on paper. */
export const Icon: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 132, height: 132, borderRadius: 10, background: `linear-gradient(135deg, ${ROW} 50%, ${COL} 50%)` }} />
  </AbsoluteFill>
);
