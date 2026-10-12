"""End-to-end tests: drive Qontext Studio the way a person would."""

import pathlib
import re

from conftest import DEMO

ROOT = pathlib.Path(__file__).resolve().parents[2]

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
    assert page.input_value("#shapeOut").startswith("# Qontext Unpaintables")


def test_example_pool_and_seal(page):
    open_tab(page, "hardware")
    page.click("#poolExample")
    page.wait_for_function("() => document.querySelector('#seal').innerText.includes('SHA-256')")
    assert float(page.inner_text("#hwScore")) > 4
    assert re.search(r"[0-9a-f]{64}", page.inner_text("#seal"))
    assert page.locator("#poolTable tr").count() == 6
    open_tab(page, "grid")
    assert "Measured on" in page.inner_text("#gridScoreNote")


def test_bad_pool_shows_message(page):
    open_tab(page, "hardware")
    page.click("text=Paste the file's text instead")
    page.fill("#poolText", '{"contexts": {"R1": [[1, 0, 1]]}}')
    page.click("#poolLoad")
    page.wait_for_function("() => document.querySelector('#toast').innerText.length > 0")
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
    page.click("#openFold summary")
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
    page.wait_for_function("() => document.querySelector('[data-q-tile]').hasAttribute('data-q-value')")
    assert page.locator("[data-q-value]").count() == 18
    seed = page.inner_text("#seed code")
    assert seed.isdigit()
    css = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--q-r1c1-row')")
    assert re.fullmatch(r"#[0-9a-f]{6}", css.strip())
    row = page.get_attribute('[data-q-context="row"] .tiles [data-q-tile="r1c1"]', "data-q-value")
    col = page.get_attribute('[data-q-context="col"] .tiles [data-q-tile="r1c1"]', "data-q-value")
    assert row == css.strip() and re.fullmatch(r"#[0-9a-f]{6}", col)
    page.reload()
    page.wait_for_function("() => document.querySelector('[data-q-tile]').hasAttribute('data-q-value')")
    assert page.inner_text("#seed code") == seed, "seed should be stable for the session"
    page.click("#again")
    assert page.inner_text("#seed code") != seed
    ctx.close()
    assert errors == []


def test_loads_pool_written_by_python_runner(page):
    from conftest import ROOT

    open_tab(page, "hardware")
    page.set_input_files("#poolFile", str(ROOT / "examples" / "sample-pool-noisy.json"))
    page.wait_for_function("() => document.querySelector('#seal').innerText.includes('aer simulator')")
    assert float(page.inner_text("#hwScore")) > 4
    assert float(page.inner_text("#hwChsh")) > 2
    open_tab(page, "entangle")
    assert "Measured on aer simulator" in page.inner_text("#chshSource")


def test_every_room_explains_itself_in_plain_words(page):
    for name in TABS:
        open_tab(page, name)
        wall = page.locator(f"#tab-{name} .wall")
        assert wall.is_visible()
        assert len(wall.locator(".wall-what").inner_text().split()) >= 20
        assert wall.locator(".wall-eg").inner_text().startswith("For example")
        assert wall.locator(f'[data-goal="{name}"]').is_visible()
        assert "—" not in wall.inner_text()  # house style: no em dashes


def test_try_this_does_what_it_says(page):
    page.click('[data-try="grid"]')
    assert "Measurement 2" in page.inner_text("#legend")
    open_tab(page, "mixer")
    page.click('[data-try="mixer"]')
    page.fill("#phiIn", "180")
    page.dispatch_event("#phiIn", "input")
    # Opposite colors at the opposite phase leave one output plain gray, and the goal is reached.
    share = int(page.inner_text("#eShare").rstrip("%"))
    assert share <= 3 or share >= 97
    page.wait_for_function("() => document.querySelector('[data-goal=\"mixer\"]').classList.contains('done')")
    assert page.inner_text("#eurekaN") == "1"


def test_a_goal_counts_once_and_survives_a_reload(page):
    open_tab(page, "shapes")
    page.click('[data-shape="yuoh13"]')
    page.wait_for_function("() => document.querySelector('[data-goal=\"shapes\"]').classList.contains('done')")
    assert page.locator('[data-goal="shapes"] .goal-k').inner_text() == "Goal reached:"
    page.click('[data-shape="peres33"]')
    page.click('[data-shape="yuoh13"]')
    assert page.inner_text("#eurekaN") == "1"
    page.reload()
    page.wait_for_selector("#tab-shapes:not([hidden])")  # the last room is restored too
    assert page.inner_text("#eurekaN") == "1"


def test_best_attempt_does_not_count_as_your_own(page):
    open_tab(page, "learn")
    page.click('[data-try="learn"]')
    assert page.inner_text("#learnVerdict").startswith("5 of 6")
    assert page.inner_text("#eurekaN") == "0"
    page.click('[data-try="learn"]')
    # From a best attempt, flip a tile twice: the visitor's own 5 of 6 counts.
    page.click("#cl00")
    page.click("#cl00")
    page.wait_for_function("() => document.querySelector('[data-goal=\"learn\"]').classList.contains('done')")


def test_celebration_stays_still_under_reduced_motion(browser):
    from conftest import STUDIO, _new_page

    errors = []
    ctx, page = _new_page(browser, {"width": 1280, "height": 900}, errors)
    page.emulate_media(reduced_motion="reduce")
    page.goto(STUDIO)
    page.wait_for_selector("#cell00")
    open_tab(page, "hardware")
    page.click("#poolExample")
    page.wait_for_function("() => document.getElementById('eurekaN').textContent === '1'")
    assert page.locator(".burst").count() == 0
    ctx.close()
    assert errors == []


def test_notary_hides_results_until_there_are_some(page):
    open_tab(page, "hardware")
    assert page.locator("#poolResults").is_hidden()
    assert page.locator("#poolText").is_hidden()  # the raw text box waits behind its fold
    assert "appears here" in page.inner_text("#seal")
    page.set_input_files("#poolFile", str(ROOT / "examples" / "sample-pool-noisy.json"))
    page.wait_for_selector("#poolResults:not([hidden])")
    rows = page.locator("#poolTable tr")
    assert rows.count() == 6
    assert rows.first.inner_text().startswith("Row 1 multiplies to +1")
    assert page.locator("#seal .stamp svg").count() == 1
    page.click("#poolClear")
    assert page.locator("#poolResults").is_hidden()
    assert "appears here" in page.inner_text("#seal")


def test_handoff_shows_colors_and_downloads_a_named_file(page):
    open_tab(page, "export")
    assert page.locator("#handoffSwatches .sw-h").count() == 3
    assert page.locator("#handoffSwatches .sw-t").count() == 9
    assert page.locator("#exportOut").is_hidden()  # the code waits behind Show the code
    page.fill("#projName", "Spring launch")
    page.dispatch_event("#projName", "change")
    page.click('[data-fmt="tokens"]')
    with page.expect_download() as info:
        page.click("#downloadBtn")
    assert info.value.suggested_filename == "qontext-spring-launch.tokens.json"
    assert page.inner_text("#eurekaN") == "1"


def test_handoff_pauses_and_fixes_unreadable_colors(page):
    open_tab(page, "harmony")
    page.fill("#lIn", "0.4")
    page.dispatch_event("#lIn", "input")
    open_tab(page, "export")
    assert page.locator("#handoffBlock").is_visible()
    assert page.is_disabled("#downloadBtn")
    page.click("#handoffFix")
    assert page.locator("#handoffBlock").is_hidden()
    assert page.is_enabled("#copyBtn")


# The gallery look: the Atelier hangs like the site, no card kit (Impeccable critique, 2026-10-12).

STYLE_PROBE = """() => {
  const out = { small: [], stripes: [], fonts: new Set(), boxed: [] };
  const sec = document.querySelector('main > section:not([hidden])');
  for (const el of sec.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const s = getComputedStyle(el);
    const skip = '.sr-only, [aria-hidden="true"], details:not([open]) > :not(summary)';
    if (s.visibility === 'hidden' || el.closest(skip)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own) {
      out.fonts.add(s.fontFamily.split(',')[0].replaceAll('"', '').trim());
      const svg = el.closest('svg');
      const vb = svg && svg.viewBox.baseVal;
      const scale = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
      const px = parseFloat(s.fontSize) * scale;
      if (px < 12) out.small.push(`${el.getAttribute('class') || el.tagName} ${px.toFixed(1)}px`);
    }
    const left = parseFloat(s.borderLeftWidth);
    if (left >= 3 && left > parseFloat(s.borderRightWidth) + 1) out.stripes.push(el.getAttribute('class'));
    const bordered = ['Top', 'Right', 'Bottom', 'Left'].every((k) => parseFloat(s[`border${k}Width`]) > 0);
    if (bordered && el.parentElement.classList.contains('rail')) out.boxed.push(el.getAttribute('class'));
  }
  return { ...out, fonts: [...out.fonts] };
}"""


def test_rooms_hang_like_the_site(page):
    for name in TABS:
        open_tab(page, name)
        probe = page.evaluate(STYLE_PROBE)
        assert probe["small"] == [], f"{name}: text under 12 px {probe['small']}"
        assert probe["stripes"] == [], f"{name}: side stripes {probe['stripes']}"
        assert probe["boxed"] == [], f"{name}: boxed rail cards {probe['boxed']}"
        assert "Instrument Sans" not in probe["fonts"], f"{name}: {probe['fonts']}"
        name_el = page.locator(f"#tab-{name} h2.room-name")
        assert name_el.is_visible()
        assert name_el.evaluate("e => getComputedStyle(e).fontWeight") == "330"
    reading = page.evaluate("getComputedStyle(document.querySelector('.wall-what')).fontFamily")
    assert reading.replace('"', "").startswith("Literata")


def test_wall_text_beside_the_name_keeps_the_exhibit_high(page):
    # Desktop: the wall label sits beside the room name, so Fringe's band starts in the first screen.
    open_tab(page, "mixer")
    assert page.locator("#fringe").bounding_box()["y"] < 900
    name = page.locator("#tab-mixer h2").bounding_box()
    wall = page.locator("#tab-mixer .wall").bounding_box()
    assert wall["x"] > name["x"] + name["width"] - 1


def test_number_keys_open_rooms_and_t_tries(page):
    page.locator("body").click(position={"x": 5, "y": 5})
    page.keyboard.press("4")
    page.wait_for_selector("#tab-mixer:not([hidden])")
    page.keyboard.press("9")
    page.wait_for_selector("#tab-export:not([hidden])")
    page.keyboard.press("3")
    page.wait_for_selector("#tab-harmony:not([hidden])")
    before = page.input_value("#hIn")
    page.keyboard.press("t")
    page.wait_for_function(f"() => document.getElementById('hIn').value !== '{before}'")
    # Typing in a field never switches rooms.
    page.keyboard.press("9")
    open_tab(page, "export")
    page.fill("#projName", "")
    page.locator("#projName").type("1 2")
    assert page.locator("#tab-export").is_visible()


def test_fringe_band_turns_the_dial_when_dragged(page):
    open_tab(page, "mixer")
    band = page.locator("#fringe").bounding_box()
    page.mouse.click(band["x"] + band["width"] * 0.5, band["y"] + band["height"] / 2)
    assert abs(int(page.input_value("#phiIn")) - 180) <= 3
    assert page.locator("#fringe").bounding_box()["height"] >= 120


def test_spooky_pair_hangs_as_two_posters(page):
    open_tab(page, "entangle")
    assert page.locator("#tab-entangle .cta").count() == 0
    for side in "AB":
        word = page.inner_text(f"#asset{side}Word")
        assert word in ("Calm", "Bold")
        ratio = page.evaluate(
            f"""() => {{
              const e = document.getElementById('asset{side}Word');
              const lum = (c) => {{ const v = c.match(/\\d+(\\.\\d+)?/g).slice(0, 3).map((x) => x / 255)
                .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
                return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; }};
              const a = lum(getComputedStyle(e).color), b = lum(getComputedStyle(e.parentElement).backgroundColor);
              return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            }}"""
        )
        assert ratio >= 4.5
    page.select_option("#styleA", "1")
    assert page.inner_text("#assetAWord") == "Bold"


def test_fringe_marker_stays_on_the_band_and_ports_are_in_view(page):
    open_tab(page, "mixer")
    page.fill("#phiIn", "0")
    page.dispatch_event("#phiIn", "input")
    band = page.locator("#fringe").bounding_box()
    mark = page.locator("#fringeMk").bounding_box()
    assert band["x"] - 0.5 <= mark["x"] and mark["x"] + mark["width"] <= band["x"] + band["width"] + 0.5
    assert band["y"] - 0.5 <= mark["y"] and mark["y"] + mark["height"] <= band["y"] + band["height"] + 0.5
    assert page.locator("#outA").bounding_box()["y"] < 900
