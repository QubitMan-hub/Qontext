"""Records "the film": a one-minute walk through the Qontext site and Atelier, captured from Chromium.

Usage (from the repository root, after `npm ci && npm run build`):
    python scripts/record-film.py

Writes dist/media/qontext-film.mp4, dist/media/qontext-film-poster.jpg and dist/media/chapters.json.
Needs Playwright with Chromium and ffmpeg on the PATH.
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

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests" / "e2e"))
if "PLAYWRIGHT_BROWSERS_PATH" not in os.environ and pathlib.Path("/opt/pw-browsers").exists():
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"

from localfonts import install as install_fonts  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

W, H = 1280, 720
SITE = (ROOT / "dist" / "index.html").as_uri()
MEDIA = ROOT / "dist" / "media"

# A visible cursor and a caption bar, injected into every page during recording only.
OVERLAY = """
(() => {
  if (document.getElementById('film-cursor')) return;
  const c = document.createElement('div');
  c.id = 'film-cursor';
  c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;' +
    'border:3px solid #1d1f52;background:rgba(255,255,255,.55);box-shadow:0 0 0 2px rgba(255,255,255,.9);' +
    'z-index:2147483647;pointer-events:none;transition:transform .12s ease;';
  document.documentElement.appendChild(c);
  addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => { c.style.transform = 'scale(.7)'; }, true);
  addEventListener('mouseup', () => { c.style.transform = 'none'; }, true);
  const cap = document.createElement('div');
  cap.id = 'film-caption';
  cap.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:min(980px,92vw);' +
    'background:#1d1f52;color:#fff;font:600 22px/1.35 "Instrument Sans",Arial,sans-serif;padding:12px 20px;' +
    'border-radius:4px;z-index:2147483646;pointer-events:none;opacity:0;transition:opacity .35s ease;text-align:center;';
  document.documentElement.appendChild(cap);
  window.__caption = (t) => { cap.textContent = t; cap.style.opacity = t ? '1' : '0'; };
  window.__endcard = () => {
    const e = document.createElement('div');
    e.style.cssText = 'position:fixed;inset:0;background:#1d1f52;color:#fff;z-index:2147483645;display:grid;' +
      'place-content:center;text-align:center;gap:14px;opacity:0;transition:opacity .6s ease;';
    e.innerHTML = '<div style="font:900 120px/0.9 Anybody,Arial,sans-serif;font-variation-settings:\\'wdth\\' 130">Qontext</div>' +
      '<div style="font:500 28px/1.3 \\'Instrument Sans\\',Arial,sans-serif">Color that depends on how you read it.</div>';
    document.documentElement.appendChild(e);
    requestAnimationFrame(() => (e.style.opacity = '1'));
  };
})();
"""


class Recorder:
    def __init__(self, page):
        self.page = page
        self.frames = []
        self.cdp = page.context.new_cdp_session(page)
        self.cdp.on("Page.screencastFrame", self._frame)
        self.chapters = []

    def _frame(self, ev):
        self.frames.append((ev["metadata"]["timestamp"], ev["data"]))
        try:
            self.cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        except Exception:  # noqa: BLE001 - the page may be navigating
            pass

    def start(self):
        self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W, "maxHeight": H, "everyNthFrame": 1})

    def stop(self):
        self.cdp.send("Page.stopScreencast")

    def chapter(self, title, caption=None):
        self.chapters.append((time.time(), title))
        self.caption(caption if caption is not None else "")

    def caption(self, text):
        self.page.evaluate("t => window.__caption && window.__caption(t)", text)

    def hold(self, ms):
        self.page.wait_for_timeout(ms)


def glide(page, x, y, steps=30):
    page.mouse.move(x, y, steps=steps)


def scroll_to(page, element_id, block="start", offset=0, duration=900):
    """Smooth scroll so the motion is visible in the film."""
    page.evaluate(
        """([id, block, offset, duration]) => new Promise((done) => {
          const el = document.getElementById(id);
          const r = el.getBoundingClientRect();
          const target = window.scrollY + (block === 'center' ? r.top - (innerHeight - r.height) / 2 : r.top - 72) + offset;
          const from = window.scrollY, t0 = performance.now();
          const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          const step = (now) => { const p = Math.min(1, (now - t0) / duration);
            window.scrollTo({ top: from + (target - from) * ease(p), behavior: 'instant' });
            p < 1 ? requestAnimationFrame(step) : done(); };
          requestAnimationFrame(step);
        })""",
        [element_id, block, offset, duration],
    )


def scroll_by(page, dy, duration=1200):
    page.evaluate(
        """([dy, duration]) => new Promise((done) => {
          const from = window.scrollY, t0 = performance.now();
          const step = (now) => { const p = Math.min(1, (now - t0) / duration);
            window.scrollTo({ top: from + dy * p, behavior: 'instant' }); p < 1 ? requestAnimationFrame(step) : done(); };
          requestAnimationFrame(step);
        })""",
        [dy, duration],
    )


def center(page, selector):
    box = page.locator(selector).first.bounding_box()
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def click(page, selector, steps=25):
    x, y = center(page, selector)
    glide(page, x, y, steps)
    page.mouse.down()
    page.wait_for_timeout(90)
    page.mouse.up()


def film(page, rec):
    page.goto(SITE)
    page.add_script_tag(content=OVERLAY)
    page.wait_for_timeout(300)
    page.mouse.move(W * 0.62, H * 0.2)
    rec.start()

    rec.chapter("Arrival: the page collapses", "Every visitor's copy of Qontext is its own quantum collapse.")
    for x, y in [(W * 0.9, H * 0.3), (W * 0.75, H * 0.75), (W * 0.95, H * 0.85), (W * 0.7, H * 0.45)]:
        glide(page, x, y, 45)
    rec.caption("Tiles shimmer in superposition until your pointer measures them.")
    for x, y in [(W * 0.82, H * 0.2), (W * 0.93, H * 0.6), (W * 0.72, H * 0.9)]:
        glide(page, x, y, 40)
    rec.hold(400)

    rec.chapter("Floor plan", "The map of the site is a Mermin-Peres square.")
    scroll_to(page, "floor", duration=1300)
    rec.hold(500)
    click(page, '#plan .hdr[data-read="R2"]')
    rec.hold(1200)
    click(page, '#plan .hdr[data-read="C3"]')
    rec.hold(1200)
    click(page, '#plan .hdr[data-read="C3"]')
    rec.hold(300)

    rec.chapter("Janus flips its reading", "Janus: one tile, two true colors. Scroll and the reading flips.")
    scroll_to(page, "room-janus", duration=1300)
    rec.hold(500)
    scroll_by(page, 640, duration=2600)
    rec.hold(900)
    scroll_by(page, -260, duration=1200)
    rec.hold(800)

    rec.chapter("Mermin's Dare", "Mermin's Dare: fixed colors top out at 5 of 6 rules.")
    scroll_to(page, "room-dare", offset=380, duration=1200)
    rec.hold(400)
    # One flip breaks a row and a column (3 of 6); a second flip in the same row recovers 5 of 6, the ceiling.
    for k in (0, 2):
        click(page, f"#dgrid button:nth-child({k + 1})", steps=18)
        rec.hold(900)
    rec.caption("Quantum measurement gets all six, every time.")
    click(page, "#dQuantum")
    rec.hold(1800)

    rec.chapter("Unity Wheel and Fringe", "Unity Wheel: harmony is quantum phase, and it turns as you scroll.")
    scroll_to(page, "room-wheel", offset=200, duration=1100)
    scroll_by(page, 520, duration=2400)
    rec.hold(300)
    rec.caption("Fringe: colors mix like light waves, and energy is conserved.")
    scroll_to(page, "room-fringe", offset=420, duration=1100)
    _, y0 = center(page, "#band")
    box = page.locator("#band").bounding_box()
    glide(page, box["x"] + 10, y0, 15)
    page.mouse.down()
    glide(page, box["x"] + box["width"] - 10, y0, 70)
    glide(page, box["x"] + box["width"] * 0.3, y0, 40)
    page.mouse.up()
    rec.hold(300)

    rec.chapter("Spooky Pair and Unpaintables", "Spooky Pair: two assets that answer each other through entanglement.")
    scroll_to(page, "room-spooky", offset=480, duration=1200)
    for _ in range(3):
        click(page, "#pairBtn", steps=15)
        rec.hold(550)
    click(page, "#pairMany", steps=12)
    rec.hold(900)
    rec.caption("Unpaintables: shapes no classical coloring can finish. The broken set glows.")
    scroll_to(page, "room-unpaintables", offset=430, duration=1200)
    scroll_by(page, 300, duration=2200)
    rec.hold(600)

    rec.chapter("Many Worlds", "Many Worlds: jump to another collapse of the whole site.")
    scroll_to(page, "frame", duration=1200)
    rec.hold(500)
    click(page, "#frame [data-many]")
    rec.hold(2200)
    rec.caption("Your world, framed, with a Wavefunction to take into the Atelier.")
    rec.hold(1200)
    href = page.get_attribute("#editWorld", "href")
    click(page, "#editWorld")
    rec.stop()

    page.wait_for_selector("#cell00")
    page.add_script_tag(content=OVERLAY)
    page.mouse.move(W * 0.5, H * 0.5)
    rec.start()
    rec.chapter("Inside the Atelier", "The Atelier opens the exact same world.")
    rec.hold(1200)
    click(page, "#measure")
    rec.hold(1100)
    click(page, "#measure")
    rec.hold(1000)
    rec.caption("Bouncer checks every color a tile can take. Handoff exports CSS, tokens and Tailwind.")
    click(page, "#tabbtn-export")
    rec.hold(1700)
    click(page, "#tabbtn-shapes")
    rec.hold(1800)
    rec.caption("")
    page.evaluate("window.__endcard()")
    rec.hold(2600)
    rec.stop()
    return href


def encode(rec, out_mp4, poster):
    frames = sorted(rec.frames, key=lambda f: f[0])
    if len(frames) < 10:
        raise SystemExit("Too few frames captured")
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="qontext-film-"))
    lines = []
    for i, (ts, data) in enumerate(frames):
        name = tmp / f"f{i:05d}.jpg"
        name.write_bytes(base64.b64decode(data))
        nxt = frames[i + 1][0] if i + 1 < len(frames) else ts + 0.5
        lines.append(f"file '{name}'\nduration {max(0.001, min(2.0, nxt - ts)):.4f}")
    lines.append(f"file '{tmp / f'f{len(frames) - 1:05d}.jpg'}'")
    (tmp / "list.txt").write_text("\n".join(lines))
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"),
         "-vf", f"fps=30,scale={W}:{H}:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow",
         "-crf", "23", "-movflags", "+faststart", str(out_mp4)],
        check=True,
    )
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "2.5", "-i", str(out_mp4), "-frames:v", "1", "-q:v", "3", str(poster)], check=True)
    shutil.rmtree(tmp)
    return frames[0][0]


def main():
    MEDIA.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=1, color_scheme="light")
        install_fonts(ctx)
        page = ctx.new_page()
        rec = Recorder(page)
        film(page, rec)
        browser.close()
    t0 = encode(rec, MEDIA / "qontext-film.mp4", MEDIA / "qontext-film-poster.jpg")
    # Chapter times on the film's own clock. Gaps while the Atelier loads are not in the film.
    frames = sorted(f[0] for f in rec.frames)
    def film_time(wall):
        before = [f for f in frames if f <= wall]
        if not before:
            return 0
        # Sum the encoded durations up to that frame (each capped at 2 s, as in encode()).
        total, prev = 0.0, frames[0]
        for f in frames[1:]:
            if f > wall:
                break
            total += max(0.001, min(2.0, f - prev))
            prev = f
        return round(total)
    chapters = [[film_time(t), title] for t, title in rec.chapters]
    (MEDIA / "chapters.json").write_text(json.dumps(chapters, indent=2))
    # The site's chapter list is built from this file, so its timestamps always match the film.
    (ROOT / "src" / "site" / "film-chapters.json").write_text(json.dumps(chapters, indent=2) + "\n")
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(MEDIA / "qontext-film.mp4")], check=True, capture_output=True, text=True).stdout.strip()
    size = (MEDIA / "qontext-film.mp4").stat().st_size / 1e6
    print(f"Film: {float(dur):.1f} s, {size:.1f} MB, {len(rec.frames)} frames, starts {t0}")
    print(json.dumps(chapters))


if __name__ == "__main__":
    main()
