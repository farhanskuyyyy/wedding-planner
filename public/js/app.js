// Wedding Planner — Farhan & Tazkiah
// Anti-slop redesign: Monitor surface, density, glanceability
const API = '';

// ============ UTILITY ============
function formatRp(num) {
  if (num === null || num === undefined) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function formatRpShort(num) {
  if (num === null || num === undefined) return 'Rp 0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1000000000) return sign + 'Rp ' + (abs / 1000000000).toFixed(1) + 'M';
  if (abs >= 1000000) return sign + 'Rp ' + (abs / 1000000).toFixed(1) + 'M';
  if (abs >= 1000) return sign + 'Rp ' + (abs / 1000).toFixed(0) + 'K';
  return sign + 'Rp ' + abs.toLocaleString('id-ID');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-text').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ============ THEME ============
function toggleTheme() {
  const html = document.documentElement;
  const body = document.body;
  const icon = document.getElementById('theme-icon');
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    body.classList.remove('dark');
    body.classList.add('bg-white', 'text-ink');
    icon.textContent = '☀';
  } else {
    html.classList.add('dark');
    body.classList.add('dark');
    body.classList.remove('bg-white', 'text-ink');
    body.classList.add('bg-surface-dark', 'text-surface');
    icon.textContent = '☾';
  }
  // Rebuild charts with new theme colors
  if (currentTab === 'dashboard') loadDashboard();
}

// ============ TABS ============
let currentTab = 'dashboard';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'dashboard') loadDashboard();
  else if (tab === 'guests') loadGuests();
  else if (tab === 'budget') loadBudget();
  else if (tab === 'savings') loadSavings();
  else if (tab === 'sync') loadSyncTab();
}

// ============ THEME HELPERS ============
function isDark() { return document.documentElement.classList.contains('dark'); }
function chartTextColor() { return isDark() ? '#9CA3AF' : '#6B7280'; }
function chartGridColor() { return isDark() ? '#2A2A2A' : '#F3F4F6'; }

// ============ DASHBOARD ============
let pieChart = null;
let guestChart = null;
let rsvpChart = null;
let dashSavingsChart = null;

const ACCENT = '#C17E61';
const ACCENT_LIGHT = '#D4967B';
const ACCENT_MUTED = 'rgba(193,126,97,0.15)';

// Budget sub-item breakdown (static reference data)
const BUDGET_SUBITEMS = {
  nikah: [
    { name: 'Catering', amount: 60000000 },
    { name: 'Dekorasi', amount: 15000000 },
    { name: 'MUA & Busana', amount: 8000000 },
    { name: 'Fotografer', amount: 5000000 },
    { name: 'Undangan Cetak', amount: 3000000 },
    { name: 'Lainnya', amount: 7050000 }
  ],
  lamaran: [
    { name: 'Cincin', amount: 250000 },
    { name: 'Seserahan', amount: 100000 },
    { name: 'Lainnya', amount: 50000 }
  ],
  isi_rumah: [
    { name: 'Furniture', amount: 10000000 },
    { name: 'Elektronik', amount: 5000000 },
    { name: 'Perlengkapan', amount: 3000000 },
    { name: 'Lainnya', amount: 2000000 }
  ]
};

const CATEGORY_LABELS = {
  nikah: 'Pernikahan',
  lamaran: 'Lamaran',
  isi_rumah: 'Isi Rumah',
  honeymoon: 'Honeymoon',
  bang_ade: 'Bang Ade',
  bawaan_balik_lamaran: 'Bawaan Balik Lamaran',
  pengajian: 'Pengajian',
  baju_bridesmaids: 'Baju Bridesmaids',
  kontrak_3_bulan: 'Kontrak 3 Bulan',
  baju_keluarga: 'Baju Keluarga',
  biaya_tak_terduga: 'Biaya Tak Terduga'
};

async function loadDashboard() {
  try {
    const [dashRes, guestsRes, fundsRes] = await Promise.all([
      fetch(API + '/api/dashboard'),
      fetch(API + '/api/guests'),
      fetch(API + '/api/funds')
    ]);
    const data = await dashRes.json();
    const guests = await guestsRes.json();
    const funds = await fundsRes.json();
    const { farhan, tazkiah, budget_breakdown, wedding_date } = data;

    // Key metrics
    const totalBudget = farhan.total_budget + tazkiah.total_budget;
    const totalFunds = farhan.funds + tazkiah.funds;
    const totalNanti = farhan.uang_nanti + tazkiah.uang_nanti;
    document.getElementById('stat-total-budget').textContent = formatRpShort(totalBudget);
    document.getElementById('stat-total-funds').textContent = formatRpShort(totalFunds);
    document.getElementById('stat-uang-nanti').textContent = formatRpShort(totalNanti);

    // Days to wedding
    const target = new Date(wedding_date + 'T08:00:00+07:00');
    const now = new Date();
    const daysLeft = Math.max(0, Math.ceil((target - now) / 86400000));
    document.getElementById('stat-days-wedding').textContent = daysLeft > 0 ? daysLeft : 'Hari ini!';
    updateCountdown(wedding_date);

    // Guest summary
    let totalPax = 0, totalUnd = 0, totalCetak = 0, totalVip = 0;
    guests.forEach(g => { totalPax += g.total_pax; totalUnd += g.total_undangan; totalCetak += g.cetak; totalVip += g.vip; });
    document.getElementById('dash-total-pax').textContent = totalPax.toLocaleString();
    document.getElementById('dash-total-undangan').textContent = totalUnd.toLocaleString();
    document.getElementById('dash-total-cetak').textContent = totalCetak.toLocaleString();
    document.getElementById('dash-total-vip').textContent = totalVip.toLocaleString();

    // Guest bar chart
    renderGuestBarChart(guests);

    // Budget pie chart
    renderPieChart(budget_breakdown);

    // Budget breakdown with sub-items
    renderBudgetBreakdown(budget_breakdown);

    // Savings
    const farhanSav = farhan.savings;
    const tazkiahSav = tazkiah.savings;
    if (farhanSav) {
      document.getElementById('dash-sav-farhan').textContent = formatRpShort(farhanSav.total_projected);
      document.getElementById('dash-sav-farhan-detail').textContent = formatRpShort(farhanSav.monthly_amount) + '/bln × ' + farhanSav.months + ' bln';
      const savMax = Math.max(farhanSav.total_projected, tazkiahSav ? tazkiahSav.total_projected : 1, 1);
      document.getElementById('bar-sav-farhan').style.width = (farhanSav.total_projected / savMax * 100) + '%';
    }
    if (tazkiahSav) {
      document.getElementById('dash-sav-tazkiah').textContent = formatRpShort(tazkiahSav.total_projected);
      document.getElementById('dash-sav-tazkiah-detail').textContent = formatRpShort(tazkiahSav.monthly_amount) + '/bln × ' + tazkiahSav.months + ' bln';
      const savMax = Math.max(farhanSav ? farhanSav.total_projected : 1, tazkiahSav.total_projected, 1);
      document.getElementById('bar-sav-tazkiah').style.width = (tazkiahSav.total_projected / savMax * 100) + '%';
    }
    document.getElementById('dash-sav-combined').textContent = formatRpShort(
      (farhanSav ? farhanSav.total_projected : 0) + (tazkiahSav ? tazkiahSav.total_projected : 0)
    );

    // Savings projection chart (dashboard)
    renderDashSavingsChart(farhanSav, tazkiahSav);

    // Fund sources
    const farhanFunds = funds.filter(f => f.owner === 'farhan');
    const tazkiahFunds = funds.filter(f => f.owner === 'tazkiah');
    document.getElementById('dash-farhan-funds').innerHTML = farhanFunds.length
      ? farhanFunds.map(f => `<div class="flex items-center justify-between text-sm"><span class="text-ink-secondary">${f.source_name}</span><span class="font-medium">${formatRpShort(f.amount)}</span></div>`).join('')
      : '<div class="text-xs text-ink-tertiary">Belum ada data</div>';
    document.getElementById('dash-tazkiah-funds').innerHTML = tazkiahFunds.length
      ? tazkiahFunds.map(f => `<div class="flex items-center justify-between text-sm"><span class="text-ink-secondary">${f.source_name}</span><span class="font-medium">${formatRpShort(f.amount)}</span></div>`).join('')
      : '<div class="text-xs text-ink-tertiary">Belum ada data</div>';

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function renderPieChart(breakdown) {
  const ctx = document.getElementById('budgetPieChart').getContext('2d');
  if (pieChart) pieChart.destroy();

  const mutedAccents = [
    ACCENT, '#8B7355', '#A69080', '#7A8B7A',
    '#8B8B9E', '#9E8B7A', '#6B8B8B', '#8B6B7A',
    '#7A7A8B', '#8B7A6B', '#6B7A8B'
  ];

  const labels = breakdown.map(b => CATEGORY_LABELS[b.category] || b.category.replace(/_/g, ' '));
  const values = breakdown.map(b => b.amount_budget);
  const bgColors = breakdown.map((_, i) => mutedAccents[i % mutedAccents.length]);

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: isDark() ? '#1A1A1A' : '#FFFFFF',
        hoverBorderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '55%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const val = ctx.raw;
              const total = values.reduce((a, b) => a + b, 0);
              const pct = ((val / total) * 100).toFixed(1);
              return ctx.label + ': ' + formatRpShort(val) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });

  // Custom legend
  document.getElementById('budget-legend').innerHTML = breakdown.map((b, i) => {
    const name = CATEGORY_LABELS[b.category] || b.category.replace(/_/g, ' ');
    const total = values.reduce((a, b) => a + b, 0);
    const pct = ((b.amount_budget / total) * 100).toFixed(1);
    return `<div class="flex items-center gap-2 text-xs">
      <span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${bgColors[i]}"></span>
      <span class="flex-1 text-ink-secondary truncate">${name}</span>
      <span class="font-medium tabular-nums">${formatRpShort(b.amount_budget)}</span>
      <span class="text-ink-tertiary tabular-nums" style="width:36px;text-align:right">${pct}%</span>
    </div>`;
  }).join('');
}

function renderBudgetBreakdown(breakdown) {
  const el = document.getElementById('budget-breakdown-list');
  el.innerHTML = breakdown.map(b => {
    const name = CATEGORY_LABELS[b.category] || b.category.replace(/_/g, ' ');
    const subs = BUDGET_SUBITEMS[b.category];
    const hasSubs = subs && subs.length > 0;
    const ownerBadge = b.owner === 'farhan'
      ? '<span class="badge badge-farhan">Farhan</span>'
      : '<span class="badge badge-tazkiah">Tazkiah</span>';

    if (hasSubs) {
      const subHtml = subs.map(s =>
        `<div class="sub-item"><span>${s.name}</span><span class="tabular-nums font-medium">${formatRpShort(s.amount)}</span></div>`
      ).join('');
      return `<details class="budget-item">
        <summary style="padding: 0.625rem 1rem;">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <svg class="chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4l4 4-4 4"/></svg>
            <span class="font-medium text-sm truncate">${name}</span>
            ${ownerBadge}
          </div>
          <span class="font-heading font-semibold text-sm tabular-nums ml-2 flex-shrink-0">${formatRpShort(b.amount_budget)}</span>
        </summary>
        <div style="padding: 0 1rem 0.5rem 2.25rem;">${subHtml}</div>
      </details>`;
    } else {
      return `<div class="budget-item" style="padding: 0.625rem 1rem;">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span style="width:16px;"></span>
            <span class="font-medium text-sm">${name}</span>
            ${ownerBadge}
          </div>
          <span class="font-heading font-semibold text-sm tabular-nums">${formatRpShort(b.amount_budget)}</span>
        </div>
      </div>`;
    }
  }).join('');
}

function renderGuestBarChart(guests) {
  const ctx = document.getElementById('guestBarChart').getContext('2d');
  if (guestChart) guestChart.destroy();

  const filtered = guests.filter(g => g.total_pax > 0);
  const labels = filtered.map(g => g.category);
  const paxData = filtered.map(g => g.total_pax);
  const colors = filtered.map(g => g.owner === 'farhan' ? ACCENT : '#8B8B9E');

  guestChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Pax',
        data: paxData,
        backgroundColor: colors,
        borderRadius: 3,
        barThickness: 24
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ctx.raw + ' pax' }
        }
      },
      scales: {
        x: { ticks: { color: chartTextColor(), font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: chartTextColor(), font: { size: 10 } }, grid: { color: chartGridColor() }, beginAtZero: true }
      }
    }
  });
}

function renderDashSavingsChart(farhanSav, tazkiahSav) {
  const ctx = document.getElementById('savingsChart').getContext('2d');
  if (dashSavingsChart) dashSavingsChart.destroy();
  renderSavingsProjectionChart(ctx, farhanSav, tazkiahSav);
}

// ============ COUNTDOWN ============
function updateCountdown(weddingDate) {
  const target = new Date(weddingDate + 'T08:00:00+07:00');
  function tick() {
    const now = new Date();
    const diff = target - now;
    const el = document.getElementById('countdown-text');
    if (diff <= 0) {
      el.textContent = 'Hari Bahagia!';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = d + 'h ' + h + 'j ' + m + 'm';
    requestAnimationFrame(() => setTimeout(tick, 1000));
  }
  tick();
}

// ============ GUESTS ============
async function loadGuests() {
  try {
    const [guestsRes, capacityRes] = await Promise.all([
      fetch(API + '/api/guests'),
      fetch(API + '/api/guest-capacity')
    ]);
    const guests = await guestsRes.json();
    const capacity = await capacityRes.json();

    let totalPax = 0, totalUnd = 0, totalCetak = 0, totalVip = 0;
    guests.forEach(g => { totalPax += g.total_pax; totalUnd += g.total_undangan; totalCetak += g.cetak; totalVip += g.vip; });
    document.getElementById('guest-total-pax').textContent = totalPax;
    document.getElementById('guest-total-undangan').textContent = totalUnd;
    document.getElementById('guest-total-cetak').textContent = totalCetak;
    document.getElementById('guest-total-vip').textContent = totalVip;

    let availPax = 0, availUnd = 0, availCetak = 0, availVip = 0;
    capacity.forEach(c => { availPax += c.tersedia_pax; availUnd += c.tersedia_undangan; availCetak += c.tersedia_cetak; availVip += c.tersedia_vip; });
    document.getElementById('guest-avail-pax').textContent = availPax;
    document.getElementById('guest-avail-undangan').textContent = availUnd;
    document.getElementById('guest-avail-cetak').textContent = availCetak;
    document.getElementById('guest-avail-vip').textContent = availVip;

    renderCapacityBars(capacity);

    const tbody = document.getElementById('guest-table-body');
    tbody.innerHTML = guests.map(g => `<tr>
      <td class="font-medium">${g.category}</td>
      <td><span class="badge ${g.owner === 'farhan' ? 'badge-farhan' : 'badge-tazkiah'}">${g.owner === 'farhan' ? 'Farhan' : 'Tazkiah'}</span></td>
      <td class="text-right tabular-nums">${g.total_pax}</td>
      <td class="text-right tabular-nums">${g.total_undangan}</td>
      <td class="text-right tabular-nums">${g.cetak}</td>
      <td class="text-right tabular-nums">${g.vip}</td>
      <td class="text-center">
        <button onclick="editGuest(${g.id})" class="text-accent hover:underline text-xs mr-2" style="color:#C17E61">Edit</button>
        <button onclick="deleteGuest(${g.id})" class="text-red-500 hover:underline text-xs">Hapus</button>
      </td>
    </tr>`).join('');
  } catch (err) { console.error('Guests load error:', err); }
}

function renderCapacityBars(capacity) {
  const types = ['pax', 'undangan', 'cetak', 'vip'];
  const labels = { pax: 'Pax', undangan: 'Undangan', cetak: 'Cetak', vip: 'VIP' };
  ['farhan', 'tazkiah'].forEach(owner => {
    const cap = capacity.find(c => c.owner === owner);
    const container = document.getElementById(owner + '-capacity-bars');
    if (!cap || !container) return;
    container.innerHTML = types.map(type => {
      const avail = cap['tersedia_' + type];
      const sisa = cap['sisa_' + type];
      const used = avail - sisa;
      const pct = avail > 0 ? (used / avail) * 100 : 0;
      return `<div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-ink-secondary">${labels[type]}</span>
          <span class="text-ink-tertiary tabular-nums">${used} / ${avail} (sisa: ${sisa})</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${Math.min(100, pct)}%"></div>
        </div>
      </div>`;
    }).join('');
  });
}

function openGuestModal(guest = null) {
  document.getElementById('guest-modal').classList.add('show');
  document.getElementById('guest-modal-title').textContent = guest ? 'Edit Kategori Tamu' : 'Tambah Kategori Tamu';
  document.getElementById('guest-edit-id').value = guest ? guest.id : '';
  document.getElementById('guest-cat').value = guest ? guest.category : '';
  document.getElementById('guest-owner').value = guest ? guest.owner : 'farhan';
  document.getElementById('guest-pax').value = guest ? guest.total_pax : 0;
  document.getElementById('guest-undangan').value = guest ? guest.total_undangan : 0;
  document.getElementById('guest-cetak').value = guest ? guest.cetak : 0;
  document.getElementById('guest-vip').value = guest ? guest.vip : 0;
}
function closeGuestModal() { document.getElementById('guest-modal').classList.remove('show'); }

async function editGuest(id) {
  const res = await fetch(API + '/api/guests');
  const guests = await res.json();
  const g = guests.find(x => x.id === id);
  if (g) openGuestModal(g);
}

async function saveGuest() {
  const id = document.getElementById('guest-edit-id').value;
  const data = {
    category: document.getElementById('guest-cat').value,
    owner: document.getElementById('guest-owner').value,
    total_pax: parseInt(document.getElementById('guest-pax').value) || 0,
    total_undangan: parseInt(document.getElementById('guest-undangan').value) || 0,
    cetak: parseInt(document.getElementById('guest-cetak').value) || 0,
    vip: parseInt(document.getElementById('guest-vip').value) || 0
  };
  try {
    if (id) await fetch(API + '/api/guests/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    else await fetch(API + '/api/guests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    closeGuestModal();
    loadGuests();
    showToast(id ? 'Tamu diperbarui!' : 'Tamu ditambahkan!');
  } catch (err) { showToast('Error: ' + err.message); }
}

async function deleteGuest(id) {
  if (!confirm('Hapus kategori tamu ini?')) return;
  try { await fetch(API + '/api/guests/' + id, { method: 'DELETE' }); loadGuests(); showToast('Tamu dihapus!'); }
  catch (err) { showToast('Error: ' + err.message); }
}

// ============ BUDGET TAB ============
let compareChart = null;

async function loadBudget() {
  try {
    const res = await fetch(API + '/api/budget');
    const budgets = await res.json();
    let farhanTotal = 0, farhanActual = 0, tazkiahTotal = 0, tazkiahActual = 0;
    budgets.forEach(b => {
      if (b.owner === 'farhan') { farhanTotal += b.amount_budget; farhanActual += b.amount_actual; }
      else { tazkiahTotal += b.amount_budget; tazkiahActual += b.amount_actual; }
    });
    document.getElementById('bgt-farhan-total').textContent = formatRpShort(farhanTotal);
    document.getElementById('bgt-farhan-actual').textContent = formatRpShort(farhanActual);
    document.getElementById('bgt-farhan-remain').textContent = formatRpShort(farhanTotal - farhanActual);
    document.getElementById('bgt-tazkiah-total').textContent = formatRpShort(tazkiahTotal);
    document.getElementById('bgt-tazkiah-actual').textContent = formatRpShort(tazkiahActual);
    document.getElementById('bgt-tazkiah-remain').textContent = formatRpShort(tazkiahTotal - tazkiahActual);

    renderCompareChart(budgets);

    const tbody = document.getElementById('budget-table-body');
    tbody.innerHTML = budgets.map(b => {
      const sisa = b.amount_budget - b.amount_actual;
      const pct = b.amount_budget > 0 ? ((b.amount_actual / b.amount_budget) * 100).toFixed(0) : 0;
      return `<tr>
        <td class="font-medium">${CATEGORY_LABELS[b.category] || b.category.replace(/_/g, ' ')}</td>
        <td><span class="badge ${b.owner === 'farhan' ? 'badge-farhan' : 'badge-tazkiah'}">${b.owner === 'farhan' ? 'Farhan' : 'Tazkiah'}</span></td>
        <td class="text-right tabular-nums">${formatRpShort(b.amount_budget)}</td>
        <td class="text-right"><div class="tabular-nums">${formatRpShort(b.amount_actual)}</div><div class="text-xs text-ink-tertiary">${pct}%</div></td>
        <td class="text-right tabular-nums ${sisa >= 0 ? 'text-green-600' : 'text-red-500'}">${formatRpShort(sisa)}</td>
        <td class="text-center">
          <button onclick="editBudgetItem(${b.id})" class="text-xs mr-2 hover:underline" style="color:#C17E61">Edit</button>
          <button onclick="deleteBudgetItem(${b.id})" class="text-red-500 text-xs hover:underline">Hapus</button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) { console.error('Budget load error:', err); }
}

function renderCompareChart(budgets) {
  const ctx = document.getElementById('budgetCompareChart').getContext('2d');
  if (compareChart) compareChart.destroy();
  const labels = budgets.map(b => CATEGORY_LABELS[b.category] || b.category.replace(/_/g, ' '));
  compareChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Budget', data: budgets.map(b => b.amount_budget), backgroundColor: ACCENT, borderRadius: 3, barThickness: 20 },
        { label: 'Actual', data: budgets.map(b => b.amount_actual), backgroundColor: chartGridColor(), borderRadius: 3, barThickness: 20 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatRpShort(ctx.raw) } } },
      scales: {
        x: { ticks: { color: chartTextColor(), font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: chartTextColor(), callback: v => formatRpShort(v) }, grid: { color: chartGridColor() } }
      }
    }
  });
}

function openBudgetModal(budget = null) {
  document.getElementById('budget-modal').classList.add('show');
  document.getElementById('budget-modal-title').textContent = budget ? 'Edit Budget' : 'Tambah Budget';
  document.getElementById('budget-edit-id').value = budget ? budget.id : '';
  document.getElementById('budget-cat').value = budget ? budget.category : '';
  document.getElementById('budget-owner').value = budget ? budget.owner : 'farhan';
  document.getElementById('budget-amount').value = budget ? budget.amount_budget : 0;
  document.getElementById('budget-actual').value = budget ? budget.amount_actual : 0;
  document.getElementById('budget-desc').value = budget ? (budget.description || '') : '';
}
function closeBudgetModal() { document.getElementById('budget-modal').classList.remove('show'); }

async function editBudgetItem(id) {
  const res = await fetch(API + '/api/budget');
  const budgets = await res.json();
  const b = budgets.find(x => x.id === id);
  if (b) openBudgetModal(b);
}

async function saveBudget() {
  const id = document.getElementById('budget-edit-id').value;
  const data = {
    category: document.getElementById('budget-cat').value,
    owner: document.getElementById('budget-owner').value,
    amount_budget: parseInt(document.getElementById('budget-amount').value) || 0,
    amount_actual: parseInt(document.getElementById('budget-actual').value) || 0,
    description: document.getElementById('budget-desc').value
  };
  try {
    if (id) await fetch(API + '/api/budget/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    else await fetch(API + '/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    closeBudgetModal(); loadBudget();
    showToast(id ? 'Budget diperbarui!' : 'Budget ditambahkan!');
  } catch (err) { showToast('Error: ' + err.message); }
}

async function deleteBudgetItem(id) {
  if (!confirm('Hapus budget ini?')) return;
  try { await fetch(API + '/api/budget/' + id, { method: 'DELETE' }); loadBudget(); showToast('Budget dihapus!'); }
  catch (err) { showToast('Error: ' + err.message); }
}

// ============ SAVINGS TAB ============
let savingsChartFull = null;

async function loadSavings() {
  try {
    const [savingsRes, fundsRes] = await Promise.all([fetch(API + '/api/savings'), fetch(API + '/api/funds')]);
    const savings = await savingsRes.json();
    const funds = await fundsRes.json();

    savings.forEach(s => {
      document.getElementById('sav-' + s.owner + '-monthly').textContent = formatRp(s.monthly_amount) + '/bulan';
      document.getElementById('sav-' + s.owner + '-months').textContent = s.months + ' bulan';
      document.getElementById('sav-' + s.owner + '-total').textContent = formatRp(s.total_projected);
    });

    const farhanSav = savings.find(s => s.owner === 'farhan');
    const tazkiahSav = savings.find(s => s.owner === 'tazkiah');

    // Full savings chart
    const ctx = document.getElementById('savingsChartFull').getContext('2d');
    if (savingsChartFull) savingsChartFull.destroy();
    renderSavingsProjectionChart(ctx, farhanSav, tazkiahSav);

    // Fund sources
    const farhanFunds = funds.filter(f => f.owner === 'farhan');
    const tazkiahFunds = funds.filter(f => f.owner === 'tazkiah');

    document.getElementById('farhan-funds-list').innerHTML = farhanFunds.length
      ? farhanFunds.map(f => `<div class="flex items-center justify-between section-card" style="padding:0.5rem 0.75rem;">
          <span class="text-sm">${f.source_name}</span>
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm tabular-nums">${formatRpShort(f.amount)}</span>
            <button onclick="editFund(${f.id})" class="text-xs hover:underline" style="color:#C17E61">Edit</button>
            <button onclick="deleteFund(${f.id})" class="text-red-500 text-xs hover:underline">Hapus</button>
          </div>
        </div>`).join('')
      : '<p class="text-ink-tertiary text-xs">Belum ada data</p>';

    document.getElementById('tazkiah-funds-list').innerHTML = tazkiahFunds.length
      ? tazkiahFunds.map(f => `<div class="flex items-center justify-between section-card" style="padding:0.5rem 0.75rem;">
          <span class="text-sm">${f.source_name}</span>
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm tabular-nums">${formatRpShort(f.amount)}</span>
            <button onclick="editFund(${f.id})" class="text-xs hover:underline" style="color:#C17E61">Edit</button>
            <button onclick="deleteFund(${f.id})" class="text-red-500 text-xs hover:underline">Hapus</button>
          </div>
        </div>`).join('')
      : '<p class="text-ink-tertiary text-xs">Belum ada data</p>';
  } catch (err) { console.error('Savings load error:', err); }
}

function renderSavingsProjectionChart(ctx, farhanSav, tazkiahSav) {
  const months = 8;
  const labels = Array.from({ length: months + 1 }, (_, i) => 'Bulan ' + i);
  const farhanData = Array.from({ length: months + 1 }, (_, i) => (farhanSav ? farhanSav.monthly_amount * i : 0));
  const tazkiahData = Array.from({ length: months + 1 }, (_, i) => (tazkiahSav ? tazkiahSav.monthly_amount * i : 0));
  const combinedData = farhanData.map((v, i) => v + tazkiahData[i]);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Farhan', data: farhanData, borderColor: ACCENT, backgroundColor: ACCENT_MUTED, fill: false, tension: 0.2, pointRadius: 2, borderWidth: 2 },
        { label: 'Tazkiah', data: tazkiahData, borderColor: '#8B8B9E', backgroundColor: 'rgba(139,139,158,0.1)', fill: false, tension: 0.2, pointRadius: 2, borderWidth: 2 },
        { label: 'Combined', data: combinedData, borderColor: '#555555', backgroundColor: 'transparent', fill: false, tension: 0.2, pointRadius: 2, borderWidth: 1.5, borderDash: [5, 3] }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatRp(ctx.raw) } } },
      scales: {
        x: { ticks: { color: chartTextColor(), font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: chartTextColor(), callback: v => formatRpShort(v) }, grid: { color: chartGridColor() } }
      }
    }
  });
}

function editSavings(owner) {
  fetch(API + '/api/savings').then(r => r.json()).then(savings => {
    const s = savings.find(x => x.owner === owner);
    if (!s) return;
    document.getElementById('savings-modal').classList.add('show');
    document.getElementById('savings-modal-title').textContent = 'Edit Tabungan ' + (owner === 'farhan' ? 'Farhan' : 'Tazkiah');
    document.getElementById('savings-owner').value = owner;
    document.getElementById('savings-monthly').value = s.monthly_amount;
    document.getElementById('savings-months').value = s.months;
    updateSavingsProjected();
  });
}

function updateSavingsProjected() {
  const m = parseInt(document.getElementById('savings-monthly').value) || 0;
  const n = parseInt(document.getElementById('savings-months').value) || 0;
  document.getElementById('savings-projected').textContent = formatRp(m * n);
}

document.getElementById('savings-monthly').addEventListener('input', updateSavingsProjected);
document.getElementById('savings-months').addEventListener('input', updateSavingsProjected);
function closeSavingsModal() { document.getElementById('savings-modal').classList.remove('show'); }

async function saveSavings() {
  const owner = document.getElementById('savings-owner').value;
  const data = { monthly_amount: parseInt(document.getElementById('savings-monthly').value) || 0, months: parseInt(document.getElementById('savings-months').value) || 0 };
  try {
    await fetch(API + '/api/savings/' + owner, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    closeSavingsModal(); loadSavings(); showToast('Tabungan diperbarui!');
  } catch (err) { showToast('Error: ' + err.message); }
}

// ============ FUND SOURCES ============
function openFundModal(fund = null) {
  document.getElementById('fund-modal').classList.add('show');
  document.getElementById('fund-modal-title').textContent = fund ? 'Edit Sumber Dana' : 'Tambah Sumber Dana';
  document.getElementById('fund-edit-id').value = fund ? fund.id : '';
  document.getElementById('fund-name').value = fund ? fund.source_name : '';
  document.getElementById('fund-owner').value = fund ? fund.owner : 'farhan';
  document.getElementById('fund-amount').value = fund ? fund.amount : 0;
}
function closeFundModal() { document.getElementById('fund-modal').classList.remove('show'); }

async function editFund(id) {
  const res = await fetch(API + '/api/funds');
  const funds = await res.json();
  const f = funds.find(x => x.id === id);
  if (f) openFundModal(f);
}

async function saveFund() {
  const id = document.getElementById('fund-edit-id').value;
  const data = { source_name: document.getElementById('fund-name').value, owner: document.getElementById('fund-owner').value, amount: parseInt(document.getElementById('fund-amount').value) || 0 };
  try {
    if (id) await fetch(API + '/api/funds/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    else await fetch(API + '/api/funds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    closeFundModal(); loadSavings();
    showToast(id ? 'Sumber dana diperbarui!' : 'Sumber dana ditambahkan!');
  } catch (err) { showToast('Error: ' + err.message); }
}

async function deleteFund(id) {
  if (!confirm('Hapus sumber dana ini?')) return;
  try { await fetch(API + '/api/funds/' + id, { method: 'DELETE' }); loadSavings(); showToast('Sumber dana dihapus!'); }
  catch (err) { showToast('Error: ' + err.message); }
}

// ============ SYNC FUNCTIONS ============
async function checkSyncStatus() {
  try {
    const res = await fetch(API + '/api/sync/status');
    const data = await res.json();
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-status-text');
    if (text) text.classList.remove('hidden');
    if (data.last_sync_guests) {
      dot.className = 'sync-dot connected';
      if (text) text.textContent = 'Synced';
    } else {
      dot.className = 'sync-dot disconnected';
      if (text) text.textContent = 'Not synced';
    }
    if (data.rsvp_stats) updateRSVPWidget(data.rsvp_stats);
  } catch (err) {
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-status-text');
    if (dot) dot.className = 'sync-dot error';
    if (text) text.textContent = 'Offline';
  }
}

function updateRSVPWidget(stats) {
  document.getElementById('rsvp-confirmed').textContent = stats.confirmed || 0;
  document.getElementById('rsvp-pending').textContent = stats.pending || 0;
  document.getElementById('rsvp-checkedin').textContent = stats.checked_in || 0;
  // Not attending = total - confirmed - pending - checked_in
  const total = stats.total || 0;
  const notAttending = Math.max(0, total - (stats.confirmed || 0) - (stats.pending || 0) - (stats.checked_in || 0));
  document.getElementById('rsvp-not-attending').textContent = notAttending;
  renderRSVPChart(stats, notAttending);
}

function renderRSVPChart(stats, notAttending) {
  const ctx = document.getElementById('rsvpPieChart').getContext('2d');
  if (rsvpChart) rsvpChart.destroy();
  const confirmed = stats.confirmed || 0;
  const pending = stats.pending || 0;
  const checkedIn = stats.checked_in || 0;
  if (confirmed + pending + notAttending + checkedIn === 0) return;

  rsvpChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Confirmed', 'Pending', 'Tidak Hadir', 'Checked In'],
      datasets: [{
        data: [confirmed, pending, notAttending, checkedIn],
        backgroundColor: ['#10B981', '#D97706', '#9CA3AF', ACCENT],
        borderWidth: 2,
        borderColor: isDark() ? '#1A1A1A' : '#FFFFFF'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '50%',
      plugins: { legend: { display: false } }
    }
  });
}

async function refreshRSVPStats() {
  try {
    showToast('Refreshing RSVP data...');
    const res = await fetch(API + '/api/sync/rsvp');
    const data = await res.json();
    if (data.success) { updateRSVPWidget(data.stats); showToast('RSVP data refreshed!'); }
  } catch (err) { showToast('Error: ' + err.message); }
}

async function syncGuestsToUndangan() {
  const btn = document.getElementById('sync-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
  try {
    showToast('Syncing guests to Undangan...');
    const res = await fetch(API + '/api/sync/guests', { method: 'POST' });
    const data = await res.json();
    if (data.success) { showToast('Synced ' + (data.count || 0) + ' guests!'); showSyncResults(data); }
    else showToast('Sync failed: ' + (data.error || 'Unknown error'));
  } catch (err) { showToast('Error: ' + err.message); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Sync ke Undangan'; } }
}

async function syncRSVP() {
  try {
    showToast('Fetching RSVP data...');
    const res = await fetch(API + '/api/sync/rsvp');
    const data = await res.json();
    if (data.success) { updateRSVPWidget(data.stats); showSyncResults({ stats: data.stats, type: 'rsvp' }); showToast('RSVP data synced!'); }
    else showToast('Sync failed: ' + (data.error || 'Unknown error'));
  } catch (err) { showToast('Error: ' + err.message); }
}

async function syncCheckin() {
  try {
    showToast('Fetching check-in data...');
    const res = await fetch(API + '/api/sync/checkin');
    const data = await res.json();
    if (data.success !== false) { showCheckinList(data); showToast((data.total_checked_in || 0) + ' guests checked in!'); }
    else showToast('Sync failed: ' + (data.error || 'Unknown error'));
  } catch (err) { showToast('Error: ' + err.message); }
}

async function syncBudgetImpact() {
  try {
    showToast('Calculating budget impact...');
    const res = await fetch(API + '/api/sync/budget-impact');
    const data = await res.json();
    if (data.success) { showBudgetImpact(data.impact); showToast('Budget impact calculated!'); }
    else showToast('Error: ' + (data.error || 'Unknown error'));
  } catch (err) { showToast('Error: ' + err.message); }
}

function showSyncResults(data) {
  const section = document.getElementById('sync-results');
  const content = document.getElementById('sync-results-content');
  if (!section || !content) return;
  section.classList.remove('hidden');
  if (data.type === 'rsvp') {
    content.innerHTML = '<strong>RSVP Statistics:</strong>\n' +
      'Total Guests: ' + data.stats.total + '\nConfirmed: ' + data.stats.confirmed +
      '\nPending: ' + data.stats.pending + '\nChecked In: ' + data.stats.checked_in +
      '\nTotal Pax Confirmed: ' + data.stats.total_pax_confirmed;
  } else if (data.links) {
    let html = '<strong>Synced ' + data.count + ' guests!</strong>\n\nInvitation Links:\n';
    data.links.slice(0, 20).forEach((l, i) => { html += (i + 1) + '. ' + l.name + ' → ' + l.link + '\n'; });
    if (data.links.length > 20) html += '\n... and ' + (data.links.length - 20) + ' more';
    content.innerHTML = html;
  } else { content.innerHTML = JSON.stringify(data, null, 2); }
}

function showCheckinList(data) {
  const section = document.getElementById('checkin-list-section');
  const tbody = document.getElementById('checkin-table-body');
  if (!section || !tbody) return;
  section.classList.remove('hidden');
  tbody.innerHTML = '';
  if (!data.guests || data.guests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-ink-tertiary py-4">Belum ada tamu yang hadir</td></tr>';
    return;
  }
  data.guests.forEach(g => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${g.name}</td><td class="font-mono text-xs">${g.qr_code}</td><td>${g.arrival_time || '—'}</td><td class="text-right tabular-nums">${g.attendance_count || 1}</td><td class="text-center">${g.is_vip ? '★' : ''}</td>`;
    tbody.appendChild(tr);
  });
}

function showBudgetImpact(impact) {
  const section = document.getElementById('budget-impact-section');
  const content = document.getElementById('budget-impact-content');
  if (!section || !content) return;
  section.classList.remove('hidden');
  const ci = impact.catering_impact;
  const bs = impact.budget_summary;
  const gb = impact.guest_breakdown;
  content.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div class="section-card" style="padding:0.75rem;">
      <div class="text-xs font-semibold uppercase tracking-wide mb-2" style="color:#C17E61">Budget Summary</div>
      <div class="space-y-1 text-xs">
        <div class="metric-row"><span class="metric-row-label">Total Budget</span><span class="metric-row-value">${formatRp(bs.total_budget)}</span></div>
        <div class="metric-row"><span class="metric-row-label">Total Actual</span><span class="metric-row-value">${formatRp(bs.total_actual)}</span></div>
        <div class="metric-row"><span class="metric-row-label">Remaining</span><span class="font-semibold ${bs.remaining >= 0 ? 'text-green-600' : 'text-red-500'}">${formatRp(bs.remaining)}</span></div>
      </div>
    </div>
    <div class="section-card" style="padding:0.75rem;">
      <div class="text-xs font-semibold uppercase tracking-wide text-ink-secondary mb-2">Catering Impact</div>
      <div class="space-y-1 text-xs">
        <div class="metric-row"><span class="metric-row-label">Confirmed Pax</span><span class="metric-row-value">${ci.confirmed_pax}</span></div>
        <div class="metric-row"><span class="metric-row-label">Cost/Pax</span><span class="metric-row-value">${formatRp(ci.cost_per_pax)}</span></div>
        <div class="metric-row"><span class="metric-row-label">Estimated Cost</span><span class="font-semibold">${formatRp(ci.estimated_cost)}</span></div>
        <div class="metric-row"><span class="metric-row-label">Difference</span><span class="font-semibold ${ci.catering_difference >= 0 ? 'text-green-600' : 'text-red-500'}">${formatRp(ci.catering_difference)}</span></div>
      </div>
    </div>
    <div class="section-card sm:col-span-2" style="padding:0.75rem;">
      <div class="text-xs font-semibold uppercase tracking-wide text-ink-secondary mb-2">Guest Breakdown</div>
      <div class="flex gap-4 text-center">
        <div><div class="font-heading font-bold text-lg text-green-600">${gb.confirmed_guests}</div><div class="text-xs text-ink-tertiary">Confirmed</div></div>
        <div><div class="font-heading font-bold text-lg text-amber-600">${gb.pending_guests}</div><div class="text-xs text-ink-tertiary">Pending</div></div>
        <div><div class="font-heading font-bold text-lg" style="color:#C17E61">${gb.checked_in}</div><div class="text-xs text-ink-tertiary">Checked In</div></div>
      </div>
    </div>
  </div>`;
}

async function loadSyncTab() {
  try {
    const res = await fetch(API + '/api/sync/undangan-health');
    const data = await res.json();
    const dot = document.getElementById('conn-dot');
    const status = document.getElementById('conn-status');
    if (data.connected) { dot.className = 'sync-dot connected'; status.textContent = 'Connected'; status.className = 'text-sm font-medium text-green-600'; }
    else { dot.className = 'sync-dot error'; status.textContent = 'Disconnected'; status.className = 'text-sm font-medium text-red-500'; }
  } catch (err) {
    const dot = document.getElementById('conn-dot');
    const status = document.getElementById('conn-status');
    if (dot) dot.className = 'sync-dot error';
    if (status) { status.textContent = 'Error'; status.className = 'text-sm font-medium text-red-500'; }
  }
  try {
    const res = await fetch(API + '/api/sync/status');
    const data = await res.json();
    document.getElementById('last-guest-sync').textContent = data.last_sync_guests || 'Never';
    document.getElementById('last-rsvp-sync').textContent = data.last_sync_rsvp || 'Never';
    document.getElementById('last-checkin-sync').textContent = data.last_sync_checkin || 'Never';
    if (data.rsvp_stats) updateRSVPWidget(data.rsvp_stats);
  } catch (err) { console.error('Failed to load sync status:', err); }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  checkSyncStatus();
});

// ═══════════════════════════════════════════════════════════════════
// BUDGET SUB-ITEMS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

async function loadSubItems(categoryId) {
  try {
    const res = await fetch(`/api/budget/${categoryId}/subitems`);
    return await res.json();
  } catch (err) {
    console.error('Error loading sub-items:', err);
    return [];
  }
}

async function createSubItem(categoryId, data) {
  try {
    const res = await fetch(`/api/budget/${categoryId}/subitems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('Error creating sub-item:', err);
    throw err;
  }
}

async function updateSubItem(id, data) {
  try {
    const res = await fetch(`/api/budget/subitems/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error('Error updating sub-item:', err);
    throw err;
  }
}

async function deleteSubItem(id) {
  try {
    await fetch(`/api/budget/subitems/${id}`, { method: 'DELETE' });
    return true;
  } catch (err) {
    console.error('Error deleting sub-item:', err);
    return false;
  }
}

// Render sub-items table for a budget category
function renderSubItemsTable(categoryId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  loadSubItems(categoryId).then(items => {
    let html = `
      <div class="mt-3 border border-[#E5E1DA] rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FDFBFB] text-[#8C9A8E] text-xs uppercase tracking-wide">
              <th class="text-left px-4 py-2 font-semibold">Item</th>
              <th class="text-right px-4 py-2 font-semibold">Budget</th>
              <th class="text-right px-4 py-2 font-semibold">Actual</th>
              <th class="text-center px-4 py-2 font-semibold w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>`;
    
    let totalBudget = 0;
    let totalActual = 0;
    
    items.forEach(item => {
      totalBudget += item.amount_budget;
      totalActual += item.amount_actual;
      html += `
        <tr class="border-t border-[#F3F1ED] hover:bg-[#FDFBFB]" data-id="${item.id}">
          <td class="px-4 py-2">
            <input type="text" value="${item.name}" 
              class="w-full bg-transparent border-b border-transparent hover:border-[#E5E1DA] focus:border-[#C17E61] outline-none py-1 text-sm"
              onchange="updateSubItemField(${item.id}, 'name', this.value)" />
          </td>
          <td class="px-4 py-2 text-right">
            <input type="number" value="${item.amount_budget}" 
              class="w-full bg-transparent border-b border-transparent hover:border-[#E5E1DA] focus:border-[#C17E61] outline-none py-1 text-sm text-right"
              onchange="updateSubItemField(${item.id}, 'amount_budget', Number(this.value))" />
          </td>
          <td class="px-4 py-2 text-right">
            <input type="number" value="${item.amount_actual}" 
              class="w-full bg-transparent border-b border-transparent hover:border-[#E5E1DA] focus:border-[#C17E61] outline-none py-1 text-sm text-right"
              onchange="updateSubItemField(${item.id}, 'amount_actual', Number(this.value))" />
          </td>
          <td class="px-4 py-2 text-center">
            <button onclick="handleDeleteSubItem(${item.id}, ${categoryId}, '${containerId}')" 
              class="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50">Hapus</button>
          </td>
        </tr>`;
    });
    
    html += `
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-[#C17E61] bg-[#FDFBFB] font-semibold text-sm">
              <td class="px-4 py-2">Total</td>
              <td class="px-4 py-2 text-right">${formatRp(totalBudget)}</td>
              <td class="px-4 py-2 text-right">${formatRp(totalActual)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button onclick="handleAddSubItem(${categoryId}, '${containerId}')" 
        class="mt-2 text-xs text-[#C17E61] hover:text-[#A96B51] font-semibold px-3 py-1.5 rounded-lg border border-[#C17E61]/30 hover:border-[#C17E61] transition-colors">
        + Tambah Item
      </button>`;
    
    container.innerHTML = html;
  });
}

// Handle field update
window.updateSubItemField = async function(id, field, value) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const nameInput = row.querySelector('input[type="text"]');
  const budgetInput = row.querySelectorAll('input[type="number"]')[0];
  const actualInput = row.querySelectorAll('input[type="number"]')[1];
  
  await updateSubItem(id, {
    name: nameInput.value,
    amount_budget: Number(budgetInput.value),
    amount_actual: Number(actualInput.value)
  });
};

// Handle add sub-item
window.handleAddSubItem = async function(categoryId, containerId) {
  await createSubItem(categoryId, { name: 'Item Baru', amount_budget: 0, amount_actual: 0 });
  renderSubItemsTable(categoryId, containerId);
};

// Handle delete sub-item
window.handleDeleteSubItem = async function(id, categoryId, containerId) {
  if (confirm('Hapus item ini?')) {
    await deleteSubItem(id);
    renderSubItemsTable(categoryId, containerId);
  }
};

// ═══════════════════════════════════════════════════════════════════
// ENHANCED BUDGET TABLE WITH SUB-ITEMS
// ═══════════════════════════════════════════════════════════════════

// Override the renderBudgetTable function to include sub-items
const originalRenderBudgetTable = window.renderBudgetTable;
window.renderBudgetTable = async function() {
  // Call original function first
  if (originalRenderBudgetTable) await originalRenderBudgetTable();
  
  // Now render sub-items for each category
  const container = document.getElementById('budget-subitems-container');
  if (!container) return;
  
  try {
    const res = await fetch('/api/budget');
    const categories = await res.json();
    
    let html = '<div class="section-card"><div class="section-title mb-4">Detail per Kategori (klik untuk expand)</div>';
    
    // Group by owner
    const farhanCategories = categories.filter(c => c.owner === 'farhan');
    const tazkiahCategories = categories.filter(c => c.owner === 'tazkiah');
    
    const renderOwnerSection = (ownerName, cats) => {
      let section = `<div class="mb-4"><div class="text-xs font-semibold uppercase tracking-wide mb-3" style="color:#C17E61">${ownerName}</div>`;
      
      cats.forEach(cat => {
        section += `
          <div class="mb-3 border border-[#E5E1DA] rounded-lg overflow-hidden">
            <button onclick="toggleSubItems(${cat.id})" 
              class="w-full flex items-center justify-between px-4 py-3 bg-[#FDFBFB] hover:bg-[#F3F1ED] transition-colors text-left">
              <div class="flex items-center gap-3">
                <span id="arrow-${cat.id}" class="text-[#8C9A8E] transition-transform text-xs">▶</span>
                <span class="font-semibold text-sm text-ink">${cat.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
              <div class="flex items-center gap-4 text-xs">
                <span class="text-[#8C9A8E]">Budget: <strong class="text-ink">${formatRp(cat.amount_budget)}</strong></span>
                <span class="text-[#8C9A8E]">Actual: <strong class="text-ink">${formatRp(cat.amount_actual)}</strong></span>
              </div>
            </button>
            <div id="subitems-${cat.id}" class="hidden px-4 pb-3">
              <div id="subitems-list-${cat.id}"></div>
            </div>
          </div>`;
      });
      
      section += '</div>';
      return section;
    };
    
    html += renderOwnerSection('Uang Farhan', farhanCategories);
    html += renderOwnerSection('Uang Tazkiah', tazkiahCategories);
    html += '</div>';
    
    container.innerHTML = html;
    
    // Load sub-items for visible categories
    categories.forEach(cat => {
      renderSubItemsTable(cat.id, `subitems-list-${cat.id}`);
    });
    
  } catch (err) {
    console.error('Error rendering sub-items:', err);
  }
};

// Toggle sub-items visibility
window.toggleSubItems = function(categoryId) {
  const el = document.getElementById(`subitems-${categoryId}`);
  const arrow = document.getElementById(`arrow-${categoryId}`);
  if (el) {
    el.classList.toggle('hidden');
    if (arrow) {
      arrow.style.transform = el.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
    }
  }
};
