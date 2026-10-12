"""Pictures of the site for the paper: the painted pair in Pair Production, its drop, and the same pair on the
Turntable. World 4,227,792, as in the other figures. Needs a built dist/ and Playwright's Chromium.

Usage, from the repository root:
    python3 paper/figures/shots.py
"""

import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "tests" / "e2e"))
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")

from PIL import Image  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402
from server import base_url, serve  # noqa: E402

WORLD = "4227792"


def save(png, name, crop=None):
    """A screenshot as a JPEG for the paper, optionally cropped to (left, top, right, bottom) shares."""
    import io

    img = Image.open(io.BytesIO(png)).convert("RGB")
    if crop:
        w, h = img.size
        img = img.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    img.save(HERE / name, "JPEG", quality=88, optimize=True)


def main():
    httpd = serve(ROOT)
    base = base_url(httpd)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        size = {"width": 1440, "height": 900}
        ctx = browser.new_context(viewport=size, device_scale_factor=2, reduced_motion="reduce")
        ctx.add_init_script(f"sessionStorage.setItem('qontext-site-world', '{WORLD}')")
        page = ctx.new_page()
        page.goto(f"{base}/dist/index.html")
        page.wait_for_selector("#plan .cellwrap")
        page.wait_for_function("() => document.fonts.status === 'loaded'")
        page.evaluate("document.querySelector('#pairSteps [data-step=\"4\"]').scrollIntoView({block: 'center'})")
        page.wait_for_selector("#pairSvg path[data-panel]", state="attached")
        page.click("#pairPaintAll")
        page.wait_for_timeout(1500)
        save(page.locator("#pairStage").screenshot(), "fig-pair.jpg")
        page.evaluate("document.querySelector('#pairSteps [data-step=\"5\"]').scrollIntoView({block: 'center'})")
        page.wait_for_timeout(1200)
        save(page.locator("#pairDrop").screenshot(), "fig-drop.jpg", crop=(0, 0, 1, 0.5))  # the first six of twelve
        href = page.get_attribute("#pairTurntable", "href")
        page.goto(f"{base}/dist/{href}")
        page.wait_for_selector("#ttStage[data-ready='true']", timeout=60000)
        page.wait_for_timeout(500)
        save(page.locator("#ttView").screenshot(), "fig-turntable.jpg", crop=(0.22, 0.08, 0.78, 0.96))
        browser.close()
    httpd.shutdown()
    print("pictures written to", HERE)


if __name__ == "__main__":
    main()
