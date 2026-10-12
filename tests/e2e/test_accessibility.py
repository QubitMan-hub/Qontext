"""Accessibility: axe-core (the engine behind Deque's Axe tools) scans the site and the Atelier on a phone and a
desktop, in light and dark, against WCAG 2.2 A and AA. Any violation fails the build.

The site is scrolled end to end first, so every room has woken up and is checked, not just the first screen.
"""

import pathlib

import pytest
from conftest import SITE, STUDIO, _new_page

ROOT = pathlib.Path(__file__).resolve().parents[2]
AXE = (ROOT / "node_modules" / "axe-core" / "axe.min.js").read_text()
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
VIEWPORTS = {"desktop": {"width": 1440, "height": 900}, "phone": {"width": 390, "height": 844}}


def wake_every_room(page):
    """Walks the whole page so lazily built rooms and sections exist before the scan. Jumps are instant: the
    page scrolls smoothly by default, and a scan taken mid-glide would catch the Compass half faded."""
    height = page.evaluate("document.documentElement.scrollHeight")
    y = 0
    while y < height:
        page.evaluate(f"window.scrollTo({{top: {y}, behavior: 'instant'}})")
        page.wait_for_timeout(40)
        y += 500
        height = page.evaluate("document.documentElement.scrollHeight")
    page.wait_for_timeout(400)
    page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    page.wait_for_function("() => !document.getElementById('compass')?.classList.contains('on')")
    page.wait_for_timeout(400)


def scan(page):
    # Evaluated through the DevTools protocol, so the pages' Content Security Policy does not block it. axe's
    # stylesheet download (preload) is off: the policy rightly refuses it, and no WCAG rule here needs it.
    page.evaluate(AXE)
    return page.evaluate(
        """(tags) => axe.run(document, {
            runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'], preload: false,
          }).then((r) => r.violations.map((v) => ({
            id: v.id, impact: v.impact, help: v.help,
            nodes: v.nodes.slice(0, 6).map((n) => n.target.join(' ')),
            count: v.nodes.length,
          })))""",
        TAGS,
    )


def report(violations):
    return "\n".join(f"{v['id']} ({v['impact']}, {v['count']}x): {v['help']}\n    {v['nodes']}" for v in violations)


@pytest.mark.parametrize("scheme", ["light", "dark"])
@pytest.mark.parametrize("size", list(VIEWPORTS))
def test_site_has_no_axe_violations(browser, size, scheme):
    errors = []
    ctx, page = _new_page(browser, VIEWPORTS[size], errors)
    page.emulate_media(color_scheme=scheme)
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    wake_every_room(page)
    violations = scan(page)
    ctx.close()
    assert violations == [], report(violations)
    assert errors == []


@pytest.mark.parametrize("phase", [90, 270])
@pytest.mark.parametrize("size", list(VIEWPORTS))
def test_site_reads_at_dusk(browser, size, phase):
    """90 and 270 degrees are the Phase Dial's hardest angles: the walls sit near the band where no ink reads."""
    errors = []
    ctx, page = _new_page(browser, VIEWPORTS[size], errors)
    page.add_init_script(f"localStorage.setItem('qontext:phase', '{phase}')")
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    assert page.evaluate("document.documentElement.dataset.phase") == str(phase)
    wake_every_room(page)
    violations = scan(page)
    # The dial itself, open.
    page.click("#phaseBtn")
    violations += scan(page)
    page.keyboard.press("Escape")
    # A new world brings new tiles to the Wall Wash, and Bouncer checks again.
    page.click("#worldBtn")
    page.wait_for_function("() => document.getElementById('toast').innerText.startsWith('Welcome')")
    page.wait_for_timeout(1300)
    wake_every_room(page)
    violations += scan(page)
    ctx.close()
    assert violations == [], report(violations)
    assert errors == []


@pytest.mark.parametrize("scheme", ["light", "dark"])
@pytest.mark.parametrize("size", list(VIEWPORTS))
def test_atelier_has_no_axe_violations(browser, size, scheme):
    errors = []
    ctx, page = _new_page(browser, VIEWPORTS[size], errors)
    page.emulate_media(color_scheme=scheme)
    page.goto(STUDIO)
    page.wait_for_selector("#cell00")
    violations = []
    # Every tab is its own screen, so each one is scanned while it is showing.
    for tab in page.eval_on_selector_all("button[role=tab][data-tab]", "els => els.map((e) => e.dataset.tab)"):
        page.click(f"#tabbtn-{tab}")
        page.wait_for_timeout(250)
        for v in scan(page):
            v["help"] = f"[{tab}] {v['help']}"
            violations.append(v)
    ctx.close()
    assert violations == [], report(violations)
    assert errors == []


@pytest.mark.parametrize("scheme", ["light", "dark"])
@pytest.mark.parametrize("size", list(VIEWPORTS))
@pytest.mark.parametrize("page_name", ["404.html", "privacy.html"])
def test_static_pages_have_no_axe_violations(browser, page_name, size, scheme):
    errors = []
    ctx, page = _new_page(browser, VIEWPORTS[size], errors)
    page.emulate_media(color_scheme=scheme)
    page.goto(SITE.rsplit("/", 1)[0] + "/" + page_name)
    violations = scan(page)
    ctx.close()
    assert violations == [], report(violations)
    assert errors == []


@pytest.mark.parametrize("scheme", ["light", "dark"])
@pytest.mark.parametrize("size", list(VIEWPORTS))
def test_turntable_has_no_axe_violations(browser, size, scheme):
    errors = []
    ctx, page = _new_page(browser, VIEWPORTS[size], errors)
    page.emulate_media(color_scheme=scheme, reduced_motion="reduce")
    page.goto(SITE.rsplit("/", 1)[0] + "/turntable.html")
    page.wait_for_selector("#ttStage[data-ready='true']", timeout=30000)
    violations = scan(page)
    ctx.close()
    assert violations == [], report(violations)
    assert errors == []


def test_site_skip_link_and_menu_work_by_keyboard(browser):
    errors = []
    ctx, page = _new_page(browser, VIEWPORTS["phone"], errors)
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    page.keyboard.press("Tab")
    assert page.evaluate("document.activeElement.classList.contains('skip')")
    page.keyboard.press("Enter")
    page.wait_for_function("() => location.hash === '#main'")
    # The menu opens from the keyboard, takes focus, and gives it back on Escape.
    page.focus("#menuBtn")
    page.keyboard.press("Enter")
    assert page.evaluate("document.getElementById('menu').contains(document.activeElement)")
    page.keyboard.press("Escape")
    assert page.evaluate("document.activeElement.id") == "menuBtn"
    ctx.close()
    assert errors == []


def test_text_never_sits_on_a_fading_background(site):
    """A fade between two accents passes through mid-tones neither ink can read, so buttons switch instantly."""
    site.evaluate("document.getElementById('room-spooky').scrollIntoView({behavior: 'instant'})")
    site.wait_for_selector("#room-spooky[data-ready]", state="attached")
    for _ in range(3):
        site.click("#pairBtn")
        shown = site.evaluate(
            "['aCta', 'bCta'].map((id) => { const e = document.getElementById(id); "
            "return [e.style.backgroundColor, getComputedStyle(e).backgroundColor]; })"
        )
        for target, computed in shown:
            assert computed == target, f"button shows {computed} on its way to {target}"
