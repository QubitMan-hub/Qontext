# Qontext

Qontext is a design engine where color depends on context. It is built on quantum contextuality: a tile
can show one color when read with its row and another when read with its column, and the mathematics
guarantees that no fixed coloring could ever do the same. Hue is treated as quantum phase, so classic
color harmonies are the roots of unity of a d-level quantum system.

Everything runs as exact quantum simulation on the visitor's device. Real hardware (IBM Quantum) adds
physically random collapses, measured violations of classical limits, and a verifiable provenance seal.

## The names

Every product and feature has one name, used the same way in the website, the Atelier, the code and the docs.

| Name | What it is | Where it lives |
| --- | --- | --- |
| **Qontext** | The whole system | |
| **Atelier** | The studio: every room below as a working design tool | `src/app/` → `dist/studio.html` |
| **Janus** | The Mermin-Peres context grid: one tile, two true colors | Atelier tab, site room |
| **Mermin's Dare** | The puzzle: try to color the grid with fixed values (5 of 6 is the ceiling) | Atelier tab, site room |
| **Unity Wheel** | Harmony as quantum phase (roots of unity) | Atelier tab, site room |
| **Fringe** | The interferometer mixer: colors mix like light waves | Atelier tab, site room |
| **Pentacle** | The KCBS five-color palette | Atelier tab, site room |
| **Spooky Pair** | Entangled light and dark assets (CHSH) | Atelier tab, site room |
| **Unpaintables** | Kochen-Specker shape packs no coloring can finish | Atelier tab, site room |
| **Notary** | Hardware results, scores and the SHA-256 provenance seal | Atelier tab, site room |
| **Handoff** | Exports: CSS variables, design tokens, Tailwind, SVG | Atelier tab |
| **Bouncer** | Contrast checks (WCAG 2.2 and APCA) against every color a tile can take; blocks failing exports | Inside Janus and Handoff |
| **Many Worlds** | Per-visitor collapses of one design | Janus, the site's world switcher |
| **Wavefunction** | A portable code (`QX1.`) for one exact design | Handoff, the site, Superpose |
| **Walk-By** | Interlaced lenticular print files | Handoff |
| **Observer** | The 12 KB theme runtime for websites | `src/runtime/` → `dist/qontext-runtime.min.js` |
| **Superpose** | The Figma plugin (Row and Column variable modes) | `figma-plugin/` |
| **Probe** | The hardware runner CLI, `qontext-probe` | `python/` |

## What is in this repository

| Part | Path |
| --- | --- |
| Engine: pure ES modules for color science, quantum simulation, contextuality structures and exports | `src/engine/` |
| Website, the front door | `src/site/` → `dist/index.html` |
| Atelier | `src/app/` → `dist/studio.html` |
| Shared drawing code (Unpaintables) | `src/shared/` |
| Observer | `src/runtime/` |
| Superpose | `figma-plugin/` |
| Probe | `python/` |
| The film, its poster and chapters | `dist/media/`, recorded by `scripts/record-film.py` |
| Pool schema | `schema/qontext-pool.schema.json` |
| Tests | `tests/engine/`, `tests/e2e/`, `python/tests/` |
| Docs | `docs/ARCHITECTURE.md`, `docs/PHYSICS.md` |
| The original v0.1 prototype | `legacy/` |

## The website

The site is an exhibit in itself. Things it does:

- **Your copy is a measurement.** Each visitor's palette is an Observer collapse with its own world number.
- **Colors wait until you look.** Swatches shimmer between both outcomes until they scroll into view.
- **One token, two truths.** Rooms alternate between row and column readings of the same tile tokens.
- **A pointer that measures.** The hero field collapses under your pointer and drifts back into superposition.
- **Linked by entanglement.** Spooky Pair's two cards take their accents from one entangled pair.
- **Every view is a proof.** The footer shows that all six Mermin-Peres rules hold for your page.
- **The floor plan is a Mermin-Peres square**, and each room's wall label stretches as you scroll.
- **Your world, framed**: a poster of your world, plus a Wavefunction that opens it in the Atelier.

## Quick start

Open `dist/index.html` (the site) or `dist/studio.html` (the Atelier) in any modern browser.

```
npm ci              # dev tools: esbuild, eslint, local fonts for browser tests
npm run build       # builds dist/ and figma-plugin/dist/
npm run watch       # rebuilds on every change
npm test            # engine and runtime unit tests (node:test)
npm run lint        # ESLint
npm run test:e2e    # browser tests (pip install pytest playwright && playwright install chromium)
npm run film        # re-records the film (needs ffmpeg)
npm run check       # lint + test + build
```

## Observer

```html
<script src="qontext-runtime.min.js" data-qontext='{"base":200,"d":3,"L":0.72,"C":0.13}'></script>

<section data-q-context="row"><div data-q-tile="r1c1"></div></section>
<section data-q-context="col"><div data-q-tile="r1c1"></div></section>  <!-- same tile, may differ -->
```

Each visitor gets a collapse that stays stable for their session and obeys all six rules. Colors are also
CSS custom properties (`--q-r1c1-row`, `--q-r1c1-col`, `--q-harmony-1`, ...). See `examples/runtime-demo.html`.
A collapse with seed `s` equals Atelier measurement 1 of a project whose `measureSeed` is `s`, so a world
means the same thing everywhere.

## Superpose

In Figma: Plugins, Development, Import plugin from manifest, then pick `figma-plugin/manifest.json`. Paste a
Wavefunction or set the palette; Superpose creates a grid frame, a variable collection with **Row** and
**Column** modes, and optional paint styles.

## Probe

```
pip install './python[ibm]'
qontext-probe --noisy                # local test with noise
qontext-probe --ibm least_busy       # IBM Quantum, needs a saved account
qontext-probe --dry-run --ibm least_busy
```

`qontext-hw` still works as the old command name. See `python/README.md`.

## Privacy and network use

The site, the Atelier and Observer make no network requests of their own. The pages load fonts from Google
Fonts and fall back to system fonts when that is blocked. Images used for palette extraction never leave the
device. Settings and your world number are stored in the browser only. No tracking.

## License

Copyright (c) 2026 Lakshmi Monish. All rights reserved. See `LICENSE`.
