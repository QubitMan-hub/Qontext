"""Turns the Pair Production photo into what the site paints on: a cropped WebP of the white sneaker and a vector
path for each of its nine panels, traced from the photo's own seams.

The photo (art/pair-shoe.png) is a studio shot of a plain white sneaker made with Figma's image generator. The
site lays each panel's color over it with a multiply blend, so the leather's real shading, stitching and laces
show through any color. This script is run by hand when the photo changes; its outputs are committed:

    src/site/public/pair-shoe.webp   the shoe, cropped
    src/site/pair-photo.js           the crop's size, the silhouette and the nine panel paths

Usage, from the repository root:
    python3 scripts/pair_photo.py
"""

import json
import pathlib
import warnings

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure, morphology
from skimage.draw import polygon as fill_polygon
from skimage.segmentation import expand_labels

warnings.filterwarnings("ignore", category=FutureWarning)

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "pair-shoe.png"
CROP = (60, 108, 1476, 740)  # left, top, right, bottom: the shoe and a little air
WEBP = ROOT / "src" / "site" / "public" / "pair-shoe.webp"
MODULE = ROOT / "src" / "site" / "pair-photo.js"

# The sole's lower edge, traced by eye, so the contact shadow under it is not part of the shoe.
SOLE_BOTTOM = [
    (82, 640), (84, 672), (90, 692), (100, 708), (130, 714), (200, 719), (300, 722), (400, 724), (500, 726),
    (700, 727), (900, 728), (1000, 727), (1050, 724), (1100, 720), (1150, 715), (1200, 709), (1250, 705),
    (1300, 700), (1350, 693), (1390, 684), (1420, 672), (1440, 660), (1452, 645), (1458, 600),
]  # fmt: skip

# Where a seam is only partly visible, these cuts finish it. Points are photo pixels (x, y).
TONGUE = [(528, 284), (528, 100), (820, 100), (820, 200), (760, 214), (700, 228), (650, 238), (610, 252), (570, 267),
          (548, 277)]  # fmt: skip
COLLAR = [(0, 0), (574, 0), (574, 272), (566, 420), (0, 420)]
TOE_BOX = [(1096, 380), (1500, 380), (1500, 620), (1080, 620), (1078, 520), (1084, 470)]
HEEL_COUNTER = [(0, 300), (120, 370), (200, 395), (290, 437), (330, 467), (355, 508), (366, 558), (378, 602),
                (382, 640), (0, 640)]  # fmt: skip
TOE_BUMPER = [(1048, 706), (1136, 630), (1200, 612), (1300, 601), (1380, 591), (1440, 576), (1458, 556),
              (1500, 556), (1500, 800), (1040, 800)]  # fmt: skip
HEEL_SOLE = [(0, 560), (372, 560), (380, 600), (394, 720), (0, 720)]


def polygon(points, shape):
    mask = np.zeros(shape, bool)
    rows, cols = fill_polygon([p[1] for p in points], [p[0] for p in points], shape=shape)
    mask[rows, cols] = True
    return mask


def silhouette(gray):
    """The shoe: everything not reachable from the border through near-white background, above the sole's edge."""
    bright = ndi.gaussian_filter(gray, 1.0) >= 248
    lab, _ = ndi.label(bright)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    shoe = ndi.binary_fill_holes(~np.isin(lab, list(border)))
    h, w = gray.shape
    shoe &= polygon([(0, 0), (w, 0), (w, 600), *reversed(SOLE_BOTTOM), (0, 640)], gray.shape)
    shoe = morphology.binary_opening(shoe, morphology.disk(2))
    lab, n = ndi.label(shoe)
    sizes = ndi.sum(shoe, lab, range(1, n + 1))
    return lab == (np.argmax(sizes) + 1)


def regions(gray, shoe):
    """Areas of leather between seams: thin dark lines are found with a black-hat filter and cut the shoe apart."""
    smooth = ndi.gaussian_filter(gray, 0.8)
    lines = ((ndi.grey_closing(smooth, size=(9, 9)) - smooth) > 9) & shoe
    lines = morphology.binary_dilation(morphology.remove_small_objects(lines, 40), morphology.disk(1))
    lab, _ = ndi.label(shoe & ~lines)
    return lab


def region_at(lab, point):
    """The region under `point` (x, y): the most common label in a small window, so a seam under it does not matter."""
    x, y = point
    window = lab[y - 6 : y + 7, x - 6 : x + 7].ravel()
    window = window[window > 0]
    return lab == np.bincount(window).argmax()


def panels(gray, shoe):
    lab = regions(gray, shoe)
    shape = gray.shape
    # The big seam-bounded regions, found by a point each sits on.
    upper = region_at(lab, (800, 300))  # collar, tongue, eyestay and toe box, joined at the lace eyelets
    stripe = region_at(lab, (480, 380))
    side = region_at(lab, (700, 530))  # the white quarter, heel counter and mudguard
    heel_top = region_at(lab, (150, 300))
    sole = region_at(lab, (540, 655))
    tongue = upper & polygon(TONGUE, shape)
    collar = upper & ~tongue & polygon(COLLAR, shape)
    toe_box = upper & polygon(TOE_BOX, shape)
    eyestay = upper & ~tongue & ~collar & ~toe_box
    heel = heel_top | (side & polygon(HEEL_COUNTER, shape))
    bumper = shoe & polygon(TOE_BUMPER, shape)
    heel_sole = sole & polygon(HEEL_SOLE, shape) & ~bumper
    midsole = sole & ~polygon(HEEL_SOLE, shape) & ~bumper
    parts = {
        "laces": eyestay, "tongue": tongue, "collar": collar,
        "toebox": toe_box, "stripe": stripe, "heel": heel,
        "bumper": bumper, "midsole": midsole, "heelsole": heel_sole,
    }  # fmt: skip
    labels = np.zeros(shape, np.int32)
    for k, mask in enumerate(parts.values(), start=1):
        labels[mask & shoe] = k
    # Seam pixels belong to the panel beside them, not to the white base between panels.
    labels = np.where((labels == 0) & shoe & (lab == 0), expand_labels(labels, distance=5), labels)
    out = {}
    taken = np.zeros(shape, bool)
    for k, name in enumerate(parts, start=1):
        m = ndi.binary_fill_holes(ndi.binary_opening(ndi.binary_closing(labels == k, np.ones((5, 5))), np.ones((3, 3))))
        m &= shoe & ~taken
        taken |= m
        out[name] = m
    return out


def to_path(mask):
    """A mask as an SVG path in crop coordinates, simplified to within about a pixel."""
    x0, y0 = CROP[0], CROP[1]
    parts = []
    for contour in measure.find_contours(np.pad(mask, 1).astype(float), 0.5):
        if len(contour) < 12:
            continue
        contour = measure.approximate_polygon(contour, tolerance=1.2)
        pts = [f"{round(x - 1 - x0)} {round(y - 1 - y0)}" for y, x in contour]
        parts.append("M" + " L".join(pts) + "Z")
    return "".join(parts)


def main():
    image = Image.open(SOURCE).convert("RGB")
    gray = np.asarray(image).astype(float).mean(axis=2)
    shoe = silhouette(gray)
    parts = panels(gray, shoe)
    image.crop(CROP).save(WEBP, "WEBP", quality=84, method=6)
    w, h = CROP[2] - CROP[0], CROP[3] - CROP[1]
    paths = {k: to_path(m) for k, m in parts.items()}
    # How bright the white leather is on each panel: a color laid on it with multiply shows this much darker.
    shade = {k: round(float(gray[m].mean() / 255), 3) for k, m in parts.items()}
    data = {"src": WEBP.name, "width": w, "height": h, "silhouette": to_path(shoe), "panels": paths, "shade": shade}
    body = json.dumps(data, indent=2)
    MODULE.write_text(
        "// Written by scripts/pair_photo.py from art/pair-shoe.png. Do not edit by hand: change the photo or the\n"
        "// script's cut lines and run it again. Paths are in the cropped photo's pixels.\n\n"
        f"export const PHOTO = {body};\n"
    )
    print(f"{WEBP.name}: {WEBP.stat().st_size // 1024} KB, {MODULE.name}: {MODULE.stat().st_size // 1024} KB")
    for k, m in parts.items():
        print(f"  {k:9} {int(m.sum()):6} px")


if __name__ == "__main__":
    main()
