# Object Lab (work in progress)

Object Lab extends **Janus** rather than changing Qontext's existing gallery, navigation, typography or color system.

## Use it

1. Open Atelier → Janus and scroll to Object Lab.
2. Choose a local image (PNG, JPEG, WebP, GIF; up to 12 MB).
3. Choose a palette preset, then toggle the nine rectangular image regions to color.
4. Compare **Qontext** (different row and column outcomes) with **Ordinary design** (the same fixed row outcomes in both views).
5. Change overlay strength, measure another world and export PNGs.

The browser draws the image and overlays on two canvases. No image upload, server or paid API is required. All measurements come from the existing shared engine.

## Scope and limits

- This first version is a **3×3 region overlay**, not a segmentation or object-boundary detection tool. The colors tint rectangular parts of a photo and may not follow the outline of a shoe or garment.
- The fixed baseline is a transparent visual comparison. It does not establish quantum computational advantage or a user-preference benefit.
- Color presets change only the palette; the measurement outputs and mathematical rules remain intact.
- Image bytes are intentionally **not** included in Wavefunction codes. Those codes continue to reproduce the underlying Qontext design, not an uploaded image.
- Overlay PNGs are previews. Bouncer's existing token contrast checks do not certify the final composited photo.

## Verification before merge

Run `npm ci && npm run check`, then `npm run test:e2e` with browser dependencies installed. Visually check light/dark mode, mobile widths, keyboard navigation, upload errors, image aspect ratios, downloads, and the existing nine Atelier rooms. Rebuild committed `dist/` only after review. This branch is intentionally not deployed.

## Next work

Add actual user-selected polygon/brush masks or local object segmentation, followed by full object-aware recoloring and robust undo/redo. Expand the classical comparison into a controlled user study rather than claiming superiority from visuals alone.
