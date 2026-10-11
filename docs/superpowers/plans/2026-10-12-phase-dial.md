# Phase Dial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the site's light/dark pair with a 360° Phase Dial whose every whole-degree angle is an interference blend of the two themes, with Bouncer guaranteeing 4.5 : 1 text at all of them.

**Architecture:** A pure engine module (`src/engine/phase.js`) turns an angle and the world's tile colors into the eight chrome tokens. A site feature (`src/site/features/phase.js`) owns the angle (system default, stored choice), writes the tokens onto the root element and draws the Moon button and dial popover. `world.js` reads its paper from the current theme so washed tiles follow.

**Tech Stack:** Plain ES modules, node:test, Playwright (Python) browser tests, axe-core 4.14.0.

**Spec:** `docs/superpowers/specs/2026-10-12-phase-dial-design.md` (approved 2026-10-12: site only, 360° period).

## Global Constraints

- 0° returns exactly today's light tokens and 180° exactly today's dark tokens; 360° equals 0°.
- Every text token (ink, ink-2, ok, no) reaches at least 4.5 : 1 on paper, paper-2, sheet and every wash (84% paper, 16% tile, mixed in OKLab) at every whole degree.
- Angles are whole degrees 0 to 359; anything else is rounded and wrapped first.
- Name in UI: "Phase Dial", descriptor "light, dark and every angle between". No em dashes in copy.
- Without JavaScript the existing CSS light/dark media queries still apply.
- Local storage key `qontext:phase`, every access in try/catch.
- Reduced motion: no transitions while the theme changes.

## Review Focus

- Local storage that throws (private windows): the dial still works and the page follows the system.
- A stored value that is not a whole number from 0 to 359 ("abc", 999, -5): ignored or wrapped, never NaN in a CSS variable.
- The system scheme changes while the visitor never touched the dial: the page follows. After they turned it: it does not.
- Many Worlds at 90°: washes depend on the new world's tiles, so the theme is recomputed and text still passes.
- Pointer drags give fractional and negative angles: rounded and wrapped before any lookup.

---

### Task 1: Engine blend (`phaseMix`, `PHASE_POINTS`)

**Files:**
- Create: `src/engine/phase.js`
- Modify: `src/engine/index.js` (add `export * from './phase.js';`)
- Test: `tests/engine/phase.test.js`

**Interfaces:**
- Produces: `PHASE_POINTS = { light: {paper, paper2, sheet, ink, ink2, rule, ok, no}, dark: {...} }` with today's hexes from `src/site/site.css` (light `#eef0f4 #e2e5ee #fafbfd #1d1f52 #4b4e7c #c8ccdc #1a6e49 #b4232c`, dark `#121433 #181a42 #1c1f4a #eceefb #aeb1d6 #33366c #63d49c #ff8f86`). `normalizeDeg(deg: number) -> int 0..359`. `phaseMix(lightHex, darkHex, deg) -> hex`.

- [ ] **Step 1: Write the failing tests**
  - `phaseMix returns the light value at 0 and the dark value at 180`: for every token pair, `phaseMix(l, d, 0) === l` and `phaseMix(l, d, 180) === d`.
  - `phaseMix repeats every turn`: `phaseMix(l, d, 360) === phaseMix(l, d, 0)` and `phaseMix(l, d, -90) === phaseMix(l, d, 270)`.
  - `the two dusks differ`: `phaseMix(paper.light, paper.dark, 90) !== phaseMix(paper.light, paper.dark, 270)`.
  - `normalizeDeg rounds and wraps`: `[0,0] [359.6,0] [-5,355] [720,0] [89.4,89]` and `normalizeDeg(NaN) === 0`.
  - `the CSS fallback matches PHASE_POINTS`: read `src/site/site.css`, take the `--paper` … `--no` values from the `:root {` block and from the `:root[data-theme="dark"]` block, compare to `PHASE_POINTS`.
- [ ] **Step 2:** `node --test tests/engine/phase.test.js` fails (module missing).
- [ ] **Step 3: Implement.** For deg φ (radians r), with A, B in OKLCH: `wa = |cos(r/2)|`, `wb = |sin(r/2)|`; `L = wa²·A.L + wb²·B.L`; chroma vector `z = wa·A.C·e^{i·A.h} + wb·B.C·e^{i(B.h + φ − 180°)}`; return `oklch(L, |z|, arg z).hex`. At exactly 0° and 180° return the input hex unchanged (rounding must not drift the endpoints).
- [ ] **Step 4:** tests pass; `npm test` green.
- [ ] **Step 5:** commit "Phase Dial: interference blend of the light and dark tokens".

### Task 2: Bouncer at every angle (`phaseTheme`)

**Files:**
- Modify: `src/engine/phase.js`
- Test: `tests/engine/phase.test.js`

**Interfaces:**
- Consumes: Task 1, `wcagContrast`, `hexToLin`, `hexToOklch`, `oklch`, `allTileColors`.
- Produces: `phaseTheme(deg, washes = []) -> { deg, tokens: {paper, paper2, sheet, ink, ink2, rule, ok, no}, scheme: 'light'|'dark', minContrast }` where `washes` is an array of tile hexes and `scheme` is `'light'` when the text went dark. `washOf(paperHex, tileHex) -> hex` (OKLab mix, 16% tile).

- [ ] **Step 1: Write the failing tests**
  - `phaseTheme at 0 and 180 is today's theme`: tokens equal `PHASE_POINTS.light` / `.dark` with `washes = []`.
  - `Bouncer proves every angle`: palettes `{ base: h, d: 3, L, C }` for h in 0..345 step 15, L in [0.62, 0.7, 0.76, 0.84], C in [0.06, 0.13, 0.2]; for every whole degree, with `washes = allTileColors(palette).map(c => c.hex)`, every text token reaches ≥ 4.5 on paper, paper2, sheet and every `washOf(paper, w)`. Failure message names angle, palette, token and ratio.
  - `Bouncer leaves passing tokens alone`: at every degree where `phaseMix` ink already passes on all backgrounds with no washes, `phaseTheme(deg).tokens.ink === phaseMix(...)`.
  - `scheme flips with the ink`: `phaseTheme(0).scheme === 'light'`, `phaseTheme(180).scheme === 'dark'`.
- [ ] **Step 2:** tests fail.
- [ ] **Step 3: Implement.** Blend all eight tokens with `phaseMix`. Backgrounds = paper, paper2, sheet, and each wash. If no single choice of black or white reaches 4.5 on all of them, shift the L of paper, paper2 and sheet together by the smallest multiple of 0.005 (try both directions, take the smaller) after which one of black/white does, recomputing washes each try. Then for each text token keep hue and chroma and move L away from the backgrounds (direction from `inkFor(paper)`) in 0.005 steps until the minimum ratio ≥ 4.5, ending at `#000000`/`#ffffff`. Cache results by `deg` plus the washes joined, so the site's per-frame calls are cheap.
- [ ] **Step 4:** tests pass (the proof sweep should run in under 5 s; if not, cache tile washes per palette inside the test, not in production code).
- [ ] **Step 5:** commit "Phase Dial: Bouncer proves text at all 360 angles".

### Task 3: Site theme state and tokens

**Files:**
- Create: `src/site/features/phase.js`
- Modify: `src/site/world.js` (paper comes from the current theme; export `setPaper(hex)` used by phase.js, replacing `readPaper`'s light/dark lookup; `retheme()` stays the entry point that re-tones tiles and emits `theme`)
- Modify: `src/site/main.js` (call `initPhase()` before `setWorld`)
- Test: `tests/e2e/test_site.py`

**Interfaces:**
- Consumes: `phaseTheme`, `normalizeDeg`, `allTileColors`, `site.palette`.
- Produces: `initPhase()`, `setPhase(deg, { remember: boolean })`, `currentPhase() -> { deg, followsSystem }`. Writes `--paper --paper-2 --sheet --ink --ink-2 --rule --ok --no` and `color-scheme` on `document.documentElement.style`; sets `data-phase` on the root to the whole degree.

- [ ] **Step 1: Write the failing browser tests**
  - `test_phase_defaults_to_the_system_and_remembers_a_turn`: a light page has `data-phase="0"` and `--paper` `#eef0f4`; a page opened with `color_scheme="dark"` has `data-phase="180"`; after `localStorage.setItem('qontext:phase', '90')` and a reload, `data-phase="90"` and `--paper` is no longer `#eef0f4`.
  - `test_phase_ignores_bad_stored_values`: for `"abc"`, `"999"`, `"-5"` reload and assert `data-phase` is `"0"`, `"279"`, `"355"` respectively and no console errors.
  - `test_phase_survives_storage_that_throws`: `add_init_script` replacing `localStorage.getItem/setItem` with throwing functions; page loads with `data-phase="0"`, no errors.
  - `test_phase_follows_system_until_turned`: no stored value, switch `emulate_media` light to dark: `data-phase` goes 0 to 180. With stored 90, switching keeps 90.
- [ ] **Step 2:** tests fail.
- [ ] **Step 3: Implement** `phase.js` state: stored value parsed with `Number`, accepted only when finite, then `normalizeDeg`. Apply on boot, on `matchMedia` change while following the system, and on `world` events (washes changed), using `allTileColors(site.palette)` as washes. Drop the `matchMedia` listener in `main.js` that called `retheme` directly; phase.js now calls `retheme()` after writing tokens.
- [ ] **Step 4:** browser tests pass; full `npm run check` green.
- [ ] **Step 5:** commit "Phase Dial: the site's theme is an angle".

### Task 4: The Moon and the dial

**Files:**
- Modify: `src/site/index.html` (Moon button `#phaseBtn` in `.nav-in` after `#worldBtn`; popover `#phase` with `#phaseRing` (`role="slider"`), `#phaseLine` (`aria-live="polite"`), buttons `[data-phase-to="0"]` Light, `[data-phase-to="180"]` Dark, `#phaseSystem` Follow system)
- Modify: `src/site/features/phase.js`, `src/site/site.css`
- Test: `tests/e2e/test_site.py`, `tests/e2e/test_accessibility.py`

**Interfaces:**
- Consumes: Task 3.
- Produces: the controls above. The Moon is an inline SVG whose lit fraction is `(1 + cos φ) / 2`, waning from 0° to 180° and waxing back.

- [ ] **Step 1: Write the failing tests**
  - `test_phase_dial_by_keyboard`: focus `#phaseBtn`, Enter opens `#phase`, focus is on `#phaseRing`; ArrowRight makes `aria-valuenow` 1, Shift+ArrowRight 16, PageUp 61, End 180, Home 0; `aria-valuetext` contains "°"; Escape closes and focus returns to `#phaseBtn`.
  - `test_phase_dial_buttons`: Dark sets `data-phase="180"`, Follow system removes the stored value (`localStorage.getItem('qontext:phase') is None`).
  - `#phaseLine` reads like `Phase 90°. Text here reads at N : 1. Bouncer checked all 360 angles.` with N ≥ 4.5.
  - Accessibility: parametrize `test_site_has_no_axe_violations` with `phase` in `[None, 90, 270]` (set via storage before load); also run one Many Worlds switch at 90° and scan again.
- [ ] **Step 2:** tests fail.
- [ ] **Step 3: Implement.** Ring painted with a `conic-gradient` of `phaseTheme(k*10).tokens.paper` for k in 0..35 (computed once per world). Pointer: `pointerdown` on the ring sets the angle from `atan2` around its center (0° at the top, clockwise), drag continues with pointer capture, updates at most once per animation frame. Keys as in the test. Popover: anchored under the Moon on wide screens, a bottom sheet under 520 px. Close on Escape, outside click, or the Moon again.
- [ ] **Step 4:** browser tests and axe pass at all three phases.
- [ ] **Step 5:** commit "Phase Dial: the Moon and the dial".

### Task 5: Ship

**Files:**
- Modify: `README.md` (names table: Phase Dial), `docs/ARCHITECTURE.md` (engine `phase.js`, site `features/phase.js`), `CHANGELOG.md` (Unreleased: New), `.claude/memory/project-roadmap.md`

- [ ] **Step 1:** `npm run check`, `python3 -m pytest tests/e2e -q -p no:playwright`, `ruff check python scripts tests`, all green.
- [ ] **Step 2:** screenshots at 1440x900 and 390x844 at 0°, 90°, 180°, 270°, dial open and closed; fix anything they show in one batch.
- [ ] **Step 3:** commit, push to `origin main`, republish `dist/artifact.html` with `studio.html` and the two media files, list the artifact files.
