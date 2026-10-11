---
name: reference-surfaces
description: Where Qontext lives outside this repo (live page, product doc, skill, Figma, tooling notes)
type: reference
---

- Live site (private Claude artifact, the owner shares it): https://claude.ai/artifact/Wp4SYJZ2ymd1NDXUpgqHzA
  It holds index.html (from dist/artifact.html), studio.html, media/qontext-film.mp4 and the poster.
- Product doc (Claude Docs): project cc016557-89a4-47b3-91d1-0f98e0445930.
- Build, test and publish steps: the qontext-builder skill in the owner's account, and README.md.
- Figma: connected through the Figma plugin, account handle QubitMan, Starter team with a View seat, which
  may block writing to files.
- GitHub: public repo https://github.com/QubitMan-hub/Qontext (remote `origin`, branch `main`). The site's
  Take it home index links into it, so keep those paths (src/runtime, figma-plugin, python) valid.
- Axe: the free axe-core checker runs in the browser tests; Deque's hosted Axe service is not connected.
