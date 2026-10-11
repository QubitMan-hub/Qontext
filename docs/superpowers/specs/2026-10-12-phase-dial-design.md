# Phase Dial: design

Status: draft for the owner's review, 2026-10-12. Nothing is built until this is approved.

## What it is

Every website has a light mode and a dark mode. Qontext has a dial instead. Light sits at 0°, dark at 180°,
and every angle between them is a real theme, worked out with the same interference maths as the Fringe
room. Turn it and the page passes through dusk. The two half-turns are different: going from light to dark
it passes through a teal dusk, and coming back through a plum one. That difference is real interference,
not a style choice. Bouncer, which already guards tile text, checks that text reads at all 360 angles.

Name: Phase Dial. Plain descriptor wherever the name appears: "light, dark and every angle between".

## How an angle becomes a theme

The chrome has eight tokens: paper, paper-2, sheet, ink, ink-2, rule, ok, no. Each one has a light value (the
current light theme) and a dark value (the current dark theme). For a dial angle φ, each token goes through
the same Mach-Zehnder model Fringe uses, with φ as the phase difference between the two arms:

- Lightness follows the intensity at one output port, cos²(φ/2). So 0° is all light value, 180° is all dark
  value, and 90° and 270° are an even split.
- Tint comes from the chroma of the two values as waves (hue is the phase, chroma the height, as in Fringe).
  They add with weights |cos(φ/2)| and |sin(φ/2)| and a relative phase of φ minus 180°. That relative phase
  turns the dark value's hue a quarter turn one way at 90° and the other way at 270°. For the current
  indigo dark paper, that gives teal at 90° and plum at 270°.
- At 0° and 180° the result is exactly today's light and dark tokens, and 360° gives back 0°.

A spike with today's tokens (paper only, before Bouncer):

| Angle | Paper | Theme ink on it | Best of black or white |
|---|---|---|---|
| 0° | #eef0f4 | 13.4 : 1 | 18.4 : 1 |
| 60° | #a3bab0 | 3.8 : 1 | 10.2 : 1 |
| 90° | #5c8382 | 1.1 : 1 | 5.0 : 1 |
| 180° | #121433 | 15.5 : 1 | 17.9 : 1 |
| 270° | #917179 | 1.1 : 1 | 4.8 : 1 |

So blending the inks the same way fails near 90° and 270°. This is why the Bouncer step exists.

## Bouncer, at every angle

Any background has at least 4.58 : 1 with pure black or with pure white. Bouncer relies on that fact. It
works in two steps for each angle.

1. Backgrounds. The text has to read on everything it sits on:
   - paper, paper-2 and sheet
   - the Wall Wash of every tile in the visitor's world (84% paper, 16% tile)

   If no single ink can reach 4.5 : 1 on all of them, the backgrounds sit on both sides of the dead band
   (around 18% luminance). Bouncer then moves all backgrounds together, keeping their hue, toward whichever
   side is closer, by the smallest step that clears the band. In use the wall takes a short jump through
   the band instead of stopping in it.
2. Text. Ink, ink-2, ok and no each keep their blended hue. Each one's lightness moves away from the
   backgrounds just far enough to reach 4.5 : 1 on all of them; past that it heads to pure black or white,
   which always works. A token that already passes is left alone. Near 90° and 270° this means ink and
   ink-2 both end up near black or near white. There, readability wins over hierarchy.

`color-scheme` (form controls and scrollbars) switches from light to dark at the angle where the ink flips.

Rule borders are decorative and stay as blended. Fixed-color pieces are out of scope because they are
already checked: the Spooky Pair halves, the Many Worlds wipe, the poster and the film.

## The control

- In the nav, a small Moon: a disc whose lit fraction is (1 + cos φ) / 2, which is the Moon's own phase law.
  Light to dark is waning and dark back to light is waxing, so the icon also tells the two dusks apart. It
  is a button that opens the dial.
- The dial is a popover with a ring. The ring is painted with the papers at every 10°, with Light marked at
  0° and Dark at 180°. One handle sits on the ring. Under it:
  - a live line: "Phase 135°. Text here reads at 7.4 : 1. Bouncer checked all 360 angles."
  - three buttons: Light, Dark and Follow system
- Keyboard: the ring is `role="slider"`, with values 0 to 359 and a value text like "135°, dusk on the way to
  dark". Arrows move 1°, Shift with an arrow moves 15°, Page Up and Page Down move 45°, Home goes to light
  and End to dark. Escape closes the popover and returns focus to the Moon.
- Pointer: drag the handle or tap the ring. On a phone the popover is a sheet at the bottom of the screen.
- The page follows the system setting (0° or 180°) until the visitor turns the dial. After that the angle is
  kept for that visitor in local storage (wrapped in try/catch, so a private window just forgets it). Follow
  system clears it.
- Reduced motion: the theme changes instantly, with no wash fades.
- Without JavaScript the CSS media query still gives today's light and dark.

## Where the code goes

- Engine: `src/engine/phase.js`, pure and dependency-free.
  - `PHASE_POINTS`: the light and dark values of the eight tokens.
  - `phaseMix(lightHex, darkHex, deg)`
  - `phaseTheme(deg, { washes })` returns the eight tokens after Bouncer, the ink side, and the worst
    contrast it found.
  - It reuses `interfere`'s conventions and the existing contrast helpers (`wcagContrast`, `inkFor`).
- Site: `src/site/features/phase.js` builds the Moon and the dial.
  - It sets the eight tokens as custom properties on the root element, cached per whole degree, at most
    once a frame while dragging.
  - `world.js` takes its paper from the current angle instead of the light and dark pair, so washed tile
    tones and Unpaintables follow the dial through the existing `theme` event.
- CSS: the light and dark values stay in `site.css` as the no-script fallback. A unit test fails if they ever
  differ from `PHASE_POINTS`.

## Tests

- Engine (`tests/engine/phase.test.js`):
  - 0° and 180° return exactly today's tokens, and 360° equals 0°.
  - 90° and 270° differ: the interference is real.
  - The proof sweeps every whole degree from 0 to 359 across a grid of palettes (base hue, lightness and
    chroma, as in the legibility test). At each one, every text token reaches at least 4.5 : 1 on paper,
    paper-2, sheet and every wash.
  - Bouncer leaves a token untouched wherever the blend already passes.
  - The CSS fallback matches `PHASE_POINTS`.
- Browser:
  - The Moon opens the dial, the keyboard moves it, and the paper token changes. The angle survives a
    reload, and Follow system clears it.
  - axe runs at 90° and 270° (the hardest angles) on desktop and phone, as well as at the defaults.
  - The performance budget still holds at the default angle.

## Not in this version

- The Atelier keeps following the system theme. The engine function is shared, so it can adopt the dial
  later.
- Observer does not expose the phase yet. A later version could let any website ship a Phase Dial.
- No Handoff export of phase themes yet.

## Open questions for the owner

1. Scope: the site only (recommended for this version), or the site and the Atelier together?
2. One turn or two? A dial that repeats every 360° (recommended), or a spin-½ dial: after one full turn you
   get the light theme's warm twin, and only a second turn brings the original back, just as a spin-½
   particle needs 720°.
