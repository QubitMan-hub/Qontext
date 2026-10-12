"""Pair Production: a sneaker drop, start to finish. The left foot reads the grid by its rows, the right foot by
its columns, and the visitor paints the pair in their own world."""

import re


def enter_pair(page, step=None):
    """Brings the section (or one of its steps) to the middle of the screen and waits for the pair to be drawn."""
    target = f'#pairSteps [data-step="{step}"]' if step else "#pair"
    page.evaluate(f"document.querySelector('{target}').scrollIntoView({{block: 'center', behavior: 'instant'}})")
    page.wait_for_selector("#pairSvg path[data-panel]", state="attached")


def fills(page, side=None):
    sel = f'#pairSvg g[data-side="{side}"] path[data-panel]' if side else "#pairSvg path[data-panel]"
    return page.eval_on_selector_all(sel, "els => els.map((e) => [e.dataset.panel, e.getAttribute('fill')])")


def test_pair_section_sits_after_the_idea(site):
    assert site.locator("#idea + #pair").count() == 1
    assert site.inner_text("#pairTitle") == "Pair Production"
    assert site.locator('#menu a[href="#pair"]').count() == 1
    assert site.locator('footer nav a[href="#pair"]').count() == 1
    assert site.locator('#links a[href="#pair"]').inner_text() == "Showcase"


def test_pair_starts_unpainted_in_your_world(site):
    enter_pair(site)
    all_fills = fills(site)
    assert len(all_fills) == 18
    assert all(f.startswith("url(#") for _, f in all_fills)
    assert site.inner_text("#pairWorld") == site.inner_text("#worldNum")


def test_rolling_the_world_changes_the_pair(site):
    enter_pair(site, 1)
    before = site.inner_text("#pairWorld")
    stops = site.eval_on_selector_all("#pairSvg stop", "els => els.map((e) => e.getAttribute('stop-color'))")
    site.click("#pairRoll")
    site.wait_for_function("() => document.getElementById('toast').innerText.startsWith('Welcome')")
    site.wait_for_function(f"() => document.getElementById('pairWorld').textContent !== '{before}'")
    assert site.inner_text("#pairWorld") == site.inner_text("#worldNum")
    after = site.eval_on_selector_all("#pairSvg stop", "els => els.map((e) => e.getAttribute('stop-color'))")
    assert after != stops
    assert all(re.fullmatch(r"#[0-9a-f]{6}", s) for s in after)
