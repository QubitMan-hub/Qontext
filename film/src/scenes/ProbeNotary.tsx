// Probe's session typing itself in a terminal, then the Notary seal over the results, stamped with the world's
// three harmony colors.
import React from "react";
import { delayRender, continueRender } from "remotion";
import { examplePool, poolSummary, canonicalShots, harmony } from "../../../src/engine/index.js";
import { useSceneClock, type SceneTiming } from "../clock";
import { Stage, WallName, ease } from "../parts";
import { C, FONT, world } from "../theme";

// The same example session the site has always shown: a noisy simulator run, then the command for real hardware.
const SESSION = [
  ["$ ", "qontext-probe --noisy"],
  ["", "Backend: aer simulator (noisy)"],
  ["", "Mermin score 4.684  (classical max 4, quantum ideal 6)"],
  ["", "CHSH value   2.547  (classical max 2, quantum max 2.828)"],
  ["", "Pool written to qontext_pool.json. Load it in Notary."],
  ["$ ", "qontext-probe --ibm least_busy"],
];
// The seal over the example pool that ships with Qontext, with its real SHA-256, saying it is simulated.
const pool = examplePool({ seed: 7 });
const sum = poolSummary(pool);
const sealLines = (hash: string) => [
  "QONTEXT NOTARY SEAL",
  `backend        ${pool.backend}`,
  "hardware       no, simulated example",
  `shots          ${sum.totalShots}`,
  `mermin score   ${sum.mermin.total.toFixed(3)}   classical max 4`,
  `chsh value     ${sum.chsh ? sum.chsh.S.toFixed(3) : "n/a"}   classical max 2`,
  `sha-256        ${hash.slice(0, 32)}`,
  `               ${hash.slice(32)}`,
];
let HASH = "";
if (typeof crypto !== "undefined" && crypto.subtle) {
  const handle = delayRender("Sealing the example pool");
  crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalShots(pool))).then((buf) => {
    HASH = Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, "0")).join("");
    continueRender(handle);
  });
}
const HUES = (harmony(world(9).palette) as { hex: string }[]).map((c) => c.hex);

export const ProbeNotary: React.FC<{ scene: SceneTiming }> = ({ scene }) => {
  const { ms, sentenceAt } = useSceneClock(scene);
  const notary = ms >= sentenceAt(2);
  // Fast enough that the whole session is on screen before the voice moves on to Notary.
  const typedChars = Math.max(0, (ms - sentenceAt(1) + 400) / 8);
  let left = typedChars;
  const lines = SESSION.map(([p, t]) => {
    const n = Math.max(0, Math.min(t.length, Math.floor(left)));
    left -= t.length + 14;
    return [p, t.slice(0, n), n > 0] as const;
  });
  const stamp = ease(ms, sentenceAt(2) + 900, 260);
  return (
    <Stage>
      <div style={{ position: "absolute", left: 120, top: 70 }}>
        <WallName ms={ms} at={notary ? sentenceAt(2) : sentenceAt(1)}>{notary ? "Notary" : "Probe"}</WallName>
      </div>
      {!notary ? (
        <div style={{ position: "absolute", left: 120, right: 120, top: 300, background: "#0f1030", color: "#dfe2ff", borderRadius: 10, padding: "30px 40px", fontFamily: FONT.code, fontSize: 32, lineHeight: 1.7, minHeight: 420, opacity: ease(ms, sentenceAt(1) - 200, 300) }}>
          {lines.map(([p, t, shown], i) => (shown || i === 0 ? <div key={i}><span style={{ color: "#9fa6ff" }}>{p}</span>{t}</div> : null))}
        </div>
      ) : (
        <div style={{ position: "absolute", left: 0, right: 0, top: 280, display: "grid", justifyItems: "center" }}>
          <div style={{ position: "relative", width: 1100, background: C.sheet, border: `3px solid ${C.ink}`, borderRadius: 4, padding: "36px 44px", fontFamily: FONT.code, fontSize: 30, lineHeight: 1.75, color: C.ink, whiteSpace: "pre", boxShadow: "0 40px 80px -50px rgba(20,22,70,0.6)", opacity: ease(ms, sentenceAt(2), 300) }}>
            {sealLines(HASH).join("\n")}
            <div style={{ position: "absolute", right: 40, top: 34, width: 150, height: 150, borderRadius: "50%", background: `conic-gradient(${HUES[0]} 0 33.33%, ${HUES[1]} 0 66.67%, ${HUES[2]} 0)`, opacity: stamp, transform: `scale(${1.5 - 0.5 * stamp}) rotate(${(1 - stamp) * -30}deg)` }} />
          </div>
        </div>
      )}
    </Stage>
  );
};
