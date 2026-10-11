"""Browser fixtures for the Studio end-to-end tests (Playwright, Chromium)."""

import os
import pathlib

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
STUDIO = (ROOT / "dist" / "studio.html").as_uri()
SITE = (ROOT / "dist" / "index.html").as_uri()
DEMO = (ROOT / "examples" / "runtime-demo.html").as_uri()

if "PLAYWRIGHT_BROWSERS_PATH" not in os.environ and pathlib.Path("/opt/pw-browsers").exists():
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"

from localfonts import install as install_fonts  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402


@pytest.fixture(scope="session")
def browser():
    if not (ROOT / "dist" / "studio.html").exists():
        pytest.fail("dist/ is missing. Run `npm run build` first.")
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


def _new_page(browser, viewport, errors):
    ctx = browser.new_context(viewport=viewport)
    page = ctx.new_page()
    # Fonts come from Google Fonts in production; tests serve the same faces from node_modules.
    install_fonts(page)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None,
    )
    return ctx, page


@pytest.fixture()
def errors():
    return []


@pytest.fixture()
def page(browser, errors):
    ctx, page = _new_page(browser, {"width": 1280, "height": 900}, errors)
    page.goto(STUDIO)
    page.wait_for_selector("#cell00")
    yield page
    ctx.close()
    assert errors == [], f"Browser errors: {errors}"


@pytest.fixture()
def phone(browser, errors):
    ctx, page = _new_page(browser, {"width": 390, "height": 844}, errors)
    page.goto(STUDIO)
    page.wait_for_selector("#cell00")
    yield page
    ctx.close()
    assert errors == [], f"Browser errors: {errors}"


@pytest.fixture()
def site(browser, errors):
    ctx, page = _new_page(browser, {"width": 1440, "height": 900}, errors)
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    yield page
    ctx.close()
    assert errors == [], f"Browser errors: {errors}"


@pytest.fixture()
def site_phone(browser, errors):
    ctx, page = _new_page(browser, {"width": 390, "height": 844}, errors)
    page.goto(SITE)
    page.wait_for_selector("#plan .cellwrap")
    yield page
    ctx.close()
    assert errors == [], f"Browser errors: {errors}"
