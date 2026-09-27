const http = require('http');
const crypto = require('crypto');

const UNDANGAN_BASE = 'http://127.0.0.1:3456';
const JWT_SECRET = 'undangan-wedding-secret-key-2026';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'password';

let cachedToken = null;
let tokenExpiry = 0;

function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return Promise.resolve(cachedToken);

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const options = {
      hostname: '127.0.0.1', port: 3456, path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.token) {
            cachedToken = parsed.token;
            tokenExpiry = Date.now() + 3500000; // ~1h
            resolve(parsed.token);
          } else {
            reject(new Error('No token received'));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1', port: 3456, path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = http.request(options, (res) => {
      let bodyStr = '';
      res.on('data', (c) => bodyStr += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(bodyStr) });
        } catch (e) {
          resolve({ status: res.statusCode, data: bodyStr });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Sync guest categories from Wedding Planner to Undangan
// Generates individual guest placeholders from category pax counts
function generateGuestsFromCategories(categories, db) {
  const guests = [];
  const insertGuest = db.prepare(`INSERT OR REPLACE INTO sync_guests 
    (category_id, owner, category_name, qr_code, name, invited_pax, vip, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`);

  for (const cat of categories) {
    // For each category, generate guest placeholder entries
    // The category has total_pax, total_undangan, cetak, vip
    // We create individual guest records for the undangan system
    const paxCount = cat.total_pax || 0;
    const undanganCount = cat.total_undangan || 0;
    const vipCount = cat.vip || 0;

    if (paxCount === 0 && undanganCount === 0) continue;

    // Generate QR codes for undangan invitations
    const numToGenerate = Math.max(paxCount, undanganCount, 1);
    for (let i = 0; i < numToGenerate; i++) {
      const qrCode = `WP-${cat.owner.toUpperCase()}-${cat.category.toUpperCase().replace(/\s+/g, '-')}-${String(i + 1).padStart(3, '0')}`;
      const name = `${cat.category} - Tamu ${i + 1}`;
      const invitedPax = Math.ceil(paxCount / numToGenerate) || 2;
      const isVip = i < vipCount ? 1 : 0;

      insertGuest.run(cat.id, cat.owner, cat.category, qrCode, name, invitedPax, isVip);

      guests.push({
        id: crypto.randomUUID(),
        name,
        qr_code: qrCode,
        description: cat.category,
        invited_pax: invitedPax,
        is_vip: isVip === 1
      });
    }
  }

  return guests;
}

async function syncGuestsToUndangan(db) {
  // Get all guest categories from wedding planner
  const categories = db.prepare('SELECT * FROM guest_categories ORDER BY owner, id').all();

  // Create sync_guests table if not exists
  db.exec(`CREATE TABLE IF NOT EXISTS sync_guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    owner TEXT,
    category_name TEXT,
    qr_code TEXT UNIQUE,
    name TEXT,
    invited_pax INTEGER DEFAULT 2,
    vip INTEGER DEFAULT 0,
    synced_at TEXT DEFAULT (datetime('now'))
  )`);

  // Generate guests from categories
  const guests = generateGuestsFromCategories(categories, db);

  if (guests.length === 0) {
    return { success: true, guests: [], links: [], message: 'No guests to sync' };
  }

  // Get auth token
  const token = await getToken();

  // Send guests to Undangan API in batches
  const batchSize = 50;
  const results = [];

  for (let i = 0; i < guests.length; i += batchSize) {
    const batch = guests.slice(i, i + batchSize);
    try {
      const response = await apiRequest('POST', '/api/guests', batch, token);
      if (response.status === 200 || response.status === 201) {
        const created = Array.isArray(response.data) ? response.data : [response.data];
        results.push(...created);
      }
    } catch (err) {
      console.error('Batch sync error:', err.message);
    }
  }

  // Generate invitation links
  const links = guests.map(g => ({
    name: g.name,
    qr_code: g.qr_code,
    link: `https://tazkiahfarhan.my.id/?to=${g.qr_code}`,
    description: g.description,
    vip: g.is_vip
  }));

  // Update sync status
  db.exec(`INSERT OR REPLACE INTO settings (key, value, updated_at) 
    VALUES ('last_sync_guests', datetime('now'), datetime('now'))`);

  return { success: true, count: guests.length, results, links };
}

async function fetchRSVPFromUndangan(db) {
  const token = await getToken();

  // Fetch all guests from undangan
  const response = await apiRequest('GET', '/api/guests', null, token);
  if (response.status !== 200) {
    throw new Error(`Failed to fetch RSVP data: ${response.status}`);
  }

  const guests = response.data;

  // Aggregate stats
  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp_status === true || g.rsvp_status === 1).length,
    not_attending: 0,
    pending: 0,
    checked_in: guests.filter(g => g.has_arrived === true || g.has_arrived === 1).length,
    total_pax_confirmed: guests
      .filter(g => g.rsvp_status === true || g.rsvp_status === 1)
      .reduce((sum, g) => sum + (g.attendance_count || 1), 0)
  };
  stats.pending = stats.total - stats.confirmed;

  // Update wedding planner settings
  db.exec(`INSERT OR REPLACE INTO settings (key, value, updated_at) 
    VALUES ('rsvp_stats', '${JSON.stringify(stats).replace(/'/g, "''")}', datetime('now'))`);
  db.exec(`INSERT OR REPLACE INTO settings (key, value, updated_at) 
    VALUES ('last_sync_rsvp', datetime('now'), datetime('now'))`);

  return stats;
}

async function fetchCheckinFromUndangan(db) {
  const token = await getToken();

  // Fetch checked-in guests
  const response = await apiRequest('GET', '/api/guests?has_arrived=true', null, token);
  if (response.status !== 200) {
    throw new Error(`Failed to fetch check-in data: ${response.status}`);
  }

  const guests = response.data;

  // Update sync status
  db.exec(`INSERT OR REPLACE INTO settings (key, value, updated_at) 
    VALUES ('last_sync_checkin', datetime('now'), datetime('now'))`);

  return {
    total_checked_in: guests.length,
    guests: guests.map(g => ({
      id: g.id,
      name: g.name,
      qr_code: g.qr_code,
      arrival_time: g.arrival_time,
      photo_url: g.photo_url,
      attendance_count: g.attendance_count,
      is_vip: g.is_vip
    }))
  };
}

async function calculateBudgetImpact(db) {
  // First fetch latest RSVP stats
  const rsvpStats = await fetchRSVPFromUndangan(db);

  // Get budget data
  const farhanBudget = db.prepare(`
    SELECT COALESCE(SUM(amount_budget), 0) as total_budget,
           COALESCE(SUM(amount_actual), 0) as total_actual
    FROM budget_categories WHERE owner = 'farhan'
  `).get();

  const tazkiahBudget = db.prepare(`
    SELECT COALESCE(SUM(amount_budget), 0) as total_budget,
           COALESCE(SUM(amount_actual), 0) as total_actual
    FROM budget_categories WHERE owner = 'tazkiah'
  `).get();

  // Estimate catering cost per pax (assumption: Rp 150,000 per pax)
  const CATERING_PER_PAX = 150000;
  const estimatedCatering = rsvpStats.total_pax_confirmed * CATERING_PER_PAX;

  // Get current catering budget from categories
  const cateringBudget = db.prepare(`
    SELECT COALESCE(SUM(amount_budget), 0) as budget, COALESCE(SUM(amount_actual), 0) as actual
    FROM budget_categories WHERE category LIKE '%nikah%' OR category LIKE '%catering%'
  `).get();

  const totalBudget = farhanBudget.total_budget + tazkiahBudget.total_budget;
  const totalActual = farhanBudget.total_actual + tazkiahBudget.total_actual;

  const impact = {
    rsvp: rsvpStats,
    budget_summary: {
      total_budget: totalBudget,
      total_actual: totalActual,
      remaining: totalBudget - totalActual
    },
    catering_impact: {
      confirmed_pax: rsvpStats.total_pax_confirmed,
      cost_per_pax: CATERING_PER_PAX,
      estimated_cost: estimatedCatering,
      catering_budget: cateringBudget.budget,
      catering_actual: cateringBudget.actual,
      catering_difference: cateringBudget.budget - estimatedCatering
    },
    guest_breakdown: {
      confirmed_guests: rsvpStats.confirmed,
      pending_guests: rsvpStats.pending,
      checked_in: rsvpStats.checked_in,
      estimated_final_pax: rsvpStats.total_pax_confirmed
    }
  };

  // Update sync status
  db.exec(`INSERT OR REPLACE INTO settings (key, value, updated_at) 
    VALUES ('last_sync_budget', datetime('now'), datetime('now'))`);

  return impact;
}

module.exports = {
  syncGuestsToUndangan,
  fetchRSVPFromUndangan,
  fetchCheckinFromUndangan,
  calculateBudgetImpact
};
