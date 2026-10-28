const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3333;
const ROOT = __dirname;

app.use(express.json());
app.use(express.static(ROOT));

// Store uploads in memory so we control the final destination
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadCatalog() {
  let raw = fs.readFileSync(path.join(ROOT, 'data/catalog.json'), 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip BOM if present
  return JSON.parse(raw);
}

function saveCatalog(catalog) {
  const json = JSON.stringify(catalog, null, 2);
  // Write as Buffer to guarantee no BOM
  fs.writeFileSync(path.join(ROOT, 'data/catalog.json'), Buffer.from(json, 'utf8'));
  fs.writeFileSync(path.join(ROOT, 'js/catalog-data.js'), Buffer.from(`window.CATALOG_DATA = ${json};`, 'utf8'));
}

function saveImage(file, subfolder) {
  if (!file) return '';
  const dir  = path.join(ROOT, 'assets/images', subfolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // prefix with timestamp to avoid name collisions
  const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
  const name = `${Date.now()}-${safe}`;
  fs.writeFileSync(path.join(dir, name), file.buffer);
  return `assets/images/${subfolder}/${name}`;
}

// Convert lineId  "HC-L-001"  →  base  "HC-L001"  used in machine IDs
function lineBase(lineId) {
  return lineId.replace(/-L-(\d+)$/, '-L$1');
}

function nextMachineId(line) {
  const nums = line.machines.map(m => {
    const match = m.id.match(/-M(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const n = (Math.max(0, ...nums) + 1).toString().padStart(2, '0');
  return `${lineBase(line.id)}-M${n}`;
}

function nextPartId(machine) {
  const parts = machine.diesAndParts || [];
  const nums  = parts.map(p => {
    const match = p.id.match(/-P(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const n = (Math.max(0, ...nums) + 1).toString().padStart(2, '0');
  return `${machine.id}-P${n}`;
}

// ── API ───────────────────────────────────────────────────────────────────────

// Return full catalog (used by admin panel to populate dropdowns)
app.get('/api/catalog', (_req, res) => {
  res.json(loadCatalog());
});

// Add a machine to a line
app.post('/api/add-machine', upload.single('image'), (req, res) => {
  try {
    const { lineId, name, fn, description, specs } = req.body;
    if (!lineId) return res.status(400).json({ error: 'lineId is required' });
    if (!name)   return res.status(400).json({ error: 'name is required' });

    const catalog = loadCatalog();

    let targetLine = null;
    for (const cat of catalog.categories) {
      const found = cat.lines.find(l => l.id === lineId);
      if (found) { targetLine = found; break; }
    }
    if (!targetLine) return res.status(404).json({ error: `Line "${lineId}" not found` });

    const imagePath = saveImage(req.file, 'machines');
    const id        = nextMachineId(targetLine);

    const machine = {
      id,
      machineNumber:  id,
      orderInLine:    targetLine.machines.length + 1,
      name:           name.trim(),
      function:       (fn          || '').trim(),
      description:    (description || '').trim(),
      image:          imagePath,
      specs:          parseSpecs(specs),
      diesAndParts:   []
    };

    targetLine.machines.push(machine);
    saveCatalog(catalog);

    res.json({ success: true, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Add a die/part to a machine
app.post('/api/add-part', upload.single('image'), (req, res) => {
  try {
    const { machineId, name, type, description, specs } = req.body;
    if (!machineId) return res.status(400).json({ error: 'machineId is required' });
    if (!name)      return res.status(400).json({ error: 'name is required' });

    const catalog = loadCatalog();

    let targetMachine = null;
    outer: for (const cat of catalog.categories) {
      for (const line of cat.lines) {
        const found = line.machines.find(m => m.id === machineId);
        if (found) { targetMachine = found; break outer; }
      }
    }
    if (!targetMachine) return res.status(404).json({ error: `Machine "${machineId}" not found` });

    const imagePath = saveImage(req.file, 'spare-parts');
    const id        = nextPartId(targetMachine);

    const part = {
      id,
      partNumber:   id,
      type:         type || 'part',
      name:         name.trim(),
      description:  (description || '').trim(),
      image:        imagePath,
      specs:        parseSpecs(specs)
    };

    if (!targetMachine.diesAndParts) targetMachine.diesAndParts = [];
    targetMachine.diesAndParts.push(part);
    saveCatalog(catalog);

    res.json({ success: true, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Edit an existing machine (image optional — only replaced if a new file is sent)
app.put('/api/machine/:id', upload.single('image'), (req, res) => {
  try {
    const { name, fn, description, specs } = req.body;
    const catalog = loadCatalog();
    let machine = null;
    outer: for (const cat of catalog.categories) {
      for (const line of cat.lines) {
        const m = line.machines.find(m => m.id === req.params.id);
        if (m) { machine = m; break outer; }
      }
    }
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    if (name        !== undefined) machine.name        = name.trim();
    if (fn          !== undefined) machine.function    = (fn || '').trim();
    if (description !== undefined) machine.description = (description || '').trim();
    if (specs       !== undefined) machine.specs       = parseSpecs(specs);
    if (req.file)                  machine.image       = saveImage(req.file, 'machines');

    saveCatalog(catalog);
    res.json({ success: true, id: machine.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Edit an existing die/part (image optional)
app.put('/api/part/:id', upload.single('image'), (req, res) => {
  try {
    const { name, type, description, specs } = req.body;
    const catalog = loadCatalog();
    let part = null;
    outer: for (const cat of catalog.categories) {
      for (const line of cat.lines) {
        for (const machine of line.machines) {
          const p = (machine.diesAndParts || []).find(p => p.id === req.params.id);
          if (p) { part = p; break outer; }
        }
      }
    }
    if (!part) return res.status(404).json({ error: 'Part not found' });

    if (name        !== undefined) part.name        = name.trim();
    if (type        !== undefined) part.type        = type || 'part';
    if (description !== undefined) part.description = (description || '').trim();
    if (specs       !== undefined) part.specs       = parseSpecs(specs);
    if (req.file)                  part.image       = saveImage(req.file, 'spare-parts');

    saveCatalog(catalog);
    res.json({ success: true, id: part.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Delete a machine (and all its parts) from its line
app.delete('/api/machine/:id', (req, res) => {
  try {
    const catalog = loadCatalog();
    let found = false;
    outer: for (const cat of catalog.categories) {
      for (const line of cat.lines) {
        const idx = line.machines.findIndex(m => m.id === req.params.id);
        if (idx !== -1) { line.machines.splice(idx, 1); found = true; break outer; }
      }
    }
    if (!found) return res.status(404).json({ error: 'Machine not found' });
    saveCatalog(catalog);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete a single die/part from its machine
app.delete('/api/part/:id', (req, res) => {
  try {
    const catalog = loadCatalog();
    let found = false;
    outer: for (const cat of catalog.categories) {
      for (const line of cat.lines) {
        for (const machine of line.machines) {
          const idx = (machine.diesAndParts || []).findIndex(p => p.id === req.params.id);
          if (idx !== -1) { machine.diesAndParts.splice(idx, 1); found = true; break outer; }
        }
      }
    }
    if (!found) return res.status(404).json({ error: 'Part not found' });
    saveCatalog(catalog);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function parseSpecs(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// ── Start ─────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log('\n  ✓ Server running');
  console.log(`\n  Admin panel : http://localhost:${PORT}/admin-local/`);
  console.log(`  Website     : http://localhost:${PORT}/`);
  console.log('\n  (Close this terminal or press Ctrl+C to stop the server.)\n');
});

// If the port is still held by an old instance, say so clearly instead of crashing.
server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ✗ Port ${PORT} is already in use — an old server is still running.`);
    console.error(`    Close it first (or run:  npx kill-port ${PORT}  ), then try again.\n`);
    process.exit(1);
  }
  throw err;
});

// ── Shut down cleanly so port 3333 is freed when the terminal closes ──────────
let shuttingDown = false;
function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n  Stopping server (${reason}) — port ${PORT} released.`);
  server.close(() => process.exit(0));
  // Safety net: force-exit if close hangs on an open connection
  setTimeout(() => process.exit(0), 800).unref();
}

// Ctrl+C, kill, and — on Windows — closing the console window all land here.
['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'].forEach(sig => {
  try { process.on(sig, () => shutdown(sig)); } catch { /* signal not supported */ }
});

// Fallback: if the controlling terminal goes away, stdin ends — stop too.
if (process.stdin.isTTY) {
  process.stdin.on('end',   () => shutdown('terminal closed'));
  process.stdin.on('close', () => shutdown('terminal closed'));
  process.stdin.resume();
}
