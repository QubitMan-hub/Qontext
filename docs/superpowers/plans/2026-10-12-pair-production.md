# Pair Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scroll-story section on the website where the visitor designs and paints a sneaker pair in their own world, from rolling the world to a downloadable paint sheet.

**Architecture:** Pure data and maths in `src/site/pair-shape.js` (panels, paths, colors per foot, rule checks, drop seeds; engine calls only, no DOM). The section's behaviour in `src/site/features/pair.js`, woken by `whenNear`, building SVG once and then changing only `fill` attributes. Layout in `index.html` and `site.css`: a sticky stage beside six steps.

**Tech Stack:** Vanilla ES modules bundled by esbuild, SVG, `node:test` for the pure module, Playwright (pytest) for the browser.

**Spec:** `docs/superpowers/specs/2026-10-12-pair-production-design.md`

## Global Constraints

- Name: Pair Production. Descriptor everywhere it appears: "a sneaker drop, start to finish". Nav label: Showcase.
- Placement: after `#idea`, before `#floor`. Menu entry "Pair Production" with the descriptor; footer nav and top nav get "Showcase".
- Panel (band r, zone c) is tile (r, c). Bands: Top, Body, Sole. Zones: Toe, Mid, Heel. Panels: Tongue, Laces, Collar / Toe box, Stripe, Heel counter / Toe bumper, Midsole, Outsole.
- Left foot = `tileColor(palette, r, c, rowValue(out, r, c))`; right foot = same with `colValue`. No other color maths in the site.
- Logo: an invented mark (the split tile and the word Qontext) on the Stripe. No real brand names or shapes.
- Unpainted panels are split on the diagonal into their two possible colors; painted panels are flat.
- Contrast: every text and the logo at 4.5 : 1 or better (Bouncer), in light, dark and every Phase Dial angle.
- Copy: short, plain, human; no em dashes. Reduced motion: nothing animates, everything works.
- No cookies, no analytics, nothing sent anywhere. DOM from text nodes only (`h()`, `svg()`); exports escape with `xmlEscape`.

## Review Focus

- A world change (Many Worlds, the drop) while panels are half painted: the pair must reset to unpainted in the new world, never mix two worlds. Test in Task 5.
- Harmony set to 4 or 5 colors after painting: painted panels repaint in the new palette and stay painted. Test in Task 3.
- Try to match pressed, then a panel painted or the world rolled: the match is cleared and 6 of 6 is back. Test in Task 4.
- Keyboard only: every step usable with Tab, Enter and Space, focus visible on the band. Test in Task 4 (legend buttons) and the axe scans.
- Storage blocked or SubtleCrypto missing: the tag still renders, the fingerprint says it is unavailable. Test in Task 6.

---

### Task 1: The pair as data

**Files:**
- Create: `src/site/pair-shape.js`
- Test: `tests/engine/pair-shape.test.js`

**Interfaces:**
- Produces: `PANELS: Array<{ id: string, name: string, r: 0|1|2, c: 0|1|2, d: string }>` (ids: `tongue, laces, collar, toebox, stripe, heel, bumper, midsole, outsole`), `BANDS = ['Top band', 'Body band', 'Sole band']`, `ZONES = ['Toe zone', 'Mid zone', 'Heel zone']`, `SHOE_VIEWBOX = '0 0 600 300'`, `DETAILS: string[]` (stitch and lace paths, decorative), `LOGO: { x, y, size }` (on the stripe).
- Produces: `pairOf(palette, outcomes) -> { left: Map<id, hex>, right: Map<id, hex>, both: Map<id, [hexPlus, hexMinus]>, differ: string[] }`.
- Produces: `pairChecks(leftValues, rightValues) -> Array<{ ctx: 'R1'|'R2'|'R3'|'C1'|'C2'|'C3', label: string, ok: boolean }>` where values are 3x3 arrays of ±1; rows are judged on the left values, columns on the right values, against `CONTEXTS` signs.
- Produces: `footValues(outcomes) -> { left: number[][], right: number[][] }` (row and column readings).
- Produces: `dropSeeds(seed, n = 12) -> number[]`, distinct, in 1..9,999,999, none equal to `seed`, the same for the same `seed`.

- [ ] **Step 1: Write the failing tests**

```js
test('the nine panels are the nine tiles, once each', () => {
  assert.equal(PANELS.length, 9);
  assert.deepEqual(new Set(PANELS.map((p) => `${p.r}${p.c}`)).size, 9);
  assert.equal(PANELS.find((p) => p.id === 'stripe').r, 1);
});
test('a quantum pair follows all six rules and differs exactly on the contextual tiles', () => {
  for (const seed of [1, 7, 5690984]) {
    const out = collapse({ base: 200, d: 3, L: 0.72, C: 0.13, state: 'random', stateSeed: 7, seed }).outcomes;
    const { left, right } = footValues(out);
    assert.equal(pairChecks(left, right).filter((x) => x.ok).length, 6);
    assert.deepEqual(pairOf({ base: 200, d: 3, L: 0.72, C: 0.13 }, out).differ.length, contextualTiles(out).length);
  }
});
test('a matching pair (any fixed paint job) passes at most 5 of 6', () => {
  for (let mask = 0; mask < 512; mask++) {
    const v = [0, 1, 2].map((r) => [0, 1, 2].map((c) => ((mask >> (r * 3 + c)) & 1 ? -1 : 1)));
    assert.ok(pairChecks(v, v).filter((x) => x.ok).length <= 5);
  }
});
test('the drop is twelve other worlds, the same every time', () => {
  const a = dropSeeds(4227792);
  assert.equal(new Set(a).size, 12);
  assert.ok(!a.includes(4227792) && a.every((s) => s >= 1 && s <= 9999999));
  assert.deepEqual(dropSeeds(4227792), a);
});
```

- [ ] **Step 2: Run** `node --test tests/engine/pair-shape.test.js`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `src/site/pair-shape.js`.** Imports only from `../engine/index.js` (the test imports `collapse` from the runtime itself). Paths are hand-drawn for a right-facing low-top in `SHOE_VIEWBOX`, panels touching without gaps, toe on the right. `dropSeeds` uses `hashSeed(seed, 0x5e, k) % 9999999 + 1`, skipping repeats and `seed`.
- [ ] **Step 4: Run** `node --test tests/engine/pair-shape.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `Pair Production: the pair as data`.

### Task 2: The section, the pinned pair and step 1

**Files:**
- Create: `src/site/features/pair.js`
- Modify: `src/site/index.html` (section after `#idea`, menu, top nav, footer nav), `src/site/main.js` (`initPair()` in boot), `src/site/site.css` (band and sticky layout)
- Test: `tests/e2e/test_pair.py`

**Interfaces:**
- Consumes: Task 1 exports; `site`, `onWorld`, `worldNumber` from `world.js`; `whenNear`, `h`, `svg` from `lib.js`.
- Produces: DOM contract used by every later task and by the tests:
  `section#pair[aria-labelledby=pairTitle]` with `h2#pairTitle` "Pair Production" and the descriptor; `#pairStage` (sticky) holding `svg#pairSvg` with two groups `g[data-side=L]` (mirrored) and `g[data-side=R]`, each with nine `path[data-panel=<id>]`; foot captions "Left foot reads the rows" and "Right foot reads the columns"; `ul#pairPanels` with nine `button[data-panel=<id>]`; `ol#pairSteps` with six `li.pair-step[data-step=1..6]`. Step 1 holds `#pairWorld` (the world number) and `button#pairRoll[data-many]`.
- Produces: `initPair()` and module state `pair = { nudge: 0, d: 3, L: null, painted: Set<id>, match: false }`, `palette() -> { base, d, L, C }`, `render()` that sets every path's `fill` (unpainted: `url(#pg-<side>-<id>)`, a diagonal hard-stop gradient of the two possible colors; painted: the foot's hex).

- [ ] **Step 1: Write the failing tests** in `tests/e2e/test_pair.py` (helper `enter_pair(page)` scrolls `#pair` into view and waits for `#pairSvg path[data-panel]`):
  - `test_pair_section_sits_after_the_idea`: `#idea + #pair` exists; menu and footer nav link to `#pair`; the title is "Pair Production".
  - `test_pair_starts_unpainted_in_your_world`: 18 panel paths, every `fill` starts with `url(#`; `#pairWorld` equals `#worldNum`.
  - `test_rolling_the_world_changes_the_pair`: click `#pairRoll`, wait for the toast "Welcome to world", `#pairWorld` changed and equals `#worldNum`.
- [ ] **Step 2: Run** `python3 -m pytest tests/e2e/test_pair.py -q -p no:playwright`. Expected: FAIL.
- [ ] **Step 3: Implement** the markup, `initPair()` (wakes on `whenNear(#pair)`, builds the SVG and the legend once, renders, re-renders on `onWorld`), boot wiring, and the layout: full-bleed band `--band: #0b0c24` in every theme with fixed light text, two columns (steps left, stage right, `position: sticky; top: 88px`) above 900 px; below it the stage is sticky at `top: 64px` and about 42vh tall with the steps under it. Each step is at least 70vh tall on desktop, 60vh on a phone.
- [ ] **Step 4: Run** the tests and `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit** `Pair Production: section, pinned pair, roll your world`.

### Task 3: Step 2, the harmony, and step 3, Bouncer on the logo

**Files:** Modify `src/site/features/pair.js`, `src/site/index.html`, `src/site/site.css`; Test `tests/e2e/test_pair.py`

**Interfaces:**
- Produces: `input#pairTurn` (range 0 to 359, step 1, label "Turn the harmony"), buttons `[data-d=3|4|5]` in `#pairD` with `aria-pressed`, chips in `#pairHarmony`; `#pairInkRatio` (text like "7.1 : 1"), `#pairInkNote`, `button#pairFix` (hidden unless the lower ratio is under 4.5). The logo on both stripes uses the ink Bouncer picks (`inkFor` on each stripe color; when they disagree, the one whose lower ratio is higher). Fix sets `pair.L = fixLightness(palette(), ink)`.

- [ ] **Step 1: Write the failing tests:**
  - `test_harmony_changes_the_pair_not_the_site`: record `--q-r1c1-row` on `:root` and a stripe gradient's stop colors; set `#pairTurn` to 120 (fill and dispatch `input`); stop colors changed, the root variable did not.
  - `test_harmony_size_repaints_painted_panels`: paint all (Task 4's button may not exist yet, so paint by clicking each `#pairPanels button`), press `[data-d="5"]`; every path fill is a flat `#` hex and differs from before for at least one panel.
  - `test_logo_reads_on_both_stripe_colors`: parse `#pairInkRatio`; it is at least 4.5; after sweeping `#pairTurn` through 0, 60, ..., 300 and pressing `#pairFix` whenever it is visible, it is always at least 4.5.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the controls and the logo check (the lower WCAG ratio of the chosen ink over the two stripe colors, from the engine's `wcagContrast` via `hexToLin`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `Pair Production: tune the harmony, Bouncer on the logo`.

### Task 4: Step 4, painting the pair

**Files:** Modify `src/site/features/pair.js`, `src/site/index.html`, `src/site/site.css`; Test `tests/e2e/test_pair.py`

**Interfaces:**
- Produces: clicking a path or pressing a `#pairPanels` button paints that panel on both feet (adds to `pair.painted`, sets `aria-pressed="true"` on its button, the button shows both foot colors); `button#pairPaintAll`; `button#pairMatch` (`aria-pressed`); `ul#pairChecks` with six `li[data-ctx][data-ok=true|false]` labelled with BANDS for rows ("on the left foot") and ZONES for columns ("on the right foot"); `#pairVerdict` text: "6 of 6 rules hold." or, matched, "5 of 6 at best. The pair has to differ." (use the real count).
- Painting animates a short collapse (opacity and transform only); none under reduced motion.

- [ ] **Step 1: Write the failing tests:**
  - `test_painting_collapses_panels_on_both_feet`: focus the first legend button, press Enter; its two paths have flat fills, the other paths still `url(`.
  - `test_painted_pair_differs_exactly_on_contextual_tiles`: `#pairPaintAll`; the number of panels whose L and R fills differ equals the floor plan's count of tiles that change with context (`#planDiff`), and `#pairChecks li[data-ok=true]` count is 6.
  - `test_trying_to_match_breaks_a_rule`: press `#pairMatch`; L and R fills are equal for every panel; `[data-ok=false]` count is at least 1; `#pairVerdict` contains "has to differ"; paint a panel or press it again and 6 of 6 is back.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** with `pairOf`, `footValues` and `pairChecks`; Try to match uses the left values for both feet.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `Pair Production: paint the pair, and why it cannot match`.

### Task 5: Step 5, the drop

**Files:** Modify `src/site/features/pair.js`, `src/site/features/worlds.js`, `src/site/index.html`, `src/site/site.css`; Test `tests/e2e/test_pair.py`

**Interfaces:**
- Produces in `worlds.js`: `export function goToWorld(seed?: number)` (the Many Worlds wipe to a given seed; the existing buttons call it with no seed, which picks `newSeed()`).
- Produces: `ul#pairDrop` with twelve `li > button[data-seed]` each holding a small painted pair (its own world's palette and outcomes, via `paletteFor` logic: export `paletteFor(seed)` from `world.js`) and its world number. Built when step 5 first comes near. Choosing one calls `goToWorld(seed)`. When step 5 becomes active and nothing is painted, the pair paints itself.

- [ ] **Step 1: Write the failing tests:**
  - `test_the_drop_is_twelve_different_worlds`: 12 buttons, 12 distinct `data-seed`, none equal to the current world.
  - `test_choosing_a_pair_from_the_drop_makes_it_your_world`: click the third; `#worldNum` becomes that seed (formatted); the pinned pair is unpainted again; the drop rebuilt for the new world.
  - `test_a_world_change_resets_a_half_painted_pair`: paint two panels, press `#worldBtn`; after the toast, all 18 fills start with `url(`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `Pair Production: the drop`.

### Task 6: Step 6, the tag and the paint sheet

**Files:** Modify `src/site/features/pair.js`, `src/site/index.html`, `src/site/site.css`; Test `tests/e2e/test_pair.py`

**Interfaces:**
- Produces: `#pairTag` (a hang tag: world number, "6 of 6 rules", the panels that differ by name, `code#pairPrint` with the SHA-256 of the design's Wavefunction or "unavailable in this browser", and the line "Simulated in this browser. Run it on IBM Quantum with Probe."), `a#pairAtelier` with `href="studio.html#" + encodeProject({ name: 'Pair, world N', ...palette(), state: 'random', stateSeed: 7, measureSeed: site.seed })`, `button#pairSheet` that downloads `qontext-pair-world-<seed>.svg`.
- The paint sheet: 1200 by 900, both shoes painted, and a table of the nine panels with each foot's hex and `oklch(L C h)`; every string through `xmlEscape`.

- [ ] **Step 1: Write the failing tests:**
  - `test_the_tag_carries_a_fingerprint`: `#pairPrint` matches `^[0-9a-f]{64}$`.
  - `test_the_tag_survives_without_subtlecrypto`: add an init script deleting `crypto.subtle`; `#pairPrint` reads "unavailable in this browser" and the tag still lists the world.
  - `test_open_in_the_atelier_is_the_same_design`: follow `#pairAtelier`; the Atelier loads with no errors and its Wavefunction field (`#projCode`) decodes to the same base hue.
  - `test_the_paint_sheet_is_an_svg_with_both_feet`: `page.expect_download()` on `#pairSheet`; the file starts with `<svg`, has 18 hex colors in its table and all nine panel names.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `Pair Production: the tag and the paint sheet`.

### Task 7: The look, the steps coming alive, docs, ship

**Files:** Modify `src/site/features/pair.js`, `src/site/site.css`, `src/site/index.html`, `README.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `.claude/memory/project-roadmap.md`; Test `tests/e2e/test_pair.py`, existing axe and performance tests.

**Interfaces:**
- Produces: the active step (`li.pair-step.on`, one at a time) chosen by an IntersectionObserver with `rootMargin: '-50% 0px -40% 0px'`; `#pairStage[data-step]` mirrors it (step 3 rings the stripe, step 4 shows the legend prominently, step 5 dims the pair behind the drop count).

- [ ] **Step 1: Write the failing tests:**
  - `test_steps_come_alive_in_order`: scroll each step into the middle; exactly one `.pair-step.on`, and `#pairStage` `data-step` matches.
  - `test_pair_fits_a_phone`: at 390 px no horizontal overflow; the stage stays in view while scrolling the steps (its top within 0 to 80 px when step 3 is active).
  - `test_pair_under_reduced_motion`: with `reduced_motion='reduce'`, painting still works and no element under `#pair` has a running animation.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the step observer and the visual pass (frontend-design guidance): wide heavy step numbers, the progress rail, the floor shadow, the collapse settle, hover and focus states on the band.
- [ ] **Step 4: Verify:** `npm run check`; `python3 -m pytest tests/e2e -q -p no:playwright` (axe in light, dark, phone, desktop and at dusk, the performance budget); `ruff check python scripts tests film/scripts`; screenshots of every step at 1440x900 and 390x844, light and dark.
- [ ] **Step 5: Docs:** README names table (Pair Production), the website list, CHANGELOG under New, ARCHITECTURE features line, roadmap memory.
- [ ] **Step 6: Commit and ship:** commit, push `main`, republish the preview artifact.
