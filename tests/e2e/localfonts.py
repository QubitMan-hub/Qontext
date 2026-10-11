"""Serves the site's Google Fonts from local npm packages, so offline browser runs render the real type.

Used by the end-to-end tests, the screenshot checks and the film recording. Production pages still load
the fonts from Google Fonts.
"""

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
NM = ROOT / "node_modules"

FILES = {
    "anybody.woff2": NM / "@fontsource-variable/anybody/files/anybody-latin-wdth-normal.woff2",
    "instrument.woff2": NM / "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wdth-normal.woff2",
    "plexmono-400.woff2": NM / "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
    "plexmono-500.woff2": NM / "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
}
BASE = "https://fonts.gstatic.com/qontext-local/"

CSS = f"""
@font-face {{ font-family: 'Anybody'; font-style: normal; font-weight: 100 900; font-stretch: 50% 150%;
  src: url({BASE}anybody.woff2) format('woff2'); }}
@font-face {{ font-family: 'Instrument Sans'; font-style: normal; font-weight: 400 700; font-stretch: 75% 100%;
  src: url({BASE}instrument.woff2) format('woff2'); }}
@font-face {{ font-family: 'IBM Plex Mono'; font-style: normal; font-weight: 400;
  src: url({BASE}plexmono-400.woff2) format('woff2'); }}
@font-face {{ font-family: 'IBM Plex Mono'; font-style: normal; font-weight: 500;
  src: url({BASE}plexmono-500.woff2) format('woff2'); }}
"""


def available() -> bool:
    return all(p.exists() for p in FILES.values())


def install(target) -> None:
    """Route font requests for a Playwright page or context. Falls back to blocking them."""
    if not available():
        target.route("**/fonts.googleapis.com/**", lambda r: r.abort())
        target.route("**/fonts.gstatic.com/**", lambda r: r.abort())
        return

    def css(route):
        route.fulfill(status=200, content_type="text/css", body=CSS, headers={"Access-Control-Allow-Origin": "*"})

    def font(route):
        name = route.request.url.rsplit("/", 1)[-1]
        path = FILES.get(name)
        if not path:
            route.abort()
            return
        route.fulfill(status=200, content_type="font/woff2", body=path.read_bytes(), headers={"Access-Control-Allow-Origin": "*"})

    target.route("**/fonts.googleapis.com/**", css)
    target.route("**/fonts.gstatic.com/**", font)
