const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3457;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database(path.join(__dirname, 'data', 'wedding.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════

app.get('/api/dashboard', (req, res) => {
  try {
    const budgetCategories = db.prepare('SELECT * FROM budget_categories').all();
    const savings = db.prepare('SELECT * FROM savings').all();
    const funds = db.prepare('SELECT * FROM fund_sources').all();
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.key] = s.value; });
    const weddingDate = settingsObj.wedding_date || '2026-10-08';

    const farhanBudget = budgetCategories.filter(c => c.owner === 'farhan');
    const farhanSavings = savings.find(s => s.owner === 'farhan');
    const farhanFunds = funds.filter(f => f.owner === 'farhan');
    const farhan = {
      total_budget: farhanBudget.reduce((sum, c) => sum + c.amount_budget, 0),
      total_actual: farhanBudget.reduce((sum, c) => sum + c.amount_actual, 0),
      savings_monthly: farhanSavings ? farhanSavings.monthly_amount : 0,
      savings_months: farhanSavings ? farhanSavings.months : 0,
      savings_projected: farhanSavings ? farhanSavings.total_projected : 0,
      funds: farhanFunds.reduce((sum, f) => sum + f.amount, 0),
      uang_nanti: 139000000
    };

    const tazkiahBudget = budgetCategories.filter(c => c.owner === 'tazkiah');
    const tazkiahSavings = savings.find(s => s.owner === 'tazkiah');
    const tazkiahFunds = funds.filter(f => f.owner === 'tazkiah');
    const tazkiah = {
      total_budget: tazkiahBudget.reduce((sum, c) => sum + c.amount_budget, 0),
      total_actual: tazkiahBudget.reduce((sum, c) => sum + c.amount_actual, 0),
      savings_monthly: tazkiahSavings ? tazkiahSavings.monthly_amount : 0,
      savings_months: tazkiahSavings ? tazkiahSavings.months : 0,
      savings_projected: tazkiahSavings ? tazkiahSavings.total_projected : 0,
      funds: tazkiahFunds.reduce((sum, f) => sum + f.amount, 0),
      uang_nanti: 57000000
    };

    const budget_breakdown = budgetCategories.map(c => ({
      category: c.category, owner: c.owner, amount: c.amount_budget
    }));

    res.json({ farhan, tazkiah, budget_breakdown, wedding_date: weddingDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// BUDGET CATEGORIES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/budget', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM budget_categories ORDER BY owner, id').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/budget', (req, res) => {
  try {
    const { owner, category, amount_budget, amount_actual, description } = req.body;
    const r = db.prepare('INSERT INTO budget_categories (owner, category, amount_budget, amount_actual, description) VALUES (?, ?, ?, ?, ?)').run(owner, category, amount_budget || 0, amount_actual || 0, description || null);
    res.json(db.prepare('SELECT * FROM budget_categories WHERE id = ?').get(r.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/budget/:id', (req, res) => {
  try {
    const { owner, category, amount_budget, amount_actual, description } = req.body;
    db.prepare('UPDATE budget_categories SET owner=?, category=?, amount_budget=?, amount_actual=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(owner, category, amount_budget || 0, amount_actual || 0, description || null, req.params.id);
    res.json(db.prepare('SELECT * FROM budget_categories WHERE id = ?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/budget/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM budget_subitems WHERE category_id = ?').run(req.params.id);
    db.prepare('DELETE FROM budget_categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// BUDGET SUB-ITEMS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/budget/:categoryId/subitems', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM budget_subitems WHERE category_id = ? ORDER BY id ASC').all(req.params.categoryId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/budget/:categoryId/subitems', (req, res) => {
  try {
    const { name, amount_budget, amount_actual, description } = req.body;
    const r = db.prepare('INSERT INTO budget_subitems (category_id, name, amount_budget, amount_actual, description) VALUES (?, ?, ?, ?, ?)').run(req.params.categoryId, name, amount_budget || 0, amount_actual || 0, description || null);
    res.json(db.prepare('SELECT * FROM budget_subitems WHERE id = ?').get(r.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/budget/subitems/:id', (req, res) => {
  try {
    const { name, amount_budget, amount_actual, description } = req.body;
    db.prepare('UPDATE budget_subitems SET name=?, amount_budget=?, amount_actual=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name, amount_budget || 0, amount_actual || 0, description || null, req.params.id);
    res.json(db.prepare('SELECT * FROM budget_subitems WHERE id = ?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/budget/subitems/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM budget_subitems WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// GUEST CATEGORIES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/guests', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM guest_categories ORDER BY owner, id').all());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/guests', (req, res) => {
  try {
    const { category, owner, total_pax, total_undangan, cetak, vip } = req.body;
    const r = db.prepare('INSERT INTO guest_categories (category, owner, total_pax, total_undangan, cetak, vip) VALUES (?, ?, ?, ?, ?, ?)').run(category, owner, total_pax || 0, total_undangan || 0, cetak || 0, vip || 0);
    res.json(db.prepare('SELECT * FROM guest_categories WHERE id = ?').get(r.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/guests/:id', (req, res) => {
  try {
    const { category, owner, total_pax, total_undangan, cetak, vip } = req.body;
    db.prepare('UPDATE guest_categories SET category=?, owner=?, total_pax=?, total_undangan=?, cetak=?, vip=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(category, owner, total_pax || 0, total_undangan || 0, cetak || 0, vip || 0, req.params.id);
    res.json(db.prepare('SELECT * FROM guest_categories WHERE id = ?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/guests/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM guest_categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// GUEST CAPACITY
// ═══════════════════════════════════════════════════════════════════

app.get('/api/guest-capacity', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM guest_capacity').all()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/guest-capacity/:owner', (req, res) => {
  try {
    const b = req.body;
    const existing = db.prepare('SELECT * FROM guest_capacity WHERE owner = ?').get(req.params.owner);
    if (existing) {
      db.prepare('UPDATE guest_capacity SET tersedia_pax=?,tersedia_undangan=?,tersedia_cetak=?,tersedia_vip=?,sisa_pax=?,sisa_undangan=?,sisa_cetak=?,sisa_vip=?,updated_at=CURRENT_TIMESTAMP WHERE owner=?').run(b.tersedia_pax,b.tersedia_undangan,b.tersedia_cetak,b.tersedia_vip,b.sisa_pax,b.sisa_undangan,b.sisa_cetak,b.sisa_vip,req.params.owner);
    } else {
      db.prepare('INSERT INTO guest_capacity (owner,tersedia_pax,tersedia_undangan,tersedia_cetak,tersedia_vip,sisa_pax,sisa_undangan,sisa_cetak,sisa_vip) VALUES (?,?,?,?,?,?,?,?,?)').run(req.params.owner,b.tersedia_pax,b.tersedia_undangan,b.tersedia_cetak,b.tersedia_vip,b.sisa_pax,b.sisa_undangan,b.sisa_cetak,b.sisa_vip);
    }
    res.json(db.prepare('SELECT * FROM guest_capacity WHERE owner = ?').get(req.params.owner));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// SAVINGS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/savings', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM savings').all()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/savings/:owner', (req, res) => {
  try {
    const { monthly_amount, months, total_projected } = req.body;
    const existing = db.prepare('SELECT * FROM savings WHERE owner = ?').get(req.params.owner);
    if (existing) {
      db.prepare('UPDATE savings SET monthly_amount=?, months=?, total_projected=?, updated_at=CURRENT_TIMESTAMP WHERE owner=?').run(monthly_amount, months, total_projected, req.params.owner);
    } else {
      db.prepare('INSERT INTO savings (owner, monthly_amount, months, total_projected) VALUES (?, ?, ?, ?)').run(req.params.owner, monthly_amount, months, total_projected);
    }
    res.json(db.prepare('SELECT * FROM savings WHERE owner = ?').get(req.params.owner));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// FUND SOURCES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/funds', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM fund_sources ORDER BY owner, id').all()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/funds', (req, res) => {
  try {
    const { owner, source_name, amount } = req.body;
    const r = db.prepare('INSERT INTO fund_sources (owner, source_name, amount) VALUES (?, ?, ?)').run(owner, source_name, amount || 0);
    res.json(db.prepare('SELECT * FROM fund_sources WHERE id = ?').get(r.lastInsertRowid));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/funds/:id', (req, res) => {
  try {
    const { owner, source_name, amount } = req.body;
    db.prepare('UPDATE fund_sources SET owner=?, source_name=?, amount=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(owner, source_name, amount || 0, req.params.id);
    res.json(db.prepare('SELECT * FROM fund_sources WHERE id = ?').get(req.params.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/funds/:id', (req, res) => {
  try { db.prepare('DELETE FROM fund_sources WHERE id = ?').run(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/settings', (req, res) => {
  try {
    const upsert = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP');
    db.transaction(() => { for (const [k, v] of Object.entries(req.body)) upsert.run(k, String(v), String(v)); })();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// SYNC
// ═══════════════════════════════════════════════════════════════════

const UNDANGAN_URL = 'http://127.0.0.1:3456';

async function getUndanganToken() {
  try {
    const res = await fetch(`${UNDANGAN_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@admin.com', password: 'password' }) });
    return (await res.json()).token;
  } catch (e) { return null; }
}

app.post('/api/sync/guests', async (req, res) => {
  try {
    const token = await getUndanganToken();
    if (!token) return res.status(503).json({ error: 'Undangan API not available' });
    const guests = db.prepare('SELECT * FROM guest_categories').all();
    const syncGuests = [];
    for (const g of guests) {
      for (let i = 0; i < (g.total_pax || 1); i++) {
        syncGuests.push({ name: `${g.category} #${i+1}`, qr_code: `${g.category.toLowerCase().replace(/\s+/g,'-')}-${g.id}-${i+1}`, description: g.category, invited_pax: 2, is_vip: g.vip > 0 ? 1 : 0, rsvp_status: false, attendance_count: 0, has_arrived: false, souvenir_taken: false });
      }
    }
    await fetch(`${UNDANGAN_URL}/api/guests`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(syncGuests) });
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_guest_sync', ?, CURRENT_TIMESTAMP)").run(new Date().toISOString());
    res.json({ success: true, synced: syncGuests.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sync/rsvp', async (req, res) => {
  try {
    const token = await getUndanganToken();
    if (!token) return res.status(503).json({ error: 'Undangan API not available' });
    const guests = await (await fetch(`${UNDANGAN_URL}/api/guests`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
    const stats = { total: guests.length, confirmed: guests.filter(g => g.rsvp_status === 1 || g.rsvp_status === true).length, not_attending: guests.filter(g => g.rsvp_status === 0 && g.message).length, pending: guests.filter(g => !g.rsvp_status && !g.message).length, checked_in: guests.filter(g => g.has_arrived === 1 || g.has_arrived === true).length, total_pax_confirmed: guests.filter(g => g.rsvp_status === 1 || g.rsvp_status === true).reduce((s, g) => s + (g.attendance_count || 0), 0) };
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_rsvp_sync', ?, CURRENT_TIMESTAMP)").run(new Date().toISOString());
    res.json({ stats, guests });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sync/checkin', async (req, res) => {
  try {
    const token = await getUndanganToken();
    if (!token) return res.status(503).json({ error: 'Undangan API not available' });
    const guests = await (await fetch(`${UNDANGAN_URL}/api/guests?has_arrived=true`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
    db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_checkin_sync', ?, CURRENT_TIMESTAMP)").run(new Date().toISOString());
    res.json({ guests, count: guests.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sync/budget-impact', async (req, res) => {
  try {
    const token = await getUndanganToken();
    let rsvpStats = { total_pax_confirmed: 0, confirmed: 0, checked_in: 0 };
    if (token) {
      const guests = await (await fetch(`${UNDANGAN_URL}/api/guests`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
      rsvpStats = { total: guests.length, confirmed: guests.filter(g => g.rsvp_status === 1 || g.rsvp_status === true).length, checked_in: guests.filter(g => g.has_arrived === 1 || g.has_arrived === true).length, total_pax_confirmed: guests.filter(g => g.rsvp_status === 1 || g.rsvp_status === true).reduce((s, g) => s + (g.attendance_count || 0), 0) };
    }
    const cats = db.prepare('SELECT * FROM budget_categories').all();
    const totalBudget = cats.reduce((s, c) => s + c.amount_budget, 0);
    const totalActual = cats.reduce((s, c) => s + c.amount_actual, 0);
    res.json({ rsvp: rsvpStats, budget_summary: { total_budget: totalBudget, total_actual: totalActual, remaining: totalBudget - totalActual }, catering_impact: { confirmed_pax: rsvpStats.total_pax_confirmed, cost_per_pax: 150000, estimated_cost: rsvpStats.total_pax_confirmed * 150000 } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sync/status', (req, res) => {
  try {
    const settings = db.prepare("SELECT * FROM settings WHERE key LIKE 'last_%'").all();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// CATCH-ALL (must be last)
// ═══════════════════════════════════════════════════════════════════

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wedding Planner API running on port ${PORT}`);
});
