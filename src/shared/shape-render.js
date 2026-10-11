// Draws Unpaintables shape packs. Shared by the Atelier and the site so a shape looks identical in both.

import { projectPoint } from '../engine/index.js';

/** Screen positions of both tips (+v and -v) of every direction. */
export function shapeTips(A, view, size) {
  const R = size * 0.36;
  const tips = [];
  A.vectors.forEach((v, i) => {
    for (const s of [1, -1]) {
      const p = projectPoint(v.map((x) => x * s), { yaw: view.yaw, pitch: view.pitch, w: view.w || 0, scale: R });
      tips.push({ i, s, x: size / 2 + p[0], y: size / 2 - p[1], z: p[2] / R });
    }
  });
  return tips;
}

/**
 * Renders a shape onto a 2D canvas context.
 * colors: { sets: [hex...], lit, unlit, broken, halo }. view: { yaw, pitch, w }.
 * `pulse` (0 to 1) makes broken sets glow.
 */
export function drawShape(ctx, A, attempt, { size, dpr = 1, view, colors, pulse = 0 }) {
  ctx.clearRect(0, 0, size, size);
  const tips = shapeTips(A, view, size);
  const tip = (i, s) => tips[2 * i + (s > 0 ? 0 : 1)];
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = colors.unlit;
  ctx.lineWidth = dpr;
  ctx.beginPath();
  for (let i = 0; i < A.n; i++) {
    const a = tip(i, 1);
    const b = tip(i, -1);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  const broken = new Set(attempt.broken);
  A.bases.forEach((basis, k) => {
    const isBroken = broken.has(k);
    ctx.strokeStyle = isBroken ? colors.broken : colors.sets[k % colors.sets.length];
    ctx.lineWidth = (isBroken ? 2.6 + 2 * pulse : 1.5) * dpr;
    ctx.setLineDash(isBroken ? [6 * dpr, 4 * dpr] : []);
    ctx.globalAlpha = isBroken ? 0.75 + 0.25 * pulse : 0.6;
    ctx.beginPath();
    for (let x = 0; x < basis.length; x++) {
      for (let y = x + 1; y < basis.length; y++) {
        const p = tip(basis[x], 1);
        const q = tip(basis[y], 1);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
      }
    }
    ctx.stroke();
  });
  ctx.setLineDash([]);
  for (const t of tips.slice().sort((a, b) => a.z - b.z)) {
    const on = attempt.coloring[t.i] === 1;
    ctx.globalAlpha = 0.4 + 0.6 * ((Math.max(-1, Math.min(1, t.z)) + 1) / 2);
    ctx.beginPath();
    ctx.arc(t.x, t.y, (on ? 6 : 3.4) * dpr, 0, Math.PI * 2);
    ctx.fillStyle = on ? colors.lit : colors.unlit;
    ctx.fill();
    if (on) {
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = colors.halo;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** Standalone SVG of the current view (theme-independent colors). */
export function shapeSvg(A, attempt, view, colors, size = 600) {
  const tips = shapeTips(A, view, size);
  const broken = new Set(attempt.broken);
  const f = (n) => n.toFixed(1);
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    `  <title>Qontext Unpaintables: ${A.set.name}</title>`,
  ];
  for (let i = 0; i < A.n; i++) {
    const a = tips[2 * i];
    const b = tips[2 * i + 1];
    out.push(`  <line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(b.x)}" y2="${f(b.y)}" stroke="#8a899b" stroke-opacity="0.3"/>`);
  }
  A.bases.forEach((basis, k) => {
    const isBroken = broken.has(k);
    const color = isBroken ? '#b3261e' : colors.sets[k % colors.sets.length];
    for (let x = 0; x < basis.length; x++) {
      for (let y = x + 1; y < basis.length; y++) {
        const p = tips[2 * basis[x]];
        const q = tips[2 * basis[y]];
        out.push(`  <line x1="${f(p.x)}" y1="${f(p.y)}" x2="${f(q.x)}" y2="${f(q.y)}" stroke="${color}" stroke-width="${isBroken ? 3 : 1.6}"${isBroken ? ' stroke-dasharray="7 5"' : ''}/>`);
      }
    }
  });
  for (const t of tips) {
    const on = attempt.coloring[t.i] === 1;
    out.push(`  <circle cx="${f(t.x)}" cy="${f(t.y)}" r="${on ? 7 : 4}" fill="${on ? colors.lit : '#8a899b'}"/>`);
  }
  out.push('</svg>');
  return out.join('\n') + '\n';
}
