# Catalog data migration — STARMER booklets → catalog

Source of truth: `scripts/build_catalog.py` (run it to regenerate
`js/catalog-data.js` + `data/catalog.json`). Originals backed up as
`*.bak`. Placeholder image: `assets/images/coming-soon.svg`.

Rules: ignore `assets/STARMER/DIES` and `assets/STARMER/PARTS`; every machine
gets 1 placeholder die + 1 placeholder part (image coming soon). Concise
name + function + short description + key specs per machine. Numbering
strategy unchanged (HC-L-001 / HC-L001-M01 / -D01 / -P01).

## Progress (1 / 21 lines)

### Hard Candy (HC) — 1/4
- [x] HC-L-001  Complete Candy Line 200 kg/hr
- [ ] HC-L-002  Complete Candy Line 450 kg/hr
- [ ] HC-L-003  Complete Candy Line 1000 kg/hr
- [ ] HC-L-004  Chain Die Candy Line 450 kg/hr

### Lollipop (LP) — 0/3
- [ ] LP-L-001  Lollipop 200 kg
- [ ] LP-L-002  Lollipop Standard Speed Line 450 kg/hr
- [ ] LP-L-003  Flat Lollipop Line

### Chew & Toffee (CT) — 0/7
- [ ] CT-L-001  Toffee 400 kg/hr Complete Line
- [ ] CT-L-002  Toffee 800 kg/hr Complete Line
- [ ] CT-L-003  Chain Die Toffee 400 kg/hr Complete Line
- [ ] CT-L-004  Double Twist Chew Complete Line
- [ ] CT-L-005  Fudge Complete Line
- [ ] CT-L-006  Chew Stick Lollipop Line
- [ ] CT-L-007  Zombie Complete Line

### Bubble Gum (BG) — 0/6
- [ ] BG-L-001  Ball Gum Complete Line
- [ ] BG-L-002  Bazuka Bubble Gum Line
- [ ] BG-L-003  Centre Filled Bubble 300 kg/hr
- [ ] BG-L-004  Centre Filled Bubble 600 kg/hr
- [ ] BG-L-005  Pop Complete Line
- [ ] BG-L-006  Trigum Line

### Pharma (PH) — 0/1
- [ ] PH-L-001  Complete Pharma (Lozenges) 450 kg/hr

## Machine library
Transcribed once in `LIB_LIST`; reused across lines. Current entries:
Glucose Tank, Steam Generator, Steam Header, Dissolving Tank, Batch Type
Cooker, Vacuum Pump, Cooling Table, Kneading Machine, Powder Filling Pump,
Batch Roller, Rope Sizer, Small Candy Plant, Vibrator, Pillow Pack Wrapping
Machine. (New machines from later booklets get appended as encountered.)
