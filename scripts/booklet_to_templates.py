#!/usr/bin/env python3
"""
STEP 1 of 2 -- Turn the image-based booklet PDFs into fill-in templates.

The booklets in assets/STARMER/ are scanned images (no selectable text), so
data can't be auto-extracted reliably. Instead this script does the mechanical
work for you:

  * walks assets/STARMER/<CATEGORY>/<LINE>/<booklet>.pdf
  * renders every page to a clean PNG you can glance at
  * writes ONE editable template file per line:  booklet-data/<cat>/<line>.yaml
    pre-structured with one machine block per page (blank name/specs fields,
    plus a link to that page's image).

You then open each .yaml, look at the matching page image, and type the data.
Add your machine image path in the `image:` field. Delete any page block that
isn't a real machine (covers, index pages, etc.).

When done, run STEP 2:  python scripts/templates_to_catalog.py

Usage:
    python scripts/booklet_to_templates.py
    python scripts/booklet_to_templates.py --dpi 150        # sharper page images
    python scripts/booklet_to_templates.py --only "HARD CANDY"
"""

import argparse
import re
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF is required:  python -m pip install pymupdf")
try:
    import yaml
except ImportError:
    sys.exit("PyYAML is required:  python -m pip install pyyaml")

SRC_ROOT = Path("assets/STARMER")
OUT_ROOT = Path("booklet-data")
# Top-level folders under STARMER that are NOT product categories.
SKIP_DIRS = {"_ready", "DIES", "PARTS"}

# The spec fields seeded into every machine block (edit/add/remove freely while
# filling). These mirror the keys used in data/catalog.json.
DEFAULT_SPECS = [
    "capacity", "powerConsumption", "dimensions",
    "weight", "materialContact", "controlSystem",
]


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def guess_rate(name: str):
    """Pull a production rate like '200 kg/hr' out of a folder/file name."""
    m = re.search(r"(\d[\d,]*)\s*kg", name, re.I)
    return f"{m.group(1)} kg/hr" if m else ""


def clean_line_name(folder: str) -> str:
    """Tidy a raw folder name into a readable line name."""
    name = folder.replace("_", " ").replace(".", " ")
    name = re.sub(r"\s+", " ", name).strip(" -")
    return name


def unique_pdfs(line_dir: Path):
    """Return PDFs in a folder, de-duplicated (Windows is case-insensitive)."""
    seen, out = set(), []
    for p in sorted(line_dir.iterdir()):
        if p.is_file() and p.suffix.lower() == ".pdf" and p.name.lower() not in seen:
            seen.add(p.name.lower())
            out.append(p)
    return out


YAML_HEADER = """\
# ============================================================================
#  FILL-IN TEMPLATE  --  one production line
#  Open each page image (see page_image:) and type the machine's data below.
#  * Delete any machine block whose page is a cover/index/not-a-machine.
#  * Put your machine photo path in `image:` (e.g. assets/images/machines/M1.jpg)
#  * Add or remove spec keys under `specs:` as needed.
#  When finished, run:  python scripts/templates_to_catalog.py
# ============================================================================
"""


def build_template(category_label, line_dir, pdf, page_images):
    folder = line_dir.name
    machines = []
    for i, img in enumerate(page_images, start=1):
        machines.append({
            "page": i,
            "page_image": img.as_posix(),
            "name": "",
            "model": "",          # internal code e.g. SEW-101 (optional)
            "function": "",       # the "Traits:" paragraph
            "description": "",
            "image": "",          # leave blank -> auto-linked from _ready by name
            "specs": {k: "" for k in DEFAULT_SPECS},
        })
    return {
        "category": category_label,
        "category_slug": slugify(category_label),
        "line": {
            "name": clean_line_name(folder),
            "productionRate": guess_rate(folder) or guess_rate(pdf.stem),
            "description": "",
            "image": "",
        },
        "source_pdf": pdf.as_posix(),
        "machines": machines,
    }


def render_pages(pdf: Path, out_dir: Path, dpi: int):
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf)
    images = []
    for i in range(doc.page_count):
        pix = doc[i].get_pixmap(dpi=dpi)
        out = out_dir / f"page-{i + 1:02d}.png"
        pix.save(out)
        images.append(out)
    doc.close()
    return images


def main() -> int:
    ap = argparse.ArgumentParser(description="Render booklets and make fill-in templates.")
    ap.add_argument("--src", default=str(SRC_ROOT), help="Booklet root (default assets/STARMER)")
    ap.add_argument("--out", default=str(OUT_ROOT), help="Output root (default booklet-data)")
    ap.add_argument("--dpi", type=int, default=120, help="Page render resolution (default 120)")
    ap.add_argument("--only", help="Only process this category folder (e.g. 'HARD CANDY')")
    args = ap.parse_args()

    src = Path(args.src)
    out_root = Path(args.out)
    if not src.is_dir():
        return print(f"Booklet folder not found: {src}") or 1

    categories = [d for d in sorted(src.iterdir())
                  if d.is_dir() and d.name not in SKIP_DIRS]
    if args.only:
        categories = [d for d in categories if d.name.lower() == args.only.lower()]

    lines_done = machines_total = 0
    for cat in categories:
        cat_slug = slugify(cat.name)
        for line_dir in sorted(d for d in cat.iterdir() if d.is_dir()):
            pdfs = unique_pdfs(line_dir)
            if not pdfs:
                continue
            pdf = pdfs[0]
            line_slug = slugify(line_dir.name)
            pages_dir = out_root / cat_slug / line_slug / "pages"
            print(f"[{cat.name}] {line_dir.name}  ->  rendering {pdf.name} ...")
            imgs = render_pages(pdf, pages_dir, args.dpi)
            data = build_template(cat.name, line_dir, pdf, imgs)

            yaml_path = out_root / cat_slug / f"{line_slug}.yaml"
            yaml_path.parent.mkdir(parents=True, exist_ok=True)
            with open(yaml_path, "w", encoding="utf-8") as f:
                f.write(YAML_HEADER)
                yaml.dump(data, f, sort_keys=False, allow_unicode=True, width=100)
            print(f"    {len(imgs)} pages  ->  {yaml_path}")
            lines_done += 1
            machines_total += len(imgs)

    print(f"\nDone. {lines_done} line template(s), {machines_total} page/machine block(s).")
    print(f"Templates are in: {out_root}/  -- fill them in, then run STEP 2.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
