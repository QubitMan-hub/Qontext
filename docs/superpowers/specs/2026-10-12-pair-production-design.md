# Pair Production: design

Status: draft for the owner's review, 2026-10-12. Nothing is built until this is approved.

## What it is

A new section of the website that walks through a real job from start to finish: a custom sneaker artist
designs a pair for a drop, and the visitor does it with them, ending with a pair they painted themselves in
their own world's colors.

The idea maps onto contextuality with nothing forced. A pair of shoes is two contexts. The left shoe reads the
grid by its rows, the right shoe reads it by its columns, and the nine panels of a sneaker are the nine tiles.
So a panel can be one true color on the left foot and another on the right. And the maths says the pair has
to differ somewhere: no single paint job, the same on both feet, can follow all six rules (Mermin's Dare, 5 of
6 at best). Mismatched pairs are already a thing in sneaker culture; this is the first one with a proof.

Name: Pair Production (in physics, light turning into a pair of particles). Plain descriptor wherever the name
appears: "a sneaker drop, start to finish". Nav label: Showcase.

Owner's choices: the sneaker drop, told as a scroll story.

## Where it goes

Right after The idea and before the floor plan, so it is the second thing a visitor scrolls into, while the
idea is still fresh. The rooms that follow then explain how each step works. The menu gets "Pair Production,
a sneaker drop, start to finish", and the footer nav gets Showcase.

## The pair

A side view of a low-top sneaker, drawn as an SVG with nine closed panels, in three bands and three zones:

| | Toe zone | Mid zone | Heel zone |
|---|---|---|---|
| Top band | Tongue | Laces | Collar |
| Body band | Toe box | Stripe (carries the logo) | Heel counter |
| Sole band | Toe bumper | Midsole | Outsole |

Panel (band r, zone c) is tile (r, c). The left shoe is drawn mirrored, so the pair stands toes out, like a
product shot. Left panel color is `tileColor(palette, r, c, rowValue(out, r, c))`, right is the same with
`colValue`. Both come from the engine; the site adds no color maths of its own. The logo is an invented mark
(the split tile and the word Qontext), nothing that looks like a real brand.

Unpainted panels are split on the diagonal into their two possible colors, as everywhere on the site. Painted
panels are flat.

## The six steps

The pair stays pinned on one side (position: sticky, no scroll script) while the steps scroll past on the
other. On a phone the pair sits at the top, about 40 percent of the screen, and the steps scroll under it.
Each step becomes active when it is in the middle of the screen (IntersectionObserver) and changes the pair.

1. **Roll your world.** The pair takes the visitor's world, the same one as the rest of the site. A button
   rolls a new world (Many Worlds, so the whole site changes with it, which is the point).
2. **Tune the harmony.** A small Unity Wheel dial turns the base hue and picks 3, 4 or 5 colors. This stays
   local to the showcase; the rest of the site keeps its world.
3. **Bouncer checks the logo.** The logo sits on the stripe, which can take two colors. Bouncer picks the ink
   that reads on both and shows the lower of the two contrast ratios. If neither ink reaches 4.5 : 1, a Fix
   button moves the lightness until one does (the engine's `fixLightness`), and the pair updates.
4. **Paint the pair.** The visitor taps panels (or uses Tab and Enter) and each one is measured: it collapses
   to its row color on the left foot and its column color on the right. A Paint the rest button does the
   others. Under the pair, six small checks show the rules holding: on the left shoe each band has an even
   number of flipped panels; on the right shoe each zone does too, except the heel zone, which has an odd
   number. A Try to match button repaints the right shoe to copy the left; one check turns red and the line
   reads "5 of 6 at best. The pair has to differ." Painting again restores it.
5. **The drop.** A wall of twelve pairs from twelve other worlds (picked from your world number, so the wall
   stays the same until you roll again), each one different and each one following
   all six rules. Choosing one makes it your world.
6. **The tag.** A hang tag for the pair: world number, 6 of 6 rules, which panels differ between the feet, and
   a SHA-256 fingerprint of the design's Wavefunction, labelled honestly as simulated in this browser. Two
   actions: Open this pair in the Atelier (a Wavefunction link with the tuned palette), and Download the
   paint sheet: an SVG of both shoes with every panel's name and color for each foot, in hex and OKLCH, so
   an artist can mix paint from it.

## Look

The loudest moment on the site after the hero, still in the gallery's language. The section is a full-bleed
deep indigo band that stays deep in every theme, like a darkened room in the gallery, so the pair glows; text stays in the site's voice (Anybody for
names and step numbers, Literata for reading). Big wide step numbers, a thin progress rail, the pair large,
with a soft floor shadow. Collapses use the site's existing settle (no bounce). Under reduced motion nothing
animates and every step still works. Bouncer keeps every text and logo readable on the band, in light, dark
and every Phase Dial angle.

## How it is built

- `src/site/features/pair.js`: the section. It sleeps until the visitor is near (`whenNear`), builds the SVG
  once from text nodes (`svg()` from lib.js), and after that only changes `fill` attributes. It listens for
  world changes (`onWorld`).
- `src/site/pair-shape.js`: the nine panel paths, their names and their tile positions. Data only.
- `src/site/index.html` and `site.css`: the section, the sticky layout, the menu and nav links.
- Engine: nothing new. It uses `collapse`, `tileColor`, `rowValue`, `colValue`, `contextualTiles`,
  `classicalCheck`, `inkFor`, `legibleOn`, `fixLightness` and `encodeProject`.
- The paint sheet SVG is built from text nodes and offered as a Blob download, like the framed poster.
  Names and colors are escaped with the engine's `xmlEscape`.

## Tests

- Unit: the panel table covers each of the nine tiles exactly once, and a matching pair (any fixed paint
  job) passes at most 5 of the 6 band and zone checks (this reuses the existing 512-assignment search).
- Browser (`tests/e2e/test_site.py`): rolling changes the world number and the pair; the harmony dial changes
  the pair but not the rest of the site; the logo ink reads at 4.5 : 1 on both stripe colors; tapping and
  keyboard painting collapse panels; after painting, the panels that differ between the feet are exactly the
  contextual tiles; Try to match shows 5 of 6; the drop shows twelve pairs with different world numbers and
  choosing one switches the world; the tag shows a 64-character fingerprint and the Atelier link opens the
  same design; the paint sheet download is an SVG with 18 colors.
- The axe scans already walk the whole page in light and dark on a phone and a desktop; they will include
  the section. No horizontal overflow at 390 px. The performance budget still holds.
- Screenshots at 1440x900 and 390x844, light and dark, of every step.

## Not in this

The film stays as it is (it can get a Pair Production scene later). No real brand names or shapes. No
cookies, no analytics, nothing sent anywhere. No 3D.
