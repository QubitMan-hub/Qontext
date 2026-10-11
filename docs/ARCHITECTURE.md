# Architecture

## Layers

```
src/engine/      pure functions, no DOM, no dependencies     (tested in Node)
   ├── src/site/         the website                          (tested in Chromium)
   ├── src/app/          the Atelier, vanilla JS modules      (tested in Chromium)
   ├── src/shared/       drawing code used by both
   ├── src/runtime/      theme runtime for websites           (tested in Node and Chromium)
   └── figma-plugin/src  Figma plugin main thread
python/qontext_hw/  hardware runner                           (tested with Qiskit Aer)
schema/            pool format shared by all of the above
```

The engine is the single source of truth for the physics and the color math. The Studio, runtime and
Figma plugin import the same modules, so a palette looks the same everywhere.

## Engine modules

| Module | Responsibility |
| --- | --- |
| `random.js` | Seeded PRNG (mulberry32), seed hashing, crypto-backed fresh seeds |
| `color.js` | OKLCH ↔ sRGB with chroma-reduction gamut mapping, WCAG 2.x, APCA 0.0.98G |
| `cvd.js` | Machado 2009 color-vision matrices, also used for the Studio's SVG filters |
| `linalg.js` | Complex matrices and Pauli strings |
| `mermin.js` | Grid, contexts, exact sampling, scores, classical optimum |
| `kcbs.js`, `chsh.js`, `shapes.js` | The other contextuality and nonlocality structures |
| `interferometer.js`, `harmony.js` | Color as phase |
| `guard.js` | Contrast Guard report and automatic lightness fix |
| `kmeans.js` | Palette extraction |
| `pool.js` | Pool validation, summaries, drawers, example pools |
| `project.js` | Project sanitization and portable project codes |
| `exporters.js` | CSS, design tokens, Tailwind, SVG, lenticular interlacing |

## Website

`src/site/world.js` owns the visitor's world: an Observer collapse whose seed (1 to 9,999,999) is the world
number, kept for the browser session. It writes the tile tokens as CSS variables and tints every `.q[data-q]`
swatch from its context (`data-q-context` on the nearest room, or `data-q-ctx` on the swatch). An
IntersectionObserver collapses swatches from superposition the first time they are seen. `hero.js` draws the
observable field on a canvas, `rooms.js` runs the nine exhibits, `scroll.js` drives every scroll-linked
exhibit from one requestAnimationFrame loop, and `extras.js` handles navigation, the floor plan, Many Worlds,
the poster, tools and the film. All continuous motion stops under `prefers-reduced-motion`.

## Atelier


`src/app/store.js` holds the project (every design setting, persisted to local storage and encodable as
a `QX1.` project code) and the session (current measurement, loaded pool). Modules in
`src/app/modules/` each export `init()` and `render()`. `main.js` re-renders only the visible module
on every store change, which keeps phase motion smooth. All storage access is wrapped so private
windows and blocked storage never break the app.

## Determinism

Every collapse is reproducible: its seed is `hashSeed(measureSeed, stateSeed, count, visitor)`. A
project code plus a measurement count reproduces a design exactly. The runtime uses a fresh
crypto seed per visitor, kept for the browser session.

## Pools

`qontext-pool/1` stores shots per context (`[a, b, c]`) and per CHSH setting (`[a, b]`), plus backend,
job ids and timestamps. When a pool is in use, collapses cycle through its shots instead of sampling.
The provenance seal hashes the canonical JSON of the shots with SHA-256.

## Build

`scripts/build.mjs` uses esbuild to bundle the Studio into one HTML file (CSS and JS inlined, CVD
filter values generated from the engine), the runtime as a minified browser global and an ES module,
and the Figma plugin. Built files are committed so `dist/index.html` works without a toolchain; CI
fails if they are out of date.
