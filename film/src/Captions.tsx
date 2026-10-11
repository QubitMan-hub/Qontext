import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { captionPages } from "./timing.js";
import type { Timing } from "./clock";
import { C, FONT } from "./theme";

/** One sentence (or one page of a long sentence) at a time, low in the frame, held through short pauses. */
export const Captions: React.FC<{ timing: Timing }> = ({ timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const pages = useMemo(() => timing.scenes.flatMap((s) => s.sentences.flatMap((x) => captionPages(x))), [timing]) as { text: string; startMs: number; endMs: number }[];
  let page = null as null | { text: string };
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const next = pages[i + 1];
    const until = next && next.startMs - p.endMs < 900 ? next.startMs : p.endMs + 250;
    if (ms >= p.startMs && ms < until) page = p;
  }
  if (!page) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <span style={{ maxWidth: 1480, padding: "14px 28px", borderRadius: 6, background: "rgba(250, 251, 253, 0.95)", color: C.ink, fontFamily: FONT.display, fontWeight: 560, fontSize: 46, lineHeight: 1.25, textAlign: "center", boxShadow: "0 18px 40px -26px rgba(20, 22, 70, 0.6)" }}>
        {page.text}
      </span>
    </div>
  );
};
