#!/usr/bin/env python3
"""Normalize the catalog: standardize units (mm/kg/hp/pcs-min), fix terms &
spelling, tidy names and descriptions. Dry-run by default; pass --apply to write.

Writes both data/catalog.json and js/catalog-data.js (window.CATALOG_DATA wrapper).
"""
import json, re, sys, io
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CJSON = ROOT / "data" / "catalog.json"
CJS = ROOT / "js" / "catalog-data.js"

APPLY = "--apply" in sys.argv

# ── new palette: align accentColor to each category's gradient-start ──────────
ACCENT = {
    "bubble-gum": "#EC4899",
    "chew-toffee": "#D97706",
    "hard-candy": "#EF4444",
    "lollipop": "#8B5CF6",
    "pharma": "#14B8A6",
}

# ── word-level spelling / term fixes (case-insensitive, word-boundary) ────────
WORD_FIX = {
    "leef": "leaf", "keef": "leaf",
    "trolly": "trolley",
    "dozing": "dosing",
    "alluminium": "aluminium", "aluminum": "aluminium",
    "stainles": "stainless",
    "centre": "centre",  # keep British spelling already used
}

# spec-key spelling/format fixes (exact key -> canonical key)
KEY_FIX = {
    "leef": "leaf",
    "keef": "leaf",
    "trollyStand": "trolleyStand",
    "dozingPump": "dosingPump",
    "dimension": "dimensions",
    "gearMotors": "gearMotor",
    "electricMotors": "electricMotor",
    "rods": "rod",
    "covers": "cover",
}

changes = {"keys": 0, "dim": 0, "weight": 0, "power": 0, "speed": 0,
           "rate": 0, "capacity": 0, "text": 0, "name": 0, "accent": 0,
           "dim_unparsed": []}

FT = 304.8
INCH = 25.4

def fnum(x):
    """format a number: drop trailing .0, round to whole for mm."""
    return str(int(round(x)))

AXIS_WORDS = {"dia": "Dia", "diameter": "Dia", "length": "L", "l": "L",
              "width": "W", "w": "W", "height": "H", "h": "H", "depth": "D", "d": "D"}

def extract_axis(tok):
    """pull axis label words out of a token, return (clean_token, label_or_None)."""
    label = None
    def grab(m):
        nonlocal label
        label = AXIS_WORDS[m.group(0).lower()]
        return " "
    clean = re.sub(r"\b(dia|diameter|length|width|height|depth)\b", grab, tok, flags=re.I)
    # single-letter axis markers (only when standalone, not part of a number)
    clean = re.sub(r"(?<![\w.])([LWHD])(?![\w.])", grab, clean)
    return clean.strip(), label

def parse_len_to_mm(tok, default_unit):
    """parse one dimension token like 4'6\", 6.5', 18\", 900 mm, 2,335 -> mm or None."""
    t = tok.strip().replace(",", "")
    if not t:
        return None
    # feet+inches  e.g. 4'6"
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)\s*\"?", t)
    if m:
        return float(m.group(1)) * FT + float(m.group(2)) * INCH
    # explicit mm
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*mm", t, re.I)
    if m:
        return float(m.group(1))
    # explicit cm
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*cm", t, re.I)
    if m:
        return float(m.group(1)) * 10
    # explicit inches  18"  or  5 in
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(?:\"|inch|in)", t, re.I)
    if m:
        return float(m.group(1)) * INCH
    # explicit feet   6'  or 3 ft
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(?:'|ft|feet)", t, re.I)
    if m:
        return float(m.group(1)) * FT
    # bare number -> use default unit
    m = re.fullmatch(r"(\d+(?:\.\d+)?)", t)
    if m:
        return float(m.group(1)) * (FT if default_unit == "ft" else 1.0)
    return None

def detect_axis_label(s):
    m = re.search(r"\(([^)]*[lwhLWH][^)]*)\)", s)
    if m and re.search(r"[lwh]", m.group(1), re.I):
        return m.group(1).upper().replace(" ", "")
    return None

def normalize_dimension(val):
    s = str(val).strip()
    if not s or s.lower() in ("variable", "custom", "none", "n/a"):
        return val
    label = detect_axis_label(s)
    core = re.sub(r"\([^)]*\)", "", s)            # strip parens
    # decide default unit for bare numbers: ft unless the string clearly states mm/cm
    default_unit = "mm" if re.search(r"\bmm\b|\bcm\b", s, re.I) else "ft"
    if "..." in core:
        changes["dim_unparsed"].append(s)
        return val
    parts = re.split(r"[x×]", core)
    mm = []
    tok_labels = []
    for p in parts:
        clean, tlabel = extract_axis(p)
        v = parse_len_to_mm(clean, default_unit)
        if v is None:
            changes["dim_unparsed"].append(s)
            return val
        mm.append(v)
        tok_labels.append(tlabel)
    if not mm:
        return val
    body = " x ".join(fnum(v) for v in mm) + " mm"
    # axis label: prefer per-token labels, else the trailing (L x W x H) group
    letters = []
    if any(tok_labels):
        letters = [t for t in tok_labels if t]
        if len(letters) != len(mm):
            letters = []
    if not letters and label:
        letters = [c for c in label if c in "LWHD"]
    if letters and len(letters) == len(mm):
        body += " (" + " x ".join(letters) + ")"
    out = body
    if out != s:
        changes["dim"] += 1
    return out

def normalize_weight(val):
    s = str(val).strip()
    if not s:
        return val
    approx = bool(re.search(r"approx", s, re.I))
    # ton -> kg
    m = re.search(r"(\d+(?:\.\d+)?)\s*ton", s, re.I)
    if m:
        kg = float(m.group(1)) * 1000
        out = f"{fnum(kg)} kg"
        if approx:
            out += " (approx.)"
        if out != s:
            changes["weight"] += 1
        return out
    # kg (possibly with lbs in parens) -> keep kg only
    m = re.search(r"(\d+(?:\.\d+)?)\s*kg", s, re.I)
    if m:
        out = f"{m.group(1).rstrip('.0') if '.' in m.group(1) else m.group(1)} kg"
        out = f"{fnum(float(m.group(1)))} kg"
        if approx:
            out += " (approx.)"
        if out != s:
            changes["weight"] += 1
        return out
    return val

def normalize_power(val):
    s = str(val).strip()
    if s.lower() in ("none", "n/a", ""):
        return ""  # drop meaningless power values
    out = s
    out = re.sub(r"\bHP\b", "hp", out)
    out = re.sub(r"(\d)\s*hp", r"\1 hp", out, flags=re.I)
    out = re.sub(r"\bh\.p\.?\b", "hp", out, flags=re.I)
    if out != s:
        changes["power"] += 1
    return out

def normalize_speed(val):
    s = str(val).strip()
    out = s
    out = re.sub(r"pieces?\s*/?\s*(?:per\s*)?min(?:ute)?", "pcs/min", out, flags=re.I)
    out = re.sub(r"pcs\s*/?\s*min", "pcs/min", out, flags=re.I)
    out = re.sub(r"packs?\s*(?:/|per)\s*min(?:ute)?", "packs/min", out, flags=re.I)
    # tighten numeric ranges only (don't touch hyphens inside words)
    out = re.sub(r"(\d)\s+to\s+(\d)", r"\1-\2", out)
    out = re.sub(r"(\d)\s*-\s*(\d)", r"\1-\2", out)
    out = re.sub(r"\s+", " ", out).strip()
    if out != s:
        changes["speed"] += 1
    return out

def normalize_rate(val):
    s = str(val).strip()
    out = re.sub(r"kg\s*/?\s*(?:per\s*)?hour", "kg/hr", s, flags=re.I)
    out = re.sub(r"kg\s*/?\s*hr", "kg/hr", out, flags=re.I)
    if out != s:
        changes["rate"] += 1
    return out

def fix_words(text):
    def repl(m):
        w = m.group(0)
        low = w.lower()
        if low in WORD_FIX and WORD_FIX[low] != low:
            r = WORD_FIX[low]
            return r.capitalize() if w[0].isupper() else r
        return w
    return re.sub(r"[A-Za-z]+", repl, text)

def tidy_text(val):
    if not isinstance(val, str):
        return val
    s = val
    s = fix_words(s)
    s = re.sub(r"[ \t]+", " ", s)               # collapse spaces
    s = re.sub(r"\s+([,.;:])", r"\1", s)        # no space before punct
    s = re.sub(r"\bM\.?S\b", "M.S", s)          # canonical mild steel
    s = re.sub(r"\bS\.?S\b", "S.S", s)          # canonical stainless steel
    s = s.strip()
    return s

def tidy_sentence(val):
    """tidy + ensure capital first letter and trailing period."""
    if not isinstance(val, str) or not val.strip():
        return val
    s = tidy_text(val)
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    if s and s[-1] not in ".!?":
        s = s + "."
    if s != val:
        changes["text"] += 1
    return s

def title_name(val):
    """Conservative: names are already Title Case in the data, so only fix
    spelling/terms, collapse whitespace, and capitalise the first letter."""
    if not isinstance(val, str) or not val.strip():
        return val
    s = re.sub(r"[ \t]+", " ", fix_words(val)).strip()
    m = re.search(r"[A-Za-z]", s)
    if m and s[m.start()].islower():
        i = m.start()
        s = s[:i] + s[i].upper() + s[i + 1:]
    if s != val:
        changes["name"] += 1
    return s

DIM_KEYS = {"dimension", "dimensions"}
LINEAR_KEYS = {"length", "width", "diameter", "height"}
WEIGHT_KEYS = {"weight", "netWeight", "grossWeight"}
POWER_KEYS = {"powerLoad", "power", "electricLoad", "mainPower"}
SPEED_KEYS = {"speed", "output", "productionSpeed", "outputSpeed", "production", "productionCapacity"}

def normalize_specs(specs):
    if not isinstance(specs, dict):
        return specs
    new = {}
    for k, v in specs.items():
        nk = KEY_FIX.get(k, k)
        if nk != k:
            changes["keys"] += 1
        if isinstance(v, str):
            if k in DIM_KEYS or k in LINEAR_KEYS:
                v = normalize_dimension(v)
            elif k in WEIGHT_KEYS:
                v = normalize_weight(v)
            elif k in POWER_KEYS:
                v = normalize_power(v)
            elif k in SPEED_KEYS:
                v = normalize_speed(v)
                v = normalize_rate(v)
            else:
                v = normalize_rate(normalize_power(tidy_text(v)))
        # drop specs whose value is empty / meaningless (e.g. powerLoad 'None')
        if v is None or (isinstance(v, str) and v.strip() == ""):
            continue
        if nk in new and not new[nk]:
            new[nk] = v
        else:
            new.setdefault(nk, v)
    return new

def walk(d):
    for cat in d["categories"]:
        if cat["id"] in ACCENT and cat.get("accentColor") != ACCENT[cat["id"]]:
            cat["accentColor"] = ACCENT[cat["id"]]
            changes["accent"] += 1
        cat["label"] = title_name(cat.get("label", ""))
        for line in cat["lines"]:
            line["name"] = title_name(line.get("name", ""))
            if line.get("description"):
                line["description"] = tidy_sentence(line["description"])
            if line.get("productionRate"):
                line["productionRate"] = normalize_rate(line["productionRate"])
            for m in line["machines"]:
                m["name"] = title_name(m.get("name", ""))
                if m.get("function"):
                    m["function"] = tidy_sentence(m["function"])
                if m.get("description"):
                    m["description"] = tidy_sentence(m["description"])
                if "specs" in m:
                    m["specs"] = normalize_specs(m["specs"])
                for dp in m.get("diesAndParts", []):
                    dp["name"] = title_name(dp.get("name", ""))
                    if dp.get("description"):
                        dp["description"] = tidy_sentence(dp["description"])
                    if "specs" in dp:
                        dp["specs"] = normalize_specs(dp["specs"])
    return d

def main():
    d = json.load(open(CJSON, encoding="utf-8"))
    before = json.dumps(d, ensure_ascii=False)
    d = walk(d)
    after = json.dumps(d, ensure_ascii=False)
    print("CHANGE COUNTS:")
    for k, v in changes.items():
        if k == "dim_unparsed":
            print(f"  dimensions left un-parsed: {len(v)}")
        else:
            print(f"  {k:10s}: {v}")
    if changes["dim_unparsed"]:
        print("  --- un-parsed dimension strings (need manual review) ---")
        for s in sorted(set(changes["dim_unparsed"])):
            print("      ", repr(s))
    if APPLY:
        out = json.dumps(d, ensure_ascii=False, indent=2)
        CJSON.write_text(out + "\n", encoding="utf-8")
        CJS.write_text("window.CATALOG_DATA = " + out + ";\n", encoding="utf-8")
        print("APPLIED -> wrote catalog.json and catalog-data.js")
    else:
        print("DRY RUN (no files written). Re-run with --apply to write.")

if __name__ == "__main__":
    main()
