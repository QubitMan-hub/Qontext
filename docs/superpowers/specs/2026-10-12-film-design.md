# The Qontext film: design

Status: draft for the owner's review, 2026-10-12. No audio is generated and nothing is built until the owner
approves this spec and the script in it.

## What it is

A film of about two and a half minutes that explains every Qontext product so that anyone gets it on the
first watch. It uses plain words and easy everyday slang, the way you'd explain it to a friend. An
ElevenLabs voice narrates it, and captions are burned in so it also works with the sound off. It replaces
the one-minute screen recording in the site's Film section.

Decided with the owner:

- Voice: Alex (ElevenLabs, "Clear, Friendly Conversational", voice id `SHJeg1jtED7EW6Zr6rHc`).
- Length: about 2.5 minutes.
- Slang: easy everyday ("Okay, here's the deal", "sounds fake, right?"). No internet slang that dates.
- Visuals: animated scenes drawn by the real engine, plus short clips of the real site and Atelier.

## The script

Rules for the script:
- Short sentences.
- No maths symbols, no code names read aloud, no hedging, and a concrete example for every claim.
- Numbers are written as words, so the voice and the captions say the same thing.

About 450 words (2,450 characters), which comes to about 2 minutes 45 seconds at a relaxed explainer pace.
If the chosen take runs long, the Rooms and Atelier lines are the first to trim. Each scene says what we see.

**1. Hook** (we see one big square, split corner to corner into two colors, slowly breathing)
> Okay, quick question. Can one square be two colors at the same time? Not a trick of the light. Actually two colors, and both of them true. Sounds fake, right? Stick with me.

**2. The idea** (Albers' two identical squares on different grounds, then a 3 by 3 grid where one tile
changes color as the highlight moves from its row to its column)
> Back in the sixties, the artist Josef Albers showed that a color can look different depending on what's next to it. But that's just your eyes. Qontext goes way further. In quantum physics, some things don't have one fixed answer. What you get depends on how you check. So here, a tile really is one color when you read it along its row, and a different color when you read it down its column.

**3. Mermin's Dare** (a board of nine tiles flipping between plus and minus. The score keeps landing on five
of six. A counter runs up to five hundred and twelve tries. Then the quantum version snaps to six of six.)
> Don't buy it? Try Mermin's Dare. Nine tiles, six rules. Give every tile a plus or a minus and make all six rules happy. You'll get five. Everyone gets five. A computer tried all five hundred and twelve ways. Quantum gets six, every single time.

**4. Your own world** (a real clip: the site opening, the Many Worlds wipe, the world number changing, and
unseen tiles shimmering until they're scrolled into view)
> That's what the Qontext website runs on. The second you open it, it rolls the dice and picks colors just for you. That's your world. Your friend gets a different one. And colors you haven't scrolled to yet aren't decided. They settle the moment you look.

**5. The rooms** (quick cuts of each room, drawn by the engine: the Unity Wheel turning, the Fringe band
sliding, the Pentacle star, the light and dark Spooky Pair halves changing together, an Unpaintables
shape with its broken set glowing)
> Each room shows off a different trick. Unity Wheel turns quantum math into perfect color combos. Fringe mixes colors like waves of light. Pentacle gives you five colors that never clash. Spooky Pair links a light design and a dark one, so they react together. And Unpaintables shows shapes you literally can't color by the rules.

**6. Phase Dial** (a small page drawn by the engine turns all the way round the dial: light, teal dusk,
dark, plum dusk, with the Moon icon waning and waxing)
> Oh, and light mode versus dark mode? Tap the moon. You get a whole dial: light, dark, and every kind of dusk in between. The text stays easy to read the whole way round.

**7. The Atelier** (a real clip of the Atelier: switching rooms, Bouncer turning a failing color into a pass,
the Handoff export, a Walk-By print preview)
> Want to make something? Open the Atelier, the studio. Play with every room, pick your colors, and save your design as one short code you can share. Bouncer works like a bouncer at a club: if your text is hard to read on any color, it's not getting in. Handoff sends your colors to code and design tools, and Walk-By makes prints that change color as you walk past.

**8. Observer and Superpose** (Observer's one line of setup typing itself, then three browser windows side
by side, each a different visitor's world. Then a plain sketch of a design tool's color list with a Row
column and a Column column.)
> Got a website? Drop in Observer. It's one tiny file, and every visitor gets their own world. No server, no tracking. Designer? Superpose puts the same grid in Figma, with a row version and a column version of every color.

**9. Probe and Notary** (Probe's session typing in a terminal, then the Notary seal stamping onto the results)
> Want the real deal? Probe runs it all on an actual IBM quantum computer. Then Notary checks the results and stamps them with a seal, so anyone can see exactly where your colors came from.

**10. Outro** (the hero field of tiles, the Qontext wordmark, "Open the Atelier")
> That's Qontext. Colors that depend on how you look at them. Open the Atelier and make your own world.

## Look and sound

- Same world as the site: indigo ink on cool gallery paper, Anybody for names, Literata for the few words
  on screen, every accent from a real collapse. Each scene uses its own fixed world seed, so a re-render
  looks the same.
- Motion follows the physics, as on the site: tiles snap when measured, never bounce, and split tiles
  shimmer while they're undecided.
- Captions sit low in the frame, one sentence at a time, in Anybody on a paper-colored band. They are the
  script's own sentences, so they never drift from the voice.
- 1920 by 1080, 30 frames a second, H.264 MP4, with a poster frame. No music: the restricted ElevenLabs
  connector can't make any, and the voice carries it.

## How it's built

- **Project:** a Remotion project in `film/`, with its own `package.json` so the site's dependencies stay
  lean. Versions are pinned exactly: Remotion 4.0.534, React 19.2.3. It imports `src/engine` directly. A
  spike confirmed this works here: Remotion renders with Playwright's headless Chromium, and a still was
  drawn by `phaseTheme` at 96°.
- **Scenes:** one React component per scene in `film/src/scenes/`, placed on the timeline by the timing file.
- **Clips:** `film/scripts/clips.py` records the real site and Atelier with the CDP screencast that today's
  film uses, with local fonts and fixed seeds. It writes the clips to `film/public/clips/`.
- **Voice:** the whole script is generated in one ElevenLabs run with the Alex voice and the `eleven_v4`
  model, with scenes separated by blank lines. The run gives four takes to choose from. Before generating,
  the credit cost is priced with `estimate_only` and shown to the owner.
  - This workspace can't download from ElevenLabs. The owner downloads the chosen take from the ElevenLabs
    canvas and attaches it to the chat. It becomes `film/public/voice.mp3`.
- **Timing:** `film/scripts/align.mjs` finds the pauses in the voice with ffmpeg's silence detection and
  matches them to the script's sentences. That gives the start of every sentence and scene, saved in
  `film/src/timing.json`. If the pause count doesn't match the sentence count, it times each sentence by
  its share of the scene's length instead and says so.
- **Output:** `npm run film` at the root records the clips, aligns the voice and renders. It writes
  `dist/media/qontext-film.mp4`, the poster, and `src/site/film-chapters.json` (ten chapters, one per
  scene). Then `npm run build`.
- **Site:** the Film section keeps its player and chapter list. The chapter list now has ten entries.

## Tests

- `align.mjs`:
  - Given a made-up list of pauses, every sentence gets a start time in order.
  - The fallback covers a missing or extra pause.
  - Unit tests run with `node --test`.
- The captions are exactly the script's sentences, in order, and the script has no maths symbols, digits or
  em dashes.
- Render stills at the middle of every scene, at 1920 by 1080, and check them on a contact sheet for
  overflow, readability and caption placement.
- The site test for the Film section expects ten chapters. The browser and accessibility suites stay green.

## Licences and costs

- **Remotion** is free for individuals and companies of up to three people. Larger companies need a
  company licence.
- **ElevenLabs:** commercial use of generated audio depends on the owner's plan. Free plans require
  attribution and are non-commercial.
- Voice generation spends the owner's credits. A run is never repeated just to retry. The priced estimate
  for this script, with the Alex voice on `eleven_v4`, is 9,808 credits for four takes (about 2,450
  credits a take). ElevenLabs shows that as about 0.98 USD. Nothing has been generated yet.
  The estimate is on ElevenLabs flow `RCJE0TqqvDjsRmen5GFc`, which the real run will reuse.

## Not in this version

- Music, other languages, and a vertical cut for social media.
- A captions track separate from the burned-in captions.
