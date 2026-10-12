"""Makes the film: lines the voice up with the script, records the real clips in step with it, renders the film
with Remotion, and writes the poster and the site's chapter list.

Usage, from the repository root:
    npm run film

Needs the film's own dependencies (`npm ci` inside film/), ffmpeg, and Playwright with Chromium. Writes
dist/media/qontext-film.mp4, dist/media/qontext-film-poster.jpg and src/site/film-chapters.json, then rebuilds
the site so the chapters are in it.
"""

import json
import pathlib
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
FILM = ROOT / "film"
MEDIA = ROOT / "dist" / "media"
MAX_MB = 24  # Cloudflare Pages serves files up to 25 MiB


def run(cmd, cwd=ROOT):
    print("$", " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def main():
    run(["npm", "run", "build"])
    run(["node", "film/scripts/align.mjs"])
    run(["python3", "film/scripts/clips.py"])
    timing = json.loads((FILM / "src" / "timing.json").read_text())
    script = json.loads((FILM / "src" / "script.json").read_text())

    out = FILM / "out" / "qontext-film.mp4"
    run(["npm", "run", "render", "--", "Film", str(out), "--codec=h264", "--crf=22", "--audio-bitrate=128k"], cwd=FILM)
    size_mb = out.stat().st_size / 1e6
    if size_mb > MAX_MB:
        raise SystemExit(f"The film is {size_mb:.1f} MB; raise --crf until it is under {MAX_MB} MB.")

    # The poster: the hook's split square, at the moment both true colors are named.
    hook = timing["scenes"][0]
    frame = round((hook["sentences"][3]["startMs"] + 900) / 1000 * 30)
    poster = FILM / "out" / "poster.jpg"
    run(
        [
            "npx",
            "remotion",
            "still",
            "Film",
            str(poster),
            f"--frame={frame}",
            "--image-format=jpeg",
            "--jpeg-quality=86",
            "--scale=0.6667",
        ],
        cwd=FILM,
    )

    MEDIA.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(out, MEDIA / "qontext-film.mp4")
    shutil.copyfile(poster, MEDIA / "qontext-film-poster.jpg")
    chapters = [
        [int(s["startMs"] // 1000), meta["chapter"]] for s, meta in zip(timing["scenes"], script["scenes"], strict=True)
    ]
    (ROOT / "src" / "site" / "film-chapters.json").write_text(json.dumps(chapters, indent=2) + "\n")
    run(["npm", "run", "build"])
    seconds = timing["durationMs"] / 1000
    print(f"Film: {seconds:.0f} s from {timing['source']}, {size_mb:.1f} MB, {len(chapters)} chapters.")


if __name__ == "__main__":
    main()
