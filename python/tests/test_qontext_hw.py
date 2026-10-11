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
