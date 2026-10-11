"""Performance budgets for the website, measured the way scripts/perf.py does.

The budgets sit well above today's numbers (shared CI machines are slower and noisier than a laptop) and well
below where the site was before it was rebuilt for speed, so a real regression fails and noise does not.

Before (v1.1.0), phone profile: boot 1,297 ms, 1,508 ms blocked at load, hero using 100% of the main thread at
rest, 34 long tasks while scrolling.
"""

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import perf  # noqa: E402

BUDGETS = {
    "phone": {"boot_ms": 1000, "blocking_ms_load": 600, "hero_idle_main_thread": 15, "long_tasks_scroll": 4},
    "desktop": {"boot_ms": 300, "blocking_ms_load": 150, "hero_idle_main_thread": 5, "long_tasks_scroll": 1},
}


@pytest.fixture(scope="module")
def results():
    return {r["profile"]: r for r in perf.run()}


@pytest.mark.parametrize("profile", list(BUDGETS))
def test_site_stays_within_its_performance_budget(results, profile):
    got = results[profile]
    over = {k: (got[k], limit) for k, limit in BUDGETS[profile].items() if got[k] > limit}
    assert not over, f"{profile}: over budget (measured, budget): {over}"
