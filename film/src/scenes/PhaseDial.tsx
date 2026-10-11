// Light mode and dark mode, then the Moon is tapped and the whole dial opens: a small page drawn with the real
// Phase Dial tokens turns all the way round, with Bouncer's live contrast underneath.
import React from "react";
import { phaseTheme, allTileColors } from "../../../src/engine/index.js";
import { useSceneClock, type SceneTiming } from "../clock";
import { Label, Stage, ease } from "../parts";
import { C, FONT, world } from "../theme";

const W = world(6);
const WASHES = (allTileColors(W.palette) as { hex: string }[]).map((c) => c.hex);
type Tokens = { paper: string; paper2: string; sheet: string; ink: string; ink2: string; rule: string };

const Page: React.FC<{ t: Tokens; width: number; label?: string }> = ({ t, width, label }) => (
  <div style={{ width, height: width * 0.62, borderRadius: 10, background: t.paper, border: `1px solid ${t.rule}`, padding: width * 0.06, display: "grid", alignContent: "start", gap: width * 0.03, boxShadow: "0 40px 80px -50px rgba(20,22,70,0.6)" }}>
    <div style={{ fontFamily: FONT.display, fontWeight: 330, fontStretch: "56%", fontSize: width * 0.13, lineHeight: 0.9, color: t.ink }}>{label ?? "Pentacle"}</div>
    <div style={{ fontFamily: FONT.body, fontSize: width * 0.032, lineHeight: 1.5, color: t.ink, maxWidth: "80%" }}>Five colors that never clash, for charts and maps where neighbours must not look alike.</div>
    <div style={{ fontFamily: FONT.body, fontSize: width * 0.026, color: t.ink2 }}>Klyachko, Can, Binicioğlu and Shumovsky, 2008</div>
    <span style={{ justifySelf: "start", background: t.ink, color: t.paper, borderRadius: 6, padding: `${width * 0.014}px ${width * 0.03}px`, fontFamily: FONT.display, fontWeight: 600, fontSize: width * 0.03 }}>Open the room</span>
  </div>
);

/** The Moon at an angle: lit share (1 + cos) / 2, waning from light to dark and waxing back. */
const Moon: React.FC<{ deg: number; size: number }> = ({ deg, size }) => {
  const R = 11;
  const c = Math.cos((deg * Math.PI) / 180);
  const waning = deg % 360 <= 180;
  const d = `M0 ${-R}A${R} ${R} 0 0 ${waning ? 0 : 1} 0 ${R}A${(Math.abs(c) * R).toFixed(2)} ${R} 0 0 ${waning === c > 0 ? 0 : 1} 0 ${-R}Z`;
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size}>
      <circle r={11} fill="#121433" stroke={C.ink} strokeWidth={0.9} />
      <path d={d} fill="#eef0f4" />
    </svg>
  );
};

export const PhaseDial: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentenceAt, lengthMs } = useSceneClock(scene);
  const dialOn = ease(ms, sentenceAt(1), 400);
  const sweepStart = sentenceAt(2);
  const deg = Math.round(Math.max(0, Math.min(1, (ms - sweepStart) / Math.max(1, lengthMs - sweepStart - 300))) * 360) % 360;
  const theme = phaseTheme(ms < sweepStart ? 0 : deg, WASHES);
  if (dialOn < 1 && ms < sweepStart) {
    // Light versus dark, the way every site does it; then the Moon.
    return (
      <Stage>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 60, opacity: 1 - dialOn }}>
          <Page t={phaseTheme(0).tokens} width={640} label="Light" />
          <Page t={phaseTheme(180).tokens} width={640} label="Dark" />
        </div>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: dialOn }}>
          {/* The Moon button from the site's bar, large, with the ring of a tap spreading out from it. */}
          <div style={{ position: "relative", width: 300, height: 300, borderRadius: "50%", background: C.sheet, border: `3px solid ${C.rule}`, display: "grid", placeItems: "center", boxShadow: "0 30px 60px -36px rgba(20,22,70,0.6)", transform: `scale(${0.92 + 0.08 * dialOn})` }}>
            <Moon deg={35} size={200} />
            <div style={{ position: "absolute", inset: -3, borderRadius: "50%", border: `4px solid ${C.ink}`, opacity: 1 - ease(ms, sentenceAt(1) + 300, 700), transform: `scale(${1 + 0.35 * ease(ms, sentenceAt(1) + 300, 700)})` }} />
          </div>
        </div>
      </Stage>
    );
  }
  const ringStops = Array.from({ length: 37 }, (_, k) => `${phaseTheme(k * 10, WASHES).tokens.paper} ${k * 10}deg`).join(", ");
  return (
    <Stage background={theme.tokens.paper}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 110 }}>
        <Page t={theme.tokens} width={900} />
        <div style={{ display: "grid", justifyItems: "center", gap: 26 }}>
          <div style={{ position: "relative", width: 380, height: 380 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(${ringStops})`, WebkitMask: "radial-gradient(closest-side, transparent 70%, #000 71%)", mask: "radial-gradient(closest-side, transparent 70%, #000 71%)", boxShadow: `0 0 0 1px ${theme.tokens.rule}` }} />
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <Moon deg={deg} size={150} />
            </div>
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 40, height: 40, margin: -20, borderRadius: "50%", background: theme.tokens.paper, border: `5px solid ${theme.tokens.ink}`, transform: `rotate(${deg}deg) translateY(-161px)` }} />
          </div>
          <div style={{ fontFamily: FONT.display, fontWeight: 330, fontStretch: "56%", fontSize: 120, lineHeight: 1, color: theme.tokens.ink }}>{deg}°</div>
          <Label style={{ color: theme.tokens.ink2 }}>text reads at {(Math.floor(theme.minContrast * 10) / 10).toFixed(1)} : 1 or better</Label>
        </div>
      </div>
    </Stage>
  );
};
