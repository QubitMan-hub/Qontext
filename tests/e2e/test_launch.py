"""The files a public website needs beyond its pages: link previews, icons, the sitemap, robots.txt, Cloudflare
Pages' headers and redirects, Vacuum (the 404 page) and Unobserved (the privacy page)."""

import json
import pathlib
import re
import struct

import pytest
from conftest import SITE, _new_page

ROOT = pathlib.Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"
HOME = json.loads((ROOT / "package.json").read_text())["homepage"].rstrip("/")
PUBLIC = {"index.html": "/", "studio.html": "/studio", "privacy.html": "/privacy"}
BASE = SITE.rsplit("/", 1)[0]


def meta(html, attr, key):
    m = re.search(rf'<meta {attr}="{re.escape(key)}" content="([^"]*)"', html)
    return m and m.group(1)


def png_size(path):
    w, h = struct.unpack(">II", path.read_bytes()[16:24])
    return w, h


@pytest.mark.parametrize("page", list(PUBLIC))
def test_every_public_page_has_a_link_preview_and_icons(page):
    html = (DIST / page).read_text()
    assert f'<link rel="canonical" href="{HOME}{PUBLIC[page]}">' in html
    assert meta(html, "property", "og:url") == HOME + PUBLIC[page]
    assert meta(html, "property", "og:image") == f"{HOME}/og.png"
    assert meta(html, "property", "og:title") == re.search(r"<title>([^<]+)</title>", html).group(1)
    assert 50 <= len(meta(html, "name", "description")) <= 170
    assert meta(html, "name", "twitter:card") == "summary_large_image"
    for icon in re.findall(r'<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"', html):
        assert (DIST / icon).is_file(), icon
    assert png_size(DIST / "og.png") == (1200, 630)
    assert png_size(DIST / "apple-touch-icon.png") == (180, 180)


def test_sitemap_lists_every_public_page_and_robots_points_to_it():
    locs = re.findall(r"<loc>([^<]+)</loc>", (DIST / "sitemap.xml").read_text())
    assert locs == [HOME + path for path in PUBLIC.values()]
    assert f"Sitemap: {HOME}/sitemap.xml" in (DIST / "robots.txt").read_text()


def test_cloudflare_headers_and_redirects():
    headers = (DIST / "_headers").read_text()
    assert headers.startswith("/*\n")
    assert "Content-Security-Policy: frame-ancestors 'none'" in headers
    assert "X-Content-Type-Options: nosniff" in headers
    # The fragment build is for the Claude artifact host only; on the public site it leads home.
    assert "/artifact / 301" in (DIST / "_redirects").read_text()


@pytest.mark.parametrize("page", ["404.html", "privacy.html"])
def test_static_pages_run_no_script(page):
    html = (DIST / page).read_text()
    policy = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', html).group(1)
    assert "default-src 'none'" in policy
    assert "script-src" not in policy
    assert "<script" not in html


@pytest.mark.parametrize("width", [390, 1440])
@pytest.mark.parametrize("page,name", [("404.html", "Vacuum"), ("privacy.html", "Unobserved")])
def test_static_pages_fit_and_link_home(browser, page, name, width):
    errors = []
    ctx, tab = _new_page(browser, {"width": width, "height": 900}, errors)
    tab.goto(f"{BASE}/{page}")
    assert tab.inner_text("h1") == name
    assert tab.evaluate("document.documentElement.scrollWidth") <= width
    assert tab.locator("header a").get_attribute("href") in ("/", "index.html")
    ctx.close()
    assert errors == []


def test_site_footer_leads_to_privacy_license_and_contact(browser):
    errors = []
    ctx, page = _new_page(browser, {"width": 1440, "height": 900}, errors)
    page.goto(SITE)
    links = page.eval_on_selector_all(".foot-end nav a", "els => els.map((a) => a.textContent)")
    assert links == ["Privacy", "License", "Contact", "Source"]
    page.click(".foot-end nav a >> text=Privacy")
    page.wait_for_selector("h1:has-text('Unobserved')")
    ctx.close()
    assert errors == []
