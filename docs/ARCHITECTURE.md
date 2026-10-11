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
| `phase.js` | Phase Dial: the chrome at any angle (a Mach-Zehnder blend of the light and dark tokens) after Bouncer has made text readable on every wall |
| `kmeans.js` | Palette extraction |
| `pool.js` | Pool validation, summaries, drawers, example pools |
| `project.js` | Project sanitization and portable project codes |
| `exporters.js` | CSS, design tokens, Tailwind, SVG, lenticular interlacing |

## Website

| File | Job |
| --- | --- |
| `main.js` | Boot: the world, the badge, the hero and the observers. Nothing else runs until it is needed. |
| `world.js` | The visitor's world (an Observer collapse whose seed, 1 to 9,999,999, is the world number, kept for the session), the tile tokens as CSS variables, and observation: swatches (`.q[data-q]`) shimmer only near the viewport and collapse the first time they are seen. |
| `hero.js` | The observable field. Superposition is a repeating SVG tile (the field repeats every six tiles) with two shimmer layers run by the compositor; collapse is one canvas that exists only while something is collapsed. |
| `scroll.js` | One requestAnimationFrame loop for every scroll-linked exhibit. Only exhibits near the viewport are measured, and all reads happen before any writes. |
| `lib.js` | `h()` and `svg()` build DOM from text nodes, never markup; `whenNear()` wakes code just before it is seen. |
| `rooms/index.js` | Room metadata (`ROOMS`) and lazy start: a room's module runs `init()` and `paint()` when a visitor is 600 px away. |
| `rooms/<id>.js` | One module per room: `{ id, init(article), paint(), theme?() }`. |
| `features/` | Nav, Phase Dial (the theme as an angle, the Moon and the dial), floor plan, idea, tallies (floor plan counts and the footer proof), framed poster (drawn when near, encoded with `toBlob`), film (fetched when near), Many Worlds, and `traverse.js`: Wall Wash, Compass and Thresholds, all driven by IntersectionObserver. |

Off-screen rooms and later sections use `content-visibility: auto`, so the browser skips their rendering until
they come near. Wall labels are sized in CSS from each name's measured width (`--em`), with no script reads.
Only `opacity` and `transform` animate, and all continuous motion stops under `prefers-reduced-motion`.

`scripts/perf.py` measures boot, load blocking, the hero at rest and under a pointer, and scrolling, on a
throttled phone profile and a desktop profile; `tests/e2e/test_performance.py` holds the site to a budget.

## Security

`scripts/build.mjs` writes a Content Security Policy into each standalone page, with the inline bundle pinned
by SHA-256. The artifact fragment (`dist/artifact.html`) leaves the policy to its host. Untrusted text (project
names from Wavefunction codes, files, storage) goes through `sanitizeProject` and the helpers in
`src/engine/text.js` before any export writes it into CSS, JavaScript or SVG.

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
