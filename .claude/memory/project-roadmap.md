---
name: project-roadmap
description: Where Qontext stands and what the owner has approved next
type: project
---

Released: 1.0.0 (engine, Studio, runtime, Figma plugin, hardware runner), 1.1.0 (website, film, naming, the
Atelier), 1.2.0 (speed rebuild, Wall Wash, Compass, Thresholds, Content Security Policy).

Approved on 2026-10-12, in this order:
1. Project memory (this folder).
2. Accessibility pass: axe-core in the browser tests for the site and the Atelier, every violation fixed.
3. Security and lean audit: Ponytail audit plus a security review; fix only findings with a concrete case.
4. Phase dial: light and dark become two points on a 360 degree dial; every angle is a real interference blend
   (Fringe maths) and Bouncer proves text contrast at all 360 angles. Needs a written spec approved first.
5. The film rebuilt in Remotion, after the Phase dial ships. Needs a written spec approved first. It gets an
   ElevenLabs voice-over (the owner connected ElevenLabs): the script is shown before any audio is generated,
   because generation spends the owner's credits.

Shipped on 2026-10-12: items 1 to 5, plus an Impeccable gallery pass on the site (rooms hung as walls,
Literata for reading). The Phase Dial is site only, one 360 degree turn (the owner turned down a spin-1/2
dial). The film: Alex voice, about 2.5 minutes, everyday slang, animation plus real clips; the owner picked
and uploaded the take. Changing the script means a new paid take, so ask before regenerating.

Launch (owner's ask, 2026-10-12): the website checklist, minus cookies and analytics, which the owner does
not want. Hosting: the owner connected the repo to Cloudflare as a Worker with static assets (free plan),
deployed from `main`; `wrangler.jsonc` and `homepage` in package.json must agree with that Worker. The
sandbox cannot change Cloudflare or GitHub settings, so those go to the owner. Skipped on purpose: terms page (the license covers it),
thank-you page and form states (no forms), sticky phone CTA (the bar already holds Open the Atelier).

**Why:** the owner picked these from a list after installing new plugins (frontend-design, security guidance,
Remotion, Playwright, memory, Ponytail, Superpowers, Context7, Axe), then asked for the voice-over and the
Impeccable pass.

**How to apply:** pick up the first unfinished item; keep this file current when items ship or change.
