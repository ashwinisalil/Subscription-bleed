/* ============ AUTH GUARD ============ */
const token = localStorage.getItem("bleed_token");
if (!token) {
  window.location.href = "Login.html";
}

/* ============ CONFIG ============ */
const API_BASE = "http://localhost:4000/api";

/* ============ STATE ============ */
let ALL_SUBSCRIPTIONS = [];
let CURRENT_PAGE = 'home';

const PALETTE = ["#FF6A3D", "#F9A826", "#7F77DD", "#378ADD", "#5DCAA5", "#D4537E", "#1D9E75", "#4285F4"];
function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

const AI_INSIGHTS = [
  {
    tag: "Opportunity",
    headline: "Personalized savings tips",
    sub: "Once you've added a few subscriptions, this space will surface real suggestions based on your spending.",
    icon: "sparkles",
    gradient: "linear-gradient(135deg,#FF6A3D,#F9A826)",
    cta: "Learn more",
  },
];

/* ============ HELPERS ============ */
function formatINR(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatRenewalDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function animateValue(el, target, prefix, duration = 1000) {
  const start = performance.now();
  const from = 0;
  function step(ts) {
    const progress = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = from + (target - from) * eased;
    el.textContent = prefix + Math.round(val).toLocaleString("en-IN");
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ============ AUTHENTICATED FETCH ============ */
async function authFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("bleed_token");
    localStorage.removeItem("bleed_user");
    window.location.href = "Login.html";
    throw new Error("Session expired");
  }

  return res;
}

/* ============ NAVBAR + CURRENT USER ============ */
function initNavbar() {
  const navItems = document.querySelectorAll(".nav-item, .mobile-nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const key = item.dataset.nav;
      switchPage(key);
      
      // Update active states
      document.querySelectorAll(`[data-nav]`).forEach((el) => {
        el.classList.toggle("active", el.dataset.nav === key);
      });
      
      document.getElementById("mobileNav").classList.remove("open");
    });
  });

  const profileWrap = document.getElementById("profileWrap");
  const profileBtn = document.getElementById("profileBtn");
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    profileWrap.classList.toggle("open");
  });
  document.addEventListener("click", () => profileWrap.classList.remove("open"));

  const mobileToggle = document.getElementById("mobileToggle");
  const mobileNav = document.getElementById("mobileNav");
  mobileToggle.addEventListener("click", () => {
    mobileNav.classList.toggle("open");
  });

  const logoutBtn = document.querySelector(".profile-menu-item.danger");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("bleed_token");
      localStorage.removeItem("bleed_user");
      window.location.href = "Login.html";
    });
  }
}

function loadCurrentUser() {
  const user = JSON.parse(localStorage.getItem("bleed_user") || "null");
  if (!user) return;
  const displayName = user.name || user.email.split("@")[0];
  document.querySelectorAll(".p-name").forEach((el) => (el.textContent = displayName));
  document.querySelectorAll(".p-email").forEach((el) => (el.textContent = user.email));
  document.querySelectorAll(".welcome-title").forEach((el) => {
    el.innerHTML = `Welcome back, ${displayName} <span class="wave">👋</span>`;
  });
  const avatar = document.querySelector(".avatar");
  if (avatar) avatar.textContent = displayName.slice(0, 2).toUpperCase();
}

/* ============ PAGE SWITCHING ============ */
function switchPage(pageName) {
  CURRENT_PAGE = pageName;
  
  // Hide all sections
  document.getElementById("homeSection")?.classList.add("hidden");
  document.getElementById("vaultSection")?.classList.add("hidden");
  document.getElementById("statsSection")?.classList.add("hidden");
  
  // Show selected section
  const section = document.getElementById(`${pageName}Section`);
  if (section) {
    section.classList.remove("hidden");
    
    // Trigger section-specific rendering
    if (pageName === "vault") {
      renderVault();
    } else if (pageName === "stats") {
      renderStats();
    }
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============ HOME PAGE (EXISTING) ============ */
async function loadSubscriptions() {
  try {
    const res = await authFetch("/subscriptions");
    const data = await res.json();
    ALL_SUBSCRIPTIONS = data.subscriptions || [];
  } catch (err) {
    console.error("Failed to load subscriptions:", err);
    ALL_SUBSCRIPTIONS = [];
  }
  renderEverything();
}

function getActiveSubs() {
  return ALL_SUBSCRIPTIONS.filter((s) => s.status === "Active");
}

function renderEverything() {
  renderKpis();
  renderMySubsTable();
  renderCategories();
  renderRenewals();
  renderInsights();
  if (window.lucide) lucide.createIcons();
}

/* KPI Cards */
function renderKpis() {
  const active = getActiveSubs();
  const monthly = active.reduce((sum, s) => sum + s.price, 0);
  const yearly = monthly * 12;
  const cancelled = ALL_SUBSCRIPTIONS.filter((s) => s.status === "Cancelled");
  const saved = cancelled.reduce((sum, s) => sum + s.price, 0);

  const kpiValues = document.querySelectorAll(".kpi-value");
  if (kpiValues[0]) animateValue(kpiValues[0], monthly, "₹");
  if (kpiValues[1]) animateValue(kpiValues[1], yearly, "₹");
  if (kpiValues[2]) animateValue(kpiValues[2], saved, "₹");

  const budget = 5000;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - (monthly / budget) * 100 + 50)));
  initHealthRing(Math.min(100, healthScore));

  const fill = document.getElementById("budgetFill");
  if (fill) fill.style.width = Math.min(100, (monthly / budget) * 100) + "%";
}

function initHealthRing(score) {
  const ringFg = document.getElementById("ringFg");
  const ringValue = document.getElementById("ringValue");
  const ringCaption = document.getElementById("ringCaption");
  if (!ringFg) return;
  const circumference = 2 * Math.PI * 50;
  ringFg.style.strokeDasharray = circumference;
  ringFg.style.strokeDashoffset = circumference;

  let color = "#5DCAA5", label = "Excellent";
  if (score < 40) { color = "#E24B4A"; label = "Critical"; }
  else if (score < 70) { color = "#F9A826"; label = "Moderate"; }
  ringFg.style.stroke = color;
  if (ringCaption) ringCaption.textContent = `Budget health · ${label}`;

  const start = performance.now();
  function step(ts) {
    const progress = Math.min((ts - start) / 1200, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = score * eased;
    ringValue.textContent = Math.round(val) + "%";
    ringFg.style.strokeDashoffset = circumference - (val / 100) * circumference;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* My Subscriptions Table */
function renderMySubsTable() {
  const countEl = document.getElementById("mysubsCount");
  const table = document.getElementById("mysubsTable");
  const emptyState = document.getElementById("mysubsEmpty");
  const body = document.getElementById("mysubsBody");

  if (!countEl) return;
  countEl.textContent = `${ALL_SUBSCRIPTIONS.length} service${ALL_SUBSCRIPTIONS.length === 1 ? "" : "s"} tracked`;

  if (ALL_SUBSCRIPTIONS.length === 0) {
    if(table) table.style.display = "none";
    if(emptyState) emptyState.style.display = "flex";
    return;
  }
  if(table) table.style.display = "table";
  if(emptyState) emptyState.style.display = "none";

  body.innerHTML = ALL_SUBSCRIPTIONS.map((s) => {
    const color = colorFor(s.name);
    const initial = s.name.charAt(0).toUpperCase();
    return `
      <tr>
        <td>
          <div class="subs-svc-cell">
            <div class="subs-logo" style="background:${color}22;color:${color};border:1px solid ${color}40;">${initial}</div>
            <span>${escapeHtml(s.name)}</span>
          </div>
        </td>
        <td>${escapeHtml(s.category)}</td>
        <td>${formatINR(s.price)}</td>
        <td>${formatRenewalDate(s.renewal_date)}</td>
        <td><span class="subs-status-badge ${s.status.toLowerCase()}">${s.status}</span></td>
        <td class="right">
          <div class="row-actions">
            <button data-edit="${s.id}" aria-label="Edit"><i data-lucide="pencil"></i></button>
            <button data-delete="${s.id}" class="danger" aria-label="Delete"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(Number(btn.dataset.edit)));
  });
  body.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteSubscription(Number(btn.dataset.delete)));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* Categories */
function renderCategories() {
  const donut = document.getElementById("donutChart");
  const listWrap = document.getElementById("categoryList");
  const totalEl = document.getElementById("donutTotal");
  if (!donut) return;

  const active = getActiveSubs();
  const totals = {};
  active.forEach((s) => {
    totals[s.category] = (totals[s.category] || 0) + s.price;
  });
  const categories = Object.entries(totals).map(([name, amount]) => ({
    name, amount, color: colorFor(name),
  }));

  const total = categories.reduce((a, b) => a + b.amount, 0);
  if(totalEl) totalEl.textContent = formatINR(total);

  if (categories.length === 0) {
    donut.style.background = "rgba(255,255,255,0.06)";
    if(listWrap) listWrap.innerHTML = `<p class="card-sub">Add a subscription to see this chart fill in.</p>`;
    const topCat = document.getElementById("topCategory");
    if(topCat) topCat.style.display = "none";
    return;
  }
  const topCat = document.getElementById("topCategory");
  if(topCat) topCat.style.display = "block";

  let angleAcc = 0;
  const stops = categories.map((c) => {
    const startAngle = angleAcc;
    angleAcc += (c.amount / total) * 360;
    return `${c.color} ${startAngle}deg ${angleAcc}deg`;
  }).join(", ");
  donut.style.background = `conic-gradient(rgba(255,255,255,0.06) 0deg 360deg)`;
  requestAnimationFrame(() => {
    setTimeout(() => { donut.style.background = `conic-gradient(${stops})`; }, 100);
  });

  if(listWrap) {
    listWrap.innerHTML = categories.map((c) => {
      const pct = Math.round((c.amount / total) * 100);
      return `
        <div class="category-item">
          <div class="cat-icon" style="background:${c.color}1f;border:1px solid ${c.color}40;">
            <i data-lucide="tag" style="color:${c.color}"></i>
          </div>
          <span class="cat-name">${escapeHtml(c.name)}</span>
          <span class="cat-amount">${formatINR(c.amount)}</span>
          <span class="cat-pct">${pct}%</span>
        </div>
      `;
    }).join("");
  }

  const top = [...categories].sort((a, b) => b.amount - a.amount)[0];
  document.getElementById("topCatName").textContent = top.name;
  document.getElementById("topCatAmount").textContent = `${formatINR(top.amount)}/month`;
}

/* Critical Renewals */
function renderRenewals() {
  const grid = document.getElementById("renewalsGrid");
  if (!grid) return;

  const upcoming = getActiveSubs()
    .map((s) => ({ ...s, daysLeft: daysUntil(s.renewal_date) }))
    .filter((s) => s.daysLeft >= 0 && s.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (upcoming.length === 0) {
    grid.innerHTML = `<p class="card-sub">Nothing renewing in the next 7 days.</p>`;
    return;
  }

  grid.innerHTML = upcoming.map((s) => {
    const color = colorFor(s.name);
    const initial = s.name.charAt(0).toUpperCase();
    const badgeClass = s.daysLeft <= 1 ? "critical" : s.daysLeft <= 3 ? "warning" : "ok";
    const badgeText = s.daysLeft === 0 ? "Today" : s.daysLeft === 1 ? "Tomorrow" : `${s.daysLeft} days left`;
    return `
      <div class="renewal-card">
        <div class="renewal-card-top">
          <div class="renewal-card-id">
            <div class="renewal-logo" style="background:${color}22;color:${color};border:1px solid ${color}40;">${initial}</div>
            <div>
              <p class="renewal-card-name">${escapeHtml(s.name)}</p>
              <p class="renewal-card-date">Renews ${formatRenewalDate(s.renewal_date)}</p>
            </div>
          </div>
          <span class="countdown-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="renewal-card-meta">
          <div>
            <p class="renewal-card-cost">${formatINR(s.price)}</p>
            <p class="renewal-card-method">${escapeHtml(s.category)}</p>
          </div>
        </div>
        <div class="renewal-card-bottom">
          <span class="auto-renew-status">Status: ${s.status}</span>
          <button class="btn-manage" data-manage="${s.id}">Manage</button>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-manage]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(Number(btn.dataset.manage)));
  });
  if (window.lucide) lucide.createIcons();
}

/* AI Insights */
function renderInsights() {
  const grid = document.getElementById("insightsGrid");
  if (!grid) return;
  grid.innerHTML = AI_INSIGHTS.map((ins) => `
    <div class="insight-card">
      <div class="insight-icon" style="background:${ins.gradient}"><i data-lucide="${ins.icon}"></i></div>
      <p class="insight-title">${ins.tag}</p>
      <p class="insight-headline">${ins.headline}</p>
      <p class="insight-sub">${ins.sub}</p>
      <button class="insight-cta">${ins.cta} <i data-lucide="arrow-right"></i></button>
    </div>
  `).join("");
}

/* ============ MODAL ============ */
function openModal(editId = null) {
  const overlay = document.getElementById("subModalOverlay");
  const title = document.getElementById("modalTitle");
  const form = document.getElementById("subForm");
  form.reset();
  document.getElementById("modalError").textContent = "";

  if (editId) {
    const sub = ALL_SUBSCRIPTIONS.find((s) => s.id === editId);
    if (!sub) return;
    title.textContent = "Edit subscription";
    document.getElementById("subId").value = sub.id;
    document.getElementById("subName").value = sub.name;
    document.getElementById("subCategory").value = sub.category;
    document.getElementById("subPrice").value = sub.price;
    document.getElementById("subRenewal").value = sub.renewal_date;
    document.getElementById("subStatus").value = sub.status;
  } else {
    title.textContent = "Add subscription";
    document.getElementById("subId").value = "";
  }

  overlay.classList.add("open");
}

function closeModal() {
  document.getElementById("subModalOverlay").classList.remove("open");
}

function initModal() {
  document.getElementById("addSubBtn")?.addEventListener("click", () => openModal());
  document.getElementById("modalCloseBtn")?.addEventListener("click", closeModal);
  document.getElementById("modalCancelBtn")?.addEventListener("click", closeModal);
  document.getElementById("subModalOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "subModalOverlay") closeModal();
  });

  document.getElementById("subForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("modalError");
    errorEl.textContent = "";

    const id = document.getElementById("subId").value;
    const payload = {
      name: document.getElementById("subName").value.trim(),
      category: document.getElementById("subCategory").value,
      price: Number(document.getElementById("subPrice").value),
      renewal_date: document.getElementById("subRenewal").value,
      status: document.getElementById("subStatus").value,
    };

    const saveBtn = document.getElementById("modalSaveBtn");
    saveBtn.disabled = true;

    try {
      const res = await authFetch(id ? `/subscriptions/${id}` : "/subscriptions", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.error || "Something went wrong.";
        saveBtn.disabled = false;
        return;
      }

      closeModal();
      await loadSubscriptions();
    } catch (err) {
      errorEl.textContent = "Could not reach the server. Is it running?";
    } finally {
      saveBtn.disabled = false;
    }
  });
}

async function deleteSubscription(id) {
  const sub = ALL_SUBSCRIPTIONS.find((s) => s.id === id);
  if (!sub) return;
  if (!confirm(`Remove ${sub.name} from your tracked subscriptions?`)) return;

  try {
    await authFetch(`/subscriptions/${id}`, { method: "DELETE" });
    await loadSubscriptions();
  } catch (err) {
    alert("Could not delete right now. Is the server running?");
  }
}

/* ============ VAULT PAGE ============ */
function renderVault() {
  const vaultContainer = document.getElementById("vaultContainer");
  if (!vaultContainer) return;

  const allSubs = ALL_SUBSCRIPTIONS;
  
  if (allSubs.length === 0) {
    vaultContainer.innerHTML = `
      <div class="empty-state-enhancement">
        <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
        <p style="margin: 0 0 16px; font-size: 14px; color: var(--text-2);">No subscriptions in vault</p>
        <p style="margin: 0; font-size: 12px; color: var(--text-4);">Start adding subscriptions to see them here.</p>
      </div>
    `;
    return;
  }

  // Group by status
  const grouped = {
    'Active': allSubs.filter(s => s.status === 'Active'),
    'Paused': allSubs.filter(s => s.status === 'Paused'),
    'Cancelled': allSubs.filter(s => s.status === 'Cancelled'),
  };

  let html = '';
  Object.entries(grouped).forEach(([status, subs]) => {
    if (subs.length === 0) return;
    
    html += `<div class="vault-group"><h4 class="vault-group-title">${status} (${subs.length})</h4><div class="vault-grid">`;
    html += subs.map(s => {
      const color = colorFor(s.name);
      const initial = s.name.charAt(0).toUpperCase();
      return `
        <div class="vault-card" style="border-left: 4px solid ${color};">
          <div class="vault-card-header">
            <div class="vault-logo" style="background:${color}22;color:${color};border:1px solid ${color}40;">${initial}</div>
            <span class="subs-status-badge ${status.toLowerCase()}">${status}</span>
          </div>
          <h5 class="vault-name">${escapeHtml(s.name)}</h5>
          <p class="vault-category">${escapeHtml(s.category)}</p>
          <div class="vault-details">
            <div class="vault-detail">
              <span class="vault-label">Price</span>
              <span class="vault-value">${formatINR(s.price)}/mo</span>
            </div>
            <div class="vault-detail">
              <span class="vault-label">Renews</span>
              <span class="vault-value">${formatRenewalDate(s.renewal_date)}</span>
            </div>
          </div>
          <div class="vault-actions">
            <button class="btn-ghost sm" data-edit-vault="${s.id}">Edit</button>
            <button class="btn-gradient sm" data-delete-vault="${s.id}">Delete</button>
          </div>
        </div>
      `;
    }).join('');
    html += `</div></div>`;
  });

  vaultContainer.innerHTML = html;
  
  document.querySelectorAll("[data-edit-vault]").forEach(btn => {
    btn.addEventListener("click", () => openModal(Number(btn.dataset.editVault)));
  });
  document.querySelectorAll("[data-delete-vault]").forEach(btn => {
    btn.addEventListener("click", () => deleteSubscription(Number(btn.dataset.deleteVault)));
  });
  
  if (window.lucide) lucide.createIcons();
}

/* ============ STATISTICS PAGE ============ */
function renderStats() {
  const statsContainer = document.getElementById("statsContainer");
  if (!statsContainer) return;

  const active = getActiveSubs();
  const monthly = active.reduce((sum, s) => sum + s.price, 0);
  const yearly = monthly * 12;
  
  // Category breakdown
  const categoryStats = {};
  active.forEach(s => {
    categoryStats[s.category] = (categoryStats[s.category] || 0) + s.price;
  });
  const categoryArray = Object.entries(categoryStats)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Top subscriptions
  const topSubs = [...active].sort((a, b) => b.price - a.price).slice(0, 5);

  let html = `
    <div class="stats-grid-main">
      <div class="stat-card">
        <p class="stat-label">Total Monthly Spending</p>
        <p class="stat-value">${formatINR(monthly)}</p>
        <p class="stat-sub">Across ${active.length} active services</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Projected Yearly Spending</p>
        <p class="stat-value">${formatINR(yearly)}</p>
        <p class="stat-sub">If all subscriptions continue</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Average Per Service</p>
        <p class="stat-value">${formatINR(active.length > 0 ? monthly / active.length : 0)}</p>
        <p class="stat-sub">Mean subscription cost</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Most Expensive</p>
        <p class="stat-value">${topSubs.length > 0 ? escapeHtml(topSubs[0].name) : 'N/A'}</p>
        <p class="stat-sub">${topSubs.length > 0 ? formatINR(topSubs[0].price) + '/month' : 'Add a subscription'}</p>
      </div>
    </div>

    <div class="stats-charts">
      <div class="card">
        <h3 class="card-title">Spending by Category</h3>
        <p class="card-sub">Top categories this month</p>
        <div class="category-breakdown">
          ${categoryArray.map(cat => {
            const pct = Math.round((cat.amount / monthly) * 100);
            return `
              <div class="breakdown-item">
                <div class="breakdown-info">
                  <span class="breakdown-name">${escapeHtml(cat.name)}</span>
                  <span class="breakdown-amount">${formatINR(cat.amount)}</span>
                </div>
                <div class="breakdown-bar">
                  <div class="breakdown-fill" style="width: ${pct}%; background: ${colorFor(cat.name)};"></div>
                </div>
                <span class="breakdown-pct">${pct}%</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">Top 5 Subscriptions</h3>
        <p class="card-sub">Your most expensive services</p>
        <div class="top-subs-list">
          ${topSubs.map((sub, idx) => {
            const color = colorFor(sub.name);
            const initial = sub.name.charAt(0).toUpperCase();
            return `
              <div class="top-sub-item">
                <span class="top-sub-rank">#${idx + 1}</span>
                <div class="top-sub-logo" style="background:${color}22;color:${color};border:1px solid ${color}40;">${initial}</div>
                <div class="top-sub-info">
                  <p class="top-sub-name">${escapeHtml(sub.name)}</p>
                  <p class="top-sub-category">${escapeHtml(sub.category)}</p>
                </div>
                <p class="top-sub-price">${formatINR(sub.price)}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  statsContainer.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

/* ============ INIT ============ */
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  initNavbar();
  loadCurrentUser();
  initModal();
  loadSubscriptions();
});
