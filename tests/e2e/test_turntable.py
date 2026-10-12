"""Turntable: the Pair Production sneakers in 3D. The design arrives in the address as a Wavefunction, and the pair
on the platter must be exactly the pair the showcase painted."""

import base64
import io
import json

import numpy as np
from conftest import SITE
from PIL import Image
from test_pair import decode_wavefunction, enter_pair, feet, paint_all, turn

BASE = SITE.rsplit("/", 1)[0]
READY = "#ttStage[data-ready='true']"


def open_turntable(browser, errors, code="", viewport=None, motion="reduce"):
    """Opens Turntable. Motion is reduced unless a test needs the spin: software WebGL draws each frame slowly."""
    ctx = browser.new_context(viewport=viewport or {"width": 1440, "height": 900}, reduced_motion=motion)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(f"{BASE}/turntable.html{'#' + code if code else ''}")
    page.wait_for_selector("#ttStage[data-ready]", timeout=30000)
    return ctx, page


def table(page):
    """{panel: (left hex, right hex)} as the page lists them."""
    rows = page.eval_on_selector_all(
        "#ttPanels tbody tr",
        "rs => rs.map((r) => [r.dataset.panel, [...r.querySelectorAll('td')].map((t) => t.dataset.hex)])",
    )
    return {panel: tuple(hexes) for panel, hexes in rows}


def colorful(png):
    """Share of the picture's pixels that are clearly colored (the painted panels), not grey, white or the band."""
    hsv = np.asarray(Image.open(io.BytesIO(png)).convert("HSV").resize((240, 135)))
    return ((hsv[..., 1] > 90) & (hsv[..., 2] > 120)).mean()


def test_step_six_puts_your_pair_on_the_turntable(site):
    enter_pair(site, 4)
    paint_all(site)
    enter_pair(site, 6)
    link = site.locator("#pairTurntable")
    href = link.get_attribute("href")
    assert href.startswith("turntable.html#QX1.")
    assert decode_wavefunction(href) == decode_wavefunction(site.get_attribute("#pairAtelier", "href"))
    left, right = feet(site)
    link.click()
    site.wait_for_selector(READY, timeout=30000)
    shown = table(site)
    assert {k: v[0] for k, v in shown.items()} == left
    assert {k: v[1] for k, v in shown.items()} == right
    differ = site.eval_on_selector_all("#ttPanels tr[data-differ]", "rs => rs.map((r) => r.dataset.panel)")
    assert differ == [k for k in shown if left[k] != right[k]] and differ


def test_a_harmony_turned_past_the_top_of_the_wheel_arrives_intact(browser, errors):
    # World 1,000 starts at hue 335, so a quarter turn passes 360: the design must wrap round, not stop at 360.
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    ctx.add_init_script("sessionStorage.setItem('qontext-site-world', '1000')")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    enter_pair(page, 2)
    turn(page, 90)
    enter_pair(page, 4)
    paint_all(page)
    left, right = feet(page)
    enter_pair(page, 6)
    assert round(decode_wavefunction(page.get_attribute("#pairTurntable", "href"))["base"]) == (335 + 90) % 360
    page.click("#pairTurntable")
    page.wait_for_selector(READY, timeout=30000)
    shown = table(page)
    assert ({k: v[0] for k, v in shown.items()}, {k: v[1] for k, v in shown.items()}) == (left, right)
    ctx.close()
    assert errors == []


def test_the_pair_is_drawn_in_its_colors(browser, errors):
    ctx, page = open_turntable(browser, errors)
    assert page.get_attribute("#ttStage", "data-ready") == "true"
    assert page.locator("#ttLoading").is_hidden()
    shot = page.locator("#ttView canvas").screenshot()
    assert colorful(shot) > 0.04
    ctx.close()
    assert errors == []


def test_one_foot_at_a_time(browser, errors):
    ctx, page = open_turntable(browser, errors)
    pair = page.locator("#ttView canvas").screenshot()
    page.click("button[data-show='left']")
    assert page.get_attribute("#ttStage", "data-show") == "left"
    assert page.get_attribute("button[data-show='left']", "aria-pressed") == "true"
    assert page.get_attribute("button[data-show='pair']", "aria-pressed") == "false"
    page.wait_for_timeout(200)
    assert page.locator("#ttView canvas").screenshot() != pair
    ctx.close()
    assert errors == []


def test_pointing_at_a_panel_reads_it(browser, errors):
    ctx, page = open_turntable(browser, errors)
    page.click("button[data-show='right']")
    box = page.locator("#ttView canvas").bounding_box()
    page.mouse.move(box["x"] + box["width"] * 0.5, box["y"] + box["height"] * 0.5)
    page.wait_for_function("() => document.getElementById('ttReadout').textContent.includes('right foot')")
    text = page.inner_text("#ttReadout")
    active = page.get_attribute("#ttPanels tr[data-active]", "data-panel")
    name = page.inner_text(f"#ttPanels tr[data-panel='{active}'] th").split(" (")[0]
    assert text.startswith(f"{name}, right foot: #")
    ctx.close()
    assert errors == []


def test_the_keyboard_turns_and_zooms(browser, errors):
    ctx, page = open_turntable(browser, errors)
    page.focus("#ttView")
    before = page.locator("#ttView canvas").screenshot()
    page.keyboard.press("ArrowRight")
    first = int(page.get_attribute("#ttStage", "data-azimuth"))
    page.keyboard.press("ArrowRight")
    assert int(page.get_attribute("#ttStage", "data-azimuth")) > first
    assert page.get_attribute("#ttStage", "data-spin") == "false"
    page.keyboard.press("+")
    page.wait_for_timeout(300)
    assert page.locator("#ttView canvas").screenshot() != before
    ctx.close()
    assert errors == []


def test_it_spins_unless_motion_is_reduced(browser, errors):
    ctx, page = open_turntable(browser, errors, viewport={"width": 390, "height": 600}, motion="no-preference")
    assert page.get_attribute("#ttStage", "data-spin") == "true"
    page.click("#ttSpin")
    assert page.get_attribute("#ttStage", "data-spin") == "false"
    assert page.get_attribute("#ttSpin", "aria-pressed") == "false"
    ctx.close()
    ctx, page = open_turntable(browser, errors)
    assert page.get_attribute("#ttStage", "data-spin") == "false"
    ctx.close()
    assert errors == []


def test_a_broken_link_shows_your_own_world(browser, errors):
    ctx, page = open_turntable(browser, errors, code="QX1.not-a-pair")
    assert page.locator("#ttNotice").is_visible()
    assert "your own world" in page.inner_text("#ttNotice")
    assert len(table(page)) == 9
    ctx.close()
    assert errors == []


def test_a_garbled_link_shows_your_own_world(browser, errors):
    # Broken percent-encoding, as a chat app can leave behind when it cuts a long link short.
    ctx, page = open_turntable(browser, errors, code="QX1.%E0%A4%A")
    assert page.get_attribute("#ttStage", "data-ready") == "true"
    assert "your own world" in page.inner_text("#ttNotice")
    assert len(table(page)) == 9
    ctx.close()
    assert errors == []


def test_a_new_code_repaints_the_pair(browser, errors):
    ctx, page = open_turntable(browser, errors)
    before = table(page)
    design = decode_wavefunction(page.get_attribute("#ttAtelier", "href"))
    body = json.dumps({**design, "base": 40, "measureSeed": 99}).encode()
    other = "QX1." + base64.urlsafe_b64encode(body).decode().rstrip("=")
    page.evaluate("(c) => { location.hash = c; }", other)
    first = next(iter(before.values()))[0]
    page.wait_for_function("(b) => document.querySelector('#ttPanels td').dataset.hex !== b", arg=first)
    assert table(page) != before
    assert decode_wavefunction(page.get_attribute("#ttAtelier", "href"))["measureSeed"] == 99
    ctx.close()
    assert errors == []


def test_without_webgl_the_pair_stands_side_on(browser, errors):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    ctx.add_init_script(
        "const get = HTMLCanvasElement.prototype.getContext;"
        "HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {"
        "  return /webgl/.test(kind) ? null : get.call(this, kind, ...rest);"
        "};"
    )
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/turntable.html")
    page.wait_for_selector("#ttStage[data-ready='flat']", timeout=30000)
    assert page.locator("#ttView canvas[role='img']").count() == 2
    assert "cannot draw in 3D" in page.inner_text("#ttLoading")
    assert page.get_attribute("#ttView", "role") is None
    ctx.close()
    assert errors == []


def test_turntable_fits_a_phone(browser, errors):
    ctx, page = open_turntable(browser, errors, viewport={"width": 390, "height": 844})
    assert page.evaluate("document.documentElement.scrollWidth") <= 390
    view = page.locator("#ttView").bounding_box()
    assert view["height"] >= 340
    assert colorful(page.locator("#ttView canvas").screenshot()) > 0.04
    ctx.close()
    assert errors == []
