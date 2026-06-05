export const CATEGORIES = {
  lollipop: {
    label: 'Lollipop',
    subcategories: {
      'production-lines': { label: 'Production Lines' },
      'machines':         { label: 'Machines' },
      'spare-parts':      { label: 'Spare Parts' }
    }
  },
  candy: {
    label: 'Hard Candy',
    subcategories: {
      'production-lines': { label: 'Production Lines' },
      'machines':         { label: 'Machines' },
      'spare-parts':      { label: 'Spare Parts' }
    }
  },
  gum: {
    label: 'Bubble / Chewing Gum',
    subcategories: {
      'production-lines': { label: 'Production Lines' },
      'machines':         { label: 'Machines' },
      'spare-parts':      { label: 'Spare Parts' }
    }
  }
};

export const PRODUCTS = [
  // ── PRODUCTION LINES ────────────────────────────────────────────────────────

  {
    id: 'lol-pl-001',
    partNumber: 'CEQ-PL-LOL-001',
    name: 'Automatic Lollipop Production Line',
    category: 'lollipop',
    subcategory: 'production-lines',
    tagline: 'End-to-end automated lollipop manufacturing from syrup cooking to stick insertion.',
    description: 'The CEQ-PL-LOL-001 is a fully integrated lollipop production line capable of processing crystalline sugar syrup through depositing, stick insertion, cooling tunnel, and individual wrapping in a single continuous flow. Designed for high-output facilities, it incorporates PLC-driven synchronization and quick-change mold carriers for shape variety. Constructed entirely from food-grade 316L stainless steel with HACCP-compliant washdown design.',
    specs: {
      throughput:           '1,200 pcs/min',
      powerConsumption:     '45 kW',
      dimensions:           '32,000 × 1,800 × 2,200 mm',
      weight:               '8,500 kg',
      materialContact:      '316L Stainless Steel, FDA 21 CFR',
      operatingTemp:        '18–30 °C ambient',
      voltageDefault:       '380V / 3-phase / 50 Hz',
      controlSystem:        'Siemens S7-1500 PLC + 12″ HMI touchscreen',
      certifications:       'CE, FDA, ISO 9001:2015',
      coolingTunnelLength:  '12,000 mm',
      stickInserterSpeed:   '1,200 sticks/min'
    },
    configurations: {
      voltage: [
        '380V / 50 Hz (Standard)',
        '460V / 60 Hz (North America)',
        '415V / 50 Hz (UK / AU)'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Satin Brush (Ra ≤ 0.8 µm)',
        'Bead Blast (Ra ≤ 1.6 µm)'
      ]
    },
    imagePlaceholder: '#1E3A8A',
    relatedProducts: ['CEQ-MC-LOL-001', 'CEQ-MC-LOL-002', 'CEQ-SP-LOL-001']
  },

  {
    id: 'can-pl-001',
    partNumber: 'CEQ-PL-CAN-001',
    name: 'Continuous Hard Candy Drop Roller Line',
    category: 'candy',
    subcategory: 'production-lines',
    tagline: 'High-speed drop-roller line for pillow, ball, and cushion-shaped hard candies.',
    description: 'The CEQ-PL-CAN-001 integrates a twin-arm batch roller, rope sizer, drop-roller forming unit, and vibratory cooler in a compact inline arrangement. Capable of processing both clear and filled (liquid-center) candies without line changeover, it reduces downtime between SKUs by 60% vs. traditional batch processes. All product-contact surfaces comply with EU 1935/2004 and FDA 21 CFR material regulations.',
    specs: {
      throughput:             '900 kg/hr',
      powerConsumption:       '38 kW',
      dimensions:             '28,500 × 1,600 × 2,000 mm',
      weight:                 '7,200 kg',
      materialContact:        '316L Stainless Steel, EU 1935/2004',
      operatingTemp:          '15–28 °C ambient',
      voltageDefault:         '380V / 3-phase / 50 Hz',
      controlSystem:          'Allen-Bradley CompactLogix + 10″ HMI',
      certifications:         'CE, FDA, ISO 9001:2015',
      ropeCalibrationDiameter:'12–40 mm adjustable',
      batchCapacity:          '50 kg per batch'
    },
    configurations: {
      voltage: [
        '380V / 50 Hz (Standard)',
        '460V / 60 Hz (North America)',
        '415V / 50 Hz (UK / AU)'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Satin Brush (Ra ≤ 0.8 µm)',
        'Electropolish (Ra ≤ 0.25 µm)'
      ]
    },
    imagePlaceholder: '#0F766E',
    relatedProducts: ['CEQ-MC-CAN-001', 'CEQ-MC-CAN-002', 'CEQ-SP-CAN-001']
  },

  {
    id: 'gum-pl-001',
    partNumber: 'CEQ-PL-GUM-001',
    name: 'Bubble & Chewing Gum Continuous Forming Line',
    category: 'gum',
    subcategory: 'production-lines',
    tagline: 'Fully automated gum base mixing through slab, pellet, or ball forming with inline coating.',
    description: 'The CEQ-PL-GUM-001 handles the complete gum manufacturing sequence: heated sigma-blade mixing, multi-roller calender for sheet thickness calibration, scoring and cutting for pellets or sticks, and an optional enrobing drum for sugar or film coating. Temperature-controlled zones throughout ensure consistent gum base viscosity and product texture. Compatible with both chicle-based and polyvinyl acetate gum bases.',
    specs: {
      throughput:         '600 kg/hr',
      powerConsumption:   '52 kW',
      dimensions:         '24,000 × 2,200 × 2,400 mm',
      weight:             '9,100 kg',
      materialContact:    '304 Stainless Steel, FDA 21 CFR',
      operatingTemp:      '20–35 °C ambient (temperature-controlled zones)',
      voltageDefault:     '380V / 3-phase / 50 Hz',
      controlSystem:      'Beckhoff TwinCAT PLC + 15″ HMI touchscreen',
      certifications:     'CE, FDA, ISO 22000:2018',
      calenderRollerCount:'5-roll calender stack',
      mixerCapacity:      '300 kg per batch'
    },
    configurations: {
      voltage: [
        '380V / 50 Hz (Standard)',
        '460V / 60 Hz (North America)',
        '208V / 60 Hz (North America Low)'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Satin Brush (Ra ≤ 0.8 µm)',
        'Bead Blast (Ra ≤ 1.6 µm)'
      ]
    },
    imagePlaceholder: '#7C3AED',
    relatedProducts: ['CEQ-MC-GUM-001', 'CEQ-MC-GUM-002', 'CEQ-SP-GUM-001']
  },

  // ── MACHINES ─────────────────────────────────────────────────────────────────

  {
    id: 'lol-mc-001',
    partNumber: 'CEQ-MC-LOL-001',
    name: 'Lollipop Syrup Vacuum Cooker',
    category: 'lollipop',
    subcategory: 'machines',
    tagline: 'Precision vacuum cooking ensures crystal-clear, bubble-free lollipop syrup every batch.',
    description: 'The CEQ-MC-LOL-001 is a continuous vacuum cooking system designed specifically for high-Brix lollipop syrups. A jacketed scraped-surface heat exchanger combined with a downstream vacuum chamber removes moisture to target dry-solids levels of 97–99% without caramelization. Integrated conductivity sensors provide real-time Brix feedback and automatic steam valve modulation.',
    specs: {
      throughput:       '500 kg/hr',
      powerConsumption: '22 kW',
      dimensions:       '3,200 × 900 × 1,800 mm',
      weight:           '1,240 kg',
      materialContact:  '316L Stainless Steel, FDA 21 CFR',
      operatingTemp:    'Cook temp 130–165 °C; ambient 18–30 °C',
      voltageDefault:   '380V / 3-phase / 50 Hz',
      controlSystem:    'Siemens S7-300 PLC + 7″ HMI',
      certifications:   'CE, PED 2014/68/EU, ISO 9001:2015',
      vacuumLevel:      '−0.08 to −0.095 MPa',
      steamPressureMax: '0.6 MPa'
    },
    configurations: {
      voltage: [
        '380V / 50 Hz (Standard)',
        '460V / 60 Hz (North America)',
        '415V / 50 Hz (UK / AU)'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Electropolish (Ra ≤ 0.25 µm)',
        'Satin Brush (Ra ≤ 0.8 µm)'
      ]
    },
    imagePlaceholder: '#1D4ED8',
    relatedProducts: ['CEQ-PL-LOL-001', 'CEQ-MC-LOL-002', 'CEQ-SP-LOL-002']
  },

  {
    id: 'lol-mc-002',
    partNumber: 'CEQ-MC-LOL-002',
    name: 'Rotary Lollipop Depositor & Stick Inserter',
    category: 'lollipop',
    subcategory: 'machines',
    tagline: 'Servo-driven rotary depositor for round, star, and 3-D lollipop shapes at up to 1,200 pcs/min.',
    description: 'The CEQ-MC-LOL-002 combines a 24-station rotary mold table with a servo-synchronized piston depositor and pneumatic stick-insertion head. Each station carries interchangeable silicone mold inserts, enabling shape changeover in under 15 minutes. Integrated cooling plates on the mold table pre-solidify the candy before stick insertion, eliminating stick drift and improving center alignment.',
    specs: {
      throughput:        '1,200 pcs/min',
      powerConsumption:  '11 kW',
      dimensions:        '2,800 × 1,400 × 1,900 mm',
      weight:            '1,680 kg',
      materialContact:   '316L Stainless Steel + Food-grade Silicone, FDA 21 CFR',
      operatingTemp:     '18–30 °C ambient',
      voltageDefault:    '380V / 3-phase / 50 Hz',
      controlSystem:     'Omron NX PLC + 10″ HMI touchscreen',
      certifications:    'CE, FDA, ISO 9001:2015',
      moldStations:      '24 stations',
      stickDiameterRange:'3–5 mm paper or plastic stick'
    },
    configurations: {
      voltage: [
        '380V / 50 Hz (Standard)',
        '460V / 60 Hz (North America)',
        '415V / 50 Hz (UK / AU)'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Satin Brush (Ra ≤ 0.8 µm)',
        'Bead Blast (Ra ≤ 1.6 µm)'
      ]
    },
    imagePlaceholder: '#2563EB',
    relatedProducts: ['CEQ-PL-LOL-001', 'CEQ-MC-LOL-001', 'CEQ-SP-LOL-001']
  },

  {
    id: 'can-mc-001',
    partNumber: 'CEQ-MC-CAN-001',
    name: 'Hard Candy Continuous Vacuum Cooker',
    category: 'candy',
    subcategory: 'machines',
    tagline: 'Continuous-flow vacuum cooker for crystal-clear, filled, or layered hard candy syrups.',
    description: 'The CEQ-MC-CAN-001 processes sugar/glucose/isomalt syrups through a falling-film evaporator followed by a high-vacuum finishing chamber to achieve <1.5% residual moisture at output temperatures of 140–160 °C. Its modular design accommodates an optional color/flavor injection manifold for in-line flavoring without interrupting the cooking cycle. Automated CIP circuits reduce changeover cleaning time to under 20 minutes.',
    specs: {
      throughput:       '800 kg/hr',
      powerConsumption: '28 kW',
      dimensions:       '4,100 × 1,000 × 2,100 mm',
      weight:           '1,860 kg',
      materialContact:  '316L Stainless Steel, EU 1935/2004',
      operatingTemp:    'Cook temp 140–165 °C; ambient 15–28 °C',
      voltageDefault:   '380V / 3-phase / 50 Hz',
      controlSystem:    'Siemens S7-1200 PLC + 7″ HMI',
      certifications:   'CE, PED 2014/68/EU, ISO 9001:2015',
      vacuumLevel:      '−0.09 MPa',
      cipCompatible:    'Yes — automated 3-stage CIP'
    },
    configurations: {
      voltage: [
        '380V / 50 Hz (Standard)',
        '460V / 60 Hz (North America)',
        '415V / 50 Hz (UK / AU)'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Electropolish (Ra ≤ 0.25 µm)',
        'Satin Brush (Ra ≤ 0.8 µm)'
      ]
    },
    imagePlaceholder: '#0D9488',
    relatedProducts: ['CEQ-PL-CAN-001', 'CEQ-MC-CAN-002', 'CEQ-SP-CAN-001']
  },

  {
    id: 'can-mc-002',
    partNumber: 'CEQ-MC-CAN-002',
    name: 'Hard Candy Drop-Roller Forming Machine',
    category: 'candy',
    subcategory: 'machines',
    tagline: 'Precision drop-roller unit producing uniform pillow, ball, and cushion shapes at 800 pcs/min.',
    description: 'The CEQ-MC-CAN-002 accepts a calibrated candy rope from an upstream rope sizer and feeds it through a pair of synchronized, engraved forming rollers that produce individually cut and shaped candy pieces in a single pass. The quick-release roller cartridge system enables die changeover in under 10 minutes. An integrated vibratory discharge conveyor separates and cools formed pieces before handoff to packaging.',
    specs: {
      throughput:       '800 pcs/min',
      powerConsumption: '7.5 kW',
      dimensions:       '1,600 × 800 × 1,400 mm',
      weight:           '620 kg',
      materialContact:  '316L Stainless Steel + Hardened Tool Steel Dies',
      operatingTemp:    '15–28 °C ambient',
      voltageDefault:   '380V / 3-phase / 50 Hz',
      controlSystem:    'Standalone servo controller + digital display',
      certifications:   'CE, ISO 9001:2015',
      rollerDiameter:   '200 mm',
      pieceWeightRange: '2–15 g adjustable'
    },
    configurations: {
      voltage: [
        '380V / 50 Hz (Standard)',
        '460V / 60 Hz (North America)',
        '415V / 50 Hz (UK / AU)'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Satin Brush (Ra ≤ 0.8 µm)',
        'Bead Blast (Ra ≤ 1.6 µm)'
      ]
    },
    imagePlaceholder: '#0F766E',
    relatedProducts: ['CEQ-PL-CAN-001', 'CEQ-MC-CAN-001', 'CEQ-SP-CAN-002']
  },

  {
    id: 'gum-mc-001',
    partNumber: 'CEQ-MC-GUM-001',
    name: 'Heated Sigma-Blade Gum Base Mixer',
    category: 'gum',
    subcategory: 'machines',
    tagline: 'Jacketed sigma-blade mixer for uniform gum base and ingredient incorporation at batch scale.',
    description: 'The CEQ-MC-GUM-001 features a double-arm sigma-blade mixing action inside a heated and jacketed trough designed to process both natural and synthetic gum bases with softeners, plasticizers, sweeteners, and flavors. The variable-speed drive allows operators to match mixing intensity to gum base viscosity grade. A hydraulic tipping mechanism facilitates complete batch discharge with zero product holdup.',
    specs: {
      throughput:        '300 kg/batch',
      powerConsumption:  '30 kW',
      dimensions:        '3,000 × 1,200 × 1,600 mm',
      weight:            '2,100 kg',
      materialContact:   '304 Stainless Steel, FDA 21 CFR',
      operatingTemp:     '40–80 °C trough jacket; 20–35 °C ambient',
      voltageDefault:    '380V / 3-phase / 50 Hz',
      controlSystem:     'VFD drive + digital temperature controller',
      certifications:    'CE, FDA, ISO 9001:2015',
      troughCapacity:    '500 L gross / 300 kg working',
      bladeSpeedRange:   '15–45 RPM variable'
    },
    configurations: {
      voltage: [
        '380V / 50 Hz (Standard)',
        '460V / 60 Hz (North America)',
        '415V / 50 Hz (UK / AU)'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Satin Brush (Ra ≤ 0.8 µm)',
        'Bead Blast (Ra ≤ 1.6 µm)'
      ]
    },
    imagePlaceholder: '#6D28D9',
    relatedProducts: ['CEQ-PL-GUM-001', 'CEQ-MC-GUM-002', 'CEQ-SP-GUM-001']
  },

  {
    id: 'gum-mc-002',
    partNumber: 'CEQ-MC-GUM-002',
    name: 'Multi-Roller Gum Calender & Strip Cutter',
    category: 'gum',
    subcategory: 'machines',
    tagline: '5-roll calender stack with inline guillotine cutter for precise stick and pellet forming.',
    description: 'The CEQ-MC-GUM-002 accepts warm gum mass from a mixer or extruder and progressively reduces it through a 5-roll calender to a calibrated sheet thickness of 2–12 mm. An inline guillotine scoring unit and a rotary cross-cutter produce sticks or pellets to exact weight specifications. Chilled roll surfaces (5–15 °C) prevent sticking and maintain dimensional stability throughout the calendering process.',
    specs: {
      throughput:          '500 kg/hr',
      powerConsumption:    '18.5 kW',
      dimensions:          '4,500 × 900 × 1,700 mm',
      weight:              '1,450 kg',
      materialContact:     '304 Stainless Steel + Chrome-plated Calender Rolls',
      operatingTemp:       'Roll surface 5–15 °C; ambient 20–35 °C',
      voltageDefault:      '380V / 3-phase / 50 Hz',
      controlSystem:       'Siemens S7-300 PLC + 7″ HMI',
      certifications:      'CE, FDA, ISO 9001:2015',
      sheetThicknessRange: '2–12 mm adjustable',
      rollerCount:         '5 rolls, 150 mm diameter'
    },
    configurations: {
      voltage: [
        '380V / 50 Hz (Standard)',
        '460V / 60 Hz (North America)',
        '415V / 50 Hz (UK / AU)'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Chrome Roll Finish (standard)',
        'Satin Brush (Ra ≤ 0.8 µm)'
      ]
    },
    imagePlaceholder: '#7C3AED',
    relatedProducts: ['CEQ-PL-GUM-001', 'CEQ-MC-GUM-001', 'CEQ-SP-GUM-002']
  },

  // ── SPARE PARTS ──────────────────────────────────────────────────────────────

  {
    id: 'lol-sp-001',
    partNumber: 'CEQ-SP-LOL-001',
    name: 'Silicone Lollipop Mold Insert Set (Round Classic)',
    category: 'lollipop',
    subcategory: 'spare-parts',
    tagline: 'OEM-matched silicone mold inserts for CEQ-MC-LOL-002 with 24-cavity round classic profile.',
    description: 'This set of 24 replacement silicone mold inserts is precision-machined to match the CEQ-MC-LOL-002 rotary table cavity dimensions and provides a 40 mm diameter round classic lollipop profile. Manufactured from platinum-cured LSR (Liquid Silicone Rubber) approved for direct food contact under FDA 21 CFR 177.2600 and EU 10/2011. Each set is individually serialized and pressure-tested before shipment.',
    specs: {
      throughput:        'N/A (spare part)',
      powerConsumption:  'N/A',
      dimensions:        'Individual insert: 65 × 65 × 22 mm',
      weight:            '0.8 kg per set (24 inserts)',
      materialContact:   'Platinum-cured LSR, FDA 21 CFR 177.2600, EU 10/2011',
      operatingTemp:     '−50 to +200 °C',
      voltageDefault:    'N/A',
      controlSystem:     'N/A',
      certifications:    'FDA, CE (equipment approval), ISO 9001:2015',
      moldCavityCount:   '24 cavities per set',
      compatibleMachine: 'CEQ-MC-LOL-002',
      lollipopDiameter:  '40 mm round'
    },
    configurations: {
      voltage: [
        'N/A — document for records only',
        '380V / 50 Hz reference',
        '460V / 60 Hz reference'
      ],
      finish: [
        'Standard Platinum LSR (Natural)',
        'High-Durometer LSR Shore 60A',
        'High-Durometer LSR Shore 70A'
      ]
    },
    imagePlaceholder: '#1E40AF',
    relatedProducts: ['CEQ-MC-LOL-002', 'CEQ-PL-LOL-001', 'CEQ-SP-LOL-002']
  },

  {
    id: 'lol-sp-002',
    partNumber: 'CEQ-SP-LOL-002',
    name: 'Lollipop Line Main Drive Belt Assembly',
    category: 'lollipop',
    subcategory: 'spare-parts',
    tagline: 'OEM-spec polyurethane timing belt for CEQ-PL-LOL-001 main conveyor drive.',
    description: 'The CEQ-SP-LOL-002 is a precision-molded polyurethane timing belt with steel tension cord reinforcement, designed for continuous operation on the CEQ-PL-LOL-001 main conveyor drive shaft. Its open-mesh food-grade polyurethane formulation meets FDA 21 CFR 177.2600 and provides excellent chemical resistance to sugar syrup splash and steam condensate. Each belt is laser-cut to tolerance-controlled pitch and width for drop-in replacement.',
    specs: {
      throughput:       'N/A (spare part)',
      powerConsumption: 'N/A',
      dimensions:       'Belt: 8,400 × 50 × 6 mm (L × W × T)',
      weight:           '2.3 kg per belt',
      materialContact:  'Food-grade PU, FDA 21 CFR 177.2600',
      operatingTemp:    '−20 to +90 °C continuous',
      voltageDefault:   'N/A',
      controlSystem:    'N/A',
      certifications:   'FDA, ISO 9001:2015',
      beltPitch:        'T10 (10 mm pitch)',
      tensionCord:      'Steel wire, pre-stressed 2,400 N/cord',
      compatibleMachine:'CEQ-PL-LOL-001'
    },
    configurations: {
      voltage: [
        'N/A — document for records only',
        '380V / 50 Hz reference',
        '460V / 60 Hz reference'
      ],
      finish: [
        'Standard Food-grade PU (White)',
        'Anti-Static PU (Blue)',
        'High-Temperature PU (Black, up to 110 °C)'
      ]
    },
    imagePlaceholder: '#1E3A8A',
    relatedProducts: ['CEQ-PL-LOL-001', 'CEQ-MC-LOL-001', 'CEQ-SP-LOL-001']
  },

  {
    id: 'can-sp-001',
    partNumber: 'CEQ-SP-CAN-001',
    name: 'Hard Candy Drop-Roller Die Set (Pillow Shape)',
    category: 'candy',
    subcategory: 'spare-parts',
    tagline: 'Hardened tool-steel engraved roller die set for pillow-shaped hard candy on CEQ-MC-CAN-002.',
    description: 'The CEQ-SP-CAN-001 drop-roller die set consists of two engraved forming rollers manufactured from H13 tool steel (60–62 HRC) and precision ground to produce a standard pillow-shaped hard candy of 14 × 10 × 7 mm at 5 g nominal weight. The rollers are chrome-plated on engraved surfaces for easy release and anti-sticking properties. Compatible with isomalt, sucrose, and sugar-free candy syrups.',
    specs: {
      throughput:        'N/A (spare part)',
      powerConsumption:  'N/A',
      dimensions:        'Roller: 200 mm diameter × 120 mm face width',
      weight:            '9.6 kg per roller pair',
      materialContact:   'H13 Tool Steel, Hard Chrome Plating, FDA-compliant',
      operatingTemp:     'Up to 90 °C candy mass temperature',
      voltageDefault:    'N/A',
      controlSystem:     'N/A',
      certifications:    'CE (equipment approval), ISO 9001:2015',
      moldCavityCount:   '24 cavities per roller pair',
      compatibleMachine: 'CEQ-MC-CAN-002',
      candyPieceWeight:  '5 g nominal'
    },
    configurations: {
      voltage: [
        'N/A — document for records only',
        '380V / 50 Hz reference',
        '460V / 60 Hz reference'
      ],
      finish: [
        'Standard Hard Chrome (0.015 mm)',
        'DLC Coating (Diamond-Like Carbon)',
        'TiN Coating (Gold)'
      ]
    },
    imagePlaceholder: '#0F766E',
    relatedProducts: ['CEQ-MC-CAN-002', 'CEQ-PL-CAN-001', 'CEQ-SP-CAN-002']
  },

  {
    id: 'can-sp-002',
    partNumber: 'CEQ-SP-CAN-002',
    name: 'Rope Sizer Die Plate — 14 mm Round',
    category: 'candy',
    subcategory: 'spare-parts',
    tagline: 'Interchangeable rope-sizer die plate for precise 14 mm candy rope calibration.',
    description: 'The CEQ-SP-CAN-002 is a precision-machined die plate for the rope sizer unit of the CEQ-PL-CAN-001 production line. Ground to ±0.05 mm tolerance, the 14 mm round bore ensures a consistent candy rope diameter as prerequisite for downstream drop-roller weight accuracy. Manufactured from 304 stainless steel with a polished inner bore surface to minimize drag and sugar crystallization buildup.',
    specs: {
      throughput:        'N/A (spare part)',
      powerConsumption:  'N/A',
      dimensions:        '120 × 120 × 40 mm (plate body)',
      weight:            '0.55 kg per plate',
      materialContact:   '304 Stainless Steel, EU 1935/2004',
      operatingTemp:     'Up to 130 °C candy mass temperature',
      voltageDefault:    'N/A',
      controlSystem:     'N/A',
      certifications:    'CE (equipment approval), ISO 9001:2015',
      boreDiameter:      '14 mm (round)',
      toleranceGrade:    '±0.05 mm',
      compatibleMachine: 'CEQ-PL-CAN-001 rope sizer unit'
    },
    configurations: {
      voltage: [
        'N/A — document for records only',
        '380V / 50 Hz reference',
        '460V / 60 Hz reference'
      ],
      finish: [
        'Mirror Polish (Ra ≤ 0.4 µm)',
        'Electropolish (Ra ≤ 0.25 µm)',
        'Standard Machined (Ra ≤ 0.8 µm)'
      ]
    },
    imagePlaceholder: '#115E59',
    relatedProducts: ['CEQ-PL-CAN-001', 'CEQ-MC-CAN-002', 'CEQ-SP-CAN-001']
  },

  {
    id: 'gum-sp-001',
    partNumber: 'CEQ-SP-GUM-001',
    name: 'Calender Roll Replacement Set (Roll #3 & #4)',
    category: 'gum',
    subcategory: 'spare-parts',
    tagline: 'Chrome-plated calender rolls #3 and #4 for CEQ-MC-GUM-002 with chilled-core cooling channels.',
    description: 'The CEQ-SP-GUM-001 is a matched pair of replacement calender rolls for positions #3 and #4 on the CEQ-MC-GUM-002 five-roll calender. Each roll is manufactured from alloy steel, hard chrome plated to 0.025 mm, and fitted with internal spiral cooling channels connected to the machine\'s chilled-water circuit. The matched pairing ensures consistent nip geometry and uniform sheet thickness across the full 500 mm roll face.',
    specs: {
      throughput:        'N/A (spare part)',
      powerConsumption:  'N/A',
      dimensions:        '150 mm diameter × 500 mm face width',
      weight:            '24.8 kg per pair',
      materialContact:   'Hard Chrome on Alloy Steel, FDA-compliant',
      operatingTemp:     'Roll surface 5–15 °C (chilled water); ambient 20–35 °C',
      voltageDefault:    'N/A',
      controlSystem:     'N/A',
      certifications:    'CE (equipment approval), ISO 9001:2015',
      chromeThickness:   '0.025 mm hard chrome',
      coolingCircuit:    'Internal spiral channels, chilled water',
      compatibleMachine: 'CEQ-MC-GUM-002'
    },
    configurations: {
      voltage: [
        'N/A — document for records only',
        '380V / 50 Hz reference',
        '460V / 60 Hz reference'
      ],
      finish: [
        'Hard Chrome Standard (0.025 mm)',
        'Hard Chrome Heavy (0.05 mm)',
        'Ceramic Thermal Spray Coating'
      ]
    },
    imagePlaceholder: '#5B21B6',
    relatedProducts: ['CEQ-MC-GUM-002', 'CEQ-PL-GUM-001', 'CEQ-SP-GUM-002']
  },

  {
    id: 'gum-sp-002',
    partNumber: 'CEQ-SP-GUM-002',
    name: 'Guillotine Scoring Blade Set — Gum Strip Cutter',
    category: 'gum',
    subcategory: 'spare-parts',
    tagline: 'Hardened stainless scoring blades for clean, burr-free gum stick and pellet cuts.',
    description: 'The CEQ-SP-GUM-002 is a set of four scoring blades for the guillotine cross-cutter assembly on the CEQ-MC-GUM-002. Manufactured from 17-4 PH stainless steel (H900 condition) and ground to a 25° included edge angle, these blades deliver clean, burr-free cuts through gum sheets at line speed without drag or tearing. Expected service life is 2–3 million cuts per set under normal operating conditions.',
    specs: {
      throughput:          'N/A (spare part)',
      powerConsumption:    'N/A',
      dimensions:          'Blade: 450 × 30 × 4 mm per piece',
      weight:              '0.9 kg per set (4 blades)',
      materialContact:     '17-4 PH Stainless Steel H900, FDA-compliant',
      operatingTemp:       '−20 to +60 °C',
      voltageDefault:      'N/A',
      controlSystem:       'N/A',
      certifications:      'FDA, ISO 9001:2015',
      bladeEdgeAngle:      '25° included angle',
      expectedServiceLife: '2–3 million cuts per set',
      compatibleMachine:   'CEQ-MC-GUM-002'
    },
    configurations: {
      voltage: [
        'N/A — document for records only',
        '380V / 50 Hz reference',
        '460V / 60 Hz reference'
      ],
      finish: [
        'Standard Ground (Ra ≤ 0.4 µm)',
        'PVD TiAlN Coating (Extended Life)',
        'Electropolish (Ra ≤ 0.25 µm)'
      ]
    },
    imagePlaceholder: '#6D28D9',
    relatedProducts: ['CEQ-MC-GUM-002', 'CEQ-PL-GUM-001', 'CEQ-SP-GUM-001']
  }
];
