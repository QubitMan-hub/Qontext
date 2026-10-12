"""Runs Qontext circuits on a local simulator or IBM Quantum and returns a validated pool."""

from __future__ import annotations

from dataclasses import dataclass

from qiskit.transpiler import generate_preset_pass_manager

from .circuits import CONTEXTS, SETTING_KEYS, bits_to_values, chsh_circuit, context_circuit
from .pool import build_pool


class RunnerError(RuntimeError):
    """A backend could not be reached or configured. The message says how to fix it."""


@dataclass
class Target:
    sampler: object
    backend: object
    label: str
    simulated: bool


def noise_model():
    from qiskit_aer.noise import NoiseModel, ReadoutError, depolarizing_error

    nm = NoiseModel()
    nm.add_all_qubit_quantum_error(depolarizing_error(0.002, 1), ["u", "h", "sx", "x", "rz", "ry"])
    nm.add_all_qubit_quantum_error(depolarizing_error(0.02, 2), ["cx", "cy", "cz", "ecr"])
    nm.add_all_qubit_readout_error(ReadoutError([[0.98, 0.02], [0.02, 0.98]]))
    return nm


def local_target(noisy: bool = False) -> Target:
    from qiskit.primitives import BackendSamplerV2
    from qiskit_aer import AerSimulator

    backend = AerSimulator(noise_model=noise_model()) if noisy else AerSimulator()
    label = "aer simulator (noisy)" if noisy else "aer simulator (ideal)"
    return Target(BackendSamplerV2(backend=backend), backend, label, True)


def ibm_target(name: str) -> Target:
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
    except ImportError as e:
        raise RunnerError("IBM runs need qiskit-ibm-runtime: pip install 'qontext-hw[ibm]'") from e
    try:
        service = QiskitRuntimeService()
    except Exception as e:  # noqa: BLE001 - surface the runtime's own reason
        raise RunnerError(
            "No IBM Quantum account found. Save one with QiskitRuntimeService.save_account("
            'channel="ibm_quantum_platform", token="YOUR_TOKEN"). ' + str(e)
        ) from e
    if name == "least_busy":
        backend = service.least_busy(operational=True, simulator=False, min_num_qubits=5)
    else:
        backend = service.backend(name)
    return Target(SamplerV2(mode=backend), backend, backend.name, False)


def pass_manager(backend):
    """Transpiles for `backend`, choosing qubits by their noise.

    Level 2 runs a noise-aware layout search for every circuit. Level 1 takes qubits 0 and 1 for a two-qubit
    circuit whenever they fit, without looking at them: on ibm_kingston qubit 1 misreads 17% of shots, which
    halved every CHSH correlation in the first hardware runs. Level 3 can trade a quiet qubit for fewer gates.
    """
    return generate_preset_pass_manager(optimization_level=2, backend=backend, seed_transpiler=7)


def build_circuits(seed: int, include_chsh: bool = True):
    circuits = [context_circuit(cid, seed) for cid in CONTEXTS]
    if include_chsh:
        circuits += [chsh_circuit(key) for key in SETTING_KEYS]
    return circuits


def transpile_report(target: Target, seed: int, include_chsh: bool = True) -> list[dict]:
    pm = pass_manager(target.backend)
    rows = []
    for qc in build_circuits(seed, include_chsh):
        isa = pm.run(qc)
        ops = isa.count_ops()
        two_q = sum(v for k, v in ops.items() if k in ("cx", "cz", "ecr", "cy", "rzz", "swap"))
        rows.append({"name": qc.name, "depth": isa.depth(), "two_qubit_gates": two_q})
    return rows


def run(target: Target, *, shots: int = 512, seed: int = 7, include_chsh: bool = True) -> dict:
    if shots < 1 or shots > 100_000:
        raise RunnerError("shots must be between 1 and 100000")
    circuits = build_circuits(seed, include_chsh)
    pm = pass_manager(target.backend)
    isa = [pm.run(qc) for qc in circuits]
    job = target.sampler.run(isa, shots=shots)
    result = job.result()
    job_id = job.job_id() if callable(getattr(job, "job_id", None)) else "local"

    pubs = list(result)
    if len(pubs) != len(circuits):
        raise RunnerError(f"Expected {len(circuits)} results, got {len(pubs)}")

    def values_of(pub, width):
        return [bits_to_values(b, width) for b in pub.data.c.get_bitstrings()]

    contexts = {cid: values_of(pub, 3) for cid, pub in zip(CONTEXTS, pubs[: len(CONTEXTS)], strict=True)}
    chsh = None
    if include_chsh:
        chsh = {key: values_of(pub, 2) for key, pub in zip(SETTING_KEYS, pubs[len(CONTEXTS) :], strict=True)}
    return build_pool(
        backend=target.label,
        simulated=target.simulated,
        job_ids=[str(job_id)],
        shots=shots,
        seed=seed,
        contexts=contexts,
        chsh=chsh,
    )
