#!/usr/bin/env python3
"""
Normalise "assets/images/NEW IMAGES" to one resolution and one canvas size.

Sources range from 260x280 to 1600x1066 in a dozen different aspect ratios, so
each photo is upscaled onto a common canvas rather than stretched or cropped:

  1. mild denoise on small sources (JPEG noise gets amplified by upscaling)
  2. iterative 2x Lanczos steps, which hold edges better than one big jump
  3. unsharp mask scaled to how far the image was pushed
  4. centred on a fixed canvas, padded with the photo's own border colour

Originals are never touched — output goes to <SRC>/_upscaled/ mirroring the
product folders.

IMPORTANT: this is classical resampling, not AI super-resolution. It restores
apparent sharpness; it cannot invent detail a 260px source never captured.

    python scripts/upscale_new_images.py
    python scripts/upscale_new_images.py --size 2000x1500
"""

import argparse
from pathlib import Path

import cv2
import numpy as np

SRC = Path("assets/images/NEW IMAGES")
OUT_NAME = "_upscaled"
EXTS = {".jpg", ".jpeg", ".png"}


def border_colour(img: np.ndarray) -> tuple:
    """Median colour of a thin frame around the edge — the backdrop."""
    t = max(2, min(img.shape[:2]) // 40)
    edge = np.concatenate([
        img[:t].reshape(-1, 3), img[-t:].reshape(-1, 3),
        img[:, :t].reshape(-1, 3), img[:, -t:].reshape(-1, 3)])
    return tuple(int(v) for v in np.median(edge, axis=0))


def upscale(img: np.ndarray, tw: int, th: int) -> np.ndarray:
    h, w = img.shape[:2]
    factor = min(tw / w, th / h)

    if factor > 1.05 and min(h, w) < 700:
        # small sources are the noisy ones; clean before magnifying the noise
        img = cv2.fastNlMeansDenoisingColored(img, None, 3, 3, 7, 21)

    # climb in 2x steps, then land exactly on the target
    cur = img
    while factor / (cur.shape[1] / w) >= 2:
        cur = cv2.resize(cur, (cur.shape[1] * 2, cur.shape[0] * 2),
                         interpolation=cv2.INTER_LANCZOS4)
    nw, nh = max(int(round(w * factor)), 1), max(int(round(h * factor)), 1)
    cur = cv2.resize(cur, (nw, nh), interpolation=cv2.INTER_LANCZOS4)

    if factor > 1.05:
        # unsharp, strength tied to how hard we pushed it
        amount = min(0.35 + 0.30 * min(factor, 4.0), 1.30)
        blur = cv2.GaussianBlur(cur, (0, 0), 1.1)
        cur = cv2.addWeighted(cur, 1 + amount, blur, -amount, 0)
    return cur


def process(src: Path, dst: Path, tw: int, th: int) -> float:
    img = cv2.imread(str(src), cv2.IMREAD_COLOR)
    if img is None:
        return 0.0
    h, w = img.shape[:2]
    factor = min(tw / w, th / h)

    scaled = upscale(img, tw, th)
    canvas = np.full((th, tw, 3), border_colour(img), dtype=np.uint8)
    y = (th - scaled.shape[0]) // 2
    x = (tw - scaled.shape[1]) // 2
    canvas[y:y + scaled.shape[0], x:x + scaled.shape[1]] = scaled

    dst.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(dst), canvas, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return factor


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", default="1600x1200",
                    help="canvas WxH every image is normalised to")
    a = ap.parse_args()
    tw, th = (int(v) for v in a.size.lower().split("x"))

    out_root = SRC / OUT_NAME
    files = sorted(p for p in SRC.rglob("*")
                   if p.suffix.lower() in EXTS
                   and OUT_NAME not in p.parts and "__MACOSX" not in p.parts)

    heavy = []
    for p in files:
        rel = p.relative_to(SRC)
        f = process(p, out_root / rel, tw, th)
        if f >= 2.5:
            heavy.append(f"{rel.parent}/{p.name} ({f:.1f}x)")
        print(f"  {f:4.1f}x  {rel}")

    print(f"\n{len(files)} images -> {tw}x{th}  in {out_root}/")
    if heavy:
        print(f"\n{len(heavy)} pushed 2.5x or beyond — these stay soft no matter "
              f"the algorithm; re-shoot or source higher-res originals:")
        for h in heavy:
            print("   ", h)


if __name__ == "__main__":
    raise SystemExit(main())
