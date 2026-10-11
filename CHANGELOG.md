# Changelog

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
