// The rooms, one per sentence, each drawn by the engine: Unity Wheel's harmony turning, Fringe's band and ports,
// the Pentacle star, the Spooky Pair halves answering each other, and an Unpaintables shape with its broken set.
import React, { useMemo } from "react";
import {
  harmony, interfere, kcbsProbs, kcbsSum, pentaColors, samplePair, assetAccent, mulberry32, legibleOn,
  SHAPE_SETS, analyzeShape, findKsColoring, bestAttempt, oklch,
} from "../../../src/engine/index.js";
import { shapeSvg } from "../../../src/shared/shape-render.js";
import { useSceneClock, type SceneTiming } from "../clock";
import { Label, Stage, WallName, ease } from "../parts";
import { C, DARK, FONT, world, type Palette } from "../theme";

const W = world(5);
const P: Palette = W.palette;

const Wheel: React.FC<{ ms: number }> = ({ ms }) => {
  const turn = ms * 0.03; // degrees: a slow, steady phase turn
  const pal = { ...P, base: P.base + turn };
  const cols = harmony(pal) as { hex: string; h: number }[];
  const ring = Array.from({ length: 37 }, (_, i) => `${oklch(P.L, P.C, i * 10).hex} ${i * 10}deg`).join(", ");
  const R = 230;
  return (
    <div style={{ display: "flex", gap: 120, alignItems: "center" }}>
      <div style={{ position: "relative", width: 2 * R + 60, height: 2 * R + 60 }}>
        <div style={{ position: "absolute", inset: 30, borderRadius: "50%", background: `conic-gradient(from 90deg, ${ring})`, WebkitMask: "radial-gradient(closest-side, transparent 78%, #000 79%)", mask: "radial-gradient(closest-side, transparent 78%, #000 79%)" }} />
        <svg width={2 * R + 60} height={2 * R + 60} style={{ position: "absolute", inset: 0 }}>
          <polygon points={cols.map((c) => { const a = (c.h * Math.PI) / 180; return `${R + 30 + (R - 22) * Math.cos(a)},${R + 30 + (R - 22) * Math.sin(a)}`; }).join(" ")} fill="none" stroke={C.ink} strokeWidth={3} />
          {cols.map((c) => { const a = (c.h * Math.PI) / 180; return <circle key={c.hex} cx={R + 30 + (R - 22) * Math.cos(a)} cy={R + 30 + (R - 22) * Math.sin(a)} r={26} fill={c.hex} stroke={C.sheet} strokeWidth={6} />; })}
        </svg>
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        {cols.map((c) => <div key={c.hex} style={{ width: 300, height: 110, borderRadius: 6, background: c.hex }} />)}
        <Label>three quantum levels, one perfect triad</Label>
      </div>
    </div>
  );
};

const Fringe: React.FC<{ ms: number }> = ({ ms }) => {
  const [a, b] = (harmony(P) as { hex: string }[]).map((c) => c.hex);
  const stops = Array.from({ length: 37 }, (_, i) => `${interfere(a, b, i * 10).port1.hex} ${((i / 36) * 100).toFixed(1)}%`).join(", ");
  const phi = (ms * 0.09) % 360;
  const r = interfere(a, b, phi);
  return (
    <div style={{ width: 1500, display: "grid", gap: 16 }}>
      <div style={{ position: "relative", height: 260, borderRadius: 6, background: `linear-gradient(90deg, ${stops})` }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, width: 5, left: `${(phi / 360) * 100}%`, background: C.sheet, boxShadow: "0 0 0 1px rgba(0,0,0,0.2)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[r.port1.hex, r.port2.hex].map((hex: string, i: number) => (
          <div key={i} style={{ height: 150, borderRadius: 6, background: hex, display: "grid", alignContent: "end", padding: 18 }}>
            <span style={{ justifySelf: "start", background: C.sheet, borderRadius: 4, padding: "4px 12px", fontFamily: FONT.display, fontSize: 26, color: C.ink }}>
              Port {i + 1}, {Math.round((i === 0 ? r.share1 : 1 - r.share1) * 100)}% of the light
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Pentacle: React.FC<{ ms: number }> = ({ ms }) => {
  const probs = kcbsProbs(0, 0) as number[];
  const cols = pentaColors(P, probs) as { hex: string }[];
  const draw = ease(ms, 0, 900);
  const pos = [0, 1, 2, 3, 4].map((j) => { const a = ((-90 + 144 * j) * Math.PI) / 180; return [260 + 210 * Math.cos(a), 260 + 210 * Math.sin(a)]; });
  return (
    <div style={{ display: "flex", gap: 110, alignItems: "center" }}>
      <svg width={520} height={520}>
        <circle cx={260} cy={260} r={210} fill="none" stroke={C.rule} strokeWidth={2} />
        {pos.map((p, j) => { const q = pos[(j + 1) % 5]; return <line key={j} x1={p[0]} y1={p[1]} x2={p[0] + (q[0] - p[0]) * draw} y2={p[1] + (q[1] - p[1]) * draw} stroke={C.ink} strokeWidth={3} />; })}
        {pos.map((p, j) => <circle key={j} cx={p[0]} cy={p[1]} r={40 * draw} fill={cols[j].hex} stroke={C.sheet} strokeWidth={6} />)}
      </svg>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 330, fontStretch: "56%", fontSize: 200, lineHeight: 0.9, color: C.ink }}>{kcbsSum(probs).toFixed(3)}</div>
        <Label>Any normal palette tops out at 2</Label>
      </div>
    </div>
  );
};

const Spooky: React.FC<{ ms: number }> = ({ ms }) => {
  const step = Math.floor(ms / 700);
  const rng = mulberry32(4242 + step);
  const x = rng() < 0.5 ? 0 : 1;
  const y = rng() < 0.5 ? 0 : 1;
  const [oa, ob] = samplePair(x, y, rng) as [number, number];
  const half = (outcome: number, style: number, dark: boolean) => {
    const acc = assetAccent(P, outcome, style, dark);
    const cta = legibleOn(acc.hex);
    const bg = dark ? "#17183d" : "#f7f8fb";
    const fg = dark ? DARK.ink : C.ink;
    return (
      <div style={{ background: bg, color: fg, display: "grid", placeItems: "center" }}>
        <div style={{ width: 520, display: "grid", gap: 20, fontFamily: FONT.display }}>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{dark ? "Dark design" : "Light design"}</div>
          <div style={{ height: 22, borderRadius: 11, background: acc.hex }} />
          <div style={{ height: 14, width: "80%", borderRadius: 7, background: fg, opacity: 0.22 }} />
          <div style={{ height: 14, width: "55%", borderRadius: 7, background: fg, opacity: 0.22 }} />
          <span style={{ justifySelf: "start", background: cta.fill, color: cta.ink, borderRadius: 6, padding: "14px 26px", fontSize: 30, fontWeight: 600 }}>Get started</span>
        </div>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 260, bottom: 0, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {half(oa, x, false)}
      {half(ob, y, true)}
    </div>
  );
};

const Unpaintables: React.FC<{ ms: number }> = ({ ms }) => {
  const shape = useMemo(() => {
    const A = analyzeShape(SHAPE_SETS.peres33);
    const ks = findKsColoring(A);
    const attempt = (ks.coloring ? { coloring: ks.coloring, broken: [], satisfied: A.bases.length } : bestAttempt(A, 5, 300)) as { coloring: number[]; broken: number[]; satisfied: number };
    return { A, attempt };
  }, []);
  const colors = { sets: (harmony({ ...P, L: 0.66, C: 0.16 }) as { hex: string }[]).map((c) => c.hex), lit: oklch(0.62, 0.2, P.base).hex, unlit: C.ink2, broken: C.no, halo: C.sheet };
  const svg = shapeSvg(shape.A, shape.attempt, { yaw: 0.6 + ms * 0.00035, pitch: -0.4, w: 0.3 }, colors, 640) as string;
  return (
    <div style={{ display: "flex", gap: 80, alignItems: "center" }}>
      <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} width={640} height={640} />
      <div style={{ display: "grid", gap: 14, maxWidth: 520 }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 40, color: C.ink }}>{shape.attempt.satisfied} of {shape.A.bases.length} sets colored</div>
        <Label>The dashed set always breaks. A computer proved no coloring exists.</Label>
      </div>
    </div>
  );
};

const ROOMS = [
  { name: "Unity Wheel", Draw: Wheel },
  { name: "Fringe", Draw: Fringe },
  { name: "Pentacle", Draw: Pentacle },
  { name: "Spooky Pair", Draw: Spooky },
  { name: "Unpaintables", Draw: Unpaintables },
];

export const Rooms: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentence, sentenceAt } = useSceneClock(scene);
  if (sentence === 0) {
    return (
      <Stage>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 28 }}>
          {ROOMS.map((r, i) => (
            <div key={r.name} style={{ opacity: ease(ms, i * 160, 360), transform: `translateY(${(1 - ease(ms, i * 160, 360)) * 24}px)` }}>
              <div style={{ width: 300, height: 380, borderRadius: 8, background: (harmony({ ...P, d: 5 }) as { hex: string }[])[i].hex, display: "grid", alignContent: "end", padding: 18 }}>
                <span style={{ justifySelf: "start", background: C.sheet, borderRadius: 4, padding: "6px 12px", fontFamily: FONT.display, fontWeight: 330, fontStretch: "56%", fontSize: 56, color: C.ink, lineHeight: 1 }}>{r.name}</span>
              </div>
            </div>
          ))}
        </div>
      </Stage>
    );
  }
  const room = ROOMS[sentence - 1];
  const local = ms - sentenceAt(sentence);
  const dark = room.name === "Spooky Pair";
  return (
    <Stage>
      <div style={{ position: "absolute", left: 120, top: 70, zIndex: 2 }}>
        <WallName ms={local} at={0}>{room.name}</WallName>
      </div>
      {dark ? <room.Draw ms={local} /> : (
        <div style={{ position: "absolute", left: 0, right: 0, top: 220, bottom: 0, display: "grid", placeItems: "center" }}>
          <room.Draw ms={local} />
        </div>
      )}
    </Stage>
  );
};
