#!/usr/bin/env python3
"""
Build the "complete line" header image for every production line.

For each line in data/catalog.json this lines up the line's main process
machines (cooker -> forming -> cooling -> wrapping) from their own photos,
side by side on a light studio background, and writes
assets/images/lines/<line-id>.jpg. The line page shows it blurred and faded
behind the title, so each page reads as "this whole line".

Utility units (tanks, steam, AC, dies, stands, pumps) are left out so the
main machines stay large enough to recognise.

    python scripts/build_line_headers.py
"""

import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

CATALOG = Path("data/catalog.json")
OUT = Path("assets/images/lines")
W, H = 2400, 600            # 4:1, close to the header's shape on desktop
SIDE = 70                   # left/right margin
GAP = 12                    # space between machines (they read as one line)

# Not drawn: supporting units that would shrink the main machines.
SKIP = re.compile(
    r"glucose|steam|\bac\b|ac unit|cooling ac|vacuum pump|die stand|rotary|"
    r"\bdie\b|dies\b|trolly|filling (liquid )?pump|liquid filling|powder|"
    r"storage tank|rest table|header|reference mold|small candy die|plungers",
    re.I)

# Rough real-world height of each machine type, relative to the tallest.
HEIGHT = [
    (r"cooker", 1.0), (r"uniplast|forming|former|plant", 0.95),
    (r"wrap|packing", 0.9), (r"mixer|heating cabinet|grinder", 0.85),
    (r"pulling|kneading|coating", 0.8), (r"dissolving|tank", 0.9),
    (r"batch roller", 0.72), (r"extruder", 0.7), (r"rope sizer", 0.66),
    (r"tunnel|conveyor", 0.6), (r"table", 0.6), (r"vibrat", 0.55),
]


def rel_height(name: str) -> float:
    for pat, h in HEIGHT:
        if re.search(pat, name, re.I):
            return h
    return 0.8


def clean(a: np.ndarray, frame: bool) -> np.ndarray:
    """White-out the photo backdrop and the thin frame lines baked into it."""
    a = np.clip(a.astype(np.float32) * (255 / 238), 0, 255)   # light grey -> white
    if frame:
        dark = a.min(axis=2) < 215
        row, col = dark.mean(axis=1), dark.mean(axis=0)
        for frac, axis in ((row, 0), (col, 1)):
            n = len(frac)
            for i in range(6, n - 6):
                # long AND thin: much darker than 6px either side (a machine
                # body is dark on its neighbours too, so it is kept)
                if frac[i] > 0.35 and frac[i] - max(frac[i - 6], frac[i + 6]) > 0.3:
                    sl = slice(max(0, i - 2), i + 3)
                    if axis == 0:
                        a[sl, :, :] = 255
                    else:
                        a[:, sl, :] = 255
    return a


def content_box(a: np.ndarray, frame: bool):
    """Bounding box of the machine, ignoring the nameplate badge (top right)."""
    h, w = a.shape[:2]
    mask = a.min(axis=2) < 228
    if frame:
        mask[: int(h * 0.03)] = False
        mask[int(h * 0.985):] = False
        mask[: int(h * 0.15), int(w * 0.80):] = False
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return 0, 0, w, h
    p = 6
    return (max(0, xs.min() - p), max(0, ys.min() - p),
            min(w, xs.max() + p + 1), min(h, ys.max() + p + 1))


def tile(path: str, height_px: int) -> Image.Image:
    a = np.asarray(Image.open(path).convert("RGB"))
    a = clean(a, frame=True)
    x0, y0, x1, y1 = content_box(a, frame=True)
    im = Image.fromarray(a[y0:y1, x0:x1].astype(np.uint8))
    k = height_px / im.height
    return im.resize((max(1, round(im.width * k)), height_px), Image.LANCZOS)


def build(line) -> Image.Image | None:
    picks = [m for m in line["machines"]
             if m.get("image") and Path(m["image"]).is_file()
             and not SKIP.search(m["name"])]
    if len(picks) < 3:
        return None
    ref = 400
    tiles = [tile(m["image"], round(ref * rel_height(m["name"]))) for m in picks]
    row_w = sum(t.width for t in tiles) + GAP * (len(tiles) - 1)
    k = min((W - 2 * SIDE) / row_w, (H * 0.78) / ref)        # fit width and height
    tiles = [t.resize((max(1, round(t.width * k)), max(1, round(t.height * k))),
                      Image.LANCZOS) for t in tiles]
    row_w = sum(t.width for t in tiles) + round(GAP * k) * (len(tiles) - 1)

    # light studio grey, a touch lighter at the top
    grad = np.linspace(238, 216, H, dtype=np.float32)[:, None, None]
    canvas = np.broadcast_to(grad, (H, W, 3)).copy()
    tallest = max(t.height for t in tiles)
    base = (H + tallest) // 2 + 10
    x = (W - row_w) // 2
    for t in tiles:
        y = base - t.height
        # multiply blend: the photo's white backdrop vanishes, shadows stay
        canvas[y:y + t.height, x:x + t.width] *= np.asarray(t, np.float32) / 255
        x += t.width + round(GAP * k)
    return Image.fromarray(canvas.clip(0, 255).astype(np.uint8))


def main() -> int:
    cat = json.loads(CATALOG.read_text(encoding="utf-8-sig"))
    OUT.mkdir(parents=True, exist_ok=True)
    for c in cat["categories"]:
        for line in c["lines"]:
            im = build(line)
            if im is None:
                print(f"  ! {line['id']}: too few machine photos, skipped")
                continue
            out = OUT / f"{line['id']}.jpg"
            im.save(out, "JPEG", quality=80, optimize=True, progressive=True)
            print(f"  {out}  {out.stat().st_size // 1024} KB  ({line['name']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
