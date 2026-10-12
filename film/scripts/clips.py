"""Records the film's two real clips from the built site and Atelier, timed to the chosen voice take.

Each action starts when the voice starts the sentence it illustrates (read from film/src/timing.json), so the
clips line up with the narration without any editing. Writes film/public/clips/world.mp4 and atelier.mp4.

Usage, from the repository root after `npm run build`:
    python3 film/scripts/clips.py
"""

import base64
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests" / "e2e"))
if "PLAYWRIGHT_BROWSERS_PATH" not in os.environ and pathlib.Path("/opt/pw-browsers").exists():
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"

from playwright.sync_api import sync_playwright  # noqa: E402
from server import base_url, serve  # noqa: E402

W, H = 1600, 900
OUT = ROOT / "film" / "public" / "clips"
TIMING = json.loads((ROOT / "film" / "src" / "timing.json").read_text())
WORLD_SEED = "5690984"

# A visible pointer, added through the DevTools protocol (the pages' Content Security Policy refuses inline
# scripts it does not know, rightly).
CURSOR = """
(() => {
  if (document.getElementById('film-cursor')) return;
  const c = document.createElement('div');
  c.id = 'film-cursor';
  c.style.cssText = 'position:fixed;left:-40px;top:-40px;width:28px;height:28px;margin:-14px 0 0 -14px;' +
    'border-radius:50%;' +
    'border:3px solid #1d1f52;background:rgba(255,255,255,.55);box-shadow:0 0 0 2px rgba(255,255,255,.9);' +
    'z-index:2147483647;pointer-events:none;transition:transform .12s ease;';
  document.documentElement.appendChild(c);
  addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => { c.style.transform = 'scale(.7)'; }, true);
  addEventListener('mouseup', () => { c.style.transform = 'none'; }, true);
})();
"""


def scene(scene_id):
    s = next(x for x in TIMING["scenes"] if x["id"] == scene_id)
    return [x["startMs"] - s["startMs"] for x in s["sentences"]], s["endMs"] - s["startMs"]


class Clip:
    """A CDP screencast with a clock that starts with the scene, so actions can wait for their sentence."""

    def __init__(self, page):
        self.page = page
        self.frames = []
        self.cdp = page.context.new_cdp_session(page)
        self.cdp.on("Page.screencastFrame", self._frame)

    def _frame(self, ev):
        self.frames.append((ev["metadata"]["timestamp"], ev["data"]))
        try:
            self.cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        except Exception:  # noqa: BLE001 - the page may be navigating
            pass

    def start(self):
        self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W, "maxHeight": H})
        self.t0 = time.time()

    def at(self, ms):
        """Waits until `ms` into the scene, and reports any lateness so a slow action can be tightened."""
        wait = self.t0 + ms / 1000 - time.time()
        if wait > 0:
            self.page.wait_for_timeout(wait * 1000)
        elif wait < -0.15:
            print(f"  late by {-wait:.2f} s for the moment at {ms / 1000:.2f} s")

    def stop(self):
        self.cdp.send("Page.stopScreencast")


def glide(page, x, y, steps=30):
    page.mouse.move(x, y, steps=steps)


def click(page, selector, steps=12):
    box = page.locator(selector).first.bounding_box()
    glide(page, box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps)
    page.mouse.down()
    page.wait_for_timeout(90)
    page.mouse.up()


def scroll_to(page, element_id, offset=0, duration=1100):
    """Smooth scroll that re-reads its target every frame (rooms take their height only as they come near)."""
    page.evaluate(
        """([id, offset, duration]) => new Promise((done) => {
          const el = document.getElementById(id);
          const target = () => window.scrollY + el.getBoundingClientRect().top - 72 + offset;
          const from = window.scrollY, t0 = performance.now();
          const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          const step = (now) => { const p = Math.min(1, (now - t0) / duration);
            window.scrollTo({ top: from + (target() - from) * ease(p), behavior: 'instant' });
            p < 1 ? requestAnimationFrame(step) : done(); };
          requestAnimationFrame(step);
        })""",
        [element_id, offset, duration],
    )


def world_clip(page, url):
    s, length = scene("world")
    clip = Clip(page)
    clip.start()
    page.goto(url)
    page.wait_for_function('() => document.fonts.status === "loaded"')
    page.evaluate(CURSOR)
    # "...picks colors just for you": the pointer measures the field.
    clip.at(s[1])
    for x, y in [(1200, 250), (1450, 420), (1300, 640), (1500, 760)]:
        glide(page, x, y, steps=14)
    # "That's your world.": the pointer rests on the world's number in the bar. (No click: the hero headline
    # reflows under a moving pointer, so a click aimed at the hero can land on the button below it.)
    clip.at(s[2])
    box = page.locator("#worldNum").bounding_box()
    glide(page, box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=14)
    # "Your friend gets a different one.": Many Worlds.
    clip.at(s[3])
    click(page, "#worldBtn")
    # "...colors you haven't scrolled to yet aren't decided.": Janus's halves come into view, still split.
    clip.at(s[4])
    scroll_to(page, "idea", offset=-420, duration=1400)
    # "They settle the moment you look.": into view, and they collapse.
    clip.at(s[5])
    scroll_to(page, "idea", offset=120, duration=1300)
    clip.at(length)
    clip.stop()
    return clip, length


def atelier_clip(page, url):
    s, length = scene("atelier")
    clip = Clip(page)
    clip.start()
    page.goto(url)
    page.wait_for_selector("#cell00")
    page.evaluate(CURSOR)
    glide(page, 800, 450, steps=10)
    # "Play with every room, pick your colors, and save your design as one short code you can share."
    clip.at(s[2])
    for tab in ["harmony", "entangle"]:
        click(page, f"#tabbtn-{tab}")
        page.wait_for_timeout(650)
    click(page, "#tabbtn-export")
    page.wait_for_timeout(250)
    click(page, "#projCode")
    # "Bouncer works like a bouncer at a club..."
    clip.at(s[3])
    click(page, "#tabbtn-grid")
    page.wait_for_timeout(250)
    click(page, "#inkSel")
    page.select_option("#inkSel", "light")
    page.wait_for_timeout(1700)
    click(page, "#cgFix")
    # "Handoff sends your colors to code and design tools, and Walk-By makes prints..."
    clip.at(s[4])
    click(page, "#tabbtn-export")
    page.wait_for_timeout(250)
    for fmt in ["tokens", "tailwind"]:
        click(page, f'#fmtSeg [data-fmt="{fmt}"]')
        page.wait_for_timeout(550)
    click(page, "#lentiBtn")
    page.wait_for_timeout(600)
    page.mouse.wheel(0, 320)  # bring the print preview into view
    clip.at(length)
    clip.stop()
    return clip, length


def encode(clip, length_ms, out):
    frames = sorted(clip.frames, key=lambda f: f[0])
    if len(frames) < 10:
        raise SystemExit(f"Too few frames captured for {out.name}")
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="qontext-clip-"))
    lines = []
    start = clip.t0
    # Blank time before the first frame (the page loading) shows the first frame.
    first_gap = max(0.0, frames[0][0] - start)
    for i, (ts, data) in enumerate(frames):
        name = tmp / f"f{i:05d}.jpg"
        name.write_bytes(base64.b64decode(data))
        nxt = frames[i + 1][0] if i + 1 < len(frames) else start + length_ms / 1000
        dur = max(0.001, nxt - ts) + (first_gap if i == 0 else 0)
        lines.append(f"file '{name}'\nduration {dur:.4f}")
    lines.append(f"file '{tmp / f'f{len(frames) - 1:05d}.jpg'}'")
    (tmp / "list.txt").write_text("\n".join(lines))
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(tmp / "list.txt"),
            "-vf",
            f"fps=30,scale={W}:{H}:flags=lanczos,format=yuv420p",
            "-t",
            f"{length_ms / 1000:.3f}",
            "-c:v",
            "libx264",
            "-preset",
            "slow",
            "-crf",
            "18",
            "-movflags",
            "+faststart",
            str(out),
        ],
        check=True,
    )
    shutil.rmtree(tmp)


def main():
    httpd = serve(ROOT / "dist")
    base = base_url(httpd)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, make, path in [("world", world_clip, "/index.html"), ("atelier", atelier_clip, "/studio.html")]:
            ctx = browser.new_context(viewport={"width": W, "height": H}, color_scheme="light")
            ctx.add_init_script(f"sessionStorage.setItem('qontext-site-world', '{WORLD_SEED}')")
            page = ctx.new_page()
            print(name)
            clip, length = make(page, base + path)
            encode(clip, length, OUT / f"{name}.mp4")
            print(f"{name}.mp4: {len(clip.frames)} frames, {length / 1000:.1f} s")
            ctx.close()
        browser.close()
    httpd.shutdown()


if __name__ == "__main__":
    main()
