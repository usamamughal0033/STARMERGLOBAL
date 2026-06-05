// ── Cart ─────────────────────────────────────────────────────────────────────
const CART_KEY = 'sg-rfq-cart';

function _readCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function _writeCart(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
function _dispatch() { window.dispatchEvent(new CustomEvent('cart:updated')); }

function getCart() { return _readCart(); }
function getCartItem(id) { return _readCart().find(i => i.id === id); }
function getCartCount() { return _readCart().length; }
function addToCart(item) {
  const cart = _readCart();
  const idx = cart.findIndex(i => i.id === item.id);
  if (idx >= 0) cart[idx] = { ...cart[idx], ...item };
  else cart.push(item);
  _writeCart(cart);
  syncBadge();
  _dispatch();
}
function removeFromCart(id) { _writeCart(_readCart().filter(i => i.id !== id)); syncBadge(); _dispatch(); }
function updateQuantity(id, quantity) {
  const cart = _readCart();
  const idx = cart.findIndex(i => i.id === id);
  if (idx >= 0) { cart[idx].quantity = Math.max(1, quantity); _writeCart(cart); syncBadge(); _dispatch(); }
}
function clearCart() { _writeCart([]); syncBadge(); _dispatch(); }
function syncBadge() {
  const count = _readCart().length;
  document.querySelectorAll('[data-rfq-badge]').forEach(el => {
    el.textContent = count;
    el.style.opacity = count > 0 ? '1' : '0';
  });
}

// ── Data Loader ───────────────────────────────────────────────────────────────
let _catalog = null;

async function loadCatalog() {
  if (_catalog) return _catalog;
  if (!window.CATALOG_DATA) throw new Error('catalog-data.js not loaded');
  _catalog = window.CATALOG_DATA;
  return _catalog;
}

function getCategories(catalog) { return catalog.categories; }
function getCategoryById(catalog, id) { return catalog.categories.find(c => c.id === id); }
function getAllLines(catalog) {
  return catalog.categories.flatMap(c => c.lines.map(l => ({ ...l, categoryId: c.id, categoryLabel: c.label, categoryColor: c.color })));
}
function getLineById(catalog, id) {
  for (const cat of catalog.categories) {
    const line = cat.lines.find(l => l.id === id);
    if (line) return { ...line, categoryId: cat.id, categoryLabel: cat.label, categoryColor: cat.color, categoryAccent: cat.accentColor };
  }
  return null;
}
function getLinesByCategory(catalog, categoryId) {
  const cat = getCategoryById(catalog, categoryId);
  return cat ? cat.lines.map(l => ({ ...l, categoryId: cat.id, categoryLabel: cat.label, categoryColor: cat.color })) : [];
}
function getAllMachines(catalog) {
  return catalog.categories.flatMap(c => c.lines.flatMap(l => l.machines.map(m => ({ ...m, lineId: l.id, lineName: l.name, categoryId: c.id, categoryLabel: c.label, categoryColor: c.color }))));
}
function getMachineById(catalog, id) { return getAllMachines(catalog).find(m => m.id === id) || null; }
function getMachinesByLine(catalog, lineId) {
  const line = getLineById(catalog, lineId);
  return line ? [...line.machines].sort((a, b) => a.orderInLine - b.orderInLine) : [];
}
function getMachinesByCategory(catalog, categoryId) { return getAllMachines(catalog).filter(m => m.categoryId === categoryId); }
function getAllDiesAndParts(catalog) {
  return catalog.categories.flatMap(c => c.lines.flatMap(l => l.machines.flatMap(m => (m.diesAndParts || []).map(d => ({ ...d, machineId: m.id, machineName: m.name, machineNumber: m.machineNumber, lineId: l.id, lineName: l.name, categoryId: c.id, categoryLabel: c.label, categoryColor: c.color })))));
}
function getDieOrPartById(catalog, id) { return getAllDiesAndParts(catalog).find(d => d.id === id) || null; }
function getDiesAndPartsByMachine(catalog, machineId) {
  const machine = getMachineById(catalog, machineId);
  return machine ? (machine.diesAndParts || []) : [];
}
function getDiesAndPartsByCategory(catalog, categoryId) { return getAllDiesAndParts(catalog).filter(d => d.categoryId === categoryId); }

function searchCatalog(catalog, query, limit = 10) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results = [];
  for (const cat of catalog.categories) {
    for (const line of cat.lines) {
      const ls = scoreItem(q, [line.id, line.lineNumber, line.name, line.description, cat.label]);
      if (ls > 0) results.push({ type: 'line', score: ls, item: { ...line, categoryId: cat.id, categoryLabel: cat.label, categoryColor: cat.color } });
      for (const machine of line.machines) {
        const ms = scoreItem(q, [machine.id, machine.machineNumber, machine.name, machine.function, machine.description, cat.label]);
        if (ms > 0) results.push({ type: 'machine', score: ms, item: { ...machine, lineId: line.id, lineName: line.name, categoryId: cat.id, categoryLabel: cat.label } });
        for (const dp of (machine.diesAndParts || [])) {
          const ds = scoreItem(q, [dp.id, dp.partNumber, dp.name, dp.description, dp.type, machine.name, cat.label]);
          if (ds > 0) results.push({ type: 'die-part', score: ds, item: { ...dp, machineId: machine.id, machineName: machine.name, lineId: line.id, categoryId: cat.id, categoryLabel: cat.label } });
        }
      }
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
function scoreItem(q, fields) {
  let s = 0;
  for (const f of fields) {
    if (!f) continue;
    const l = f.toLowerCase();
    if (l === q) s += 10; else if (l.startsWith(q)) s += 6; else if (l.includes(q)) s += 2;
  }
  return s;
}

function getImageSrc(imagePath, fallbackColor, label, type) {
  if (imagePath) return imagePath;
  return buildSVGPlaceholder(fallbackColor || '#1E3A8A', label || '', type || 'machine');
}
function buildSVGPlaceholder(color, label, type) {
  const s1 = 'rgba(255,255,255,0.15)', s2 = 'rgba(255,255,255,0.22)', s3 = 'rgba(255,255,255,0.10)', tc = 'rgba(255,255,255,0.85)';
  let shapes = '';
  if (type === 'line') {
    shapes = `<rect x="30" y="148" width="340" height="14" rx="4" fill="${s1}"/><rect x="45" y="90" width="80" height="66" rx="8" fill="${s2}"/><rect x="165" y="76" width="110" height="80" rx="8" fill="${s2}"/><rect x="308" y="106" width="58" height="52" rx="8" fill="${s2}"/><circle cx="75" cy="170" r="12" fill="${s3}"/><circle cx="198" cy="170" r="12" fill="${s3}"/><circle cx="328" cy="170" r="12" fill="${s3}"/>`;
  } else if (type === 'die-part') {
    shapes = `<rect x="100" y="78" width="200" height="140" rx="16" fill="${s2}"/><rect x="128" y="108" width="144" height="18" rx="4" fill="${s1}"/><rect x="128" y="136" width="144" height="18" rx="4" fill="${s1}"/><circle cx="308" cy="98" r="26" fill="${s3}"/>`;
  } else {
    shapes = `<rect x="118" y="68" width="164" height="132" rx="12" fill="${s2}"/><rect x="138" y="48" width="40" height="28" rx="4" fill="${s1}"/><rect x="218" y="48" width="40" height="28" rx="4" fill="${s1}"/><circle cx="200" cy="198" r="34" fill="${s3}"/><circle cx="200" cy="198" r="18" fill="${s2}"/>`;
  }
  const shortLabel = (label || '').substring(0, 22);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${color}"/>${shapes}<rect x="108" y="238" width="184" height="26" rx="5" fill="rgba(0,0,0,0.28)"/><text x="200" y="256" font-family="Courier New,monospace" font-size="11" font-weight="700" fill="${tc}" text-anchor="middle" letter-spacing="0.5">${shortLabel}</text></svg>`)}`;
}

// ── App ───────────────────────────────────────────────────────────────────────
const PAGE = document.body.dataset.page;

document.addEventListener('DOMContentLoaded', async () => {
  let catalog = null;
  try { catalog = await loadCatalog(); }
  catch (e) { console.error('Catalog load failed:', e); showLoadError(); return; }
  initGlobalNav(catalog);
  syncBadge();
  switch (PAGE) {
    case 'home':    initHomePage(catalog);    break;
    case 'catalog': initCatalogPage(catalog); break;
    case 'line':    initLinePage(catalog);    break;
    case 'product': initProductPage(catalog); break;
    case 'dies':    initDiesPage(catalog);    break;
    case 'search':  initSearchPage(catalog);  break;
    case 'quote':   initQuotePage(catalog);   break;
  }
});

function showLoadError() { document.getElementById('load-error')?.classList.remove('hidden'); }

function initGlobalNav(catalog) {
  const nav = document.getElementById('site-nav');
  if (nav) window.addEventListener('scroll', () => nav.classList.toggle('nav-scrolled', window.scrollY > 50), { passive: true });
  const toggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    document.addEventListener('click', e => { if (nav && !nav.contains(e.target)) mobileMenu.classList.remove('open'); });
  }
  const megaInner = document.getElementById('lines-mega-inner');
  if (megaInner) {
    megaInner.innerHTML = getCategories(catalog).map(cat => `
      <div class="mega-col">
        <div class="mega-col-title">${cat.label}</div>
        ${cat.lines.map(l => `<a href="line.html?id=${l.id}">${l.name}</a>`).join('')}
        <a href="catalog.html?category=${cat.id}" style="color:#94a3b8;font-size:11px;padding-top:4px;">View All →</a>
      </div>`).join('');
  }
  const machinesDd = document.getElementById('machines-dropdown-inner');
  if (machinesDd) {
    machinesDd.innerHTML = `<a href="catalog.html?type=machine">View All Machines</a>` +
      getCategories(catalog).map(cat => `<div class="dropdown-section-label">${cat.label}</div><a href="catalog.html?category=${cat.id}&type=machine">${cat.label} Machines</a>`).join('');
  }
  const diesDd = document.getElementById('dies-dropdown-inner');
  if (diesDd) {
    diesDd.innerHTML = `<a href="dies.html">View All Dies &amp; Parts</a>` +
      getCategories(catalog).map(cat => `<div class="dropdown-section-label">${cat.label}</div><a href="dies.html?category=${cat.id}">${cat.label} Dies &amp; Parts</a>`).join('');
  }
  setupSearch(catalog, document.getElementById('search-input'), document.getElementById('search-dropdown'), document.getElementById('search-container'));
  setupSearch(catalog, document.getElementById('mobile-search-input'), document.getElementById('search-dropdown'));
  const yr = document.getElementById('footer-year');
  if (yr) yr.textContent = new Date().getFullYear();
  const mobileCatLinks = document.getElementById('mobile-cat-links');
  if (mobileCatLinks) {
    mobileCatLinks.innerHTML = getCategories(catalog).map(c => `<a href="catalog.html?category=${c.id}" class="block py-2 text-sm font-medium text-slate-600 border-b border-slate-100 pl-4">${c.label}</a>`).join('');
  }
}

function setupSearch(catalog, input, dropdown, container) {
  if (!input || !dropdown) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value.trim();
      if (!q) { dropdown.classList.add('hidden'); return; }
      renderSearchDropdown(searchCatalog(catalog, q, 6), dropdown);
      dropdown.classList.remove('hidden');
    }, 150);
  });
  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('.search-result-item');
    const focused = dropdown.querySelector('.search-result-item.focused');
    let idx = [...items].indexOf(focused);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (focused) focused.classList.remove('focused'); items[(idx + 1) % items.length]?.classList.add('focused'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (focused) focused.classList.remove('focused'); items[(idx - 1 + items.length) % items.length]?.classList.add('focused'); }
    else if (e.key === 'Enter') { const a = dropdown.querySelector('.focused'); if (a) { e.preventDefault(); a.click(); } }
    else if (e.key === 'Escape') { dropdown.classList.add('hidden'); input.blur(); }
  });
  document.addEventListener('click', e => { const c = container || document; if (!c.contains(e.target)) dropdown.classList.add('hidden'); });
}

function resultHref(result) {
  if (result.type === 'line') return `line.html?id=${result.item.id}`;
  return `product.html?id=${result.item.id}`;
}

function renderSearchDropdown(results, dropdown) {
  if (!results.length) { dropdown.innerHTML = `<div class="px-4 py-3 text-sm text-slate-400">No results found.</div>`; return; }
  dropdown.innerHTML = results.map(r => {
    const typeLabel = r.type === 'line' ? 'Line' : r.type === 'machine' ? 'Machine' : 'Die / Part';
    const num = r.item.lineNumber || r.item.machineNumber || r.item.partNumber || r.item.id;
    return `<a href="${resultHref(r)}" class="search-result-item">
      <span class="result-type type-${r.type === 'die-part' ? 'die-part' : r.type}">${typeLabel}</span>
      <span class="result-number">${num}</span>
      <span class="result-name">${r.item.name}</span>
      <span class="result-cat">${r.item.categoryLabel || ''}</span>
    </a>`;
  }).join('');
}

// ── Home ──────────────────────────────────────────────────────────────────────
function initHomePage(catalog) {
  const statsSection = document.getElementById('stats');
  if (statsSection) {
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      statsSection.querySelectorAll('.stat-item').forEach(el => el.classList.add('in-view'));
      statsSection.querySelectorAll('.counter[data-target]').forEach(el => countUp(el, parseInt(el.dataset.target), 1800));
    }, { threshold: 0.3 });
    observer.observe(statsSection);
  }
  const catsGrid = document.getElementById('home-categories-grid');
  if (catsGrid) catsGrid.innerHTML = getCategories(catalog).map(cat => buildHomeCategoryCard(cat)).join('');
}

function buildHomeCategoryCard(cat) {
  const lineCount = cat.lines.length;
  const machineCount = cat.lines.reduce((sum, l) => sum + l.machines.length, 0);
  return `<article class="category-card border border-slate-200 rounded-2xl p-7 bg-white">
    <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style="background:${cat.color}22">
      <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="${cat.color}" stroke-width="1.8"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 014 0v2"/><circle cx="12" cy="13" r="2"/></svg>
    </div>
    <h3 class="text-lg font-bold mb-2" style="color:${cat.color}">${cat.label}</h3>
    <p class="text-slate-500 text-sm mb-4 leading-relaxed">${cat.description}</p>
    <div class="flex gap-4 text-xs text-slate-400 mb-5">
      <span><strong class="text-slate-600">${lineCount}</strong> Lines</span>
      <span><strong class="text-slate-600">${machineCount}+</strong> Machines</span>
    </div>
    <a href="catalog.html?category=${cat.id}" class="inline-flex items-center gap-1 text-sm font-semibold hover:gap-2 transition-all" style="color:${cat.color}">
      Explore Equipment
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    </a>
  </article>`;
}

function countUp(el, target, duration) {
  const start = performance.now();
  const frame = now => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round((p * (2 - p)) * target).toLocaleString();
    if (p < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ── Catalog ───────────────────────────────────────────────────────────────────
function initCatalogPage(catalog) {
  const params = new URLSearchParams(window.location.search);
  const preCategory = params.get('category');
  const preType = params.get('type');
  let selectedCategory = null, selectedLine = null;

  const step1Panel = document.getElementById('step1-panel');
  const step2Panel = document.getElementById('step2-panel');
  const step3Panel = document.getElementById('step3-panel');
  const stepIndicator = document.getElementById('step-indicator');

  const catGrid = document.getElementById('cat-select-grid');
  if (catGrid) {
    catGrid.innerHTML = getCategories(catalog).map(cat => `
      <button class="cat-btn" data-cat-id="${cat.id}">
        <div class="cat-icon" style="background:${cat.color}22">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="${cat.color}" stroke-width="1.8"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 014 0v2"/></svg>
        </div>
        <span class="text-xs font-semibold text-slate-700 leading-tight">${cat.label}</span>
      </button>`).join('');
    catGrid.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCategory = getCategoryById(catalog, btn.dataset.catId);
        catGrid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        showStep(2); buildStep2(selectedCategory);
      });
    });
  }

  function buildStep2(cat) {
    const lineGrid = document.getElementById('line-select-grid');
    if (!lineGrid) return;
    lineGrid.innerHTML = cat.lines.map(l => `
      <button class="rate-btn" data-line-id="${l.id}">
        <div class="text-base">${l.name}</div>
        <div class="text-xs text-slate-400 mt-1">${l.productionRate}</div>
      </button>`).join('');
    lineGrid.querySelectorAll('.rate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedLine = getLineById(catalog, btn.dataset.lineId);
        lineGrid.querySelectorAll('.rate-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        showStep(3); buildStep3(selectedLine, cat);
      });
    });
    const backBtn2 = document.getElementById('step2-back');
    if (backBtn2) backBtn2.onclick = () => showStep(1);
    const lbl = document.getElementById('step2-cat-label');
    if (lbl) lbl.textContent = cat.label;
  }

  function buildStep3(line, cat) {
    const lineInfoEl = document.getElementById('step3-line-info');
    if (lineInfoEl) {
      lineInfoEl.innerHTML = `
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span class="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">${line.lineNumber}</span>
            <h3 class="text-xl font-bold text-slate-800 mt-1">${line.name}</h3>
            <p class="text-slate-500 text-sm mt-1">${line.description}</p>
          </div>
          <a href="line.html?id=${line.id}" class="shrink-0 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-accent transition-colors inline-flex items-center gap-2">
            View Complete Line
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>`;
    }
    const machineGrid = document.getElementById('step3-machine-grid');
    if (machineGrid) machineGrid.innerHTML = line.machines.sort((a, b) => a.orderInLine - b.orderInLine).map(m => buildMachineCard(m, cat)).join('');
    const backBtn3 = document.getElementById('step3-back');
    if (backBtn3) backBtn3.onclick = () => showStep(2);
  }

  function showStep(n) {
    step1Panel?.classList.toggle('hidden', n !== 1);
    step2Panel?.classList.toggle('hidden', n !== 2);
    step3Panel?.classList.toggle('hidden', n !== 3);
    if (stepIndicator) {
      stepIndicator.querySelectorAll('.step-indicator-item').forEach((el, i) => {
        el.classList.remove('active', 'done');
        if (i + 1 === n) el.classList.add('active');
        else if (i + 1 < n) el.classList.add('done');
      });
    }
  }

  if (preCategory) {
    const cat = getCategoryById(catalog, preCategory);
    if (cat) {
      selectedCategory = cat;
      catGrid?.querySelectorAll('.cat-btn').forEach(btn => { if (btn.dataset.catId === preCategory) btn.classList.add('selected'); });
      showStep(2); buildStep2(cat);
    }
  }

  if (preType === 'machine') {
    const panel = document.getElementById('machines-panel');
    if (panel) {
      panel.classList.remove('hidden');
      step1Panel?.classList.add('hidden');
      const machines = preCategory ? getMachinesByCategory(catalog, preCategory) : getAllMachines(catalog);
      panel.innerHTML = `<h2 class="text-lg font-bold text-slate-700 mb-5">All Machines</h2><div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">${machines.map(m => buildMachineCard(m, getCategoryById(catalog, m.categoryId))).join('')}</div>`;
    }
  }
}

function buildMachineCard(machine, cat) {
  const img = getImageSrc(machine.image, cat?.color, machine.machineNumber, 'machine');
  const inCart = !!getCartItem(machine.id);
  return `<article class="product-card border border-slate-200 rounded-2xl overflow-hidden bg-white">
    <a href="product.html?id=${machine.id}">
      <div class="h-44 overflow-hidden bg-slate-50"><img src="${img}" alt="${machine.name}" class="w-full h-full object-cover" loading="lazy"/></div>
    </a>
    <div class="p-5">
      <div class="flex items-center gap-2 mb-2 flex-wrap">
        <span class="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">${machine.machineNumber}</span>
        ${inCart ? '<span class="text-xs text-green-600 font-semibold">✓ In Quote</span>' : ''}
      </div>
      <h3 class="font-bold text-slate-800 text-sm mb-1 leading-snug">${machine.name}</h3>
      <p class="text-xs text-slate-500 mb-3 line-clamp-2">${machine.function}</p>
      <div class="flex gap-2">
        <a href="product.html?id=${machine.id}" class="text-xs font-semibold text-blue-700 border border-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 hover:text-white transition-colors">View Details</a>
        <button onclick="quickAddToCart('${machine.id}','${machine.machineNumber}','${machine.name.replace(/'/g,"\\'")}',this)"
          class="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors">Add to Quote</button>
      </div>
    </div>
  </article>`;
}

window.quickAddToCart = function(id, partNumber, name, btn) {
  addToCart({ id, partNumber, name, quantity: 1, selectedVoltage: 'To be confirmed', selectedFinish: 'Standard' });
  showToast(`${name} added to quote.`);
  if (btn) { btn.textContent = '✓ Added'; }
};

// ── Line page ─────────────────────────────────────────────────────────────────
function initLinePage(catalog) {
  const params = new URLSearchParams(window.location.search);
  const line = getLineById(catalog, params.get('id'));
  const notFound = document.getElementById('line-not-found');
  const wrapper = document.getElementById('line-wrapper');
  if (!line) { notFound?.classList.remove('hidden'); wrapper?.classList.add('hidden'); return; }
  notFound?.classList.add('hidden'); wrapper?.classList.remove('hidden');
  const cat = getCategoryById(catalog, line.categoryId);
  document.title = `${line.name} — Starmer Global`;
  setEl('bc-category', cat?.label || '');
  setEl('bc-line', line.name);
  setAttr('bc-cat-link', 'href', `catalog.html?category=${line.categoryId}`);
  setEl('line-number', line.lineNumber);
  setEl('line-name', line.name);
  setEl('line-rate', line.productionRate ? `Production Rate: ${line.productionRate}` : '');
  setEl('line-description', line.description);
  document.getElementById('add-line-btn')?.addEventListener('click', () => {
    getMachinesByLine(catalog, line.id).forEach(m => {
      addToCart({ id: m.id, partNumber: m.machineNumber, name: m.name, quantity: 1, selectedVoltage: 'To be confirmed', selectedFinish: 'Standard', lineId: line.id });
    });
    showToast(`Complete Line added to quote.`);
    const btn = document.getElementById('add-line-btn');
    if (btn) btn.textContent = '✓ Complete Line Added';
    renderPipeline(catalog, line, cat);
  });
  renderPipeline(catalog, line, cat);
}

function renderPipeline(catalog, line, cat) {
  const track = document.getElementById('pipeline-track');
  if (!track) return;
  const machines = getMachinesByLine(catalog, line.id);
  track.innerHTML = machines.map((m, i) => {
    const img = getImageSrc(m.image, cat?.color, m.machineNumber, 'machine');
    const inCart = !!getCartItem(m.id);
    const arrow = i < machines.length - 1 ? `<div class="pipeline-arrow"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></div>` : '';
    return `<div class="pipeline-machine-card${inCart ? ' in-cart' : ''}">
      <div class="pipeline-machine-img"><img src="${img}" alt="${m.name}" loading="lazy"/></div>
      <div class="pipeline-machine-body">
        <div class="pipeline-order">Step ${m.orderInLine}</div>
        <div class="pipeline-machine-num">${m.machineNumber}</div>
        <div class="pipeline-machine-name">${m.name}</div>
        <div class="pipeline-machine-func">${m.function}</div>
        <div class="pipeline-machine-actions">
          <a href="product.html?id=${m.id}" class="text-xs font-semibold text-blue-600 border border-blue-500 px-2 py-1 rounded-md hover:bg-blue-600 hover:text-white transition-colors">Details</a>
          <button onclick="quickAddToCart('${m.id}','${m.machineNumber}','${m.name.replace(/'/g,"\\'")}',this)"
            class="text-xs font-semibold ${inCart?'bg-green-100 text-green-700':'bg-slate-100 text-slate-700'} px-2 py-1 rounded-md hover:bg-primary hover:text-white transition-colors">
            ${inCart ? '✓ Added' : '+ Quote'}
          </button>
        </div>
      </div>
    </div>${arrow}`;
  }).join('');
}

// ── Product / Machine detail ──────────────────────────────────────────────────
function initProductPage(catalog) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const machine = getMachineById(catalog, id);
  const diePart = !machine ? getDieOrPartById(catalog, id) : null;
  const item = machine || diePart;
  const notFound = document.getElementById('product-not-found');
  const wrapper = document.getElementById('product-detail-wrapper');
  if (!item) { notFound?.classList.remove('hidden'); wrapper?.classList.add('hidden'); return; }
  notFound?.classList.add('hidden'); wrapper?.classList.remove('hidden');
  const cat = getCategoryById(catalog, item.categoryId);
  document.title = `${item.name} — Starmer Global`;
  setEl('bc-category', cat?.label || '');
  setAttr('bc-cat-link', 'href', `catalog.html?category=${item.categoryId}`);
  if (machine) {
    const line = getLineById(catalog, machine.lineId);
    setEl('bc-line', line?.name || '');
    setAttr('bc-line-link', 'href', `line.html?id=${machine.lineId}`);
  }
  setEl('breadcrumb-name', item.name);
  const imgContainer = document.getElementById('product-image-container');
  if (imgContainer) {
    const t = machine ? 'machine' : 'die-part';
    const src = getImageSrc(item.image, cat?.color, machine?.machineNumber || diePart?.partNumber, t);
    imgContainer.innerHTML = `<img src="${src}" alt="${item.name}" class="w-full h-full object-cover rounded-2xl"/>`;
  }
  setEl('detail-part-number', machine ? machine.machineNumber : diePart?.partNumber);
  setEl('detail-name', item.name);
  setEl('detail-function', machine ? machine.function : (diePart ? `Type: ${diePart.type}` : ''));
  setEl('detail-description', item.description);
  if (diePart) {
    const badge = document.getElementById('detail-type-badge');
    if (badge) { badge.textContent = diePart.type === 'die' ? 'Die' : 'Spare Part'; badge.className = `part-type-badge type-${diePart.type}`; badge.classList.remove('hidden'); }
  }
  const specsTbl = document.getElementById('specs-table');
  if (specsTbl && item.specs) {
    specsTbl.innerHTML = Object.entries(item.specs).map(([k, v]) => `<tr><th scope="row">${formatSpecKey(k)}</th><td>${v}</td></tr>`).join('');
  }
  const addBtn = document.getElementById('add-to-quote-btn');
  if (addBtn) {
    if (getCartItem(item.id)) addBtn.textContent = '✓ Update Quote';
    addBtn.addEventListener('click', () => {
      addToCart({ id: item.id, partNumber: machine?.machineNumber || diePart?.partNumber, name: item.name, quantity: 1, selectedVoltage: 'To be confirmed', selectedFinish: 'Standard' });
      showToast('Added to quote request.');
      addBtn.textContent = '✓ Update Quote';
    });
  }
  const dpsSection = document.getElementById('dies-parts-section');
  if (machine && dpsSection) {
    const dps = getDiesAndPartsByMachine(catalog, machine.id);
    if (dps.length) {
      dpsSection.classList.remove('hidden');
      const grid = document.getElementById('dies-parts-grid');
      if (grid) grid.innerHTML = dps.map(dp => buildDiePartCard(dp, cat)).join('');
    }
  }
}

function buildDiePartCard(dp, cat) {
  const img = getImageSrc(dp.image, cat?.color, dp.partNumber, 'die-part');
  return `<article class="border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
    <div class="h-32 overflow-hidden bg-slate-50"><img src="${img}" alt="${dp.name}" class="w-full h-full object-cover" loading="lazy"/></div>
    <div class="p-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">${dp.partNumber}</span>
        <span class="part-type-badge type-${dp.type}">${dp.type === 'die' ? 'Die' : 'Part'}</span>
      </div>
      <p class="text-sm font-semibold text-slate-700 mb-3 leading-snug">${dp.name}</p>
      <div class="flex gap-2">
        <a href="product.html?id=${dp.id}" class="text-xs font-semibold text-blue-700 border border-blue-600 px-3 py-1 rounded-lg hover:bg-blue-700 hover:text-white transition-colors">View</a>
        <button onclick="quickAddToCart('${dp.id}','${dp.partNumber}','${dp.name.replace(/'/g,"\\'")}',this)"
          class="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg hover:bg-primary hover:text-white transition-colors">+ Quote</button>
      </div>
    </div>
  </article>`;
}

// ── Dies page ─────────────────────────────────────────────────────────────────
function initDiesPage(catalog) {
  const params = new URLSearchParams(window.location.search);
  let activeCat = params.get('category') || 'all';
  let activeType = 'all';
  let searchQ = '';

  const catFilter = document.getElementById('dies-cat-filter');
  if (catFilter) {
    catFilter.innerHTML = `<label class="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="dp-cat" value="all" ${activeCat === 'all' ? 'checked' : ''} class="accent-blue-700"/><span class="text-slate-600">All Categories</span></label>` +
      getCategories(catalog).map(cat => `<label class="flex items-center gap-2 cursor-pointer text-sm"><input type="radio" name="dp-cat" value="${cat.id}" ${activeCat === cat.id ? 'checked' : ''} class="accent-blue-700"/><span class="text-slate-600">${cat.label}</span></label>`).join('');
    catFilter.querySelectorAll('input[name="dp-cat"]').forEach(inp => inp.addEventListener('change', () => { activeCat = inp.value; renderDies(); }));
  }

  const typeFilter = document.getElementById('dies-type-filter');
  if (typeFilter) {
    typeFilter.querySelectorAll('[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        typeFilter.querySelectorAll('[data-type]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        activeType = btn.dataset.type;
        renderDies();
      });
    });
  }

  document.getElementById('dies-search')?.addEventListener('input', e => { searchQ = e.target.value.trim(); renderDies(); });

  function renderDies() {
    const grid = document.getElementById('dies-grid');
    const countEl = document.getElementById('dies-count');
    if (!grid) return;
    let items = activeCat === 'all' ? getAllDiesAndParts(catalog) : getDiesAndPartsByCategory(catalog, activeCat);
    if (activeType !== 'all') items = items.filter(d => d.type === activeType);
    if (searchQ) { const q = searchQ.toLowerCase(); items = items.filter(d => d.id.toLowerCase().includes(q) || d.partNumber.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || (d.machineName||'').toLowerCase().includes(q)); }
    if (countEl) countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
    if (!items.length) { grid.innerHTML = `<div class="col-span-full text-center py-16 text-slate-400">No dies or parts found.</div>`; return; }
    grid.innerHTML = items.map(dp => {
      const cat = getCategoryById(catalog, dp.categoryId);
      const img = getImageSrc(dp.image, cat?.color, dp.partNumber, 'die-part');
      return `<article class="product-card border border-slate-200 rounded-2xl overflow-hidden bg-white">
        <div class="h-40 overflow-hidden bg-slate-50"><img src="${img}" alt="${dp.name}" class="w-full h-full object-cover" loading="lazy"/></div>
        <div class="p-5">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">${dp.partNumber}</span>
            <span class="part-type-badge type-${dp.type}">${dp.type === 'die' ? 'Die' : 'Part'}</span>
          </div>
          <h3 class="font-bold text-slate-800 text-sm mb-1 leading-snug">${dp.name}</h3>
          <p class="text-xs text-slate-400 mb-3">For: ${dp.machineName}</p>
          <div class="flex gap-2">
            <a href="product.html?id=${dp.id}" class="text-xs font-semibold text-blue-700 border border-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 hover:text-white transition-colors">View Details</a>
            <button onclick="quickAddToCart('${dp.id}','${dp.partNumber}','${dp.name.replace(/'/g,"\\'")}',this)"
              class="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors">+ Quote</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }
  renderDies();
}

// ── Search page ───────────────────────────────────────────────────────────────
function initSearchPage(catalog) {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') || '';
  const searchInput = document.getElementById('page-search-input');
  if (searchInput) searchInput.value = q;
  if (q) runSearch(catalog, q);
  searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = searchInput.value.trim(); if (v) { history.replaceState(null,'',`?q=${encodeURIComponent(v)}`); runSearch(catalog, v); } } });
  document.getElementById('page-search-btn')?.addEventListener('click', () => { const v = searchInput?.value.trim(); if (v) { history.replaceState(null,'',`?q=${encodeURIComponent(v)}`); runSearch(catalog, v); } });
}

function runSearch(catalog, q) {
  const results = searchCatalog(catalog, q, 50);
  const grid = document.getElementById('search-results-grid');
  const countEl = document.getElementById('search-count');
  const emptyEl = document.getElementById('search-empty');
  setEl('search-query-label', `"${q}"`);
  if (countEl) countEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
  if (!grid) return;
  if (!results.length) { grid.innerHTML = ''; emptyEl?.classList.remove('hidden'); return; }
  emptyEl?.classList.add('hidden');
  grid.innerHTML = results.map(r => {
    const cat = getCategoryById(catalog, r.item.categoryId);
    const href = r.type === 'line' ? `line.html?id=${r.item.id}` : `product.html?id=${r.item.id}`;
    const num = r.item.lineNumber || r.item.machineNumber || r.item.partNumber || r.item.id;
    const typeLabel = r.type === 'line' ? 'Production Line' : r.type === 'machine' ? 'Machine' : 'Die / Part';
    const img = getImageSrc(r.item.image, cat?.color, num, r.type);
    return `<article class="product-card border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <a href="${href}"><div class="h-40 overflow-hidden bg-slate-50"><img src="${img}" alt="${r.item.name}" class="w-full h-full object-cover" loading="lazy"/></div></a>
      <div class="p-5">
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <span class="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">${num}</span>
          <span class="result-type type-${r.type === 'die-part' ? 'die-part' : r.type}">${typeLabel}</span>
        </div>
        <h3 class="font-bold text-slate-800 text-sm mb-1 leading-snug">${r.item.name}</h3>
        <p class="text-xs text-slate-400 mb-3">${cat?.label || ''}</p>
        <a href="${href}" class="text-xs font-semibold text-blue-700 border border-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 hover:text-white transition-colors">View Details</a>
      </div>
    </article>`;
  }).join('');
}

// ── Quote page ────────────────────────────────────────────────────────────────
function initQuotePage(catalog) {
  renderQuoteTable();
  window.addEventListener('cart:updated', renderQuoteTable);
  const form = document.getElementById('rfq-form');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateRFQForm(form)) return;
    const cart = getCart();
    if (!cart.length) { showFormError('Your quote list is empty. Please add products first.'); return; }
    submitWithEmailJS(form, cart);
  });
}

function renderQuoteTable() {
  const cart = getCart();
  const tbody = document.getElementById('cart-tbody');
  const empty = document.getElementById('cart-empty');
  const wrapper = document.getElementById('cart-table-wrapper');
  if (!cart.length) { wrapper?.classList.add('hidden'); empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden'); wrapper?.classList.remove('hidden');
  if (!tbody) return;
  tbody.innerHTML = cart.map(item => `
    <tr data-item-id="${item.id}">
      <td class="py-4 pr-4"><span class="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold whitespace-nowrap">${item.partNumber}</span></td>
      <td class="py-4 pr-4 font-medium text-slate-700 text-sm">${item.name}</td>
      <td class="py-4 pr-4 text-xs text-slate-500 whitespace-nowrap hidden sm:table-cell">${item.selectedVoltage || '—'}</td>
      <td class="py-4 pr-4">
        <div class="flex items-center gap-1 justify-center">
          <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
          <span class="w-6 text-center text-sm font-medium">${item.quantity}</span>
          <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
        </div>
      </td>
      <td class="py-4 text-right"><button data-action="remove" data-id="${item.id}" class="text-slate-300 hover:text-red-500 transition-colors text-lg font-bold leading-none">✕</button></td>
    </tr>`).join('');
  tbody.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id, item = getCartItem(id), a = btn.dataset.action;
      if (a === 'inc') updateQuantity(id, (item?.quantity || 1) + 1);
      else if (a === 'dec') updateQuantity(id, (item?.quantity || 1) - 1);
      else if (a === 'remove') removeFromCart(id);
    });
  });
}

function submitWithEmailJS(form, cart) {
  const btn = form.querySelector('[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const itemLines = cart.map((item, i) => `${i + 1}. ${item.partNumber} — ${item.name} | Qty: ${item.quantity} | Voltage: ${item.selectedVoltage || 'TBC'}`).join('\n');
  const templateParams = { from_company: form.company.value.trim(), from_contact: form.contact.value.trim(), from_email: form.email.value.trim(), from_phone: form.phone.value.trim() || 'N/A', from_country: form.country.value.trim(), notes: form.notes.value.trim() || 'None.', item_list: itemLines, date };
  if (typeof emailjs === 'undefined' || window.EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
    fallbackMailto(form, cart); if (btn) { btn.disabled = false; btn.textContent = 'Submit Quote Request'; } return;
  }
  emailjs.send(window.EMAILJS_SERVICE_ID, window.EMAILJS_TEMPLATE_ID, templateParams).then(() => {
    clearCart();
    document.getElementById('quote-success')?.classList.remove('hidden');
    document.getElementById('rfq-form')?.classList.add('hidden');
    document.getElementById('cart-table-wrapper')?.classList.add('hidden');
    document.getElementById('cart-empty')?.classList.add('hidden');
  }).catch(() => fallbackMailto(form, cart)).finally(() => { if (btn) { btn.disabled = false; btn.textContent = 'Submit Quote Request'; } });
}

function fallbackMailto(form, cart) {
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const subject = `RFQ — Starmer Global — ${form.company.value.trim()} — ${date}`;
  const body = ['REQUEST FOR QUOTATION','=====================',`Date: ${date}`,'','CONTACT','-------',`Company: ${form.company.value.trim()}`,`Contact: ${form.contact.value.trim()}`,`Email: ${form.email.value.trim()}`,`Phone: ${form.phone.value.trim()||'N/A'}`,`Country: ${form.country.value.trim()}`,'','ITEMS','-----', ...cart.map((item,i)=>`${i+1}. ${item.partNumber} — ${item.name} | Qty: ${item.quantity}`),'','NOTES','-----', form.notes.value.trim()||'None.','','Sent via Starmer Global online catalog.'].join('\n');
  window.location.href = `mailto:info@starmerglobal.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function validateRFQForm(form) {
  let valid = true;
  ['company','contact','email','country'].forEach(name => {
    const input = form[name], wrap = input?.closest('.form-field');
    if (!input?.value.trim()) { wrap?.classList.add('field-error'); valid = false; } else wrap?.classList.remove('field-error');
  });
  const email = form.email;
  if (email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { email.closest('.form-field')?.classList.add('field-error'); valid = false; }
  if (!valid) showFormError('Please fill in all required fields correctly.'); else hideFormError();
  return valid;
}

function showFormError(msg) { const el = document.getElementById('form-validation-msg'); if (el) { el.textContent = msg; el.classList.remove('hidden'); } }
function hideFormError() { document.getElementById('form-validation-msg')?.classList.add('hidden'); }

function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setAttr(id, attr, val) { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); }
function formatSpecKey(key) { return key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase()).replace(/_/g,' '); }
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  (toast.querySelector('span') || toast).textContent = message;
  toast.classList.add('toast-visible');
  setTimeout(() => toast.classList.remove('toast-visible'), 2800);
}
