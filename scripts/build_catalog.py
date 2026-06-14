#!/usr/bin/env python3
"""
Source-of-truth builder for the Starmer Global catalog.

Transcribed (concise) data from the client booklets lives in LINES below.
Running this script regenerates BOTH:
  - js/catalog-data.js   (window.CATALOG_DATA = {...})
  - data/catalog.json    (same object as plain JSON)

Numbering strategy (kept identical to the original placeholder data):
  line   -> {PREFIX}-L-{seq:03d}           e.g. HC-L-001
  machine-> {PREFIX}-L{seq:03d}-M{i:02d}   e.g. HC-L001-M01
  die    -> {machine}-D01
  part   -> {machine}-P01

Per the client's instruction, every machine gets exactly one placeholder die
and one placeholder part, both using the "coming soon" image (to be replaced).
The DIES/ and PARTS/ folders in assets/STARMER are intentionally ignored.
"""
import json, os, re, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STARMER = os.path.join(ROOT, "assets", "STARMER")
PLACEHOLDER_IMG = "assets/images/coming-soon.svg"

CATEGORIES = [
    {"id": "hard-candy", "label": "Hard Candy Production", "slug": "hard-candy",
     "color": "#0D6B5E", "accentColor": "#14B8A6", "prefix": "HC",
     "description": "Complete production lines for hard candy in all shapes — pillow, ball, cushion, and chain die formats. Capacities from 200 to 1000 kg/hr."},
    {"id": "lollipop", "label": "Lollipop Production", "slug": "lollipop",
     "color": "#1E3A8A", "accentColor": "#3B82F6", "prefix": "LP",
     "description": "Full lollipop production lines from syrup cooking through forming, cooling and wrapping. Round, ball and flat lollipop formats in capacities from 200 to 450 kg/hr."},
    {"id": "chew-toffee", "label": "Chew & Toffee Production", "slug": "chew-toffee",
     "color": "#7C3AED", "accentColor": "#A78BFA", "prefix": "CT",
     "description": "Complete lines for chew sticks, fudge, toffee, cut & twist chews and novelty formats. Includes chain die, cut & twist, and continuous forming technologies."},
    {"id": "bubble-gum", "label": "Bubble Gum Production", "slug": "bubble-gum",
     "color": "#BE185D", "accentColor": "#F472B6", "prefix": "BG",
     "description": "Complete bubble gum production lines for centre-filled, ball, Bazooka, cut & twist, and pillow-wrap formats."},
    {"id": "pharma", "label": "Pharma Production", "slug": "pharma",
     "color": "#065F46", "accentColor": "#10B981", "prefix": "PH",
     "description": "GMP-compliant pharmaceutical confectionery lines for lozenges and medicated sweets. Designed for active-ingredient handling with full documentation and traceability."},
]

def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())

# ---------------------------------------------------------------------------
# MACHINE LIBRARY — each machine transcribed once (keyed by its name).
# Lines reference these by name; specs/text are shared because the client
# reuses the same SEW models across lines. Per-line tweaks use {"ref","specs"}.
# ---------------------------------------------------------------------------
LIB_LIST = [
    {"name": "Glucose Tank", "model": "SEW-101",
     "function": "Hygienic, stable storage of liquid glucose and syrups for the line.",
     "description": "Vertical S.S 304 storage tank engineered for crystal-free storage of liquid glucose and syrups, with base heating coil and an external service ladder.",
     "specs": {"model": "SEW-101", "grade": "S.S 304", "capacity": "20 ton glucose", "design": "Vertical", "sheetThickness": "5 mm upper & lower", "outerDiaSheet": "3 mm", "heating": "Coil on tank base", "dimensions": "16 ft × 7 ft (H × dia)"}},
    {"name": "Steam Generator", "model": "SEW-102",
     "function": "Heats water to produce high-pressure steam for cooking and cleaning.",
     "description": "Three-pass steam generator with full auto-controlled electric panel, multistage feed water pump and gas/diesel burner assembly, supplying process steam to the line.",
     "specs": {"model": "SEW-102", "typeOfPasses": "3 pass", "workingPressure": "150 psi", "testPressure": "225 psi", "tubeSize": '2" or 2½"', "tubeSheetThickness": '½"', "insulation": "Rock wool 2\", 24 gauge sheet", "burnerMotor": "2 hp", "powerLoad": "5 hp"}},
    {"name": "Steam Header", "model": "SEW-103",
     "function": "Collects steam and distributes dry, high-quality steam to user points.",
     "description": "Cushioned-cylinder mild-steel header that collects steam from the generator and distributes it to multiple branch points across the line.",
     "specs": {"model": "SEW-103", "material": "M.S", "diameter": "1 ft", "design": "Cushioned cylinder", "branchPipes": "1–4 (per system needs)"}},
    {"name": "Dissolving Tank", "model": "SEW-106",
     "function": "Controlled dissolution of sugar and glucose into a homogeneous syrup.",
     "description": "Double-jacketed dissolving tank with S.S 304 body and stirrer for controlled dissolution of sugar, glucose syrup and other ingredients into a uniform solution.",
     "specs": {"model": "SEW-106", "capacity": "400 kg", "body": "S.S 304", "jacket": "Double jacketed, M.S", "stirrer": "S.S 304", "legs": "M.S", "gearMotor": "2 hp", "dimensions": "5'6\" × 3'5\" × 3'5\" (H×W×L)", "powerLoad": "2 hp"}},
    {"name": "Batch Type Cooker", "model": "SEW-005",
     "function": "Cooks and concentrates syrup to the target moisture and temperature.",
     "description": "Double-jacketed batch cooker with S.S 304 pan and body, gauges and electric control panel, concentrating the sugar syrup to the final moisture content for high-quality candy.",
     "specs": {"model": "SEW-005", "throughput": "200 kg/hr", "pan": "S.S 304", "body": "S.S 304", "jacket": "Double jacketed, M.S", "frame": "M.S", "gearMotor": "2 hp", "dimensions": "8' × 2'5\" × 3'5\" (H×W×L)", "powerLoad": "2 hp"}},
    {"name": "Vacuum Pump", "model": "SEW-006",
     "function": "Removes moisture from the cooked mass under reduced pressure.",
     "description": "Mild-steel-framed vacuum pump that rapidly removes water vapour from the cooked candy mass under vacuum, allowing lower-temperature boiling and preventing caramelisation.",
     "specs": {"model": "SEW-006", "rating": "7.5 hp @ 1450 rpm", "frame": "M.S", "dimensions": "2 ft × 4 ft × 1 ft (H×W×L)", "powerLoad": "7.5 hp"}},
    {"name": "Cooling Table", "model": "SEW-108",
     "function": "Rapid cooling and conditioning of the cooked sugar mass.",
     "description": "Water-cooled S.S 304 cooling table that rapidly cools and conditions the cooked mass before mixing, flavouring, colouring and forming, ensuring uniform texture and workability.",
     "specs": {"model": "SEW-108", "plateMaterial": "S.S 304", "basePlateThickness": "10 mm", "coolingMedium": "Water", "legs": "4 nos, SS 201", "dimensions": "3 ft × 6 ft × 2'6\" (H×L×W)"}},
    {"name": "Kneading Machine", "model": "SEW-109",
     "function": "Uniform mixing and kneading of the cooked sugar mass.",
     "description": "Rotary kneading machine with S.S 304 rollers and plates that uniformly distributes solids, acids and additives through the candy mass; water-cooled contact parts replace tiring manual mixing.",
     "specs": {"model": "SEW-109", "roller": "S.S 304", "mainPlates": "S.S 304", "sideSheets": "SS 201", "steelPlate": "4 ft", "mainDrive": "5 hp", "dimensions": "5' × 5'6\" × 5'6\" (H×W×L)", "powerLoad": "5 hp"}},
    {"name": "Powder Filling Pump", "model": "SEW-009",
     "function": "Precision dosing of dry powder filling into the centre of the candy rope.",
     "description": "Centre-filling powder pump that injects dry or semi-dry powder fillings (milk, cocoa, fruit or malt based) into the centre of the candy rope during forming for consistent distribution across all pieces.",
     "specs": {"model": "SEW-009", "hopper": "S.S 304", "gearMotor": "2 hp", "speedControl": "Variable inverter, 2 hp", "feedRod": "Teflon-covered with S.S worm", "stand": "M.S", "powerLoad": "2 hp"}},
    {"name": "Batch Roller", "model": "SEW-114",
     "function": "Rolls the cooked mass into a uniform cylindrical rope.",
     "description": "Horizontal four-roller batch roller in S.S 304 food grade that continuously rolls and shapes the cooked mass into a uniform rope, with heaters to hold temperature and a tray for wastage removal.",
     "specs": {"model": "SEW-114", "frame": "Horizontal", "rollers": "4, S.S 304 food grade", "capacity": "75 kg", "ropeLength": "6.5 ft", "heaters": "1000 W × 2 nos (2 kW)", "mainDrive": "1 hp", "upDownDrive": "1 hp", "dimensions": "4'6\" × 2'2\" × 7'", "powerLoad": "4.68 hp"}},
    {"name": "Rope Sizer", "model": "SEW-115",
     "function": "Calibrates the rope to a uniform diameter for forming.",
     "description": "Horizontal five-stage rope sizer with graduated S.S 304 roller pairs (32/27/22/17 mm) and brass rope guides that accurately reduce and calibrate the rope diameter for consistent candy size and weight.",
     "specs": {"model": "SEW-115", "type": "Horizontal, 5 stage", "rollerPairs": "S.S 304 — 32 / 27 / 22 / 17 mm", "sizerPlates": "S.S 304", "ropeGuide": "Brass", "gearMotors": "SEW (Germany)", "inverter": "1 hp", "heaters": "500 W × 4 nos (2 kW)", "mainDrive": "2 hp", "dimensions": "4.5 ft × 2.5 ft × 6 ft", "powerLoad": "4.68 hp"}},
    {"name": "Small Candy Plant", "model": "SEW-011",
     "function": "Forms the rope into uniform individual candy pieces.",
     "description": "Compact candy forming plant with oil-bath gears that shapes, sizes and cuts the candy rope into uniform individual pieces at up to 1000 pieces per minute; die supplied separately.",
     "specs": {"model": "SEW-011", "gears": "Oil-bath system", "sideSheets": "M.S", "die": "Without die (supplied separately)", "speed": "Up to 1000 pcs/min", "capacity": "Up to 200 kg/hr", "motor": "1 hp", "powerLoad": "1 hp"}},
    {"name": "Vibrator", "model": "SEW-120",
     "function": "Conveys formed candies onward while preventing clumping.",
     "description": "M.S-framed vibrating conveyor with S.S 304 sheet and cooling fans that smoothly transports candies from the cooling and forming sections to packaging while preventing clumping or sticking.",
     "specs": {"model": "SEW-120", "frame": "M.S", "mainSheet": "S.S 304", "fans": "2 nos", "trays": "S.S 304, 2 nos", "gearMotor": "1 hp", "dimensions": "3.5 ft × 4.5 ft × 8 ft", "powerLoad": "1 hp"}},
    {"name": "Pillow Pack Wrapping Machine", "model": "SEW-123",
     "function": "High-speed pillow-pack wrapping of finished candies.",
     "description": "High-performance pillow-pack wrapper for filled or unfilled candies and bubble gum, with photo-electric eye, inverter and high-quality fin/end seals for long shelf life at up to 800 pieces per minute.",
     "specs": {"model": "SEW-123", "output": "Up to 800 pcs/min (candy) / 500 pcs/min (bubble)", "motors": "2 HP / 3-phase + ½ HP", "heaters": "3.2 kW", "standardEquipment": "Photo-electric eye & inverter", "reel": "Max OD 280 mm / core 70 mm", "dimensions": "2,335 × 900 × 1,715 mm (L×W×H)", "weight": "750 kg"}},
]
LIB = {norm(m["name"]): m for m in LIB_LIST}

# ---------------------------------------------------------------------------
# Lines. machines = ordered list; each item is either a name (str -> LIB),
# {"ref": name, "specs": {...overrides}, "name"/"function"/"description"/"img"},
# or a full dict for a brand-new machine.
# ---------------------------------------------------------------------------
LINES = [
    {
        "category": "hard-candy",
        "folder": "HARD CANDY/Complete Candy line 200Kg_Hr",
        "name": "Complete Candy Line 200 kg/hr",
        "productionRate": "200 kg/hr",
        "description": "A compact, fully integrated hard candy line for small-to-medium production. Covers the full process from glucose storage and steam supply through cooking, kneading, rope forming and sizing to small-candy forming and pillow-pack wrapping.",
        "lineImage": "Small Candy Plant",
        "machines": [
            "Glucose Tank", "Steam Generator", "Steam Header", "Dissolving Tank",
            "Batch Type Cooker", "Vacuum Pump", "Cooling Table", "Kneading Machine",
            "Powder Filling Pump", "Batch Roller", "Rope Sizer", "Small Candy Plant",
            "Vibrator", "Pillow Pack Wrapping Machine",
        ],
    },
]

# ---------------------------------------------------------------------------
# Build helpers
# ---------------------------------------------------------------------------
def resolve_machine(item):
    """Turn a line's machine entry (str | ref-dict | full-dict) into a full machine."""
    if isinstance(item, str):
        base = LIB.get(norm(item))
        if not base:
            raise SystemExit(f"!! Machine '{item}' not in LIB")
        return dict(base)
    if "ref" in item:
        base = LIB.get(norm(item["ref"]))
        if not base:
            raise SystemExit(f"!! ref '{item['ref']}' not in LIB")
        out = dict(base)
        if "specs" in item:
            out["specs"] = {**base["specs"], **item["specs"]}
        for k in ("name", "function", "description", "img"):
            if k in item:
                out[k] = item[k]
        return out
    return dict(item)

def find_image(folder_rel, name, override=None):
    folder_abs = os.path.join(STARMER, *folder_rel.split('/'))
    try:
        files = [f for f in os.listdir(folder_abs)
                 if f.lower().endswith(('.jpg', '.jpeg', '.png', '.avif', '.webp'))]
    except FileNotFoundError:
        raise SystemExit(f"!! Folder not found: {folder_abs}")
    wanted = norm(override or name)
    # exact stem match first
    for f in files:
        if norm(os.path.splitext(f)[0]) == wanted:
            return encode_path(folder_rel, f)
    # then containment
    for f in files:
        stem = norm(os.path.splitext(f)[0])
        if wanted and (wanted in stem or stem in wanted):
            return encode_path(folder_rel, f)
    print(f"  [warn] no image for '{name}' in {folder_rel} -> placeholder")
    return PLACEHOLDER_IMG

def encode_path(folder_rel, filename):
    parts = ["assets", "STARMER"] + folder_rel.split('/') + [filename]
    return "/".join(urllib.parse.quote(p) for p in parts)

def placeholder_dies_parts(machine_number, machine_name):
    return [
        {"id": f"{machine_number}-D01", "partNumber": f"{machine_number}-D01", "type": "die",
         "name": f"{machine_name} — Die", "description": "Details and image coming soon.",
         "image": PLACEHOLDER_IMG, "specs": {"compatibleMachine": machine_number}},
        {"id": f"{machine_number}-P01", "partNumber": f"{machine_number}-P01", "type": "part",
         "name": f"{machine_name} — Spare Part", "description": "Details and image coming soon.",
         "image": PLACEHOLDER_IMG, "specs": {"compatibleMachine": machine_number}},
    ]

def build():
    cat_by_slug = {c["slug"]: dict(c, lines=[]) for c in CATEGORIES}
    seq = {c["slug"]: 0 for c in CATEGORIES}

    for ln in LINES:
        cat = cat_by_slug[ln["category"]]
        prefix = cat["prefix"]
        seq[ln["category"]] += 1
        s = seq[ln["category"]]
        line_no = f"{prefix}-L-{s:03d}"
        m_prefix = f"{prefix}-L{s:03d}"

        machines = []
        line_img = PLACEHOLDER_IMG
        for i, raw in enumerate(ln["machines"], start=1):
            m = resolve_machine(raw)
            mno = f"{m_prefix}-M{i:02d}"
            img = find_image(ln["folder"], m["name"], m.get("img"))
            if ln.get("lineImage") and norm(ln["lineImage"]) == norm(m["name"]):
                line_img = img
            machines.append({
                "id": mno, "machineNumber": mno, "orderInLine": i,
                "name": m["name"], "function": m["function"],
                "description": m["description"], "image": img,
                "specs": m["specs"],
                "diesAndParts": placeholder_dies_parts(mno, m["name"]),
            })
        if ln.get("lineImage") is None and machines:
            line_img = machines[0]["image"]

        cat["lines"].append({
            "id": line_no, "lineNumber": line_no, "name": ln["name"],
            "productionRate": ln["productionRate"], "description": ln["description"],
            "image": line_img, "machines": machines,
        })

    categories = []
    for c in CATEGORIES:
        cc = cat_by_slug[c["slug"]]
        cc.pop("prefix", None)
        categories.append(cc)
    return {"categories": categories}

def main():
    data = build()
    pretty = json.dumps(data, indent=2, ensure_ascii=False)
    with open(os.path.join(ROOT, "data", "catalog.json"), "w", encoding="utf-8") as f:
        f.write(pretty + "\n")
    with open(os.path.join(ROOT, "js", "catalog-data.js"), "w", encoding="utf-8") as f:
        f.write("window.CATALOG_DATA = " + pretty + ";\n")
    n_lines = sum(len(c["lines"]) for c in data["categories"])
    n_mach = sum(len(l["machines"]) for c in data["categories"] for l in c["lines"])
    print(f"Built {len(data['categories'])} categories, {n_lines} lines, {n_mach} machines.")
    for c in data["categories"]:
        print(f"  {c['label']:28} {len(c['lines'])} lines")

if __name__ == "__main__":
    main()
