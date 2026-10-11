# Qontext

Qontext is a design engine where color depends on context. It is built directly on quantum
contextuality: a tile can show one color when read with its row and another when read with its
column, and the mathematics guarantees that no fixed coloring could ever do the same. Hue is treated
as quantum phase, so classic color harmonies are the roots of unity of a d-level quantum system.

Everything runs as exact quantum simulation on the user's device. Real hardware (IBM Quantum) adds
physically random collapses, measured violations of classical limits, and a verifiable provenance seal.

## What is in this repository

| Part | Path | What it is |
| --- | --- | --- |
| Engine | `src/engine/` | Pure, dependency-free ES modules: color science, quantum simulation, contextuality structures, exports. Shared by every other part. |
| Studio | `src/app/` → `dist/index.html` | The design app, built to one self-contained HTML file. |
| Theme runtime | `src/runtime/` → `dist/qontext-runtime.min.js` | 12 KB script that gives every website visitor their own collapse. |
| Figma plugin | `figma-plugin/` | Creates contextual grids and variables with Row and Column modes. |
| Hardware runner | `python/` | `qontext-hw`: runs the circuits on simulators or IBM Quantum and writes measurement pools. |
| Pool schema | `schema/qontext-pool.schema.json` | The contract between the runner, the Studio and the runtime. |
| Tests | `tests/`, `python/tests/` | Engine unit tests, browser end-to-end tests, Python tests. |
| Docs | `docs/` | Architecture and physics notes. |
| Legacy | `legacy/` | The original v0.1 single-file prototype, kept for reference. |

## Quick start

Open `dist/index.html` in any modern browser. Nothing else is needed.

To work on the code:

```
npm ci              # dev tools: esbuild, eslint
npm run build       # builds dist/ and figma-plugin/dist/
npm run watch       # rebuilds on every change
npm test            # engine and runtime unit tests (node:test)
npm run lint        # ESLint
npm run test:e2e    # browser tests (needs: pip install pytest playwright && playwright install chromium)
npm run check       # lint + test + build
```

## Studio modules

| Module | What it does |
| --- | --- |
| Context Grid | The Mermin-Peres square. Split, row and column views, Impossibility Meter (Mermin score, classical max 4, quantum 6), Collapse on View for six visitors, Contrast Guard (WCAG 2.2 and APCA against all 18 colors a tile can take, with automatic lightness fix). |
| Learn | Try to color the grid with fixed values. The best possible is 5 of 6 rules, proven by searching all 512 assignments. |
| Harmony | d quantum levels give d evenly spaced hues. Phase, lightness and chroma controls, phase motion, palette extraction from an image (k-means in OKLab, on device), saved library. |
| Mixer | A Mach-Zehnder interferometer for color: two inputs, two output ports, chroma energy conserved, live interference fringe. |
| Pentagram | The KCBS qutrit test as a five-color palette. Classical limit 2, quantum square root of 5. |
| Entangled | Two assets share a Bell pair. CHSH value 2.83 against a classical 2, with agreement tables by style. |
| Shapes | Kochen-Specker shape packs: Peres 33 and Cabello 18 (no classical coloring exists, proven by exhaustive search) and Yu-Oh 13 (state-independent violation, 25/3 against 8). Rotating 3D and 4D views, SVG, OBJ and JSON export. |
| Hardware | Load a measurement pool, see per-context results, measured Mermin and CHSH values, and a provenance seal with a SHA-256 hash of the shots. |
| Export | CSS variables, W3C design tokens, Tailwind config, SVG grid, lenticular print files, and portable project codes. Exports are blocked while Contrast Guard fails. |

Across the Studio: color-vision simulation (protanopia, deuteranopia, tritanopia), light and dark
themes, keyboard navigation (arrow keys across tabs, Space to measure again), settings saved in the
browser, and a layout that works down to phone width.

## Theme runtime

```html
<script src="qontext-runtime.min.js" data-qontext='{"base":200,"d":3,"L":0.72,"C":0.13}'></script>

<section data-q-context="row">
  <div data-q-tile="r1c1"></div>
</section>
<section data-q-context="col">
  <div data-q-tile="r1c1"></div>   <!-- same tile, may be a different color -->
</section>
```

Each visitor gets a collapse that stays stable for their session and obeys all six rules. Colors are
also available as CSS custom properties (`--q-r1c1-row`, `--q-r1c1-col`, `--q-harmony-1`, ...). The
API (`Qontext.collapse`, `start`, `apply`, `bind`, `fromTokens`, `contrast`) is documented in
`src/runtime/qontext-runtime.js`. See `examples/runtime-demo.html`.

## Figma plugin

In Figma: Plugins → Development → Import plugin from manifest, and pick `figma-plugin/manifest.json`.
Paste a project code from the Studio's Export tab, or set the palette in the plugin. It creates a grid
frame, a variable collection with **Row** and **Column** modes, and optional paint styles.

## Hardware runner

```
pip install './python[ibm]'
qontext-hw --noisy                # local test with noise
qontext-hw --ibm least_busy       # IBM Quantum, needs a saved account
qontext-hw --dry-run --ibm least_busy
```

See `python/README.md`.

## Privacy and network use

The Studio and the runtime make no network requests of their own. The Studio loads fonts from Google
Fonts and falls back to system fonts when that is blocked. Images used for palette extraction never
leave the device. Settings are stored in the browser's local storage only.

## License

Copyright (c) 2026 Lakshmi Monish. All rights reserved. See `LICENSE`.
