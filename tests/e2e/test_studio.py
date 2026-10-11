"""End-to-end tests: drive Qontext Studio the way a person would."""

import re

from conftest import DEMO

TABS = ["grid", "learn", "harmony", "mixer", "penta", "entangle", "shapes", "hardware", "export"]


def open_tab(page, name):
    page.click(f"#tabbtn-{name}")
    page.wait_for_selector(f"#tab-{name}:not([hidden])")


def test_every_tab_renders(page):
    for name in TABS:
        open_tab(page, name)
        assert page.locator(f"#tab-{name} h2").first.is_visible()
        assert page.locator("main > section:not([hidden])").count() == 1


def test_measure_again_and_space(page):
    assert "Measurement 1" in page.inner_text("#legend")
    page.click("#measure")
    assert "Measurement 2" in page.inner_text("#legend")
    page.locator("body").click(position={"x": 5, "y": 5})
    page.keyboard.press("Space")
    assert "Measurement 3" in page.inner_text("#legend")


def test_grid_rules_hold_and_meter(page):
    assert page.inner_text("#gridScore") == "6.00"
    assert page.locator(".ctx.flag").count() == 0
    page.click('[data-view="cols"]')
    assert "col" in page.inner_text("#vals00")


def test_tabs_keyboard_navigation(page):
    page.focus("#tabbtn-grid")
    page.keyboard.press("ArrowRight")
    assert page.get_attribute("#tabbtn-learn", "aria-selected") == "true"
    page.keyboard.press("End")
    assert page.get_attribute("#tabbtn-export", "aria-selected") == "true"


def test_learn_best_is_five_of_six(page):
    open_tab(page, "learn")
    assert page.inner_text("#learnVerdict") == "5 of 6 rules satisfied"
    page.click("#cl00")  # one tile sits in a row and a column, so flipping it breaks both
    assert page.inner_text("#learnVerdict") == "3 of 6 rules satisfied"
    page.click("#learnBest")
    assert page.inner_text("#learnVerdict") == "5 of 6 rules satisfied"


def test_harmony_levels_drive_chips(page):
    open_tab(page, "harmony")
    page.fill("#dIn", "5")
    page.dispatch_event("#dIn", "input")
    assert page.locator("#harmChips .chip").count() == 5
    assert page.text_content("#wheelName") == "Pentadic"


def test_pentagram_sum(page):
    open_tab(page, "penta")
    assert page.inner_text("#kcbsSum") == "2.236"
    page.fill("#tIn", "70")
    page.dispatch_event("#tIn", "input")
    assert float(page.inner_text("#kcbsSum")) < 2.0
    assert page.inner_text("#kcbsPill") == "Within classical"


def test_mixer_conserves_energy(page):
    open_tab(page, "mixer")
    for phi in ["0", "90", "180", "275"]:
        page.fill("#phiIn", phi)
        page.dispatch_event("#phiIn", "input")
        assert page.inner_text("#eIn") == page.inner_text("#eOut")


def test_entangled_beats_classical(page):
    open_tab(page, "entangle")
    assert float(page.inner_text("#chshS")) > 2.5
    page.click("#pairBtn")
    assert page.locator("#pairs .pair").count() == 12


def test_shapes(page):
    open_tab(page, "shapes")
    assert page.inner_text("#shapeKs") == "impossible"
    assert page.locator("#yuohCard").is_hidden()
    page.click('[data-shape="yuoh13"]')
    assert page.inner_text("#shapeKs") == "exists"
    assert page.locator("#yuohCard").is_visible()
    page.click('[data-sfmt="obj"]')
    assert page.input_value("#shapeOut").startswith("# Qontext Shape Pack")


def test_example_pool_and_seal(page):
    open_tab(page, "hardware")
    page.click("#poolExample")
    page.wait_for_function("document.querySelector('#seal').innerText.includes('sha-256')")
    assert float(page.inner_text("#hwScore")) > 4
    assert re.search(r"[0-9a-f]{64}", page.inner_text("#seal"))
    assert page.locator("#poolTable tr").count() == 6
    open_tab(page, "grid")
    assert "Measured on" in page.inner_text("#gridScoreNote")


def test_bad_pool_shows_message(page):
    open_tab(page, "hardware")
    page.fill("#poolText", '{"contexts": {"R1": [[1, 0, 1]]}}')
    page.click("#poolLoad")
    page.wait_for_function("document.querySelector('#toast').innerText.length > 0")
    assert "R1" in page.inner_text("#toast")


def test_export_formats_and_guard(page):
    open_tab(page, "export")
    assert "--q-r1c1-row" in page.input_value("#exportOut")
    page.click('[data-fmt="tokens"]')
    assert '"$type": "color"' in page.input_value("#exportOut")
    open_tab(page, "harmony")
    page.fill("#lIn", "0.4")
    page.dispatch_event("#lIn", "input")
    open_tab(page, "export")
    assert page.is_disabled("#copyBtn")
    open_tab(page, "grid")
    page.click("#cgFix")
    open_tab(page, "export")
    assert page.is_enabled("#copyBtn")


def test_project_code_round_trip_and_persistence(page):
    open_tab(page, "export")
    code = page.input_value("#projCode")
    assert code.startswith("QX1.")
    open_tab(page, "harmony")
    page.fill("#hIn", "33")
    page.dispatch_event("#hIn", "input")
    assert page.inner_text("#hVal") == "33°"
    page.wait_for_timeout(400)
    page.reload()
    page.wait_for_selector("#tab-harmony:not([hidden])")  # the last tab is restored too
    assert page.inner_text("#hVal") == "33°"
    open_tab(page, "export")
    page.fill("#projCode", code)
    page.click("#projLoad")
    open_tab(page, "harmony")
    assert page.inner_text("#hVal") == "200°"


def test_lenticular_render(page):
    open_tab(page, "export")
    page.click("#lentiBtn")
    page.wait_for_selector("#lentiOut img")
    assert page.locator("#lentiOut img").count() == 2
    assert "2400" in page.inner_text("#lentiInfo")


def test_phone_has_no_horizontal_overflow(phone):
    for name in TABS:
        open_tab(phone, name)
        overflow = phone.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert overflow <= 0, f"{name} overflows by {overflow}px"


def test_runtime_demo(browser):
    errors = []
    ctx = browser.new_context()
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(DEMO)
    page.wait_for_function("document.querySelector('[data-q-tile]').hasAttribute('data-q-value')")
    assert page.locator("[data-q-value]").count() == 18
    seed = page.inner_text("#seed code")
    assert seed.isdigit()
    css = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--q-r1c1-row')")
    assert re.fullmatch(r"#[0-9a-f]{6}", css.strip())
    row = page.get_attribute('[data-q-context="row"] .tiles [data-q-tile="r1c1"]', "data-q-value")
    col = page.get_attribute('[data-q-context="col"] .tiles [data-q-tile="r1c1"]', "data-q-value")
    assert row == css.strip() and re.fullmatch(r"#[0-9a-f]{6}", col)
    page.reload()
    page.wait_for_function("document.querySelector('[data-q-tile]').hasAttribute('data-q-value')")
    assert page.inner_text("#seed code") == seed, "seed should be stable for the session"
    page.click("#again")
    assert page.inner_text("#seed code") != seed
    ctx.close()
    assert errors == []


def test_loads_pool_written_by_python_runner(page):
    from conftest import ROOT

    open_tab(page, "hardware")
    page.set_input_files("#poolFile", str(ROOT / "examples" / "sample-pool-noisy.json"))
    page.wait_for_function("document.querySelector('#seal').innerText.includes('aer simulator')")
    assert float(page.inner_text("#hwScore")) > 4
    assert float(page.inner_text("#hwChsh")) > 2
    open_tab(page, "entangle")
    assert "Measured on aer simulator" in page.inner_text("#chshSource")
