// Color vision deficiency simulation, Machado, Oliveira and Fernandes (2009), severity 1.0.
// Matrices operate on linear sRGB. The same values drive the SVG filters in the Studio.

export const CVD_MATRICES = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export function simulateCvd(lin, type) {
  const M = CVD_MATRICES[type];
  if (!M) return lin.slice();
  return M.map((row) => Math.min(1, Math.max(0, row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])));
}

/** feColorMatrix "values" string for an SVG filter. */
export function cvdFilterValues(type) {
  const M = CVD_MATRICES[type];
  return M.map((r) => `${r[0]} ${r[1]} ${r[2]} 0 0`).join('  ') + '  0 0 0 1 0';
}
