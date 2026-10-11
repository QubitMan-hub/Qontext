// The film lives in the site's world: the light chrome tokens, the site's typefaces, and worlds collapsed exactly
// the way the website collapses them.
import { continueRender, delayRender, staticFile } from "remotion";
import { PHASE_POINTS, fixLightness, INKS, hashSeed } from "../../src/engine/index.js";
import { collapse } from "../../src/runtime/qontext-runtime.js";

export const C = PHASE_POINTS.light;
export const DARK = PHASE_POINTS.dark;
export const FONT = {
  display: "Anybody, 'Arial Narrow', Arial, sans-serif",
  body: "Literata, Georgia, serif",
  code: "'IBM Plex Mono', ui-monospace, monospace",
};

export type Palette = { base: number; d: number; L: number; C: number };
export type World = { seed: number; palette: Palette; result: ReturnType<typeof collapse> };

/** A world as the site makes it: its own base hue, a triad, and a lightness Bouncer cleared for dark text. */
export function world(seed: number): World {
  const palette: Palette = { base: hashSeed(seed, 11) % 360, d: 3, L: 0.76, C: 0.13 };
  const L = fixLightness(palette, INKS.dark);
  if (L !== null) palette.L = L;
  return { seed, palette, result: collapse({ ...palette, state: "random", stateSeed: 7, seed }) };
}

/** The typefaces, loaded once per render tab; frames wait for them so no frame shows a fallback face. */
let loading: Promise<void> | null = null;
export function loadFonts() {
  if (loading || typeof document === "undefined") return;
  const handle = delayRender("Loading the site's typefaces");
  const faces = [
    new FontFace("Anybody", `url(${staticFile("fonts/anybody.woff2")})`, { weight: "100 900", stretch: "50% 150%" }),
    new FontFace("Literata", `url(${staticFile("fonts/literata.woff2")})`, { weight: "200 900" }),
    new FontFace("IBM Plex Mono", `url(${staticFile("fonts/plexmono.woff2")})`, { weight: "400" }),
  ];
  loading = Promise.all(faces.map((f) => f.load())).then((loaded) => {
    for (const f of loaded) document.fonts.add(f);
    continueRender(handle);
  });
}
