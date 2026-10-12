# Qontext

Qontext is a design engine where color depends on context. It is built on quantum contextuality: a tile
can show one color when read with its row and another when read with its column, and the mathematics
guarantees that no fixed coloring could ever do the same. Hue is treated as quantum phase, so classic
color harmonies are the roots of unity of a d-level quantum system.

Everything runs as exact quantum simulation on the visitor's device. Real hardware (IBM Quantum) adds
physically random collapses, measured violations of classical limits, and a verifiable provenance seal.

The site: https://qontext.qubitmen.workers.dev. The Atelier: https://qontext.qubitmen.workers.dev/studio.

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
| **Phase Dial** | Light, dark and every angle between: each angle is an interference blend of the two themes, with text checked by Bouncer at all 360 | The Moon in the site's bar |
| **Wavefunction** | A portable code (`QX1.`) for one exact design | Handoff, the site, Superpose |
| **Walk-By** | Interlaced lenticular print files | Handoff |
| **Wall Wash** | The site's walls take on a little of each room's own tile color as you walk in | The website |
| **Compass** | A pocket floor plan: unvisited rooms are still split, visited rooms have collapsed | The website |
| **Thresholds** | Each room's name enters the way its physics behaves | The website |
| **Wall Cards** | Each Atelier room opens in plain words: what it does, a real example, one thing to try | The Atelier |
| **Eureka** | One small goal per Atelier room; reaching it bursts the design's own colors (still under reduced motion) | The Atelier |
| **Pair Production** | The showcase: a sneaker drop from start to finish. The nine panels of one shoe are the nine tiles; the left foot reads the rows, the right foot the columns | The website |
| **Turntable** | Your Pair Production pair in 3D, on a platter you can turn | `src/turntable/` → `dist/turntable.html` |
| **Vacuum** | The page for addresses that do not exist: nothing was measured there, so its tile stays split | `src/site/pages/404.html` |
| **Unobserved** | The privacy page: what the site keeps about you (nothing) and who else sees a visit | `src/site/pages/privacy.html` |
| **Observer** | The 12 KB theme runtime for websites | `src/runtime/` → `dist/qontext-runtime.min.js` |
| **Superpose** | The Figma plugin (Row and Column variable modes) | `figma-plugin/` |
| **Probe** | The hardware runner CLI, `qontext-probe` | `python/` |

## What is in this repository

| Part | Path |
| --- | --- |
| Engine: pure ES modules for color science, quantum simulation, contextuality structures and exports | `src/engine/` |
| Website, the front door | `src/site/` → `dist/index.html` |
| Turntable, the pair in 3D (three.js) | `src/turntable/` → `dist/turntable.html` |
| The shoe: a studio photo and its nine panels, and a 3D model generated from the photo | `art/pair-shoe.png`, `scripts/pair_photo.py`, `scripts/pair_model.py` → `src/site/pair-photo.js`, `src/site/public/pair-shoe.webp`, `src/site/public/pair-shoe.glb` |
| Atelier | `src/app/` → `dist/studio.html` |
| Shared drawing code (Unpaintables) | `src/shared/` |
| Observer | `src/runtime/` |
| Superpose | `figma-plugin/` |
| Probe | `python/` |
| Vacuum, Unobserved, and files copied to the site as they are (icons, link-preview image, `_headers`, `_redirects`) | `src/site/pages/`, `src/site/public/` |
| The film: script, voice, scenes, link-preview card and icons (Remotion) | `film/` → `dist/media/`, made by `scripts/film.py` |
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
- **The floor plan is a Mermin-Peres square**, and the brand mark in the bar is the same map in miniature.
- **Every room feels like a new room.** Wall Wash tints the walls with the room's own tile color, Compass shows
  where you are and where you have been, and Thresholds bring each name in the way its physics behaves: Janus
  flips, Mermin's Dare lands on plus and minus, Unity Wheel turns, Fringe ripples, Pentacle draws in star order,
  Spooky Pair arrives from both ends at once, Unpaintables never settles the same way twice, Notary stamps and
  Observer collapses.
- **Your world, framed**: a poster of your world, plus a Wavefunction that opens it in the Atelier.
- **Pair Production**, a sneaker drop start to finish: roll a world, tune the harmony, let Bouncer check the
  print on every panel, paint the pair (some panels can never match between the feet, and the six rules show
  why), pick from a drop of twelve worlds, and take the tag with its SHA-256 fingerprint. Then put the pair on
  the **Turntable** and turn it in 3D.

It is built to be fast on an ordinary phone. Rooms sleep until you are about to reach them, off-screen sections
skip rendering, the hero field is a repeating SVG tile with compositor-run shimmer, and nothing animates on the
main thread while the page is still. Measured with `npm run perf` (phone profile: 4x CPU slowdown, touch
scrolling), against v1.1.0:

| | v1.1.0 | v1.2.0 |
| --- | --- | --- |
| Ready to use | 1,297 ms | about 330 ms |
| Main thread blocked while loading | 1,508 ms | about 150 ms |
| Main thread used by the hero at rest | 100% | under 1% |
| Scrolling | 26 fps, 34 long tasks | 59 fps, no long tasks |

The browser tests hold the site to a performance budget (`tests/e2e/test_performance.py`).

## Quick start

Open `dist/index.html` (the site) or `dist/studio.html` (the Atelier) in any modern browser.

```
npm ci              # dev tools: esbuild, eslint, axe-core, and the typeface packages the build copies
npm run build       # builds dist/ and figma-plugin/dist/
npm run watch       # rebuilds on every change
npm test            # engine and runtime unit tests (node:test)
npm run lint        # ESLint
npm run test:e2e    # browser tests (pip install pytest playwright pillow numpy && playwright install chromium)
npm run film        # makes the film from the voice and the script (needs ffmpeg and `npm ci` in film/)
npm run perf        # measures load, hero and scrolling on a phone and a desktop profile
npm run check       # lint + test + build
```

## The paper

`paper/qontext.pdf`, "One Tile, Two True Colors: Quantum Contextuality as a Design Material", explains the idea,
the two results about the readings, Bouncer, the Phase Dial, Pair Production and the limits, in plain words. Its
numbers and charts come from the engine, and its pictures from the built site:

```
node paper/figures/data.mjs > paper/figures/data.json   # the numbers (100,000 worlds; takes a few seconds)
python3 paper/figures/plot.py                           # the charts, as PGF (needs matplotlib)
python3 paper/figures/shots.py                          # the pictures (needs a built dist/ and Playwright)
cd paper && latexmk -pdf qontext.tex                    # the PDF (pdflatex, arXiv-friendly)
```

## The film

Two and a half minutes in plain words: the idea, Mermin's Dare, your own world, the rooms, the Phase Dial and
every tool. The script lives in `film/src/script.json` (scenes, sentences and chapter names); the voice is an
ElevenLabs take of that script (`film/public/voice.mp3`). `npm run film` lines each sentence up with the pauses
in the voice, records the two real clips of the site and the Atelier in step with it, renders the scenes with
Remotion, and writes the film, its poster and the site's chapter list. Changing the script means a new voice
take. `npm run cards` inside `film/` redraws the link-preview card and the icons in `src/site/public/`.

## Hosting

The site runs on Cloudflare's free plan as a Worker with static assets, connected to this repository, so
every push to `main` deploys. `wrangler.jsonc` serves `dist/` as it is (the built files are committed, so
there is no build step) and answers missing addresses with Vacuum, `404.html`. `_headers` adds the policies a
meta tag cannot (no framing, no sniffing, no referrer), and `_redirects` sends the artifact fragment's
address home. The public address is `homepage` in `package.json`; canonical links, link previews,
`robots.txt` and `sitemap.xml` are built from it.

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

A real run is on record: `data/hardware/ibm_kingston-2026-10-12.json`, 20,480 shots on IBM's `ibm_kingston`.
Each of the square's six rules held on 93 to 95% of shots (Mermin score 5.286 ± 0.026, classical limit 4) and the
CHSH value was 2.732 ± 0.032 (classical limit 2). The Atelier's Notary opens it with **Open the real
ibm_kingston run**; `node scripts/pack-run.mjs <file>` repacks a new run for it.

## Privacy and network use

The site, the Atelier and Observer make no network requests of their own, and nothing loads from a third party:
the typefaces are served by the site itself (`src/fonts.css`, copied into `dist/fonts/` from the npm packages)
and never block the first paint. Images used for
palette extraction never leave the device. Settings and your world number are stored in the browser only. No
cookies, no analytics, no tracking. Unobserved says the same to visitors.

## Security

- The standalone pages carry a Content Security Policy: the only script that runs is the page's own bundle,
  pinned by its SHA-256 hash; nothing can be fetched, framed or posted; fonts come only from the site itself.
  Vacuum and Unobserved run no script at all. On Cloudflare, `_headers` also forbids framing.
- A Wavefunction code can come from anyone, so everything in it is sanitized on the way in (numbers clamped,
  names reduced to one printable line) and escaped on the way out: a project name cannot break out of a CSS
  comment, add a line to a Tailwind config or add markup to an SVG. `tests/engine/security.test.js` tries.
- The website builds its DOM from text nodes, never from markup strings.

## License

Copyright (c) 2026 Lakshmi Monish. All rights reserved. See `LICENSE`.
