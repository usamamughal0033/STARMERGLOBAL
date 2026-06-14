#!/usr/bin/env python3
"""
Fit machine photos to the site's required 4:3 ratio before uploading.

The website displays images with `object-fit: cover` inside 4:3 boxes, so any
image that isn't 4:3 gets cropped. This script makes every image exactly 4:3
so NOTHING is cut off.

Two modes:
  pad  (default) - keeps the whole image, adds a background to reach 4:3.
  crop           - fills the frame edge-to-edge, trimming the longer side.

It scans the input folder AND all of its subfolders, and rebuilds the same
folder structure in the output so your sorting is preserved.

Usage (run from the project root):
    python scripts/fit_images.py INPUT_FOLDER
    python scripts/fit_images.py INPUT_FOLDER -o OUTPUT_FOLDER
    python scripts/fit_images.py INPUT_FOLDER --bg white      # pad colour
    python scripts/fit_images.py INPUT_FOLDER --mode crop     # fill, trim edges
    python scripts/fit_images.py INPUT_FOLDER --in-place      # write _ready inside each subfolder

Examples:
    python scripts/fit_images.py assets/images          # whole sorted tree
    python scripts/fit_images.py assets/images --bg "#0d1b2a"
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required.  Install it with:  python -m pip install Pillow")

# Target frame the site uses (4:3).  Output is this size.
TARGET_W, TARGET_H = 1600, 1200
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

COLOR_NAMES = {"white": (255, 255, 255), "black": (0, 0, 0),
               "navy": (13, 27, 42), "grey": (241, 245, 249), "gray": (241, 245, 249)}


def parse_color(value: str):
    v = value.strip().lower()
    if v in COLOR_NAMES:
        return COLOR_NAMES[v]
    if v.startswith("#"):
        v = v[1:]
    if len(v) == 6:
        return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4))
    raise argparse.ArgumentTypeError(f"Unrecognised colour: {value!r}")


def fit_pad(img: Image.Image, bg) -> Image.Image:
    """Contain the whole image on a TARGET_W x TARGET_H canvas (no cropping)."""
    fitted = ImageOps.contain(img, (TARGET_W, TARGET_H), Image.LANCZOS)
    canvas = Image.new("RGB", (TARGET_W, TARGET_H), bg)
    x = (TARGET_W - fitted.width) // 2
    y = (TARGET_H - fitted.height) // 2
    if fitted.mode in ("RGBA", "LA", "P"):
        fitted = fitted.convert("RGBA")
        canvas.paste(fitted, (x, y), fitted)
    else:
        canvas.paste(fitted, (x, y))
    return canvas


def fit_crop(img: Image.Image) -> Image.Image:
    """Fill the frame edge-to-edge, trimming the longer side (centre crop)."""
    return ImageOps.fit(img, (TARGET_W, TARGET_H), Image.LANCZOS, centering=(0.5, 0.5))


def main() -> int:
    ap = argparse.ArgumentParser(description="Make images exactly 4:3 for upload.")
    ap.add_argument("input", help="Folder containing your original images")
    ap.add_argument("-o", "--output",
                    help="Output root (default: INPUT/_ready). Folder structure is mirrored.")
    ap.add_argument("--in-place", action="store_true",
                    help="Write a '_ready' folder inside EACH subfolder instead of one output root")
    ap.add_argument("--mode", choices=["pad", "crop"], default="pad",
                    help="pad = keep whole image (default); crop = fill, trim edges")
    ap.add_argument("--bg", type=parse_color, default="white",
                    help="Pad background colour: white/black/navy/grey or #rrggbb")
    ap.add_argument("--quality", type=int, default=88, help="JPEG quality (default 88)")
    args = ap.parse_args()

    in_dir = Path(args.input)
    if not in_dir.is_dir():
        return print(f"Not a folder: {in_dir}") or 1

    out_root = Path(args.output) if args.output else in_dir / "_ready"

    # Recursively collect every image, skipping anything already inside a _ready folder.
    files = sorted(p for p in in_dir.rglob("*")
                   if p.is_file() and p.suffix.lower() in EXTS
                   and "_ready" not in p.parts)
    if not files:
        return print(f"No images found under {in_dir}") or 1

    print(f"Found {len(files)} image(s) under {in_dir}  (mode: {args.mode})\n")
    ok = 0
    for p in files:
        rel = p.relative_to(in_dir)                     # e.g. forming/extruder.jpg
        if args.in_place:
            out_path = p.parent / "_ready" / (p.stem + ".jpg")
        else:
            out_path = out_root / rel.parent / (p.stem + ".jpg")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with Image.open(p) as im:
                im = ImageOps.exif_transpose(im)        # honour camera rotation
                result = fit_crop(im) if args.mode == "crop" else fit_pad(im, args.bg)
            result.save(out_path, "JPEG", quality=args.quality, optimize=True)
            print(f"  ok  {rel}")
            ok += 1
        except Exception as e:  # noqa: BLE001
            print(f"  !!  {rel}: {e}")

    dest = "each folder's _ready/" if args.in_place else out_root
    print(f"\nDone. {ok}/{len(files)} images are now 1600x1200 (4:3) -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
