import json
import math
import pathlib

import pytest

from qontext_hw import (
    CONTEXTS,
    SETTING_KEYS,
    PoolError,
    bits_to_values,
    chsh_circuit,
    chsh_value,
    context_circuit,
    mermin_score,
    validate_pool,
)
from qontext_hw.cli import main
from qontext_hw.runner import local_target, run, transpile_report

ROOT = pathlib.Path(__file__).resolve().parents[2]


def test_bits_to_values_reads_little_endian():
    assert bits_to_values("001", 3) == [-1, 1, 1]
    assert bits_to_values("100", 3) == [1, 1, -1]
    with pytest.raises(ValueError):
        bits_to_values("0x", 2)


def test_circuit_shapes():
    for cid in CONTEXTS:
        qc = context_circuit(cid, 7)
        assert qc.num_qubits == 5 and qc.num_clbits == 3
    for key in SETTING_KEYS:
        qc = chsh_circuit(key)
        assert qc.num_qubits == 2 and qc.num_clbits == 2
    with pytest.raises(ValueError):
        context_circuit("R9", 1)


def test_ideal_simulator_satisfies_every_rule_and_reaches_tsirelson():
    pool = run(local_target(noisy=False), shots=2000, seed=3)
    assert mermin_score(pool["contexts"]) == pytest.approx(6.0)
    assert chsh_value(pool["chsh"]) == pytest.approx(2 * math.sqrt(2), abs=0.12)
    assert pool["simulated"] is True


def test_noisy_simulator_is_still_beyond_classical():
    pool = run(local_target(noisy=True), shots=1000, seed=7)
    assert 4.0 < mermin_score(pool["contexts"]) < 6.0
    assert chsh_value(pool["chsh"]) > 2.0


def test_validation_messages():
    with pytest.raises(PoolError, match="contexts"):
        validate_pool({})
    good = {cid: [[1, 1, 1]] for cid in CONTEXTS}
    good["C3"] = [[1, 1, -1]]
    assert validate_pool({"contexts": good})
    bad = dict(good, R2=[[1, 0, 1]])
    with pytest.raises(PoolError, match="R2"):
        validate_pool({"contexts": bad})
    with pytest.raises(PoolError, match="a0b1"):
        validate_pool({"contexts": good, "chsh": {"a0b0": [[1, 1]]}})
    with pytest.raises(PoolError, match="Unsupported"):
        validate_pool({"format": "x/2", "contexts": good})
    with pytest.raises(PoolError):
        validate_pool({"contexts": dict(good, R1=[[True, 1, 1]])})


def test_validator_agrees_with_the_atelier_on_pool_size():
    """The schema and the Atelier refuse more than 200,000 shots in a context; Probe's check must agree, or a
    merged pool it calls valid would be rejected when loaded into Notary."""
    good = {cid: [[1, 1, 1]] for cid in CONTEXTS}
    good["C3"] = [[1, 1, -1]]
    big = dict(good, R1=[[1, 1, 1]] * 200_001)
    with pytest.raises(PoolError, match="200000"):
        validate_pool({"contexts": big})
    assert validate_pool({"contexts": dict(good, R1=[[1, 1, 1]] * 200_000)})


def test_cli_end_to_end(tmp_path, capsys):
    out = tmp_path / "pool.json"
    assert main(["--noisy", "--shots", "64", "--out", str(out)]) == 0
    pool = json.loads(out.read_text())
    assert pool["format"] == "qontext-pool/1"
    assert len(pool["contexts"]["R1"]) == 64 and len(pool["chsh"]["a1b1"]) == 64
    assert main(["--validate", str(out)]) == 0
    assert "Valid qontext-pool/1" in capsys.readouterr().out
    assert main(["--validate", str(tmp_path / "missing.json")]) == 2


def test_dry_run_reports_costs(capsys):
    rows = transpile_report(local_target(), 7)
    assert len(rows) == 10 and all(r["depth"] > 0 for r in rows)
    assert main(["--dry-run", "--no-chsh"]) == 0
    assert "6 circuits" in capsys.readouterr().out


def test_shared_sample_pool_matches_the_contract():
    """The sample pool in examples/ is also validated by the JavaScript tests."""
    pool = json.loads((ROOT / "examples" / "sample-pool-noisy.json").read_text())
    validate_pool(pool)
    assert mermin_score(pool["contexts"]) > 4


# On real chips the transpiler must pick qubits by their noise. At optimization level 1 a two-qubit circuit that
# fits qubits 0 and 1 is placed there without looking: on ibm_kingston qubit 1 misreads 17% of shots, which halved
# every CHSH correlation in the first hardware runs (S about 1.1 instead of about 2.6).


def test_circuits_land_on_quiet_qubits():
    fake_provider = pytest.importorskip("qiskit_ibm_runtime.fake_provider")
    from qontext_hw.circuits import CONTEXTS, SETTING_KEYS, chsh_circuit, context_circuit
    from qontext_hw.runner import pass_manager

    backend = fake_provider.FakeKingston()
    pm = pass_manager(backend)
    readout = backend.target["measure"]
    circuits = [chsh_circuit(k) for k in SETTING_KEYS] + [context_circuit(c, 7) for c in CONTEXTS]
    for qc in circuits:
        qubits = pm.run(qc).layout.final_index_layout()
        worst = max(readout[(q,)].error for q in qubits)
        assert worst < 0.03, (qc.name, qubits, worst)


def test_chsh_beats_the_classical_limit_on_a_simulated_ibm_kingston():
    fake_provider = pytest.importorskip("qiskit_ibm_runtime.fake_provider")
    from qiskit_ibm_runtime import SamplerV2

    from qontext_hw.pool import chsh_value
    from qontext_hw.runner import Target, run

    backend = fake_provider.FakeKingston()
    pool = run(Target(SamplerV2(mode=backend), backend, "fake_kingston", True), shots=1024)
    assert chsh_value(pool["chsh"]) > 2.2


# Collecting a finished job later. The run on 12 October 2026 showed why: a queue can take hours, and the job ID
# used to be printed only once the results were back, so closing the window lost them.


def test_run_reports_the_job_id_as_soon_as_it_is_submitted():
    ids = []
    pool = run(local_target(), shots=8, on_submit=ids.append)
    assert len(ids) == 1 and ids[0] == pool["job_ids"][0]


class _FakeJob:
    def __init__(self, result, job_id, backend_name):
        self._result, self._id, self._backend = result, job_id, backend_name

    def job_id(self):
        return self._id

    def result(self):
        return self._result

    def backend(self):
        class _B:
            name = self._backend

        return _B()


def test_fetch_collects_a_finished_job_into_a_pool(tmp_path, monkeypatch, capsys):
    from qontext_hw import runner
    from qontext_hw.runner import build_circuits, pass_manager

    target = local_target()
    pm = pass_manager(target.backend)
    result = target.sampler.run([pm.run(qc) for qc in build_circuits(7)], shots=32).result()

    class _Service:
        def job(self, job_id):
            assert job_id == "d0fake123"
            return _FakeJob(result, job_id, "ibm_kingston")

    monkeypatch.setattr(runner, "_service", lambda: _Service())
    out = tmp_path / "fetched.json"
    assert main(["--fetch", "d0fake123", "--out", str(out)]) == 0
    pool = json.loads(out.read_text())
    assert pool["backend"] == "ibm_kingston" and pool["simulated"] is False
    assert pool["job_ids"] == ["d0fake123"] and pool["shots"] == 32
    assert len(pool["contexts"]["R1"]) == 32 and len(pool["chsh"]["a0b0"]) == 32
    assert "Pool written to" in capsys.readouterr().out


def test_an_ibm_submission_says_how_to_collect_it_later(monkeypatch, capsys):
    from qontext_hw import cli

    def fake_run(target, *, shots, seed, include_chsh, on_submit):
        on_submit("d0job42")
        raise runner_error("stop after submission")

    from qontext_hw.runner import RunnerError as runner_error

    monkeypatch.setattr(cli, "ibm_target", lambda name: local_target())
    monkeypatch.setattr(cli, "run", fake_run)
    assert main(["--ibm", "least_busy", "--out", "x.json"]) == 2
    out = capsys.readouterr().out
    assert "d0job42" in out and "qontext-probe --fetch d0job42 --out x.json" in out
    assert "keeps running" not in out
