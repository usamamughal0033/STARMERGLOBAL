// catalog-data.js is loaded as a plain <script> before the module,
// setting window.CATALOG_DATA — works on file:// without a server.
let _catalog = null;

export async function loadCatalog() {
  if (_catalog) return _catalog;
  if (!window.CATALOG_DATA) throw new Error('Catalog data not loaded. Make sure catalog-data.js script is included.');
  _catalog = window.CATALOG_DATA;
  return _catalog;
}

// ── Flat-list helpers ─────────────────────────────────────────────────────────

export function getCategories(catalog) {
  return catalog.categories;
}

export function getCategoryById(catalog, id) {
  return catalog.categories.find(c => c.id === id);
}

export function getAllLines(catalog) {
  return catalog.categories.flatMap(c =>
    c.lines.map(l => ({ ...l, categoryId: c.id, categoryLabel: c.label, categoryColor: c.color }))
  );
}

export function getLineById(catalog, id) {
  for (const cat of catalog.categories) {
    const line = cat.lines.find(l => l.id === id);
    if (line) return { ...line, categoryId: cat.id, categoryLabel: cat.label, categoryColor: cat.color, categoryAccent: cat.accentColor };
  }
  return null;
}

export function getLinesByCategory(catalog, categoryId) {
  const cat = getCategoryById(catalog, categoryId);
  return cat ? cat.lines.map(l => ({ ...l, categoryId: cat.id, categoryLabel: cat.label, categoryColor: cat.color })) : [];
}

export function getAllMachines(catalog) {
  return catalog.categories.flatMap(c =>
    c.lines.flatMap(l =>
      l.machines.map(m => ({
        ...m,
        lineId: l.id,
        lineName: l.name,
        categoryId: c.id,
        categoryLabel: c.label,
        categoryColor: c.color
      }))
    )
  );
}

export function getMachineById(catalog, id) {
  return getAllMachines(catalog).find(m => m.id === id) || null;
}

export function getMachinesByLine(catalog, lineId) {
  const line = getLineById(catalog, lineId);
  if (!line) return [];
  return [...line.machines].sort((a, b) => a.orderInLine - b.orderInLine);
}

export function getMachinesByCategory(catalog, categoryId) {
  return getAllMachines(catalog).filter(m => m.categoryId === categoryId);
}

export function getAllDiesAndParts(catalog) {
  return catalog.categories.flatMap(c =>
    c.lines.flatMap(l =>
      l.machines.flatMap(m =>
        (m.diesAndParts || []).map(d => ({
          ...d,
          machineId: m.id,
          machineName: m.name,
          machineNumber: m.machineNumber,
          lineId: l.id,
          lineName: l.name,
          categoryId: c.id,
          categoryLabel: c.label,
          categoryColor: c.color
        }))
      )
    )
  );
}

export function getDieOrPartById(catalog, id) {
  return getAllDiesAndParts(catalog).find(d => d.id === id) || null;
}

export function getDiesAndPartsByMachine(catalog, machineId) {
  const machine = getMachineById(catalog, machineId);
  if (!machine) return [];
  return machine.diesAndParts || [];
}

export function getDiesAndPartsByCategory(catalog, categoryId) {
  return getAllDiesAndParts(catalog).filter(d => d.categoryId === categoryId);
}

// ── Search ────────────────────────────────────────────────────────────────────

export function searchCatalog(catalog, query, limit = 10) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results = [];

  for (const cat of catalog.categories) {
    // Lines
    for (const line of cat.lines) {
      const score = scoreItem(q, [line.id, line.lineNumber, line.name, line.description, cat.label]);
      if (score > 0) results.push({ type: 'line', score, item: { ...line, categoryId: cat.id, categoryLabel: cat.label, categoryColor: cat.color } });

      for (const machine of line.machines) {
        const ms = scoreItem(q, [machine.id, machine.machineNumber, machine.name, machine.function, machine.description, cat.label]);
        if (ms > 0) results.push({ type: 'machine', score: ms, item: { ...machine, lineId: line.id, lineName: line.name, categoryId: cat.id, categoryLabel: cat.label, categoryColor: cat.color } });

        for (const dp of (machine.diesAndParts || [])) {
          const ds = scoreItem(q, [dp.id, dp.partNumber, dp.name, dp.description, dp.type, machine.name, cat.label]);
          if (ds > 0) results.push({ type: 'die-part', score: ds, item: { ...dp, machineId: machine.id, machineName: machine.name, lineId: line.id, categoryId: cat.id, categoryLabel: cat.label, categoryColor: cat.color } });
        }
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function scoreItem(q, fields) {
  let score = 0;
  for (const f of fields) {
    if (!f) continue;
    const lower = f.toLowerCase();
    if (lower === q) score += 10;
    else if (lower.startsWith(q)) score += 6;
    else if (lower.includes(q)) score += 2;
  }
  return score;
}

// ── Image helper ──────────────────────────────────────────────────────────────
// Returns the image src if provided, else a generated SVG data URI placeholder.

export function getImageSrc(imagePath, fallbackColor, label, type) {
  if (imagePath) return imagePath;
  return buildSVGPlaceholder(fallbackColor || '#1E3A8A', label || '', type || 'machine');
}

function buildSVGPlaceholder(color, label, type) {
  const s1 = 'rgba(255,255,255,0.15)';
  const s2 = 'rgba(255,255,255,0.22)';
  const s3 = 'rgba(255,255,255,0.10)';
  const tc = 'rgba(255,255,255,0.85)';

  let shapes = '';
  if (type === 'line') {
    shapes = `
      <rect x="30" y="148" width="340" height="14" rx="4" fill="${s1}"/>
      <rect x="45" y="90" width="80" height="66" rx="8" fill="${s2}"/>
      <rect x="165" y="76" width="110" height="80" rx="8" fill="${s2}"/>
      <rect x="308" y="106" width="58" height="52" rx="8" fill="${s2}"/>
      <circle cx="75" cy="170" r="12" fill="${s3}"/>
      <circle cx="198" cy="170" r="12" fill="${s3}"/>
      <circle cx="328" cy="170" r="12" fill="${s3}"/>
      <line x1="48" y1="162" x2="352" y2="162" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>`;
  } else if (type === 'die-part') {
    shapes = `
      <rect x="100" y="78" width="200" height="140" rx="16" fill="${s2}"/>
      <rect x="128" y="108" width="144" height="18" rx="4" fill="${s1}"/>
      <rect x="128" y="136" width="144" height="18" rx="4" fill="${s1}"/>
      <rect x="128" y="164" width="100" height="18" rx="4" fill="${s1}"/>
      <circle cx="308" cy="98" r="26" fill="${s3}"/>
      <circle cx="308" cy="98" r="13" fill="${s2}"/>
      <circle cx="92" cy="198" r="20" fill="${s3}"/>`;
  } else {
    shapes = `
      <rect x="118" y="68" width="164" height="132" rx="12" fill="${s2}"/>
      <rect x="138" y="48" width="40" height="28" rx="4" fill="${s1}"/>
      <rect x="218" y="48" width="40" height="28" rx="4" fill="${s1}"/>
      <circle cx="200" cy="198" r="34" fill="${s3}"/>
      <circle cx="200" cy="198" r="18" fill="${s2}"/>
      <rect x="78" y="208" width="244" height="14" rx="4" fill="${s1}"/>
      <rect x="154" y="228" width="92" height="38" rx="4" fill="${s1}"/>`;
  }

  const shortLabel = (label || '').substring(0, 22);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${color}"/>${shapes}<rect x="108" y="238" width="184" height="26" rx="5" fill="rgba(0,0,0,0.28)"/><text x="200" y="256" font-family="Courier New,monospace" font-size="11" font-weight="700" fill="${tc}" text-anchor="middle" letter-spacing="0.5">${shortLabel}</text></svg>`)}`;
}
