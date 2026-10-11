"""End-to-end tests for the Qontext website."""

import re

from conftest import SITE, _new_page

HEX = r"#[0-9a-f]{6}"


def enter(page, room, block="start"):
    """Walks into a room. Rooms are built only when a visitor gets near, so wait until this one is."""
    page.evaluate(f"document.getElementById('room-{room}').scrollIntoView({{block: '{block}', behavior: 'instant'}})")
    page.wait_for_selector(f"#room-{room}[data-ready]", state="attached")


def css_var(page, name):
    return page.evaluate(f"getComputedStyle(document.documentElement).getPropertyValue('{name}').trim()")


def world(page):
    return page.inner_text("#worldNum")


def test_every_visitor_gets_a_world(site):
    assert re.fullmatch(r"[\d,]+", world(site))
    assert re.fullmatch(HEX, css_var(site, "--q-r1c1-row"))
    assert site.inner_text("#heroWorld") == world(site)
    assert site.inner_text("#planRules") == "6 of 6"
    assert int(site.inner_text("#planWaiting")) > 0


def test_floor_plan_is_a_mermin_square_and_navigates(site):
    assert site.locator("#plan .cellwrap").count() == 9
    site.click('#plan .hdr[data-read="R2"]')
    assert site.locator("#plan .cellwrap.dim").count() == 6
    assert site.locator("#plan .cellwrap.full-row").count() == 3
    site.click('#plan a[href="#room-spooky"]')
    site.wait_for_function("() => location.hash === '#room-spooky'")


def test_swatches_wait_until_seen(site):
    waiting_at_top = site.evaluate("document.querySelectorAll('.q.sup').length")
    assert waiting_at_top > 10
    for _ in range(40):
        site.mouse.wheel(0, 900)
        site.wait_for_timeout(60)
    site.wait_for_timeout(400)
    waiting_after = site.evaluate("document.querySelectorAll('.q.sup').length")
    assert waiting_after < waiting_at_top
    assert site.evaluate("document.querySelectorAll('.q.seen').length") > 0


def test_many_worlds_switches_and_persists(site):
    before = world(site)
    site.click("#worldBtn")
    site.wait_for_function(f"() => document.getElementById('worldNum').innerText !== '{before}'")
    after = world(site)
    assert after != before
    assert re.fullmatch(HEX, css_var(site, "--q-harmony-1"))
    site.wait_for_timeout(1300)
    site.reload()
    site.wait_for_selector("#plan .cellwrap")
    assert world(site) == after


def test_janus_flips_reading_with_scroll(site):
    # The reading flips halfway through the room: rows while it is entering, columns once you are deep in it.
    enter(site, "janus")
    site.evaluate("window.scrollBy({top: -650, behavior: 'instant'})")
    site.wait_for_timeout(700)
    assert "rows" in site.inner_text("#jCap")
    site.evaluate("window.scrollBy({top: 1300, behavior: 'instant'})")
    site.wait_for_timeout(900)
    assert "cols" in site.inner_text("#jCap")
    site.click('[data-jread="rows"]')
    assert "rows" in site.inner_text("#jCap")


def test_mermins_dare(site):
    enter(site, "dare")
    assert site.inner_text("#dVerdict") == "5 of 6. That is the ceiling."
    site.locator("#dgrid button").first.click()
    assert site.inner_text("#dVerdict") == "3 of 6 rules hold"
    site.click("#dQuantum")
    assert site.inner_text("#dVerdict").startswith("6 of 6")


def test_spooky_pair_beats_classical(site):
    enter(site, "spooky")
    for _ in range(4):
        site.click("#pairMany")
    chsh = float(site.locator("#tally div").nth(2).locator("b").inner_text())
    assert chsh > 2.3


def test_unpaintables_and_notary(site):
    enter(site, "unpaintables")
    assert "impossible" in site.inner_text("#uFacts")
    site.click('[data-uset="yuoh13"]')
    assert "exists" in site.inner_text("#uFacts")
    enter(site, "notary", "center")
    site.wait_for_function("() => document.getElementById('seal').innerText.includes('sha-256')", timeout=8000)
    assert "simulated example" in site.inner_text("#seal")


def test_edit_this_world_opens_the_same_world_in_the_atelier(site):
    tile = css_var(site, "--q-r1c1-row")
    href = site.get_attribute("#editWorld", "href")
    assert re.fullmatch(r"studio\.html#QX1\.[A-Za-z0-9_-]+", href)
    site.click("#editWorld")
    site.wait_for_selector("#cell00")
    site.wait_for_function("() => document.getElementById('toast').innerText.startsWith('Opened World')")
    site.click("#tabbtn-export")
    assert f"--q-r1c1-row: {tile};" in site.input_value("#exportOut")


def test_film_section(site):
    assert site.locator("#chapters button").count() == 8
    assert site.get_attribute("#video source", "src") == "media/qontext-film.mp4"
    # Nothing of the film is fetched until the visitor gets near it.
    assert site.evaluate("document.getElementById('video').getAttribute('poster')") is None
    site.evaluate("document.getElementById('film').scrollIntoView({behavior: 'instant'})")
    site.wait_for_function("() => document.getElementById('video').poster.endsWith('media/qontext-film-poster.jpg')")


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
    clipped = page.evaluate(
        """() => Array.from(document.querySelectorAll('#plan .cell .name'))
              .filter((n) => n.scrollWidth > n.clientWidth + 1)
              .map((n) => n.textContent)"""
    )
    assert clipped == []


def test_reduced_motion_still_works(browser):
    errors = []
    ctx, page = _new_page(browser, {"width": 1280, "height": 800}, errors)
    page.emulate_media(reduced_motion="reduce")
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    # At rest nothing moves: no shimmer, no collapse canvas, and wall labels are plain text.
    assert page.evaluate("document.querySelector('.field-measure').hidden")
    assert not page.evaluate("document.documentElement.classList.contains('thresholds')")
    enter(page, "pentacle")
    assert page.inner_text("#pentaSum") == "2.236"
    page.click("#worldBtn")
    page.wait_for_function("() => document.getElementById('toast').innerText.startsWith('Welcome to world')")
    ctx.close()
    assert errors == []


def test_rooms_sleep_until_a_visitor_gets_near(site):
    assert site.evaluate("document.querySelectorAll('.room[data-ready]').length") < 3
    assert site.text_content("#obsVars") == ""
    enter(site, "observer")
    assert site.locator("#obsVars div").count() == 6
    assert re.search(HEX, site.inner_text("#obsVars"))


def test_traversal_compass_wash_and_thresholds(site):
    assert not site.locator("#compass").is_visible()
    enter(site, "fringe")
    site.wait_for_function("() => document.querySelector('#compass.on')")
    assert site.get_attribute('#compass .cmp[aria-current="location"]', "aria-label") == "Fringe"
    assert site.inner_text("#compass .cmp-name") == "Fringe"
    assert site.evaluate("document.getElementById('navMark').classList.contains('rooms')")
    site.wait_for_function("() => document.querySelectorAll('.wash i.on').length === 1")
    tone = site.evaluate("document.querySelector('.wash i.on').style.getPropertyValue('--c')")
    assert tone == css_var(site, "--q-r2c1-col")  # Fringe is tile r2c1, read by columns
    # Thresholds: the wall label entered, and screen readers still get the plain name.
    site.wait_for_function("() => document.getElementById('room-fringe').classList.contains('in')")
    assert site.get_attribute("#t-fringe", "data-threshold") == "wave"
    assert site.inner_text("#t-fringe .sr-only") == "Fringe"
    # The Compass is a way around: jump to Observer.
    site.click('#compass a[href="#room-observer"]')
    site.wait_for_function(
        "() => document.querySelector('#compass .cmp[aria-current]')?.getAttribute('aria-label') === 'Observer'"
    )
    assert site.locator("#compass .cmp.seen").count() >= 2


def test_content_security_policy_blocks_injected_scripts(site, errors):
    policy = site.get_attribute('meta[http-equiv="Content-Security-Policy"]', "content")
    assert "script-src 'sha256-" in policy and "default-src 'none'" in policy
    site.evaluate(
        """() => {
          const s = document.createElement('script');
          s.textContent = 'window.__injected = true';
          document.body.append(s);
        }"""
    )
    site.wait_for_timeout(100)
    assert site.evaluate("window.__injected === undefined")
    # The refusal is reported on the console; that report is the expected outcome here.
    refused = [e for e in errors if "Content Security Policy" in e]
    assert refused
    errors[:] = [e for e in errors if e not in refused]


def phase_of(page):
    return page.evaluate("document.documentElement.dataset.phase")


def open_site(browser, errors, scheme="light", init=None):
    ctx, page = _new_page(browser, {"width": 1280, "height": 800}, errors)
    page.emulate_media(color_scheme=scheme)
    if init:
        page.add_init_script(init)
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    return ctx, page


def test_phase_defaults_to_the_system_and_remembers_a_turn(browser):
    errors = []
    ctx, page = open_site(browser, errors)
    assert phase_of(page) == "0"
    assert css_var(page, "--paper") == "#eef0f4"
    page.evaluate("localStorage.setItem('qontext:phase', '90')")
    page.reload()
    page.wait_for_selector("#plan .cellwrap")
    assert phase_of(page) == "90"
    assert css_var(page, "--paper") != "#eef0f4"
    ctx.close()
    ctx, page = open_site(browser, errors, scheme="dark")
    assert phase_of(page) == "180"
    ctx.close()
    assert errors == []


def test_phase_ignores_bad_stored_values(browser):
    errors = []
    for stored, want in [("abc", "0"), ("999", "279"), ("-5", "355")]:
        ctx, page = open_site(browser, errors, init=f"localStorage.setItem('qontext:phase', '{stored}')")
        assert phase_of(page) == want, stored
        assert css_var(page, "--paper").startswith("#")
        ctx.close()
    assert errors == []


def test_phase_survives_storage_that_throws(browser):
    errors = []
    blocked = "Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });"
    ctx, page = open_site(browser, errors, init=blocked)
    assert phase_of(page) == "0"
    ctx.close()
    assert errors == []


def test_phase_follows_the_system_until_turned(browser):
    errors = []
    ctx, page = open_site(browser, errors)
    page.emulate_media(color_scheme="dark")
    page.wait_for_function("() => document.documentElement.dataset.phase === '180'")
    page.evaluate("localStorage.setItem('qontext:phase', '90')")
    page.reload()
    page.wait_for_selector("#plan .cellwrap")
    page.emulate_media(color_scheme="light")
    page.wait_for_timeout(200)
    assert phase_of(page) == "90"
    ctx.close()
    assert errors == []


def test_phase_dial_by_keyboard(site):
    site.focus("#phaseBtn")
    site.keyboard.press("Enter")
    assert site.locator("#phase").is_visible()
    assert site.evaluate("document.activeElement.id") == "phaseRing"
    ring = "#phaseRing"
    for key, want in [("ArrowRight", "1"), ("Shift+ArrowRight", "16"), ("PageUp", "61"), ("End", "180"), ("Home", "0")]:
        site.keyboard.press(key)
        assert site.get_attribute(ring, "aria-valuenow") == want, key
        assert phase_of(site) == want
    site.keyboard.press("ArrowLeft")
    assert site.get_attribute(ring, "aria-valuenow") == "359"
    assert "°" in site.get_attribute(ring, "aria-valuetext")
    site.keyboard.press("Escape")
    assert site.locator("#phase").is_hidden()
    assert site.evaluate("document.activeElement.id") == "phaseBtn"


def test_phase_dial_buttons_and_line(site):
    site.click("#phaseBtn")
    site.click('#phase [data-phase-to="180"]')
    assert phase_of(site) == "180"
    line = site.inner_text("#phaseLine")
    m = re.fullmatch(r"Phase 180°\. All text reads at (\d+\.\d) : 1 or better\. Bouncer checked all 360 angles\.", line)
    assert m, line
    assert float(m.group(1)) >= 4.5
    assert site.evaluate("localStorage.getItem('qontext:phase')") == "180"
    site.click("#phaseSystem")
    assert site.evaluate("localStorage.getItem('qontext:phase')") is None
    assert phase_of(site) == "0"
