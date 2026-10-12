"""Pair Production: a sneaker drop, start to finish. The left foot reads the grid by its rows, the right foot by
its columns, and the visitor paints the pair in their own world."""

import re

ALL_PAINTED = (
    "() => [...document.querySelectorAll('#pairSvg path[data-panel]')]"
    ".every((p) => !p.getAttribute('fill').startsWith('url('))"
)


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


def _lin(hexstr):
    c = [int(hexstr[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def wcag(a, b):
    """WCAG 2 contrast ratio, worked out here independently of the engine."""
    la, lb = (0.2126 * x[0] + 0.7152 * x[1] + 0.0722 * x[2] for x in (_lin(a), _lin(b)))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def turn(page, deg):
    page.eval_on_selector(
        "#pairTurn", f"(el) => {{ el.value = '{deg}'; el.dispatchEvent(new Event('input', {{bubbles: true}})); }}"
    )


def test_harmony_changes_the_pair_not_the_site(site):
    enter_pair(site, 2)
    root = site.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--q-r1c1-row')")
    stops = site.eval_on_selector_all("#pairSvg stop", "els => els.map((e) => e.getAttribute('stop-color'))")
    chips = site.inner_text("#pairHarmony")
    turn(site, 120)
    assert site.eval_on_selector_all("#pairSvg stop", "els => els.map((e) => e.getAttribute('stop-color'))") != stops
    assert site.inner_text("#pairHarmony") != chips
    assert site.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--q-r1c1-row')") == root
    site.click('#pairD [data-d="5"]')
    assert site.locator("#pairHarmony .chip").count() == 5
    assert site.get_attribute('#pairD [data-d="5"]', "aria-pressed") == "true"


def test_logo_reads_on_both_stripe_colors(site):
    enter_pair(site, 3)
    for deg in [0, 60, 120, 180, 240, 300]:
        turn(site, deg)
        if site.is_visible("#pairFix"):
            site.click("#pairFix")
        stripe = site.get_attribute("#pairStage", "data-stripe").split()
        ink = site.get_attribute("#pairStage", "data-ink")
        assert len(stripe) == 2
        assert min(wcag(ink, c) for c in stripe) >= 4.5, (deg, ink, stripe)
        shown = float(site.inner_text("#pairInkRatio").split(":")[0])
        assert shown >= 4.5
        assert site.eval_on_selector("#pairSvg .brand .word", "(t) => t.getAttribute('fill')") == ink


def test_mid_tone_paint_fails_the_logo_and_fix_brings_it_back(site):
    enter_pair(site, 3)
    # Somewhere in the middle tones neither ink reaches 4.5 : 1 on both stripe colors; where depends on the hue.
    failing = None
    for v in range(50, 68):
        site.eval_on_selector(
            "#pairLight", f"(el) => {{ el.value = '{v}'; el.dispatchEvent(new Event('input', {{bubbles: true}})); }}"
        )
        if float(site.inner_text("#pairInkRatio").split(":")[0]) < 4.5:
            failing = str(v)
            break
    assert failing, "no mid-tone lightness failed the logo"
    assert site.is_visible("#pairFix")
    site.click("#pairFix")
    assert site.is_hidden("#pairFix")
    stripe = site.get_attribute("#pairStage", "data-stripe").split()
    ink = site.get_attribute("#pairStage", "data-ink")
    assert min(wcag(ink, c) for c in stripe) >= 4.5
    assert site.eval_on_selector("#pairLight", "(el) => el.value") != failing


def feet(page):
    left = dict(fills(page, "L"))
    right = dict(fills(page, "R"))
    return left, right


def paint_all(page):
    page.click("#pairPaintAll")
    page.wait_for_function(ALL_PAINTED)


def test_painting_collapses_panels_on_both_feet(site):
    enter_pair(site, 4)
    first = site.locator("#pairPanels button").first
    panel = first.get_attribute("data-panel")
    first.focus()
    site.keyboard.press("Enter")
    left, right = feet(site)
    assert re.fullmatch(r"#[0-9a-f]{6}", left[panel]) and re.fullmatch(r"#[0-9a-f]{6}", right[panel])
    assert all(f.startswith("url(") for k, f in left.items() if k != panel)
    assert first.get_attribute("aria-pressed") == "true"
    # A tap on the shoe paints too.
    site.locator('#pairSvg g[data-side="R"] path[data-panel="midsole"]').click()
    assert re.fullmatch(r"#[0-9a-f]{6}", feet(site)[0]["midsole"])


def test_painted_pair_differs_exactly_on_contextual_tiles(site):
    enter_pair(site, 4)
    paint_all(site)
    left, right = feet(site)
    differ = [k for k in left if left[k] != right[k]]
    assert len(differ) == int(site.inner_text("#planDiff").split()[0])
    assert site.locator('#pairChecks li[data-ok="true"]').count() == 6
    assert site.inner_text("#pairVerdict").startswith("6 of 6")


def test_trying_to_match_breaks_a_rule(site):
    enter_pair(site, 4)
    site.click("#pairMatch")
    site.wait_for_function("() => document.getElementById('pairMatch').getAttribute('aria-pressed') === 'true'")
    left, right = feet(site)
    assert left == right
    assert site.locator('#pairChecks li[data-ok="false"]').count() >= 1
    assert "has to differ" in site.inner_text("#pairVerdict")
    # Painting (or pressing it again) lets the feet differ, and every rule holds again.
    site.locator("#pairPanels button").first.click()
    assert site.get_attribute("#pairMatch", "aria-pressed") == "false"
    assert site.locator('#pairChecks li[data-ok="true"]').count() == 6


def test_harmony_size_repaints_painted_panels(site):
    enter_pair(site, 4)
    paint_all(site)
    before = feet(site)[0]
    site.click('#pairD [data-d="5"]')
    after = feet(site)[0]
    assert all(re.fullmatch(r"#[0-9a-f]{6}", f) for f in after.values())
    assert after != before


def world_seed(page):
    return int(page.inner_text("#worldNum").replace(",", ""))


def drop_seeds(page):
    page.wait_for_function("() => document.querySelectorAll('#pairDrop button[data-seed]').length === 12")
    return [
        int(s)
        for s in page.eval_on_selector_all("#pairDrop button[data-seed]", "els => els.map((b) => b.dataset.seed)")
    ]


def test_the_drop_is_twelve_different_worlds(site):
    enter_pair(site, 5)
    seeds = drop_seeds(site)
    assert len(set(seeds)) == 12
    assert world_seed(site) not in seeds


def test_choosing_a_pair_from_the_drop_makes_it_your_world(site):
    enter_pair(site, 5)
    seeds = drop_seeds(site)
    site.locator("#pairDrop button[data-seed]").nth(2).click()
    site.wait_for_function("() => document.getElementById('toast').innerText.startsWith('Welcome')")
    site.wait_for_function(f"() => document.getElementById('worldNum').textContent.replace(/,/g, '') === '{seeds[2]}'")
    assert all(f.startswith("url(") for _, f in fills(site))
    assert drop_seeds(site) != seeds


def test_a_world_change_resets_a_half_painted_pair(site):
    enter_pair(site, 4)
    buttons = site.locator("#pairPanels button")
    buttons.nth(0).click()
    buttons.nth(4).click()
    site.click("#worldBtn")
    site.wait_for_function("() => document.getElementById('toast').innerText.startsWith('Welcome')")
    assert all(f.startswith("url(") for _, f in fills(site))
    assert site.locator('#pairPanels button[aria-pressed="true"]').count() == 0


def test_jumping_straight_to_the_drop_paints_the_pair(site):
    site.goto(site.url.split("#")[0] + "#pairDrop")
    site.wait_for_selector("#plan .cellwrap")
    enter_pair(site, 5)
    site.wait_for_function(ALL_PAINTED)


def decode_wavefunction(code):
    import base64
    import json

    body = code.split("QX1.", 1)[1]
    return json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))


def test_the_tag_carries_a_fingerprint(site):
    enter_pair(site, 6)
    site.wait_for_function("() => /^[0-9a-f]{64}$/.test(document.getElementById('pairPrint').textContent)")
    assert site.inner_text("#pairTagWorld") == site.inner_text("#worldNum")
    assert site.inner_text("#pairTagRules").startswith("6 of 6")


def test_the_tag_survives_without_subtlecrypto(browser):
    from conftest import SITE, _new_page

    errors = []
    ctx, page = _new_page(browser, {"width": 1440, "height": 900}, errors)
    page.add_init_script("Object.defineProperty(Crypto.prototype, 'subtle', { get: () => undefined })")
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    enter_pair(page, 6)
    page.wait_for_function("() => document.getElementById('pairPrint').textContent === 'unavailable in this browser'")
    assert page.inner_text("#pairTagWorld") == page.inner_text("#worldNum")
    ctx.close()
    assert errors == []


def test_open_in_the_atelier_is_the_same_design(site):
    enter_pair(site, 2)
    plain = decode_wavefunction(site.get_attribute("#pairAtelier", "href"))
    turn(site, 90)
    href = site.get_attribute("#pairAtelier", "href")
    tuned = decode_wavefunction(href)
    assert round((tuned["base"] - plain["base"]) % 360) == 90
    site.goto(site.url.rsplit("/", 1)[0] + "/" + href)
    site.wait_for_selector("#cell00")
    site.click("#tabbtn-export")  # the Wavefunction field lives in Handoff
    site.wait_for_function("() => document.getElementById('projCode').value.startsWith('QX1.')")
    opened = decode_wavefunction(site.input_value("#projCode"))
    assert (opened["base"], opened["d"], opened["L"]) == (tuned["base"], tuned["d"], tuned["L"])


def test_the_paint_sheet_is_an_svg_with_both_feet(site):
    enter_pair(site, 6)
    with site.expect_download() as dl:
        site.click("#pairSheet")
    download = dl.value
    assert download.suggested_filename.startswith("qontext-pair-world-") and download.suggested_filename.endswith(
        ".svg"
    )
    text = open(download.path(), encoding="utf-8").read()
    assert text.startswith("<svg")
    assert len(re.findall(r"#[0-9a-f]{6}", text)) >= 18
    assert text.count("oklch(") == 18
    for name in [
        "Laces",
        "Tongue",
        "Collar",
        "Toe box",
        "Stripe",
        "Heel counter",
        "Toe bumper",
        "Midsole",
        "Heel sole",
    ]:
        assert name in text


def test_steps_come_alive_in_order(site):
    for n in range(1, 7):
        enter_pair(site, n)
        site.wait_for_function(f"() => document.getElementById('pairStage').dataset.step === '{n}'")
        assert site.locator(".pair-step.on").count() == 1
        assert site.get_attribute(".pair-step.on", "data-step") == str(n)


def test_step_three_shows_the_stripe_in_full(site):
    enter_pair(site, 3)
    site.wait_for_function("() => document.getElementById('pairStage').dataset.step === '3'")
    stripe = site.get_attribute("#pairStage", "data-stripe").split()
    stops = site.eval_on_selector_all("#pg-R-stripe stop", "els => els.map((e) => e.getAttribute('stop-color'))")
    # The stripe's two outcomes at full strength (before the leather), not the pale unpainted tint.
    assert len(stops) == 2 and all(s not in stripe for s in stops)
    assert site.eval_on_selector("#pairSvg", "(s) => s.classList.contains('focus-stripe')")


def test_pair_fits_a_phone(site_phone):
    enter_pair(site_phone, 3)
    site_phone.wait_for_function("() => document.getElementById('pairStage').dataset.step === '3'")
    assert site_phone.evaluate("document.documentElement.scrollWidth") <= 390
    top = site_phone.evaluate("document.getElementById('pairStage').getBoundingClientRect().top")
    assert 50 <= top <= 90


def test_pair_under_reduced_motion(browser):
    from conftest import SITE, _new_page

    errors = []
    ctx, page = _new_page(browser, {"width": 1440, "height": 900}, errors)
    page.emulate_media(reduced_motion="reduce")
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    enter_pair(page, 4)
    page.click("#pairPaintAll")
    page.wait_for_function(ALL_PAINTED, timeout=1000)
    running = page.evaluate(
        "document.getAnimations().filter((a) => document.getElementById('pair').contains(a.effect.target)).length"
    )
    assert running == 0
    ctx.close()
    assert errors == []
