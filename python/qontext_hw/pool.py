"""Measurement pool format (qontext-pool/1), shared with the Studio and the theme runtime.

The JSON Schema lives in schema/qontext-pool.schema.json at the repository root.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .circuits import CONTEXTS, SETTING_KEYS

POOL_FORMAT = "qontext-pool/1"


class PoolError(ValueError):
    """A pool failed validation."""


def _check_shots(name: str, shots: Any, width: int) -> None:
    if not isinstance(shots, list) or not shots:
        raise PoolError(f"{name} has no shots.")
    for s in shots:
        if not isinstance(s, list) or len(s) != width or any(v not in (1, -1) or isinstance(v, bool) for v in s):
            raise PoolError(f"Each shot in {name} must be {width} values, each 1 or -1.")


def validate_pool(pool: Any) -> dict:
    """Raises PoolError with a readable message, or returns the pool unchanged."""
    if not isinstance(pool, dict):
        raise PoolError("A pool must be a JSON object.")
    if "format" in pool and pool["format"] != POOL_FORMAT:
        raise PoolError(f'Unsupported pool format "{pool["format"]}". Expected "{POOL_FORMAT}".')
    contexts = pool.get("contexts")
    if not isinstance(contexts, dict):
        raise PoolError('Missing "contexts".')
    for ctx_id in CONTEXTS:
        _check_shots(f"Context {ctx_id}", contexts.get(ctx_id), 3)
    chsh = pool.get("chsh")
    if chsh is not None:
        if not isinstance(chsh, dict):
            raise PoolError('"chsh" must be an object.')
        for key in SETTING_KEYS:
            _check_shots(f"CHSH setting {key}", chsh.get(key), 2)
    return pool


def mermin_score(contexts: dict) -> float:
    """Sum over contexts of the mean signed product. Classical max 4, quantum ideal 6."""
    total = 0.0
    for ctx_id, (_, sign) in CONTEXTS.items():
        shots = contexts[ctx_id]
        total += sum(sign * a * b * c for a, b, c in shots) / len(shots)
    return total


def chsh_value(chsh: dict) -> float:
    """S = E00 + E01 + E10 - E11. Classical max 2, quantum max 2 sqrt 2."""
    e = {k: sum(a * b for a, b in chsh[k]) / len(chsh[k]) for k in SETTING_KEYS}
    return e["a0b0"] + e["a0b1"] + e["a1b0"] - e["a1b1"]


def build_pool(
    *, backend: str, simulated: bool, job_ids: list[str], shots: int, seed: int, contexts: dict, chsh: dict | None
) -> dict:
    pool = {
        "format": POOL_FORMAT,
        "backend": backend,
        "simulated": simulated,
        "job_ids": job_ids,
        "created": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "shots": shots,
        "state_seed": seed,
        "contexts": contexts,
    }
    if chsh is not None:
        pool["chsh"] = chsh
    return validate_pool(pool)
