"""Measures how fast the Qontext site is, the way a visitor would feel it.

Usage (after `npm run build`):
    python scripts/perf.py            # phone profile (4x CPU slowdown, 390x844 at 3x) and desktop
    python scripts/perf.py --json     # machine-readable, used by the performance budget tests

Each profile reports:
  boot_ms          navigation start to the site being fully wired (the `qontext:ready` mark)
  long_tasks       main-thread tasks over 50 ms during load, and their total blocking time over 50 ms
  hero_idle        share of the main thread the hero field uses while nobody touches it
  hero_active      the same while a pointer moves across it
  scroll           frames per second and long tasks while scrolling the whole page (a touch fling on the
                   phone profile, mouse wheel steps on desktop)

Headless Chromium rasterizes in software, so absolute frame rates are lower than on real hardware. Compare
runs against each other, not against a device.
"""

import argparse
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests" / "e2e"))
if "PLAYWRIGHT_BROWSERS_PATH" not in os.environ and pathlib.Path("/opt/pw-browsers").exists():
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"

from localfonts import install as install_fonts  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402
from server import base_url, serve  # noqa: E402

PROFILES = {
    "phone": {"viewport": {"width": 390, "height": 844}, "dpr": 3, "cpu": 4, "touch": True},
    "desktop": {"viewport": {"width": 1440, "height": 900}, "dpr": 1, "cpu": 1, "touch": False},
}

INIT = """
window.__perf = { long: [], frames: [] };
try {
  const record = (list) => { for (const e of list.getEntries()) window.__perf.long.push([e.startTime, e.duration]); };
  new PerformanceObserver(record).observe({ type: 'longtask', buffered: true });
} catch (e) {}
"""


def busy(cdp):
    m = {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
    return m["TaskDuration"]


def frames_during(page, fn):
    page.evaluate("""() => { window.__perf.frames = []; window.__perf.on = true;
      const tick = (t) => { if (!window.__perf.on) return; window.__perf.frames.push(t); requestAnimationFrame(tick); };
      requestAnimationFrame(tick); }""")
    fn()
    return page.evaluate("() => { window.__perf.on = false; return window.__perf.frames; }")


def fps(frames):
    if len(frames) < 2:
        return 0.0
    return round((len(frames) - 1) / ((frames[-1] - frames[0]) / 1000), 1)


def measure(browser, url, name, prof, dist):
    ctx = browser.new_context(
        viewport=prof["viewport"], device_scale_factor=prof["dpr"], has_touch=prof["touch"], is_mobile=prof["touch"]
    )
    install_fonts(ctx)
    page = ctx.new_page()
    page.add_init_script(INIT)
    cdp = ctx.new_cdp_session(page)
    cdp.send("Performance.enable")
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": prof["cpu"]})
    page.goto(url, wait_until="load")
    page.wait_for_function("() => performance.getEntriesByName('qontext:ready').length > 0", timeout=30000)
    boot = page.evaluate("performance.getEntriesByName('qontext:ready')[0].startTime")
    page.wait_for_timeout(1500)
    long_load = page.evaluate("window.__perf.long")
    w, h = prof["viewport"]["width"], prof["viewport"]["height"]

    page.mouse.move(5, h - 5)
    page.wait_for_timeout(4000)  # let the arrival wave finish
    t0 = busy(cdp)
    page.wait_for_timeout(3000)
    hero_idle = (busy(cdp) - t0) / 3

    t0 = busy(cdp)

    def wiggle():
        for i in range(60):
            page.mouse.move(w * (0.55 + 0.4 * ((i % 10) / 10)), h * (0.2 + 0.6 * ((i % 7) / 7)), steps=2)
            page.wait_for_timeout(16)

    active_frames = frames_during(page, wiggle)
    hero_active = (busy(cdp) - t0) / max(0.5, (active_frames[-1] - active_frames[0]) / 1000 if active_frames else 1)

    page.evaluate("window.__perf.long = []")
    height = page.evaluate("document.documentElement.scrollHeight")
    t0 = busy(cdp)

    def scroll():
        if prof["touch"]:
            # A fast thumb: 2,400 px a second, the way people skim a long page.
            cdp.send(
                "Input.synthesizeScrollGesture",
                {"x": w // 2, "y": h // 2, "yDistance": -height, "speed": 2400, "gestureSourceType": "touch"},
            )
            return
        y = 0
        while y < height:
            page.mouse.wheel(0, 240)
            page.wait_for_timeout(16)
            y += 240

    scroll_frames = frames_during(page, scroll)
    scroll_secs = (scroll_frames[-1] - scroll_frames[0]) / 1000 if len(scroll_frames) > 1 else 1
    scroll_busy = (busy(cdp) - t0) / scroll_secs
    long_scroll = page.evaluate("window.__perf.long")
    heap = page.evaluate("performance.memory ? performance.memory.usedJSHeapSize : 0")
    ctx.close()
    tbt = sum(max(0, d - 50) for _, d in long_load)
    return {
        "profile": name,
        "boot_ms": round(boot),
        "long_tasks_load": len(long_load),
        "blocking_ms_load": round(tbt),
        "hero_idle_main_thread": round(hero_idle * 100, 1),
        "hero_active_main_thread": round(hero_active * 100, 1),
        "hero_active_fps": fps(active_frames),
        "scroll_fps": fps(scroll_frames),
        "scroll_main_thread": round(scroll_busy * 100, 1),
        "long_tasks_scroll": len(long_scroll),
        "longest_scroll_task_ms": round(max([d for _, d in long_scroll], default=0)),
        "js_heap_mb": round(heap / 1e6, 1),
        "page_kb": round((dist / "index.html").stat().st_size / 1024, 1),
    }


def run(dist=ROOT / "dist", browser=None):
    """Measures both profiles. Pass a browser to reuse one that is already running (Playwright allows only one
    sync session per thread, so the test suite hands over its own)."""
    httpd = serve(dist)
    url = f"{base_url(httpd)}/index.html"
    try:
        if browser is not None:
            return [measure(browser, url, name, prof, dist) for name, prof in PROFILES.items()]
        with sync_playwright() as p:
            own = p.chromium.launch()
            try:
                return [measure(own, url, name, prof, dist) for name, prof in PROFILES.items()]
            finally:
                own.close()
    finally:
        httpd.shutdown()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--dist", type=pathlib.Path, default=ROOT / "dist", help="a built dist/ folder to measure")
    args = ap.parse_args()
    results = run(args.dist.resolve())
    if args.json:
        print(json.dumps(results, indent=2))
        return
    keys = [k for k in results[0] if k != "profile"]
    print(f"{'metric':<26}" + "".join(f"{r['profile']:>12}" for r in results))
    for k in keys:
        print(f"{k:<26}" + "".join(f"{r[k]:>12}" for r in results))


if __name__ == "__main__":
    main()
