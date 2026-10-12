// A recorded clip of the real site or Atelier inside a quiet browser frame. The camera eases between focus points
// (in the clip's own 1600 by 900 pixels) so the part the voice is talking about fills the frame.
import React from "react";
import { Easing, OffthreadVideo, interpolate, staticFile } from "remotion";
import { Window } from "../parts";

export type Focus = { at: number; x: number; y: number; zoom: number };

const CW = 1600;
const CH = 900;
const SHOW = 0.9; // the clip's size in the film at zoom 1

function camera(ms: number, keys: Focus[]) {
  let i = 0;
  while (i + 1 < keys.length && ms >= keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  if (!b) return a;
  // Hold each focus, then glide to the next over the half second before it.
  const k = interpolate(ms, [b.at - 500, b.at], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return { at: ms, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, zoom: a.zoom + (b.zoom - a.zoom) * k };
}

export const ClipFrame: React.FC<{ src: string; ms: number; focus: Focus[]; title: string }> = ({ src, ms, focus, title }) => {
  const W = CW * SHOW;
  const H = CH * SHOW;
  const c = camera(ms, focus);
  const s = SHOW * c.zoom;
  const tx = Math.min(0, Math.max(W - CW * s, W / 2 - c.x * s));
  const ty = Math.min(0, Math.max(H - CH * s, H / 2 - c.y * s));
  return (
    <Window width={W} height={H + 40} title={title}>
      <div style={{ position: "absolute", left: 0, top: 0, width: CW, height: CH, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
        <OffthreadVideo src={staticFile(src)} muted style={{ width: CW, height: CH }} />
      </div>
    </Window>
  );
};
