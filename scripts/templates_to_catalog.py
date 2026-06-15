#!/usr/bin/env python3
"""
STEP 2 of 2 -- Build the website catalog from your filled-in templates.

Reads every booklet-data/<category>/<line>.yaml you filled in (STEP 1) and
assembles them into the site's catalog schema (categories -> lines -> machines),
auto-assigning IDs and machine numbers.

Output is written to data/catalog.generated.json so it never overwrites your
live data/catalog.json by accident. Review it, then either copy it over or run
with --apply to replace data/catalog.json (a .bak is kept).

A page/machine block is SKIPPED if its `name` is still blank, so you can leave
cover/index pages empty (or delete them) and they won't appear on the site.

Usage:
    python scripts/templates_to_catalog.py
    python scripts/templates_to_catalog.py --apply       # write data/catalog.json
"""

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}

try:
    import yaml
except ImportError:
    sys.exit("PyYAML is required:  python -m pip install pyyaml")

IN_ROOT = Path("booklet-data")
OUT_JSON = Path("data/catalog.generated.json")
LIVE_JSON = Path("data/catalog.json")
LIVE_JS = Path("js/catalog-data.js")   # the file the website actually loads

# Every machine gets 1 placeholder die + 1 placeholder part using this image
# until real die/part data is added.
COMING_SOON_IMG = "assets/images/coming-soon.svg"


def dies_and_parts_for(machine_id, machine_number, machine_name):
    """One placeholder die + one placeholder spare part per machine."""
    return [
        {
            "id": f"{machine_id}-D01",
            "partNumber": f"{machine_number}-D01",
            "name": f"{machine_name} Die",
            "type": "die",
            "image": COMING_SOON_IMG,
            "description": f"Forming die for the {machine_name}. Details coming soon.",
        },
        {
            "id": f"{machine_id}-P01",
            "partNumber": f"{machine_number}-P01",
            "name": f"{machine_name} Spare Part",
            "type": "part",
            "image": COMING_SOON_IMG,
            "description": f"Spare part for the {machine_name}. Details coming soon.",
        },
    ]

# Category label/colour mapping (matches the existing site styling where known).
CATEGORY_META = {
    "hard-candy":    {"label": "Hard Candy Production", "color": "#0D6B5E", "accentColor": "#14B8A6"},
    "lollipop":      {"label": "Lollipop Production",   "color": "#B45309", "accentColor": "#F59E0B"},
    "bubble-gum":    {"label": "Bubble Gum Production", "color": "#9D174D", "accentColor": "#EC4899"},
    "chew-toffee":   {"label": "Chew & Toffee Production", "color": "#7C2D12", "accentColor": "#EA580C"},
    "pharma":        {"label": "Pharma (Lozenges)",     "color": "#1E3A8A", "accentColor": "#3B82F6"},
}


def prefix_from_slug(slug: str) -> str:
    """hard-candy -> HC, chew-toffee -> CT, pharma -> PH."""
    parts = [p for p in slug.split("-") if p]
    if len(parts) == 1:
        return parts[0][:2].upper()
    return "".join(p[0] for p in parts[:3]).upper()


def clean_specs(specs):
    if not isinstance(specs, dict):
        return {}
    return {k: str(v).strip() for k, v in specs.items() if str(v).strip()}


def norm(s: str) -> str:
    """Normalise a name for fuzzy matching: drop codes/parentheses, keep words."""
    s = s.lower()
    s = re.sub(r"\(.*?\)", " ", s)                 # remove (SEW-101) etc.
    s = re.sub(r"\bsew[-\s]?\d+\b", " ", s)         # remove SEW-101 codes
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def ready_dir_for(source_pdf: str) -> Path | None:
    """assets/STARMER/<CAT>/<LINE>/x.pdf  ->  assets/STARMER/_ready/<CAT>/<LINE>/"""
    parts = Path(source_pdf).parts
    if "STARMER" not in parts:
        return None
    i = parts.index("STARMER")
    cat_line = parts[i + 1:i + 3]                   # <CAT>, <LINE>
    if len(cat_line) < 2:
        return None
    d = Path(*parts[:i + 1]) / "_ready" / Path(*cat_line)
    return d if d.is_dir() else None


def match_image(name: str, ready_dir: Path):
    """Find the best photo in ready_dir whose filename matches the machine name."""
    if not ready_dir:
        return None
    imgs = [p for p in ready_dir.iterdir()
            if p.is_file() and p.suffix.lower() in IMG_EXTS]
    target = norm(name)
    best, best_score = None, 0.0
    t_tokens = set(target.split())
    for p in imgs:
        cand = norm(p.stem)
        ratio = difflib.SequenceMatcher(None, target, cand).ratio()
        c_tokens = set(cand.split())
        # boost when one name's words are a subset of the other's
        if t_tokens and c_tokens and (t_tokens <= c_tokens or c_tokens <= t_tokens):
            ratio = max(ratio, 0.9)
        if ratio > best_score:
            best, best_score = p, ratio
    return best.as_posix() if best and best_score >= 0.6 else None


def main() -> int:
    ap = argparse.ArgumentParser(description="Assemble catalog JSON from filled templates.")
    ap.add_argument("--in", dest="in_root", default=str(IN_ROOT))
    ap.add_argument("--apply", action="store_true",
                    help="Overwrite data/catalog.json (keeps a .bak)")
    args = ap.parse_args()

    in_root = Path(args.in_root)
    if not in_root.is_dir():
        return print(f"No templates folder: {in_root}  (run STEP 1 first)") or 1

    yaml_files = sorted(in_root.rglob("*.yaml")) + sorted(in_root.rglob("*.yml"))
    if not yaml_files:
        return print(f"No .yaml templates found under {in_root}") or 1

    categories = {}        # slug -> category dict
    cat_line_counts = {}   # slug -> running line number
    skipped = filled = 0

    for yf in yaml_files:
        with open(yf, encoding="utf-8") as f:
            doc = yaml.safe_load(f) or {}
        slug = doc.get("category_slug") or "uncategorised"
        meta = CATEGORY_META.get(slug, {})
        cat = categories.setdefault(slug, {
            "id": slug,
            "label": meta.get("label", doc.get("category", slug)),
            "slug": slug,
            "color": meta.get("color", "#334155"),
            "accentColor": meta.get("accentColor", "#64748B"),
            "description": "",
            "lines": [],
        })

        prefix = prefix_from_slug(slug)
        n = cat_line_counts.get(slug, 0) + 1
        cat_line_counts[slug] = n
        line_id = f"{prefix}-L-{n:03d}"
        line_src = doc.get("line", {}) or {}
        ready_dir = ready_dir_for(doc.get("source_pdf", ""))

        machines = []
        for block in (doc.get("machines") or []):
            name = str(block.get("name", "")).strip()
            if not name:                      # blank page -> not a machine, skip
                skipped += 1
                continue
            mi = len(machines) + 1
            image = str(block.get("image", "")).strip()
            if not image:                     # auto-link photo from _ready by name
                image = match_image(name, ready_dir)
                if not image:
                    print(f"    ! no image match for '{name}' ({yf.name})")
            machine_id = f"{prefix}-L{n:03d}-M{mi:02d}"
            model = str(block.get("model", "")).strip()
            specs = clean_specs(block.get("specs"))
            if model:                         # show the SEW model code as the first spec row
                specs = {"modelNumber": model, **specs}
            machines.append({
                "id": machine_id,
                "machineNumber": machine_id,
                "model": model or None,
                "orderInLine": mi,
                "name": name,
                "function": str(block.get("function", "")).strip(),
                "description": str(block.get("description", "")).strip(),
                "image": image or None,
                "specs": specs,
                "diesAndParts": dies_and_parts_for(machine_id, machine_id, name),
            })
            filled += 1

        cat["lines"].append({
            "id": line_id,
            "lineNumber": line_id,
            "name": str(line_src.get("name", "")).strip(),
            "productionRate": str(line_src.get("productionRate", "")).strip(),
            "description": str(line_src.get("description", "")).strip(),
            "image": str(line_src.get("image", "")).strip() or None,
            "machines": machines,
        })

    result = {"categories": list(categories.values())}

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT_JSON}")
    print(f"  categories: {len(categories)}  |  machines: {filled}  |  blank pages skipped: {skipped}")

    if args.apply:
        pretty = json.dumps(result, indent=2, ensure_ascii=False)
        if LIVE_JSON.exists():
            bak = LIVE_JSON.with_suffix(".json.bak")
            bak.write_text(LIVE_JSON.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"  backed up live data -> {bak}")
        LIVE_JSON.write_text(pretty, encoding="utf-8")
        print(f"  applied -> {LIVE_JSON}")
        # The website loads window.CATALOG_DATA from js/catalog-data.js -- write it too.
        if LIVE_JS.exists():
            LIVE_JS.with_suffix(".js.bak").write_text(
                LIVE_JS.read_text(encoding="utf-8"), encoding="utf-8")
        LIVE_JS.write_text(f"window.CATALOG_DATA = {pretty};\n", encoding="utf-8")
        print(f"  applied -> {LIVE_JS}  (the file the site loads)")
    else:
        print("  (review it; re-run with --apply to replace data/catalog.json)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
