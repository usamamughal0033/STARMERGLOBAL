#!/usr/bin/env python3
"""
Build the category gallery image set from the client's confectionery photos.

Source shots in "assets/images/NEW IMAGES/<product>/" are video stills with
black letterbox bars. This crops the bars, trims to a consistent 4:3, resizes
for web and writes them to assets/images/gallery/<category>/, then prints the
CATEGORY_GALLERY map to paste into js/bundle.js.

    python scripts/build_gallery.py
"""

import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path("assets/images/NEW IMAGES")
OUT = Path("assets/images/gallery")

# Every slide is emitted at exactly this size so the carousel boxes are filled
# edge to edge with no letterboxing and no cropping. Sources range from 260px
# to 1600px wide, so most are upscaled — Lanczos plus a light unsharp pass
# recovers apparent sharpness, but it cannot invent detail that was never
# captured. Heavy upscales are reported below so they can be re-shot.
WIDTH, HEIGHT = 1000, 750          # 4:3, matches the slide box aspect

# product folder -> (category id, caption shown under the slide)
PRODUCTS = [
    ("Hard Boil Candy",                          "hard-candy",  "Hard Boiled Candy"),
    ("Hard Boil Candy With Liquid Filling",      "hard-candy",  "Liquid Centre-Filled Candy"),
    ("Hard Boil Candy With Powder Filling",      "hard-candy",  "Powder Centre-Filled Candy"),
    ("Hard Boiled Candy with Bubble Gum Filling","hard-candy",  "Bubble Gum Filled Candy"),
    ("Round Lollipop",                           "lollipop",    "Round Lollipop"),
    ("Flat Lollipop",                            "lollipop",    "Flat Lollipop"),
    ("Canter Filled Lollipop",                   "lollipop",    "Centre-Filled Lollipop"),
    ("Ball Gum",                                 "bubble-gum",  "Ball Gum"),
    ("Bazuka Bubble Gum",                        "bubble-gum",  "Bazooka Bubble Gum"),
    ("Center Filled Bubble Gum",                 "bubble-gum",  "Centre-Filled Bubble Gum"),
    ("Fudge Toffee",                             "chew-toffee", "Fudge Toffee"),
    ("Toffee_",                                  "chew-toffee", "Eclair Toffee"),
    ("Zombie",                                   "chew-toffee", "Zombie Chew"),
]

# Pharma has almost no photography of its own: the only genuinely medicinal
# shot in the repo is the category hero (tablets/capsules). The rest fall back
# to hard-boiled candy, which is the same product form as a lozenge.
# TODO: replace with real lozenge shots (blister packs, tins, loose lozenges)
# once the client supplies them — then delete PHARMA_STANDIN entirely.
PHARMA_EXTRA = [
    (Path("assets/images/categories/pharma.jpg"), "Medicated Lozenge"),
]
PHARMA_STANDIN = ["Hard Boil Candy", "Hard Boil Candy With Powder Filling"]

TARGET_PER_CATEGORY = 6


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-")


def crop_bars(im: Image.Image) -> Image.Image:
    """Drop black letterbox bars, then trim to 4:3 about the centre."""
    a = np.asarray(im.convert("RGB")).astype(int).sum(2)
    rows = np.where(a.mean(1) > 34)[0]
    cols = np.where(a.mean(0) > 34)[0]
    if len(rows) and len(cols):
        im = im.crop((cols[0], rows[0], cols[-1] + 1, rows[-1] + 1))

    w, h = im.size
    want = 4 / 3
    if w / h > want:                       # too wide -> trim sides
        nw = int(h * want)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:                                  # too tall -> trim top/bottom
        nh = int(w / want)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im


def photos(folder: str):
    d = SRC / folder
    return sorted(p for p in d.iterdir()
                  if p.suffix.lower() in {".jpg", ".jpeg", ".png"})


def main():
    buckets = {}
    for folder, cat, caption in PRODUCTS:
        buckets.setdefault(cat, []).extend(
            (p, caption) for p in photos(folder))
    buckets.setdefault("pharma", []).extend(
        (p, cap) for p, cap in PHARMA_EXTRA if p.exists())
    for folder in PHARMA_STANDIN:
        cap = next(c for f, _, c in PRODUCTS if f == folder)
        buckets["pharma"].extend((p, cap) for p in photos(folder))

    out_map = {}
    for cat, entries in buckets.items():
        # spread the picks across products rather than taking one folder's worth
        if len(entries) > TARGET_PER_CATEGORY:
            step = len(entries) / TARGET_PER_CATEGORY
            entries = [entries[int(i * step)] for i in range(TARGET_PER_CATEGORY)]
        rows, weak = [], []
        for i, (src, caption) in enumerate(entries, 1):
            im = crop_bars(Image.open(src))
            scale = WIDTH / im.width
            im = im.resize((WIDTH, HEIGHT), Image.LANCZOS)
            if scale > 1.15:                     # upscaled — restore some bite
                amount = min(int(60 + 55 * min(scale, 3)), 190)
                im = im.filter(ImageFilter.UnsharpMask(1.1, amount, 3))
                if scale >= 2.0:
                    weak.append(f"{src.name} ({scale:.1f}x)")
            dst = OUT / cat / f"{i:02d}-{slug(caption)}.jpg"
            dst.parent.mkdir(parents=True, exist_ok=True)
            im.convert("RGB").save(dst, quality=88, optimize=True)
            rows.append((dst.name, caption))
        out_map[cat] = rows
        print(f"{cat:12} {len(rows)} images"
              + (f"   soft (upscaled >=2x): {', '.join(weak)}" if weak else ""))

    print("\n--- CATEGORY_GALLERY for js/bundle.js ---")
    for cat, rows in out_map.items():
        print(f"  '{cat}': [")
        for f, n in rows:
            print(f"    ['{f}', '{n}'],")
        print("  ],")


if __name__ == "__main__":
    raise SystemExit(main())
