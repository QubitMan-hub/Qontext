"""
Qontext hardware runner.

Measures all six contexts of the Mermin-Peres square on two data qubits.
Each observable gets its own ancilla (a Hadamard test), so every value in a
context is measured separately and the product rules are tested, not assumed.
Writes a measurement pool JSON that Qontext Studio loads in its Hardware tab.

Usage:
  python qontext_hardware.py                      # ideal local simulator
  python qontext_hardware.py --noisy              # local simulator with a noise model
  python qontext_hardware.py --ibm least_busy     # least busy IBM Quantum device
  python qontext_hardware.py --ibm ibm_brisbane   # a named IBM Quantum device

IBM runs need:  pip install qiskit-ibm-runtime
and a saved account (once):
  from qiskit_ibm_runtime import QiskitRuntimeService
  QiskitRuntimeService.save_account(channel="ibm_quantum_platform", token="YOUR_TOKEN")
"""

import argparse
import json
import math
import random
from datetime import datetime, timezone

from qiskit import ClassicalRegister, QuantumCircuit, QuantumRegister
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

# Grid of two-qubit Pauli observables. Entry [p1, p2]: p1 acts on data qubit 0, p2 on data qubit 1.
GRID = [
    [["X", "I"], ["I", "X"], ["X", "X"]],
    [["I", "Z"], ["Z", "I"], ["Z", "Z"]],
    [["X", "Z"], ["Z", "X"], ["Y", "Y"]],
]

# Context id -> (cells, required product). Column 3 multiplies to -1, everything else to +1.
CONTEXTS = {
    "R1": ([(0, 0), (0, 1), (0, 2)], +1),
    "R2": ([(1, 0), (1, 1), (1, 2)], +1),
    "R3": ([(2, 0), (2, 1), (2, 2)], +1),
    "C1": ([(0, 0), (1, 0), (2, 0)], +1),
    "C2": ([(0, 1), (1, 1), (2, 1)], +1),
    "C3": ([(0, 2), (1, 2), (2, 2)], -1),
}


def prepare_state(qc, data, seed):
    """Seeded entangled two-qubit state. The rules hold for any state."""
    rng = random.Random(seed)
    angles = [rng.uniform(0, 2 * math.pi) for _ in range(12)]
    qc.u(*angles[0:3], data[0])
    qc.u(*angles[3:6], data[1])
    qc.cx(data[0], data[1])
    qc.u(*angles[6:9], data[0])
    qc.u(*angles[9:12], data[1])


def controlled_pauli(qc, pauli, control, target):
    if pauli == "X":
        qc.cx(control, target)
    elif pauli == "Y":
        qc.cy(control, target)
    elif pauli == "Z":
        qc.cz(control, target)


def context_circuit(ctx_id, seed):
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
        controlled_pauli(qc, p1, anc[k], data[0])
        controlled_pauli(qc, p2, anc[k], data[1])
        qc.h(anc[k])
        qc.measure(anc[k], creg[k])
    return qc


def bits_to_values(bitstring):
    """Qiskit bitstrings put classical bit 0 on the right. Bit 0 means eigenvalue +1."""
    return [1 if bitstring[-1 - k] == "0" else -1 for k in range(3)]


def noise_model():
    from qiskit_aer.noise import NoiseModel, ReadoutError, depolarizing_error

    nm = NoiseModel()
    nm.add_all_qubit_quantum_error(depolarizing_error(0.002, 1), ["u", "h", "sx", "x", "rz"])
    nm.add_all_qubit_quantum_error(depolarizing_error(0.02, 2), ["cx", "cy", "cz", "ecr"])
    nm.add_all_qubit_readout_error(ReadoutError([[0.98, 0.02], [0.02, 0.98]]))
    return nm


def get_sampler(args):
    """Returns (sampler, backend, backend_label, simulated)."""
    if args.ibm:
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

        service = QiskitRuntimeService()
        if args.ibm == "least_busy":
            backend = service.least_busy(operational=True, simulator=False, min_num_qubits=5)
        else:
            backend = service.backend(args.ibm)
        return SamplerV2(mode=backend), backend, backend.name, False

    from qiskit.primitives import BackendSamplerV2
    from qiskit_aer import AerSimulator

    backend = AerSimulator(noise_model=noise_model()) if args.noisy else AerSimulator()
    label = "aer simulator (noisy)" if args.noisy else "aer simulator (ideal)"
    return BackendSamplerV2(backend=backend), backend, label, True


def mermin_score(contexts):
    total = 0.0
    for ctx_id, (_, sign) in CONTEXTS.items():
        shots = contexts[ctx_id]
        total += sum(sign * a * b * c for a, b, c in shots) / len(shots)
    return total


def main():
    ap = argparse.ArgumentParser(description="Measure the Mermin-Peres contexts for Qontext Studio.")
    ap.add_argument("--ibm", metavar="BACKEND", help="IBM Quantum backend name, or least_busy")
    ap.add_argument("--noisy", action="store_true", help="local simulator with a noise model")
    ap.add_argument("--shots", type=int, default=512)
    ap.add_argument("--seed", type=int, default=7, help="state seed")
    ap.add_argument("--out", default="qontext_pool.json")
    args = ap.parse_args()

    circuits = [context_circuit(cid, args.seed) for cid in CONTEXTS]
    sampler, backend, label, simulated = get_sampler(args)
    pm = generate_preset_pass_manager(optimization_level=1, backend=backend)
    isa = [pm.run(qc) for qc in circuits]

    job = sampler.run(isa, shots=args.shots)
    result = job.result()
    job_id = job.job_id() if callable(getattr(job, "job_id", None)) else "local"

    contexts = {}
    for cid, pub in zip(CONTEXTS, result):
        contexts[cid] = [bits_to_values(b) for b in pub.data.c.get_bitstrings()]

    pool = {
        "format": "qontext-pool/1",
        "backend": label,
        "simulated": simulated,
        "job_ids": [job_id],
        "created": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "shots": args.shots,
        "state_seed": args.seed,
        "contexts": contexts,
    }
    with open(args.out, "w") as f:
        json.dump(pool, f, separators=(",", ":"))

    score = mermin_score(contexts)
    print(f"Backend: {label}   job: {job_id}")
    for cid, (_, sign) in CONTEXTS.items():
        shots = contexts[cid]
        held = sum(1 for a, b, c in shots if a * b * c == sign) / len(shots)
        print(f"  {cid}: rule held on {held:6.1%} of {len(shots)} shots")
    print(f"Mermin score {score:.3f}  (classical max 4, quantum ideal 6)")
    print(f"Pool written to {args.out}. Load it in Qontext Studio > Hardware.")


if __name__ == "__main__":
    main()
