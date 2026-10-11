"""Quantum circuits for Qontext measurement pools.

Mermin-Peres contexts: two data qubits plus one ancilla per observable (a Hadamard test), so every
value in a context is measured on its own and the product rules are tested, not assumed.

CHSH settings: a Bell pair measured along angles in the X-Z plane, matching the Studio's
Entangled module (a = 0, 90 degrees; b = 45, -45 degrees).
"""

from __future__ import annotations

import math
import random

from qiskit import ClassicalRegister, QuantumCircuit, QuantumRegister

# GRID[r][c] = (pauli on data qubit 0, pauli on data qubit 1). Mirrors src/engine/mermin.js.
GRID: tuple[tuple[tuple[str, str], ...], ...] = (
    (("X", "I"), ("I", "X"), ("X", "X")),
    (("I", "Z"), ("Z", "I"), ("Z", "Z")),
    (("X", "Z"), ("Z", "X"), ("Y", "Y")),
)

# Context id -> (cells, required product). Column 3 multiplies to -1, the rest to +1.
CONTEXTS: dict[str, tuple[tuple[tuple[int, int], ...], int]] = {
    "R1": (((0, 0), (0, 1), (0, 2)), +1),
    "R2": (((1, 0), (1, 1), (1, 2)), +1),
    "R3": (((2, 0), (2, 1), (2, 2)), +1),
    "C1": (((0, 0), (1, 0), (2, 0)), +1),
    "C2": (((0, 1), (1, 1), (2, 1)), +1),
    "C3": (((0, 2), (1, 2), (2, 2)), -1),
}

CHSH_ANGLES = {"a": (0.0, 90.0), "b": (45.0, -45.0)}
SETTING_KEYS = ("a0b0", "a0b1", "a1b0", "a1b1")


def prepare_state(qc: QuantumCircuit, data, seed: int) -> None:
    """Seeded entangled two-qubit state. The Mermin-Peres rules hold for any state."""
    rng = random.Random(seed)
    angles = [rng.uniform(0, 2 * math.pi) for _ in range(12)]
    qc.u(*angles[0:3], data[0])
    qc.u(*angles[3:6], data[1])
    qc.cx(data[0], data[1])
    qc.u(*angles[6:9], data[0])
    qc.u(*angles[9:12], data[1])


def _controlled_pauli(qc: QuantumCircuit, pauli: str, control, target) -> None:
    if pauli == "X":
        qc.cx(control, target)
    elif pauli == "Y":
        qc.cy(control, target)
    elif pauli == "Z":
        qc.cz(control, target)
    elif pauli != "I":
        raise ValueError(f"Unknown Pauli {pauli!r}")


def context_circuit(ctx_id: str, seed: int) -> QuantumCircuit:
    """Measures the three observables of one context, each with its own ancilla."""
    if ctx_id not in CONTEXTS:
        raise ValueError(f"Unknown context {ctx_id!r}")
    cells, _ = CONTEXTS[ctx_id]
    data = QuantumRegister(2, "d")
    anc = QuantumRegister(3, "a")
    creg = ClassicalRegister(3, "c")
    qc = QuantumCircuit(data, anc, creg, name=f"qontext_{ctx_id}")
    prepare_state(qc, data, seed)
    qc.barrier()
    for k, (r, c) in enumerate(cells):
        p1, p2 = GRID[r][c]
        qc.h(anc[k])
        _controlled_pauli(qc, p1, anc[k], data[0])
        _controlled_pauli(qc, p2, anc[k], data[1])
        qc.h(anc[k])
        qc.measure(anc[k], creg[k])
    return qc


def chsh_circuit(key: str) -> QuantumCircuit:
    """Bell pair measured along the CHSH angles for setting `key` (e.g. 'a0b1')."""
    if key not in SETTING_KEYS:
        raise ValueError(f"Unknown CHSH setting {key!r}")
    x, y = int(key[1]), int(key[3])
    q = QuantumRegister(2, "q")
    creg = ClassicalRegister(2, "c")
    qc = QuantumCircuit(q, creg, name=f"qontext_chsh_{key}")
    qc.h(q[0])
    qc.cx(q[0], q[1])
    # Measuring cos(t) Z + sin(t) X equals rotating by Ry(-t) and measuring Z.
    qc.ry(-math.radians(CHSH_ANGLES["a"][x]), q[0])
    qc.ry(-math.radians(CHSH_ANGLES["b"][y]), q[1])
    qc.measure(q[0], creg[0])
    qc.measure(q[1], creg[1])
    return qc


def bits_to_values(bitstring: str, n: int) -> list[int]:
    """Qiskit bitstrings put classical bit 0 on the right. Bit 0 means eigenvalue +1."""
    if len(bitstring) < n or any(ch not in "01" for ch in bitstring):
        raise ValueError(f"Bad bitstring {bitstring!r}")
    return [1 if bitstring[-1 - k] == "0" else -1 for k in range(n)]
