import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneTiming } from "../clock";
import { C, FONT } from "../theme";

export const Placeholder: React.FC<{ scene: SceneTiming; title: string }> = ({ title }) => (
  <AbsoluteFill style={{ background: C.paper, color: C.ink, alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 120, fontWeight: 330, fontStretch: "56%" }}>
    {title}
  </AbsoluteFill>
);
