// Palette extraction: deterministic k-means in OKLab.

import { decode, labToLch, linToOklab } from './color.js';

/** RGBA byte array (canvas ImageData.data) to OKLab points, skipping transparent pixels. */
export function rgbaToOklab(data) {
  const px = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    px.push(linToOklab([decode(data[i] / 255), decode(data[i + 1] / 255), decode(data[i + 2] / 255)]));
  }
  return px;
}

/**
 * k-means with lightness-sorted initialization (deterministic). Returns clusters sorted by size:
 * [{ L, C, h, share, lab }], plus `dominant`: the cluster with the largest size x chroma.
 */
export function kmeansOklab(points, k = 5, iterations = 12) {
  if (!points.length) return { clusters: [], dominant: null };
  const px = points.slice().sort((a, b) => a[0] - b[0]);
  k = Math.min(k, px.length);
  let centers = [];
  for (let i = 0; i < k; i++) centers.push(px[Math.floor(((i + 0.5) * px.length) / k)].slice());
  const assign = new Int32Array(px.length);
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < px.length; i++) {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (px[i][0] - centers[c][0]) ** 2 + (px[i][1] - centers[c][1]) ** 2 + (px[i][2] - centers[c][2]) ** 2;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      assign[i] = best;
    }
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < px.length; i++) {
      const s = sums[assign[i]];
      s[0] += px[i][0];
      s[1] += px[i][1];
      s[2] += px[i][2];
      s[3]++;
    }
    centers = sums.map((s, c) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[c]));
  }
  const counts = new Array(k).fill(0);
  for (const a of assign) counts[a]++;
  const clusters = centers
    .map((lab, c) => ({ ...labToLch(lab), lab, share: counts[c] / px.length }))
    .sort((a, b) => b.share - a.share);
  const dominant = clusters.reduce((best, c) => (c.share * (c.C + 0.01) > best.share * (best.C + 0.01) ? c : best), clusters[0]);
  return { clusters, dominant };
}
