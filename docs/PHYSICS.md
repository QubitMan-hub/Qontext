# The physics behind Qontext

Every claim the Studio makes is computed, and every classical limit is proven by exhaustive search in
the test suite (`tests/engine/`). This page lists what is computed and where.

## Hue as phase

A d-level quantum system has operators whose eigenvalues are the d-th roots of unity, evenly spaced
on a circle. Placed on the hue wheel (in OKLCH, a perceptual color space) they give the classic
harmonies: d = 2 complementary, 3 triadic, 4 tetradic, 5 pentadic, up to 8.
Code: `src/engine/harmony.js`.

## Mermin-Peres square (Context Grid)

Nine two-qubit Pauli observables:

|  | C1 | C2 | C3 |
| --- | --- | --- | --- |
| R1 | X1 | X2 | X1 X2 |
| R2 | Z2 | Z1 | Z1 Z2 |
| R3 | X1 Z2 | Z1 X2 | Y1 Y2 |

Observables in each row and column commute. Every row multiplies to +I, columns 1 and 2 to +I, and
column 3 to -I. The signs are derived from the matrices at load time, not hard-coded.

- Quantum: every measured context obeys its rule on every shot. Expected Mermin score = 6 for every state.
- Classical: exhaustive search over all 512 fixed assignments: at most 5 of 6 rules, score 4.

Sampling is exact: for a context with observables A, B and C = s·A·B, the probability of outcomes (a, b)
is ||(I + aA)/2 (I + bB)/2 ψ||², and c = s·a·b. Code: `src/engine/mermin.js`.

Tile color: outcome +1 shows the tile's harmony hue, -1 its complement (plus 180 degrees).

## KCBS pentagram

Five qutrit vectors with v_j orthogonal to v_(j+1). For the optimal state the summed probability is the
square root of 5 (2.236). Classical maximum, by search over all 32 deterministic assignments: 2.
Code: `src/engine/kcbs.js`.

## CHSH (Entangled)

Bell state, measurements cos(t) Z + sin(t) X with t = 0, 90 degrees (asset A) and 45, -45 degrees
(asset B). Correlation E = cos(t_a - t_b). S = E00 + E01 + E10 - E11 = 2√2 (2.828). Classical maximum,
by search over all 16 deterministic strategies: 2. Game win rate 1/2 + S/8: 85.4% against 75%.
Code: `src/engine/chsh.js`.

## Shape packs

| Set | Dimension | Directions | Complete bases | Orthogonal pairs | Classical coloring |
| --- | --- | --- | --- | --- | --- |
| Peres 33 (1991) | 3 | 33 | 16 | 72 | impossible |
| Cabello 18 (1996) | 4 | 18 | 9 | 63 | impossible (each vector in exactly 2 bases, 9 is odd) |
| Yu-Oh 13 (2012) | 3 | 13 | 4 | 24 | possible |

A Kochen-Specker coloring assigns 1 to exactly one vector in each basis and never 1 to two orthogonal
vectors. The search (`findKsColoring`) uses constraint propagation and is exhaustive.

Yu-Oh: with A_v = I - 2P_v, the expression Σ⟨A_v⟩ - (1/4) Σ over ordered orthogonal pairs ⟨A_u A_v⟩
equals 25/3 for every qutrit state, while the classical maximum over all 8,192 ±1 assignments is 8.
Code: `src/engine/shapes.js`.

## Interferometer (Mixer)

A color is the complex amplitude z = C·e^(ih) (OKLCH chroma and hue). Two inputs pass a 50:50 beam
splitter after a phase shift φ on input B: out1 = (zA + e^(iφ) zB)/√2, out2 = (zA - e^(iφ) zB)/√2.
|out1|² + |out2|² = |zA|² + |zB|² at every φ. Code: `src/engine/interferometer.js`.

## Hardware circuits

Each Mermin-Peres observable is measured with its own ancilla (H, controlled Paulis, H, measure), so
the three values of a context are measured independently and noise can break a rule. Typical noisy
simulation: Mermin score about 4.7, CHSH about 2.5, both beyond classical. Code: `python/qontext_hw/`.

## What is and is not a quantum advantage

These systems are small, so their statistics are computed exactly on a laptop. Qontext's value is a
design grammar that comes from quantum mathematics. Hardware adds three things a simulator cannot
honestly claim: physically random collapses, measured violations of classical limits, and a hardware
job record as provenance.
