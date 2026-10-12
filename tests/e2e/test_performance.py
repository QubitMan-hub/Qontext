"""Performance budgets for the website, measured the way scripts/perf.py does.

The budgets sit well above today's numbers (shared CI machines are slower and noisier than a laptop) and well
below where the site was before it was rebuilt for speed, so a real regression fails and noise does not. Each
profile is measured three times and judged on the median of each number: one slow moment on a shared machine (a
neighbour's job, a cold cache) no longer fails the run, while a real regression shows up in every measurement.

Before (v1.1.0), phone profile: boot 1,297 ms, 1,508 ms blocked at load, hero using 100% of the main thread at
rest, 34 long tasks while scrolling.
"""

import pathlib
import statistics
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import perf  # noqa: E402

BUDGETS = {
    "phone": {"boot_ms": 1000, "blocking_ms_load": 600, "hero_idle_main_thread": 15, "long_tasks_scroll": 4},
    # Desktop scrolling measures 0 to 2 long tasks (waking Unpaintables is one), so the limit allows 3.
    "desktop": {"boot_ms": 300, "blocking_ms_load": 150, "hero_idle_main_thread": 5, "long_tasks_scroll": 3},
}


RUNS = 3


@pytest.fixture(scope="module")
def results(browser):
    runs = [{r["profile"]: r for r in perf.run(browser=browser)} for _ in range(RUNS)]
    return {p: {k: statistics.median(run[p][k] for run in runs) for k in BUDGETS[p]} for p in BUDGETS}


@pytest.mark.parametrize("profile", list(BUDGETS))
def test_site_stays_within_its_performance_budget(results, profile):
    got = results[profile]
    over = {k: (got[k], limit) for k, limit in BUDGETS[profile].items() if got[k] > limit}
    assert not over, f"{profile}: over budget (median of {RUNS} measurements, budget): {over}"
