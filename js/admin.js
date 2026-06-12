// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN.JS — Starmer Global Admin Panel
//
// SETUP INSTRUCTIONS
// ══════════════════
// 1. Go to https://supabase.com → Sign up (free) → New Project
// 2. In your project: Settings → API → copy "Project URL" and "anon public" key
// 3. Paste them below:
const SB_URL  = 'https://mnypmgfbhgaxfunverne.supabase.co/rest/v1/';  // e.g. https://abcxyz.supabase.co
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ueXBtZ2ZiaGdheGZ1bnZlcm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDI2MjYsImV4cCI6MjA5NjUxODYyNn0.Boe9uzfe1fO0VQbJ34GEwIWKNS54h9LZ-l1dlf3J8JE';     // starts with eyJ...
//
// 4. In Supabase → SQL Editor, run the SQL from admin-setup.sql (see comments below)
// 5. In Supabase → Authentication → Users → "Invite user" to create the admin account
// 6. Share admin.html URL + credentials ONLY with the client
// ═══════════════════════════════════════════════════════════════════════════════

/*
── SQL TO RUN IN SUPABASE SQL EDITOR ────────────────────────────────────────────

create table public.admin_machines (
  id text primary key,
  name text not null,
  machine_number text not null,
  function_desc text,
  description text,
  image text,
  category_id text not null,
  line_id text not null,
  order_in_line integer default 99,
  specs jsonb default '{}',
  created_at timestamptz default now()
);
create table public.admin_parts (
  id text primary key,
  name text not null,
  part_number text not null,
  type text default 'part',
  description text,
  image text,
  machine_id text,
  category_id text,
  specs jsonb default '{}',
  created_at timestamptz default now()
);
create table public.hidden_items (
  item_id text primary key,
  item_type text not null,
  hidden_at timestamptz default now()
);

alter table public.admin_machines enable row level security;
alter table public.admin_parts    enable row level security;
alter table public.hidden_items   enable row level security;

create policy "public_read"  on public.admin_machines for select to anon using (true);
create policy "auth_all"     on public.admin_machines for all   to authenticated using (true);
create policy "public_read"  on public.admin_parts    for select to anon using (true);
create policy "auth_all"     on public.admin_parts    for all   to authenticated using (true);
create policy "public_read"  on public.hidden_items   for select to anon using (true);
create policy "auth_all"     on public.hidden_items   for all   to authenticated using (true);

──────────────────────────────────────────────────────────────────────────────────
*/

// ── Auth helpers ──────────────────────────────────────────────────────────────
let _token = null, _userEmail = null, _catalog = null;

function _hdr(write = false) {
  const h = { 'apikey': SB_ANON, 'Content-Type': 'application/json' };
  if (write && _token) h['Authorization'] = `Bearer ${_token}`;
  return h;
}

async function sbLogin(email, password) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: _hdr(),
    body: JSON.stringify({ email, password })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.msg || 'Login failed');
  _token = d.access_token; _userEmail = d.user?.email || email;
  sessionStorage.setItem('sg-at', _token);
  sessionStorage.setItem('sg-ae', _userEmail);
}

async function sbLogout() {
  try { await fetch(`${SB_URL}/auth/v1/logout`, { method: 'POST', headers: _hdr(true) }); } catch {}
  _token = null; _userEmail = null;
  sessionStorage.removeItem('sg-at'); sessionStorage.removeItem('sg-ae');
}

// ── REST helpers ──────────────────────────────────────────────────────────────
async function sbGet(table) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?select=*&order=created_at.desc`, { headers: _hdr() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbInsert(table, row) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ..._hdr(true), 'Prefer': 'return=representation' },
    body: JSON.stringify(row)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbDel(table, col, val) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, {
    method: 'DELETE', headers: _hdr(true)
  });
  if (!r.ok) throw new Error(await r.text());
}

// ── App state ─────────────────────────────────────────────────────────────────
let adminMachines = [], adminParts = [], hiddenItems = [], activeTab = 'machines';

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _catalog = window.CATALOG_DATA;

  const saved = sessionStorage.getItem('sg-at');
  if (saved) { _token = saved; _userEmail = sessionStorage.getItem('sg-ae'); showDash(); }

  // Login
  q('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = q('#login-btn'), err = q('#login-error');
    err.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>Signing in…`;
    try {
      await sbLogin(q('#admin-email').value.trim(), q('#admin-password').value);
      showDash();
    } catch (ex) {
      err.textContent = ex.message; err.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });

  // Logout
  q('#logout-btn').addEventListener('click', async () => {
    await sbLogout(); showLogin();
  });

  // Tabs
  document.querySelectorAll('[data-tab]').forEach(b =>
    b.addEventListener('click', () => setTab(b.dataset.tab)));

  // Buttons
  q('#add-machine-btn').addEventListener('click', () => openModal('machine'));
  q('#add-part-btn').addEventListener('click',    () => openModal('part'));
  q('#modal-close').addEventListener('click', closeModal);
  q('#modal-overlay').addEventListener('click', e => { if (e.target === q('#modal-overlay')) closeModal(); });

  // Forms
  q('#machine-form').addEventListener('submit', handleAddMachine);
  q('#part-form').addEventListener('submit',    handleAddPart);
  q('#machine-spec-add').addEventListener('click', () => addSpecRow('machine-specs'));
  q('#part-spec-add').addEventListener('click',    () => addSpecRow('part-specs'));
  q('#m-category').addEventListener('change', populateLines);
});

async function showDash() {
  q('#login-screen').classList.add('hidden');
  q('#dashboard').classList.remove('hidden');
  if (_userEmail) q('#admin-user-email').textContent = _userEmail;
  await refresh();
  setTab('machines');
}
function showLogin() {
  q('#dashboard').classList.add('hidden');
  q('#login-screen').classList.remove('hidden');
  q('#admin-password').value = '';
}

async function refresh() {
  try {
    [adminMachines, adminParts, hiddenItems] = await Promise.all([
      sbGet('admin_machines'), sbGet('admin_parts'), sbGet('hidden_items')
    ]);
  } catch (e) { toast('Load error: ' + e.message, 'err'); }
  drawStats();
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function drawStats() {
  const sm = allStaticMachines(), sp = allStaticParts();
  const hSet = new Set(hiddenItems.map(h => h.item_id));
  const data = [
    { n: sm.length + adminMachines.length,      lbl: 'Total Machines',    icon: '⚙',  bg: '#e8f2ff', col: '#1A3A5C' },
    { n: adminMachines.length + adminParts.length, lbl: 'Admin-Added',     icon: '✚',  bg: '#eff6ff', col: '#2E7CC6' },
    { n: sp.length + adminParts.length,           lbl: 'Dies & Parts',     icon: '🔩', bg: '#f0fdf4', col: '#0D6B5E' },
    { n: hSet.size,                               lbl: 'Hidden Items',     icon: '👁', bg: '#fafafa', col: '#64748b' },
  ];
  q('#stats-row').innerHTML = data.map(d => `
    <div class="rounded-2xl border border-slate-200 shadow-sm p-5" style="background:${d.bg}">
      <div class="text-2xl mb-1">${d.icon}</div>
      <div class="text-3xl font-extrabold" style="color:${d.col}">${d.n}</div>
      <div class="text-xs font-semibold text-slate-500 mt-1">${d.lbl}</div>
    </div>`).join('');
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('[data-tab]').forEach(b => {
    const on = b.dataset.tab === tab;
    b.className = on
      ? 'admin-tab px-4 py-2 text-sm font-semibold text-primary bg-white rounded-lg shadow-sm transition-all'
      : 'admin-tab px-4 py-2 text-sm font-medium text-slate-500 rounded-lg hover:text-slate-700 transition-all';
  });
  q('#machines-panel').classList.toggle('hidden', tab !== 'machines');
  q('#parts-panel').classList.toggle('hidden',    tab !== 'parts');
  if (tab === 'machines') drawMachines();
  else drawParts();
}

// ── Machines table ─────────────────────────────────────────────────────────────
function drawMachines() {
  const hSet = new Set(hiddenItems.map(h => h.item_id));
  const rows = [
    ...adminMachines.map(m => ({
      id: m.id, num: m.machine_number, name: m.name,
      cat: m.category_id, line: m.line_id, origin: 'custom', hidden: hSet.has(m.id)
    })),
    ...allStaticMachines().map(m => ({
      id: m.id, num: m.machineNumber, name: m.name,
      cat: m.catLabel, line: m.lineName, origin: 'catalog', hidden: hSet.has(m.id)
    }))
  ];
  q('#machines-table-wrap').innerHTML = rows.length ? tableHtml(rows, 'machine') : emptyMsg();
}

// ── Parts table ────────────────────────────────────────────────────────────────
function drawParts() {
  const hSet = new Set(hiddenItems.map(h => h.item_id));
  const rows = [
    ...adminParts.map(p => ({
      id: p.id, num: p.part_number, name: p.name, type: p.type,
      extra: p.machine_id || '—', origin: 'custom', hidden: hSet.has(p.id)
    })),
    ...allStaticParts().map(p => ({
      id: p.id, num: p.partNumber, name: p.name, type: p.type,
      extra: p.machineName, origin: 'catalog', hidden: hSet.has(p.id)
    }))
  ];
  q('#parts-table-wrap').innerHTML = rows.length ? tableHtml(rows, 'part') : emptyMsg();
}

function tableHtml(rows, kind) {
  const isMachine = kind === 'machine';
  const th = (t) => `<th class="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">${t}</th>`;
  const header = isMachine
    ? [th('Number'), th('Name'), th('Category'), th('Line'), th('Source'), th('')]
    : [th('Number'), th('Name'), th('Type'), th('Machine'), th('Source'), th('')];

  return `<div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 border-b border-slate-100">${header.join('')}</thead>
      <tbody class="divide-y divide-slate-50">
        ${rows.map(r => {
          const hid = r.hidden;
          const badge = r.origin === 'custom'
            ? `<span class="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Custom</span>`
            : `<span class="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Catalog</span>`;
          const typeBadge = !isMachine
            ? (r.type === 'die'
              ? `<span class="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">Die</span>`
              : `<span class="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Spare Part</span>`)
            : '';
          const td3 = isMachine ? `<td class="px-4 py-3 text-xs text-slate-400">${esc(r.cat)}</td>` : typeBadge ? `<td class="px-4 py-3">${typeBadge}</td>` : `<td></td>`;
          const td4 = `<td class="px-4 py-3 text-xs text-slate-400 max-w-[160px] truncate">${esc(r.line || r.extra || '—')}</td>`;
          const actions = `
            <button onclick="toggleHide('${r.id}','${hid ? 'show' : 'hide'}','${kind}')"
              class="text-xs px-2.5 py-1 rounded-lg border transition-colors ${hid ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}">
              ${hid ? '↩ Restore' : '⊘ Hide'}
            </button>
            ${r.origin === 'custom' ? `<button onclick="deleteItem('${r.id}','${kind}')"
              class="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors ml-1.5">✕ Delete</button>` : ''}`;
          return `<tr class="hover:bg-slate-50 transition-colors${hid ? ' opacity-40' : ''}">
            <td class="px-4 py-3 font-mono text-xs font-bold text-blue-600">${esc(r.num)}</td>
            <td class="px-4 py-3 font-medium text-slate-700${hid ? ' line-through' : ''}">${esc(r.name)}</td>
            ${td3}
            ${td4}
            <td class="px-4 py-3">${badge}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">${actions}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

function emptyMsg() {
  return `<div class="py-16 text-center text-slate-400 text-sm">No items found.</div>`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
async function toggleHide(id, action, type) {
  try {
    if (action === 'hide') await sbInsert('hidden_items', { item_id: id, item_type: type });
    else await sbDel('hidden_items', 'item_id', id);
    await refresh(); setTab(activeTab);
    toast(action === 'hide' ? 'Hidden from public catalog.' : 'Item restored.', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

async function deleteItem(id, type) {
  if (!confirm('Permanently delete this item? This cannot be undone.')) return;
  try {
    await sbDel(type === 'machine' ? 'admin_machines' : 'admin_parts', 'id', id);
    await sbDel('hidden_items', 'item_id', id).catch(() => {});
    await refresh(); setTab(activeTab);
    toast('Deleted.', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(type) {
  q('#modal-overlay').classList.remove('hidden');
  q('#machine-modal').classList.toggle('hidden', type !== 'machine');
  q('#part-modal').classList.toggle('hidden',    type !== 'part');
  if (type === 'machine') {
    q('#machine-form').reset();
    populateCats(); populateLines();
    q('#machine-specs').innerHTML = specRow();
  } else {
    q('#part-form').reset();
    populateMachines();
    q('#part-specs').innerHTML = specRow();
  }
}
function closeModal() { q('#modal-overlay').classList.add('hidden'); }

function populateCats() {
  q('#m-category').innerHTML = `<option value="">— Select Category —</option>` +
    _catalog.categories.map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
  q('#m-line').innerHTML = `<option value="">— Pick category first —</option>`;
}
function populateLines() {
  const cat = _catalog.categories.find(c => c.id === q('#m-category').value);
  q('#m-line').innerHTML = cat
    ? `<option value="">— Select Line —</option>` + cat.lines.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('')
    : `<option value="">— Pick category first —</option>`;
}
function populateMachines() {
  const opts = [
    ...allStaticMachines().map(m => `<option value="${m.id}" data-cat="${m.categoryId}">${esc(m.machineNumber)} — ${esc(m.name)}</option>`),
    ...adminMachines.map(m => `<option value="${m.id}" data-cat="${m.category_id}">${esc(m.machine_number)} — ${esc(m.name)} (custom)</option>`)
  ];
  q('#p-machine').innerHTML = `<option value="">— Select Machine —</option>` + opts.join('');
}

// ── Spec rows ─────────────────────────────────────────────────────────────────
function specRow() {
  return `<div class="spec-row flex gap-2 mb-2">
    <input type="text" placeholder="Key (e.g. Capacity)" class="spec-key flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
    <input type="text" placeholder="Value (e.g. 300 L)"  class="spec-val flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
    <button type="button" onclick="this.closest('.spec-row').remove()" class="text-slate-300 hover:text-red-500 px-2 text-xl leading-none font-bold">×</button>
  </div>`;
}
function addSpecRow(id) {
  const wrap = document.getElementById(id);
  const d = document.createElement('div');
  d.innerHTML = specRow();
  wrap.appendChild(d.firstElementChild);
}
function collectSpecs(id) {
  const specs = {};
  document.getElementById(id).querySelectorAll('.spec-row').forEach(r => {
    const k = r.querySelector('.spec-key').value.trim();
    const v = r.querySelector('.spec-val').value.trim();
    if (k && v) specs[k] = v;
  });
  return specs;
}

// ── Form handlers ─────────────────────────────────────────────────────────────
async function handleAddMachine(e) {
  e.preventDefault();
  const btn = q('#add-machine-submit');
  const catId = q('#m-category').value, lineId = q('#m-line').value;
  if (!catId || !lineId) { toast('Select a category and line.', 'err'); return; }
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await sbInsert('admin_machines', {
      id: 'ADMM-' + Date.now(),
      name:           q('#m-name').value.trim(),
      machine_number: q('#m-number').value.trim(),
      function_desc:  q('#m-function').value.trim(),
      description:    q('#m-description').value.trim(),
      image:          q('#m-image').value.trim() || null,
      category_id:    catId,
      line_id:        lineId,
      order_in_line:  parseInt(q('#m-order').value) || 99,
      specs:          collectSpecs('machine-specs')
    });
    closeModal(); await refresh(); setTab('machines');
    toast('Machine added to catalog!', 'ok');
  } catch (ex) { toast(ex.message, 'err'); }
  btn.disabled = false; btn.textContent = 'Add Machine';
}

async function handleAddPart(e) {
  e.preventDefault();
  const btn = q('#add-part-submit');
  const machineId = q('#p-machine').value;
  const catOpt = q(`#p-machine option[value="${machineId}"]`);
  const catId = catOpt?.dataset?.cat || '';
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await sbInsert('admin_parts', {
      id: 'ADMP-' + Date.now(),
      name:         q('#p-name').value.trim(),
      part_number:  q('#p-number').value.trim(),
      type:         q('#p-type').value,
      description:  q('#p-description').value.trim(),
      image:        q('#p-image').value.trim() || null,
      machine_id:   machineId || null,
      category_id:  catId,
      specs:        collectSpecs('part-specs')
    });
    closeModal(); await refresh(); setTab('parts');
    toast('Part/Die added to catalog!', 'ok');
  } catch (ex) { toast(ex.message, 'err'); }
  btn.disabled = false; btn.textContent = 'Add Part/Die';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let _toastTimer;
function toast(msg, type = 'ok') {
  const el = q('#admin-toast');
  clearTimeout(_toastTimer);
  el.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-opacity duration-300 ${type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`;
  el.textContent = msg; el.style.opacity = '1';
  _toastTimer = setTimeout(() => el.style.opacity = '0', 3500);
}

// ── Catalog helpers ───────────────────────────────────────────────────────────
function allStaticMachines() {
  return _catalog.categories.flatMap(c =>
    c.lines.flatMap(l => l.machines.map(m => ({
      ...m, categoryId: c.id, catLabel: c.label, lineId: l.id, lineName: l.name
    }))));
}
function allStaticParts() {
  return _catalog.categories.flatMap(c =>
    c.lines.flatMap(l => l.machines.flatMap(m =>
      (m.diesAndParts || []).map(p => ({
        ...p, machineId: m.id, machineName: m.name, categoryId: c.id, catLabel: c.label
      })))));
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function q(sel) { return document.querySelector(sel); }
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
