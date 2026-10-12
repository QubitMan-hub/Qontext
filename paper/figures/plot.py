"""Draws the paper's charts from paper/figures/data.json (written by data.mjs from the engine).

Usage, from the repository root:
    node paper/figures/data.mjs > paper/figures/data.json
    python3 paper/figures/plot.py
"""

import json
import pathlib

import matplotlib

matplotlib.use("pgf")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Rectangle  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent
DATA = json.loads((HERE / "data.json").read_text())
INK = "#1d1f52"
INK2 = "#4b4e7c"
RULE = "#c8ccdc"

# Saved as PGF: LaTeX sets every label in the paper's own typeface when the paper is built.
plt.rcParams.update(
    {
        "pgf.texsystem": "pdflatex",
        "pgf.rcfonts": False,
        "pgf.preamble": r"\usepackage{mathpazo}",
        "font.family": "serif",
        "font.size": 9,
        "axes.edgecolor": INK2,
        "axes.labelcolor": INK,
        "xtick.color": INK2,
        "ytick.color": INK2,
        "text.color": INK,
        "axes.spines.top": False,
        "axes.spines.right": False,
    }
)


def luminance(hex_color):
    def lin(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = (int(hex_color[i : i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def op_tex(op):
    """X1Z2 -> $X_1 Z_2$"""
    out = []
    for i in range(0, len(op), 2):
        out.append(f"{op[i]}_{op[i + 1]}")
    return "$" + r"\,".join(out) + "$"


def grid_figure():
    fig, axes = plt.subplots(1, 3, figsize=(6.3, 2.35))
    grid = DATA["grid"]
    titles = ["The nine observables", "Read by rows", "Read by columns"]
    for k, ax in enumerate(axes):
        ax.set_xlim(-0.1, 3.75)
        ax.set_ylim(-0.75, 3.1)
        ax.set_aspect("equal")
        ax.axis("off")
        ax.set_title(titles[k], fontsize=9.5, color=INK, pad=4)
        for r in range(3):
            for c in range(3):
                g = grid[r][c]
                x, y = c, 2 - r
                if k == 0:
                    cell = Rectangle((x + 0.04, y + 0.04), 0.92, 0.92, facecolor="#fafbfd", edgecolor=RULE, lw=0.8)
                    ax.add_patch(cell)
                    ax.text(x + 0.5, y + 0.5, op_tex(g["op"]), ha="center", va="center", fontsize=9)
                    continue
                color = g["row"] if k == 1 else g["col"]
                value = g["rv"] if k == 1 else g["cv"]
                differs = g["rv"] != g["cv"]
                ax.add_patch(Rectangle((x + 0.04, y + 0.04), 0.92, 0.92, facecolor=color, edgecolor="none"))
                ink = INK if luminance(color) > 0.25 else "#ffffff"
                ax.text(x + 0.5, y + 0.58, op_tex(g["op"]), ha="center", va="center", fontsize=8, color=ink)
                sign = "$+1$" if value > 0 else "$-1$"
                ax.text(x + 0.5, y + 0.27, sign, ha="center", va="center", fontsize=7.5, color=ink)
                if differs:
                    ax.add_patch(Rectangle((x + 0.04, y + 0.04), 0.92, 0.92, facecolor="none", edgecolor=INK, lw=1.6))
        if k == 0:
            for r, s in enumerate(["$+1$", "$+1$", "$+1$"]):
                ax.text(3.2, 2.5 - r, s, ha="center", va="center", fontsize=8, color=INK2)
            for c, s in enumerate(["$+1$", "$+1$", "$-1$"]):
                ax.text(c + 0.5, -0.4, s, ha="center", va="center", fontsize=8, color=INK2)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.9, bottom=0.02, wspace=0.08)
    fig.savefig(HERE / "fig-grid.pgf")
    plt.close(fig)


def differ_figure():
    fig, ax = plt.subplots(figsize=(3.2, 2.1))
    n = DATA["N"]
    xs = [1, 3, 5, 7, 9]
    series = [
        ("random", "A random state (the site's)", DATA["harmony"][1]),
        ("bell", "A Bell state", DATA["harmony"][2]),
    ]
    w = 0.7
    for k, (key, label, color) in enumerate(series):
        counts = DATA["differ"][key]["counts"]
        ys = [100 * counts[x] / n for x in xs]
        ax.bar([x + (k - 0.5) * w for x in xs], ys, width=w, color=color, label=label, edgecolor=INK, lw=0.4)
    ax.set_xticks(xs)
    ax.set_xlabel("Tiles whose two readings differ")
    ax.set_ylabel(r"Share of worlds (\%)")
    ax.legend(frameon=False, fontsize=7.5)
    fig.tight_layout(pad=0.3)
    fig.savefig(HERE / "fig-differ.pgf")
    plt.close(fig)


def bouncer_figure():
    fig, ax = plt.subplots(figsize=(3.2, 2.1))
    rows = DATA["bouncer"]
    L = [r["L"] for r in rows]
    ax.plot(L, [r["dark"] for r in rows], color=INK, lw=1.4, label="Dark ink")
    ax.plot(L, [r["light"] for r in rows], color=INK2, lw=1.4, ls="--", label="White ink")
    ax.axhline(4.5, color=DATA["harmony"][2], lw=1)
    ax.text(0.305, 4.75, "AA, 4.5 : 1", fontsize=7.5, color=INK2)
    ax.axvline(DATA["palette"]["L"], color=RULE, lw=1)
    ax.set_xlabel(r"Palette lightness $L$ (OKLCH)")
    ax.set_ylabel("Weakest contrast, 18 colors")
    ax.set_ylim(1, 12)
    ax.legend(frameon=False, fontsize=7.5, loc="upper center")
    fig.tight_layout(pad=0.3)
    fig.savefig(HERE / "fig-bouncer.pgf")
    plt.close(fig)


def phase_figure():
    fig, (strip, ax) = plt.subplots(2, 1, figsize=(6.3, 2.0), gridspec_kw={"height_ratios": [1, 2.4]}, sharex=True)
    rows = DATA["phase"]
    rgb = [[tuple(int(r["paper"][i : i + 2], 16) / 255 for i in (1, 3, 5)) for r in rows]]
    strip.imshow(rgb, aspect="auto", extent=(0, 360, 0, 1))
    strip.set_yticks([])
    strip.spines["left"].set_visible(False)
    strip.spines["bottom"].set_visible(False)
    strip.set_title("The paper color at each angle of the Phase Dial", fontsize=9, pad=3)
    ax.plot([r["deg"] for r in rows], [r["min"] for r in rows], color=INK, lw=1.2)
    ax.axhline(4.5, color=DATA["harmony"][2], lw=1)
    ax.set_xlim(0, 360)
    ax.set_xticks([0, 45, 90, 135, 180, 225, 270, 315, 360])
    ax.set_xlabel("Dial angle (degrees): light at 0, dark at 180")
    ax.set_ylabel("Weakest text\ncontrast")
    fig.tight_layout(pad=0.3)
    fig.savefig(HERE / "fig-phase.pgf")
    plt.close(fig)


if __name__ == "__main__":
    grid_figure()
    differ_figure()
    bouncer_figure()
    phase_figure()
    print("figures written to", HERE)
