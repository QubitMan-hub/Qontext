// Shared pieces for the scenes: the site's wall names, tiles that are split while undecided and flat once measured,
// a quiet browser frame, and easing that settles without overshoot (a measurement never bounces).
import React from "react";
import { Easing, interpolate } from "remotion";
import { C, FONT } from "./theme";

/** 0 before `at` ms, 1 after `at + dur`, eased out in between. */
export const ease = (ms: number, at: number, dur = 320) =>
  interpolate(ms, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

/** A wall name as the site letters it: tall, light, condensed. It settles in from a little below. */
export const WallName: React.FC<{ children: React.ReactNode; ms: number; at?: number; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children, ms, at = 0, size = 168, color = C.ink, style,
}) => {
  const k = ease(ms, at, 420);
  return (
    <div style={{ fontFamily: FONT.display, fontWeight: 330, fontStretch: "56%", fontSize: size, lineHeight: 0.92, letterSpacing: "-0.015em", color, opacity: k, transform: `translateY(${(1 - k) * 0.25}em)`, ...style }}>
      {children}
    </div>
  );
};

/** A small label in the controls voice. */
export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontFamily: FONT.display, fontWeight: 520, fontSize: 30, color: C.ink2, ...style }}>{children}</div>
);

/**
 * A tile. Undecided (`split`), it shows both outcomes on the diagonal, and the reverse split breathes in and out on
 * top. Measured, it is one flat color and arrives with a short settle.
 */
export const Tile: React.FC<{ size: number; color: string; a?: string; b?: string; split?: number; breathe?: number; radius?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({
  size, color, a, b, split = 0, breathe = 0, radius = 6, children, style,
}) => (
  <div style={{ position: "relative", width: size, height: size, borderRadius: radius, overflow: "hidden", background: color, display: "grid", placeItems: "center", ...style }}>
    {a && b ? (
      <>
        <div style={{ position: "absolute", inset: 0, opacity: split, background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} />
        <div style={{ position: "absolute", inset: 0, opacity: split * breathe, background: `linear-gradient(135deg, ${b} 50%, ${a} 50%)` }} />
      </>
    ) : null}
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);

/** How much the reverse split shows at a moment: a slow, even breath. */
export const breath = (ms: number, period = 2800) => 0.5 - 0.5 * Math.cos((2 * Math.PI * ms) / period);

/** A quiet browser window: a thin bar with three dots and the page below. */
export const Window: React.FC<{ width: number; height: number; children: React.ReactNode; title?: string; style?: React.CSSProperties }> = ({ width, height, children, title, style }) => (
  <div style={{ width, height, borderRadius: 10, overflow: "hidden", background: C.sheet, border: `1px solid ${C.rule}`, boxShadow: "0 40px 80px -48px rgba(20, 22, 70, 0.55)", display: "grid", gridTemplateRows: "40px 1fr", ...style }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", background: C.paper2, borderBottom: `1px solid ${C.rule}`, fontFamily: FONT.display, fontSize: 18, color: C.ink2 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 11, height: 11, borderRadius: 6, background: C.rule }} />
      ))}
      {title ? <span style={{ marginLeft: 14 }}>{title}</span> : null}
    </div>
    <div style={{ position: "relative", overflow: "hidden" }}>{children}</div>
  </div>
);

/** The stage every scene sits on: paper, with room at the bottom for the captions. */
export const Stage: React.FC<{ children: React.ReactNode; background?: string }> = ({ children, background = C.paper }) => (
  <div style={{ position: "absolute", inset: 0, background }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 170 }}>{children}</div>
  </div>
);
