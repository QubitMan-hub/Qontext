"""Probe (qontext-hw): measurement pools for Qontext Notary from real or simulated quantum hardware."""

__version__ = "1.1.0"

from .circuits import CHSH_ANGLES, CONTEXTS, GRID, SETTING_KEYS, bits_to_values, chsh_circuit, context_circuit  # noqa: E402
from .pool import POOL_FORMAT, PoolError, build_pool, chsh_value, mermin_score, validate_pool  # noqa: E402

__all__ = [
    "CHSH_ANGLES",
    "CONTEXTS",
    "GRID",
    "POOL_FORMAT",
    "PoolError",
    "SETTING_KEYS",
    "__version__",
    "bits_to_values",
    "build_pool",
    "chsh_circuit",
    "chsh_value",
    "context_circuit",
    "mermin_score",
    "validate_pool",
]
