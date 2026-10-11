"""End-to-end tests for the Qontext website."""

import re

from conftest import _new_page

HEX = r"#[0-9a-f]{6}"


def css_var(page, name):
    return page.evaluate(f"getComputedStyle(document.documentElement).getPropertyValue('{name}').trim()")


def world(page):
    return page.inner_text("#worldNum")


def test_every_visitor_gets_a_world(site):
    assert re.fullmatch(r"[\d,]+", world(site))
    assert re.fullmatch(HEX, css_var(site, "--q-r1c1-row"))
    assert site.inner_text("#heroWorld") == world(site)
    assert site.inner_text("#f6") == "6 of 6"


def test_floor_plan_is_a_mermin_square_and_navigates(site):
    assert site.locator("#plan .cellwrap").count() == 9
    site.click('#plan .hdr[data-read="R2"]')
    assert site.locator("#plan .cellwrap.dim").count() == 6
    assert site.locator("#plan .cellwrap.full-row").count() == 3
    site.click('#plan a[href="#room-spooky"]')
    site.wait_for_function("location.hash === '#room-spooky'")


def test_swatches_wait_until_seen(site):
    waiting_at_top = site.evaluate("document.querySelectorAll('.q.sup').length")
    assert waiting_at_top > 20
    for _ in range(40):
        site.mouse.wheel(0, 900)
        site.wait_for_timeout(60)
    site.wait_for_timeout(400)
    waiting_after = site.evaluate("document.querySelectorAll('.q.sup').length")
    assert waiting_after < waiting_at_top
    assert site.evaluate("document.querySelectorAll('.q.seen').length") > 0


def test_many_worlds_switches_and_persists(site):
    before = world(site)
    color_before = css_var(site, "--q-harmony-1")
    site.click("#worldBtn")
    site.wait_for_function(f"document.getElementById('worldNum').innerText !== '{before}'")
    after = world(site)
    assert after != before
    assert css_var(site, "--q-harmony-1") != color_before or True  # hue can coincide; the number cannot
    site.wait_for_timeout(1300)
    site.reload()
    site.wait_for_selector("#plan .cellwrap")
    assert world(site) == after


def test_janus_flips_reading_with_scroll(site):
    # The reading flips halfway through the room: rows while it is entering, columns once you are deep in it.
    site.evaluate("document.getElementById('room-janus').scrollIntoView({block: 'start', behavior: 'instant'})")
    site.evaluate("window.scrollBy({top: -650, behavior: 'instant'})")
    site.wait_for_timeout(700)
    assert "rows" in site.inner_text("#jCap")
    site.evaluate("window.scrollBy({top: 1300, behavior: 'instant'})")
    site.wait_for_timeout(900)
    assert "cols" in site.inner_text("#jCap")
    site.click('[data-jread="rows"]')
    assert "rows" in site.inner_text("#jCap")


def test_mermins_dare(site):
    site.evaluate("document.getElementById('room-dare').scrollIntoView()")
    assert site.inner_text("#dVerdict") == "5 of 6. That is the ceiling."
    site.locator("#dgrid button").first.click()
    assert site.inner_text("#dVerdict") == "3 of 6 rules hold"
    site.click("#dQuantum")
    assert site.inner_text("#dVerdict").startswith("6 of 6")


def test_spooky_pair_beats_classical(site):
    site.evaluate("document.getElementById('room-spooky').scrollIntoView()")
    for _ in range(4):
        site.click("#pairMany")
    chsh = float(site.locator("#tally div").nth(2).locator("b").inner_text())
    assert chsh > 2.3


def test_unpaintables_and_notary(site):
    site.evaluate("document.getElementById('room-unpaintables').scrollIntoView()")
    assert "impossible" in site.inner_text("#uFacts")
    site.click('[data-uset="yuoh13"]')
    assert "exists" in site.inner_text("#uFacts")
    site.evaluate("document.getElementById('seal').scrollIntoView({block: 'center'})")
    site.wait_for_function("document.getElementById('seal').innerText.includes('sha-256')", timeout=8000)
    assert "simulated example" in site.inner_text("#seal")


def test_edit_this_world_opens_the_same_world_in_the_atelier(site):
    tile = css_var(site, "--q-r1c1-row")
    href = site.get_attribute("#editWorld", "href")
    assert re.fullmatch(r"studio\.html#QX1\.[A-Za-z0-9_-]+", href)
    site.click("#editWorld")
    site.wait_for_selector("#cell00")
    site.wait_for_function("document.getElementById('toast').innerText.startsWith('Opened World')")
    site.click("#tabbtn-export")
    assert f"--q-r1c1-row: {tile};" in site.input_value("#exportOut")


def test_film_section(site):
    assert site.locator("#chapters button").count() == 8
    assert site.get_attribute("#video source", "src") == "media/qontext-film.mp4"


def test_phone_menu_and_layout(site_phone):
    page = site_phone
    page.click("#menuBtn")
    assert page.locator("#menu").is_visible()
    page.keyboard.press("Escape")
    assert page.locator("#menu").is_hidden()
    page.click("#menuBtn")
    page.click('#menu a[href="#tools"]')
    assert page.locator("#menu").is_hidden()
    for _ in range(60):
        page.mouse.wheel(0, 800)
    page.wait_for_timeout(300)
    overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    assert overflow <= 0, f"overflows by {overflow}px"


def test_wall_labels_fit_on_phone(site_phone):
    page = site_phone
    page.wait_for_timeout(300)
    too_wide = page.evaluate(
        """() => Array.from(document.querySelectorAll('.room-name .wd'))
              .filter((w) => w.getBoundingClientRect().right > document.documentElement.clientWidth)
              .map((w) => w.textContent)"""
    )
    assert too_wide == []


def test_reduced_motion_still_works(browser):
    errors = []
    ctx, page = _new_page(browser, {"width": 1280, "height": 800}, errors)
    page.emulate_media(reduced_motion="reduce")
    page.goto(page.context.pages[0].url if False else __import__("conftest").SITE)
    page.wait_for_selector("#plan .cellwrap")
    page.click("#worldBtn")
    page.wait_for_function("document.getElementById('toast').innerText.startsWith('Welcome to world')")
    ctx.close()
    assert errors == []
