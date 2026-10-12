# Changelog

## Unreleased

New
- A real run on IBM hardware. On `ibm_kingston`, each of the square's six rules held on 93 to 95% of 2,048 shots:
  Mermin score 5.286 ± 0.026 against a classical limit of 4, and CHSH 2.732 ± 0.032 against 2. The shots are in
  `data/hardware/`, the Notary opens them with a real stamp (Open the real ibm_kingston run), and the paper has a
  section on the run. Pools can be packed to about 9 KB (`packPool`, `unpackPool`, `scripts/pack-run.mjs`).
- The paper is on the site (`qontext-paper.pdf`, linked from Tools and the footer), and `npm run paper:arxiv` packs
  an arXiv bundle that is compiled in an empty folder to prove it stands on its own.
- The site's Notary seals the real ibm_kingston run instead of the practice example, and Draw a world from these
  shots paints one real measurement of all six contexts in your colors, naming any rule the chip broke.
- The Atelier explains itself. Every room opens with a Wall Card in everyday words: what the room does, a real
  example, a Try this button and a small goal. Reaching a goal (Eureka) ticks it off, counts it in the header and
  throws a short burst of your own colors, which stays still for anyone who asks for less motion.
- Notary is now Prove it was real: three steps (try the example, run it on IBM Quantum, drop your results in),
  results in plain words (Row 1 multiplies to +1, rule kept 97%), and a stamp instead of a text box. The JSON box
  and the commands wait behind folds.
- Handoff is now Take your colors with you: your palette first, then where it's going (a website, Figma, Tailwind,
  an image), then Copy or Download a named file. The code waits behind Show the code, the Wavefunction is your
  design's save code, and a Fix it for me button appears when Bouncer pauses an export.
- The Atelier now hangs like the site. Each room's name is set in the site's tall vinyl letters with its wall
  label beside it, exhibits sit straight on the wall, and the controls run down a quiet column split by thin
  rules instead of a stack of boxes. Reading text is Literata, controls are Anybody. Fringe's band is tall and
  can be dragged to turn the dial, Spooky Pair shows two posters on a split light and dark wall, and the rails
  speak plainly (How quantum is it?, Total chance, How linked are the coins?). Keys 1 to 9 open a room and T
  does the room's first idea. No text is smaller than 12 px.
- Pair Production, the showcase: a sneaker drop from start to finish, told as a scroll story beside a pinned
  vitrine. One shoe's nine panels are the grid's nine tiles; the left foot reads the rows and the right foot the
  columns. Roll a world, tune the harmony, let Bouncer check the print on every panel (and fix the lightness when
  it fails), paint the pair panel by panel, try to force the feet to match and watch a rule break, pick a pair
  from a drop of twelve worlds, and take a hang tag with a SHA-256 fingerprint, a paint sheet (SVG) and a link
  into the Atelier. The shoe is a studio photo, recolored live with a multiply blend so the leather shows through.
- The paper, "One Tile, Two True Colors" (`paper/qontext.pdf`): the idea, two results about the readings (they
  always differ on an odd number of tiles, and on 3 to 4 tiles on average for any pure state), Bouncer, the Phase
  Dial, Pair Production and the limits, with numbers and charts computed by the engine. Unit tests pin both results.
- Turntable: your pair in 3D. A model generated from the same photo stands on a platter in your world's hue;
  drag, pinch or use the keyboard to turn it, show one foot or both, and point at a panel to read both feet's
  colors. It opens from the tag with the exact design, and stands side on in 2D where WebGL is missing.
- The film, rebuilt in Remotion: two and a half minutes in everyday words, with an ElevenLabs voice. Each
  sentence is lined up with the voice by its speaking rate, the scenes are drawn by the engine itself, and the
  clips of the site and the Atelier are recorded in step with the narration. Ten chapters on the site.
- Live at https://qontext.qubitmen.workers.dev on Cloudflare's free plan, deployed from `main`. With it:
  Vacuum (the 404 page), Unobserved (the privacy page), a link-preview image, icons, `robots.txt`,
  `sitemap.xml`, and `_headers` that forbid framing. Each page has a real title, description and canonical
  address. The footer links to Privacy, License, Contact and Source. Still no cookies and no analytics.
- Phase Dial: light and dark are two points on one turn. Every whole degree between is a real theme, a
  Mach-Zehnder blend of the two (lightness from the port intensity, tint from the waves' interference), so the
  way to dark passes a teal dusk and the way back a plum one. Bouncer makes text read at 4.5 : 1 or better
  at all 360 angles, on every wall and every Wall Wash, and a test sweeps them all. A Moon in the bar, lit
  by the Moon's own phase law, opens the dial; the angle is kept per visitor.

Private
- The typefaces are served by the site itself instead of Google Fonts, so no third party sees a visit,
  and the Content Security Policy now allows fonts only from the site. One Latin face per family keeps phone
  scrolling as light as before.

Quieter
- The site is hung like a gallery. Each room is one wall: its name in tall vinyl lettering, a short wall text
  that credits where the idea comes from, and the exhibit straight on the wall instead of in a card.
  Compositions follow the physics: Fringe and Spooky Pair run edge to edge (the Spooky Pair wall splits into
  a light half and a dark half), Mermin's Dare is a board in the middle.
- Reading text is set in Literata; Anybody carries names and controls, wide and heavy in the hero, tall and
  light on the walls. Instrument Sans stays in the Atelier.
- The Firsts cards are gone: each one already happened in a room, and the waiting count moved to the floor
  plan. Take it home is a short index with links to the code instead of seven cards.
- Unmeasured tiles are split on the diagonal everywhere instead of blended, and a collapse snaps into place
  instead of bouncing. The Many Worlds badge and the Notary seal show the three harmony colors as three
  equal phases.
- Copy rewritten without slogans; tile labels are at least 12 px; the poster frame holds its space until the
  poster arrives.

Accessible
- axe-core scans the site and every Atelier tab, on a phone and a desktop, in light and dark, against WCAG 2.2
  A and AA; every violation it found is fixed. Bouncer now also guards single accent fills (`inkFor`,
  `legibleOn`), so button text reads at 4.5 : 1 whatever a collapse produces.
- Wall-name letters no longer catch clicks while they fly in over an exhibit.

Fixed
- The Janus picture in The idea always showed tile X₁, which keeps one color in more than half of all worlds,
  under a caption saying its colors differ. It now shows a tile whose readings really differ in your world and
  names it.
- A refresh rolls a new world. Following a link or going back still keeps yours.
- Fringe on the site starts with wave B opposite wave A, so the band shows interference clearly: gray, full
  color, gray. The needle stays on the band at both ends, port 1's label sits clear of the room map, and the
  caption says what happens in words instead of energy figures. In the Atelier the marker stays on the band and
  the two ports sit right under it.
- Probe picks quiet qubits. It now lets the transpiler choose qubits by their noise for every circuit. Before,
  a two-qubit circuit that fit qubits 0 and 1 went there unchecked; on ibm_kingston qubit 1 misreads 17% of
  shots, which pulled the CHSH value down to about 1.1. On a simulated ibm_kingston it is now 2.7.

Sturdier
- The site speed test judges the median of three measurements, so one slow moment on a shared machine no longer
  fails a run. When a browser test fails in CI, its name and message are posted as annotations.
- Probe's pool validator agrees with the Atelier on the size limit per context; duplicate helpers and dead
  exports removed.

## 1.2.0 (2026-10-12)

Faster
- Rooms sleep until a visitor is about to reach them; off-screen sections skip rendering.
- The hero field is a repeating SVG tile with compositor-run shimmer. Its collapse canvas exists only while
  something is collapsed, is sized from a ResizeObserver (no forced layouts) and stops when the hero is off
  screen or the pointer rests.
- Swatches shimmer with an opacity animation, only near the viewport.
- Scroll-linked exhibits read layout once per frame and change only transforms and attributes.
- Fonts no longer block the first paint; the film and the poster load only when near.
- Phone profile against 1.1.0: ready in about 330 ms instead of 1,297 ms, about 150 ms of load blocking
  instead of 1,508 ms, the hero at rest under 1% of the main thread instead of 100%, scrolling at 59 fps with
  no long tasks instead of 26 fps with 34.

New
- Wall Wash, Compass and Thresholds: every room now feels like walking into a new room.
- `npm run perf` and performance budget tests.

Safer
- Content Security Policy on the standalone pages, with the script pinned by hash.
- Project names are reduced to one printable line, and exports escape them for CSS, JavaScript and SVG.
- The website builds its DOM from text nodes only.
- Browser tests run over HTTP so the policy applies as it does for visitors; security tests for hostile names.
- Dev dependencies updated past a low-severity ESLint advisory.

Cleaner
- The site is split into one module per room (`src/site/rooms/`) and per feature (`src/site/features/`).
- Python helpers (perf, film, browser tests) are linted and formatted in CI.

## 1.1.0 (2026-10-11)

Added
- The website (`dist/index.html`): a gallery of nine rooms with live exhibits, a floor plan that is a
  Mermin-Peres square, an observable hero field, kinetic Anybody type, scroll-driven exhibits, Many Worlds,
  observation-driven swatches, your world as a poster, tools, and the film.
- The film: a one-minute recording of the real site and Atelier with captions and chapters
  (`scripts/record-film.py`, `npm run film`).
- One naming system across every surface: Atelier, Janus, Mermin's Dare, Unity Wheel, Fringe, Pentacle,
  Spooky Pair, Unpaintables, Notary, Handoff, Bouncer, Many Worlds, Wavefunction, Walk-By, Observer,
  Superpose, Probe.
- Wavefunction deep links: `studio.html#QX1...` opens an exact world in the Atelier.
- `qontext-probe` command (the old `qontext-hw` name still works).
- Shared Unpaintables renderer used by the site and the Atelier.
- 13 website end-to-end tests, including "Edit this world" opening identical colors in the Atelier.

Changed
- The Atelier (formerly Studio) moved to `dist/studio.html` and adopts the site's identity: indigo print
  ink on cool gallery paper, Anybody and Instrument Sans, named rooms as tabs, a flip on every measurement.
- Observer collapses now use the same seed convention as the Atelier (`collapseSeed`).
- Browser tests render with the real typefaces, served from npm packages.


## 1.0.0 (2026-10-11)

First production release.

Added
- Engine as tested ES modules shared by the Studio, runtime and Figma plugin.
- Entangled module: Bell-pair assets with CHSH statistics (2.83 against a classical 2).
- Shapes module: Peres 33, Cabello 18 and Yu-Oh 13 shape packs, exhaustive coloring search, best classical
  attempts, rotating 3D/4D views, SVG, OBJ and JSON export.
- APCA contrast in Contrast Guard alongside WCAG 2.2; exports are blocked while the guard fails.
- Lenticular print export with a 1:1 detail view of the interlaced strips.
- Portable project codes (`QX1.`), automatic project persistence, harmony library management.
- Theme runtime (`dist/qontext-runtime.min.js`) with per-visitor collapses, CSS variables and token import.
- Figma plugin with Row and Column variable modes.
- `qontext-hw` Python package: CLI, CHSH circuits, dry-run cost report, pool validation.
- JSON Schema for `qontext-pool/1` and cross-language contract tests.
- Accessible tabs (ARIA roles, arrow keys, Home and End), labelled grid tiles, meters with values.
- CI for lint, unit tests, build freshness, browser tests and Python 3.10 to 3.13.

Fixed (from v0.1)
- Phone layouts overflowed horizontally because the tab bar stretched its grid track.
- Hidden cards could still render in standalone builds.
- Image palette extraction had no error path for unreadable files.
- Saved library entries were trusted without validation.

## 0.1.0 (2026-10-11)

Prototype single-file Studio, kept in `legacy/`.
