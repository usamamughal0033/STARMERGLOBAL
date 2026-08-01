#!/usr/bin/env python3
"""
Stamp the STARMER GLOBAL name plate into the top-right corner of every machine
photo in the catalog.

Originals are never modified: plated copies are written to
assets/STARMER/_plated/... mirroring assets/STARMER/_ready/..., and
scripts/templates_to_catalog.py prefers a plated twin when one exists. Deleting
the _plated folder and rebuilding reverts the whole site to unbranded photos.

    python scripts/apply_nameplate.py --image "<path>" --out preview.jpg
    python scripts/apply_nameplate.py --all
"""

import argparse

from pathlib import Path

from PIL import Image, ImageFilter

PLATE = Path("assets/images/nameplate.png")   # RGBA, rounded corners
READY = Path("assets/STARMER/_ready")

PLATE_FRAC = 0.12       # plate width as a fraction of the image width (visiting-card scale)
MARGIN_FRAC = 0.035     # gap from the top and right edges
SHADOW_BLUR_FRAC = 0.05
SHADOW_OFFSET_FRAC = 0.04


def apply(img_path: Path, out_path: Path) -> bool:
    base = Image.open(img_path).convert("RGBA")
    W, H = base.size

    plate = Image.open(PLATE).convert("RGBA")
    pw = max(int(W * PLATE_FRAC), 60)
    ph = max(int(pw * plate.height / plate.width), 20)
    plate = plate.resize((pw, ph), Image.LANCZOS)

    m = int(W * MARGIN_FRAC)
    x, y = W - pw - m, m

    # soft drop shadow so the badge lifts off the backdrop
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sil = Image.new("RGBA", plate.size, (0, 0, 0, 150))
    sil.putalpha(plate.getchannel("A").point(lambda v: int(v * 0.55)))
    off = max(int(pw * SHADOW_OFFSET_FRAC), 1)
    sh.paste(sil, (x + max(off // 3, 1), y + off), sil)
    sh = sh.filter(ImageFilter.GaussianBlur(max(pw * SHADOW_BLUR_FRAC, 1.5)))

    out = Image.alpha_composite(base, sh)
    out.paste(plate, (x, y), plate)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out.convert("RGB").save(out_path, quality=92, subsampling=0)
    return True


def plated_path(src: Path) -> Path:
    return Path(*[("_plated" if p == "_ready" else p) for p in src.parts])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image")
    ap.add_argument("--out")
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()

    if a.image:
        apply(Path(a.image), Path(a.out or "preview.jpg"))
        print(f"wrote {a.out or 'preview.jpg'}")
        return

    if not a.all:
        ap.error("pass --image <path> or --all")

    # Walk the _ready tree rather than the catalog: once the catalog has been
    # rebuilt it already points at _plated paths, so reading it back would skip
    # everything on a re-run.
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    srcs = sorted(p for p in READY.rglob("*")
                  if p.is_file() and p.suffix.lower() in exts)
    ok = sum(apply(p, plated_path(p)) for p in srcs)
    print(f"{ok}/{len(srcs)} photos plated -> assets/STARMER/_plated/")


if __name__ == "__main__":
    raise SystemExit(main())
