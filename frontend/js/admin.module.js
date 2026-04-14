// admin.module.js — Professional Admin Panel
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";
import { t } from "./i18n.js";

let allArticles = [];
let allUsers = [];
let currentTab = "dashboard";
let searchDebounceTimer = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initAdminModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (userRow?.role !== "admin") {
    toast(t("access_denied"), "error");
    return;
  }

  renderAdminShell();
  await loadDashboardStats();
  setupAdminTabs();
}

export function checkAdminRole(role) {
  return role === "admin";
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function renderAdminShell() {
  const page = document.querySelector(".admin-page");
  if (!page) return;

  page.innerHTML = `
    <div class="adm-header">
      <div>
        <div class="adm-title">👑 ${t("admin_title")}</div>
        <div class="adm-sub">${t("admin_subtitle")}</div>
      </div>
    </div>
    <div class="adm-tabs">
      <button class="adm-tab active" data-tab="dashboard">📊 ${t("nav_home")}</button>
      <button class="adm-tab" data-tab="users">👥 ${t("users")}</button>
      <button class="adm-tab" data-tab="articles">📚 ${t("articles")}</button>
      <button class="adm-tab" data-tab="credits">🪙 ${t("credits")}</button>
      <button class="adm-tab" data-tab="feedback">💬 ${t("feedback")}</button>
    </div>
    <div id="adm-content"></div>
  `;
}

function setupAdminTabs() {
  document.querySelectorAll(".adm-tab").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document
        .querySelectorAll(".adm-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTab = btn.dataset.tab;
      await loadTab(currentTab);
    });
  });
}

async function loadTab(tab) {
  const content = document.getElementById("adm-content");
  if (!content) return;
  content.innerHTML = `<div class="adm-loading">⏳ Yuklanmoqda...</div>`;

  switch (tab) {
    case "dashboard":
      await loadDashboardStats();
      break;
    case "users":
      await loadUsers();
      break;
    case "articles":
      await loadArticles();
      break;
    case "credits":
      await loadCreditsTab();
      break;
    case "feedback":
      await loadFeedback();
      break;
  }
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

async function loadDashboardStats() {
  const content = document.getElementById("adm-content");
  if (!content) return;

  const [
    { count: usersCount, error: usersError },
    { count: articlesCount },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("knowledge_base").select("*", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("email, display_name, credits, created_at, role")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (usersError) {
    console.error("[admin] dashboard stats error:", usersError.message);
  }

  content.innerHTML = `
    <div class="adm-stats-grid">
      <div class="adm-stat-card" style="--c:#3b82f6">
        <div class="adm-stat-icon">👥</div>
        <div class="adm-stat-num">${usersCount || 0}</div>
        <div class="adm-stat-label">Users</div>
      </div>
      <div class="adm-stat-card" style="--c:#f59e0b">
        <div class="adm-stat-icon">📚</div>
        <div class="adm-stat-num">${articlesCount || 0}</div>
        <div class="adm-stat-label">Articles</div>
      </div>
    </div>

    <div class="adm-section">
      <div class="adm-section-title">🕐 Recent Users</div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead><tr><th>Email</th><th>Name</th><th>Credits</th><th>Role</th><th>Date</th></tr></thead>
          <tbody>
            ${(recentUsers || [])
              .map(
                (u) => `
              <tr>
                <td>${esc(u.email)}</td>
                <td>${esc(u.display_name || "—")}</td>
                <td><span class="adm-badge blue">${u.credits || 0}</span></td>
                <td><span class="adm-badge ${u.role === "admin" ? "red" : "gray"}">${u.role}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString("en-US")}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

async function loadUsers() {
  const content = document.getElementById("adm-content");

  const { data: users, error } = await supabase
    .from("users")
    .select(
      "id, email, display_name, role, credits, telegram_chat_id, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    content.innerHTML = `<div class="adm-empty" style="color:#ef4444;">
      ❌ Error loading users: ${error.message}<br>
      <small style="color:#94a3b8;">This may be a Row Level Security (RLS) issue. Please disable RLS on the users table in Supabase or add a policy for admins.</small>
    </div>`;
    console.error("[admin] loadUsers error:", error);
    return;
  }

  allUsers = users || [];

  content.innerHTML = `
    <div class="adm-toolbar">
      <input class="adm-search" id="userSearch" placeholder="🔍 Search by email or name..." />
      <select class="adm-select" id="roleFilter">
        <option value="">All roles</option>
        <option value="parent">Parent</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    <div id="usersTableWrap"></div>
  `;

  renderUsersTable(allUsers);

  document.getElementById("userSearch").addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(filterUsers, 300);
  });
  document.getElementById("roleFilter").addEventListener("change", filterUsers);
}

function filterUsers() {
  const q = document.getElementById("userSearch")?.value.toLowerCase() || "";
  const role = document.getElementById("roleFilter")?.value || "";
  const filtered = allUsers.filter((u) => {
    const matchQ =
      !q ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.display_name || "").toLowerCase().includes(q);
    const matchRole = !role || u.role === role;
    return matchQ && matchRole;
  });
  renderUsersTable(filtered);
}

function renderUsersTable(users) {
  const wrap = document.getElementById("usersTableWrap");
  if (!wrap) return;

  if (!users.length) {
    wrap.innerHTML = `<div class="adm-empty">No users found</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>Email</th><th>Name</th><th>Role</th>
            <th>Credits</th><th>Telegram</th><th>Date</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map(
              (u) => `
            <tr>
              <td>${esc(u.email)}</td>
              <td>${esc(u.display_name || "—")}</td>
              <td><span class="adm-badge ${u.role === "admin" ? "red" : "gray"}">${u.role}</span></td>
              <td><span class="adm-badge blue">${u.credits || 0}</span></td>
              <td>${u.telegram_chat_id ? `<span class="adm-badge green">✓ ${u.telegram_chat_id}</span>` : '<span class="adm-badge gray">—</span>'}</td>
              <td>${new Date(u.created_at).toLocaleDateString("en-US")}</td>
              <td class="adm-actions">
                <button class="adm-btn-sm blue" onclick="window.__adminAddCredits('${u.id}','${esc(u.email)}')">+Credits</button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  window.__adminAddCredits = (id, email) => showAddCreditsModal(id, email);
}

async function showAddCreditsModal(userId, email) {
  // Use inline modal instead of prompt()
  const existing = document.getElementById("addCreditsModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "addCreditsModal";
  modal.className = "admin-modal-overlay";
  modal.innerHTML = `
    <div class="admin-modal-box" style="max-width:360px;">
      <h3>🪙 Add Credits</h3>
      <p style="color:#64748b;font-size:14px;margin-bottom:12px;">${email}</p>
      <input type="number" id="creditsAmount" value="50" min="1" max="10000"
        style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;font-size:15px;margin-bottom:16px;box-sizing:border-box;" />
      <div class="admin-modal-actions">
        <button id="confirmAddCredits" class="admin-add-btn">✅ Add</button>
        <button type="button" id="cancelAddCredits">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("#cancelAddCredits").onclick = () => modal.remove();
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#confirmAddCredits").onclick = async () => {
    const amount = parseInt(document.getElementById("creditsAmount").value);
    if (!amount || amount <= 0) return;
    modal.remove();

    const { data: user } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();
    const newCredits = (user?.credits || 0) + amount;
    const { error } = await supabase
      .from("users")
      .update({ credits: newCredits })
      .eq("id", userId);
    if (error) {
      toast("Error: " + error.message, "error");
      return;
    }
    toast(`✅ ${amount} credits added. New balance: ${newCredits}`, "success");
    await loadUsers();
  };
}

async function toggleUserRole(userId, currentRole) {
  const newRole = currentRole === "admin" ? "parent" : "admin";
  const confirmed = confirm(`Rolni "${newRole}" ga o'zgartirish?`);
  if (!confirmed) return;

  const { error } = await supabase
    .from("users")
    .update({ role: newRole })
    .eq("id", userId);
  if (error) {
    toast("Xato: " + error.message, "error");
    return;
  }

  toast(`✅ Rol "${newRole}" ga o'zgartirildi`, "success");
  await loadUsers();
}

// ─── Articles Tab ─────────────────────────────────────────────────────────────

async function loadArticles() {
  const content = document.getElementById("adm-content");

  const { data } = await supabase
    .from("knowledge_base")
    .select("*")
    .order("created_at", { ascending: false });

  allArticles = data || [];

  content.innerHTML = `
    <div class="adm-toolbar">
      <input class="adm-search" id="adminSearch" placeholder="🔍 Maqola qidirish..." />
      <select class="adm-select" id="adminCategoryFilter">
        <option value="">Barcha kategoriyalar</option>
        <option value="harmful">Zararli dorilar</option>
        <option value="immunity">Immunitet</option>
        <option value="vaccines">Emlash</option>
        <option value="herbal">O'simlik ichimliklar</option>
        <option value="nutrition">Ovqatlanish</option>
        <option value="sleep">Uyqu</option>
      </select>
      <button class="adm-btn-primary" id="adminAddBtn">➕ Yangi maqola</button>
    </div>
    <div id="adminArticlesList"></div>
  `;

  renderArticles(allArticles);
  setupSearch();
  setupCategoryFilter();
  document
    .getElementById("adminAddBtn")
    ?.addEventListener("click", openAddArticleModal);
}

// ─── Credits Tab ──────────────────────────────────────────────────────────────

async function loadCreditsTab() {
  const content = document.getElementById("adm-content");

  const { data: topUsers } = await supabase
    .from("users")
    .select("email, display_name, credits")
    .order("credits", { ascending: false })
    .limit(20);

  const { data: zeroUsers } = await supabase
    .from("users")
    .select("id, email, display_name, credits")
    .eq("credits", 0);

  content.innerHTML = `
    <div class="adm-credits-grid">
      <div class="adm-section">
        <div class="adm-section-title">🏆 Top Users by Credits</div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead><tr><th>Email</th><th>Name</th><th>Credits</th></tr></thead>
            <tbody>
              ${(topUsers || [])
                .map(
                  (u) => `
                <tr>
                  <td>${esc(u.email)}</td>
                  <td>${esc(u.display_name || "—")}</td>
                  <td><span class="adm-badge blue">${u.credits}</span></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="adm-section">
        <div class="adm-section-title">⚠️ Users with Zero Credits (${zeroUsers?.length || 0})</div>
        <button class="adm-btn-primary" id="giveAllCreditsBtn" style="margin-bottom:12px;">
          🎁 Give 10 credits to all
        </button>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead><tr><th>Email</th><th>Action</th></tr></thead>
            <tbody>
              ${(zeroUsers || [])
                .map(
                  (u) => `
                <tr>
                  <td>${esc(u.email)}</td>
                  <td><button class="adm-btn-sm blue" onclick="window.__adminAddCredits('${u.id}','${esc(u.email)}')">+Credits</button></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  window.__adminAddCredits = (id, email) => showAddCreditsModal(id, email);

  document
    .getElementById("giveAllCreditsBtn")
    ?.addEventListener("click", async () => {
      if (!confirm(`Give 10 credits to ${zeroUsers?.length} users?`)) return;
      for (const u of zeroUsers || []) {
        await supabase.from("users").update({ credits: 10 }).eq("id", u.id);
      }
      toast(`✅ 10 credits given to ${zeroUsers?.length} users`, "success");
      await loadCreditsTab();
    });
}

// ─── Feedback Tab ─────────────────────────────────────────────────────────────

async function loadFeedback() {
  const content = document.getElementById("adm-content");

  const { data: feedbacks, error } = await supabase
    .from("app_feedback")
    .select("*, users(email, display_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    content.innerHTML = `<div class="adm-empty">Error loading feedback: ${error.message}</div>`;
    return;
  }

  if (!feedbacks?.length) {
    content.innerHTML = `<div class="adm-empty">No feedback yet</div>`;
    return;
  }

  const ratingStars = (r) => "⭐".repeat(Math.min(r || 0, 5));
  const catColor = {
    general: "gray",
    bug: "red",
    feature: "blue",
    design: "purple",
  };

  content.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">💬 User Feedback (${feedbacks.length})</div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Rating</th>
              <th>Category</th>
              <th>Message</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${feedbacks
              .map(
                (f) => `
              <tr>
                <td>
                  <div style="font-size:13px;">${esc(f.users?.email || "—")}</div>
                  ${f.users?.display_name ? `<div style="font-size:11px;color:#94a3b8;">${esc(f.users.display_name)}</div>` : ""}
                </td>
                <td><span style="font-size:14px;">${ratingStars(f.rating)}</span> <span style="color:#64748b;font-size:12px;">${f.rating}/5</span></td>
                <td><span class="adm-badge ${catColor[f.category] || "gray"}">${f.category || "—"}</span></td>
                <td style="max-width:300px;font-size:13px;color:#475569;">${esc(f.message || "—")}</td>
                <td style="font-size:12px;color:#94a3b8;">${new Date(f.created_at).toLocaleDateString("en-US")}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── Articles CRUD ────────────────────────────────────────────────────────────

export function filterArticles(articles, searchQuery, category) {
  const q = (searchQuery || "").toLowerCase().trim();
  const cat = (category || "").trim();
  return articles.filter((a) => {
    const matchQ =
      !q ||
      (a.title || "").toLowerCase().includes(q) ||
      (a.category || "").includes(q);
    const matchCat = !cat || a.category === cat;
    return matchQ && matchCat;
  });
}

export function renderArticles(articles) {
  const list = document.getElementById("adminArticlesList");
  if (!list) return;

  if (!articles.length) {
    list.innerHTML = `<div class="adm-empty">Maqola topilmadi</div>`;
    return;
  }

  list.innerHTML = articles
    .map(
      (a) => `
    <div class="admin-article-item">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="flex:1">
          <h4>${esc(a.title || "Nomsiz")}</h4>
          <div class="admin-article-meta">
            <span class="adm-badge ${catColor(a.category)}">${esc(a.category || "—")}</span>
            <span style="color:#94a3b8;font-size:12px;margin-left:8px;">${new Date(a.created_at).toLocaleDateString("uz-UZ")}</span>
          </div>
          <p style="font-size:13px;color:#64748b;margin:8px 0 0;">${esc(a.summary || "")}</p>
        </div>
        <div class="admin-article-actions">
          <button class="admin-edit-btn" data-id="${a.id}">✏️ Tahrir</button>
          <button class="admin-delete-btn" data-id="${a.id}">🗑️ O'chirish</button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  list
    .querySelectorAll(".admin-delete-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteArticle(btn.dataset.id)),
    );
  list
    .querySelectorAll(".admin-edit-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => openEditArticleModal(btn.dataset.id)),
    );
}

function catColor(cat) {
  const map = {
    harmful: "red",
    immunity: "green",
    vaccines: "blue",
    herbal: "green",
    nutrition: "yellow",
    sleep: "purple",
  };
  return map[cat] || "gray";
}

function setupSearch() {
  document.getElementById("adminSearch")?.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(applyFilters, 300);
  });
}

function setupCategoryFilter() {
  document
    .getElementById("adminCategoryFilter")
    ?.addEventListener("change", applyFilters);
}

function applyFilters() {
  const q = document.getElementById("adminSearch")?.value || "";
  const cat = document.getElementById("adminCategoryFilter")?.value || "";
  renderArticles(filterArticles(allArticles, q, cat));
}

const CATEGORIES = [
  "harmful",
  "immunity",
  "vaccines",
  "herbal",
  "nutrition",
  "sleep",
];
const CAT_LABELS = {
  harmful: "Zararli dorilar",
  immunity: "Immunitet",
  vaccines: "Emlash",
  herbal: "O'simlik",
  nutrition: "Ovqatlanish",
  sleep: "Uyqu",
};

export function openAddArticleModal() {
  showArticleModal({ title: "➕ Add New Article", article: null });
}

function openEditArticleModal(id) {
  const article = allArticles.find((a) => a.id === id);
  if (!article) return;
  showArticleModal({ title: "✏️ Edit Article", article });
}

function showArticleModal({ title, article }) {
  document.getElementById("adminArticleModal")?.remove();
  const modal = document.createElement("div");
  modal.id = "adminArticleModal";
  modal.className = "admin-modal-overlay";
  modal.innerHTML = `
    <div class="admin-modal-box" style="max-width:680px;max-height:90vh;overflow-y:auto;">
      <h3>${title}</h3>
      <form id="adminArticleForm">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🇬🇧 Title (English) *</label>
            <input type="text" id="artTitle" placeholder="Article title in English" value="${esc(article?.title || "")}" required style="width:100%;box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🇺🇿 Sarlavha (O'zbek)</label>
            <input type="text" id="artTitleUz" placeholder="Maqola sarlavhasi o'zbekcha" value="${esc(article?.title_uz || "")}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🇬🇧 Summary (English) *</label>
            <input type="text" id="artSummary" placeholder="Short description in English" value="${esc(article?.summary || "")}" required style="width:100%;box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🇺🇿 Qisqacha tavsif (O'zbek)</label>
            <input type="text" id="artSummaryUz" placeholder="Qisqacha tavsif o'zbekcha" value="${esc(article?.summary_uz || "")}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🇬🇧 Content (English) *</label>
            <textarea id="artContent" placeholder="Full article text in English" rows="6" required style="width:100%;box-sizing:border-box;">${esc(article?.content || "")}</textarea>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">🇺🇿 Matn (O'zbek)</label>
            <textarea id="artContentUz" placeholder="To'liq matn o'zbekcha" rows="6" style="width:100%;box-sizing:border-box;">${esc(article?.content_uz || "")}</textarea>
          </div>
        </div>


        <select id="artCategory" required style="width:100%;box-sizing:border-box;">
          <option value="">Select category</option>
          ${CATEGORIES.map((c) => `<option value="${c}" ${article?.category === c ? "selected" : ""}>${CAT_LABELS[c]}</option>`).join("")}
        </select>

        <div class="admin-modal-actions">
          <button type="submit" class="admin-add-btn">💾 Save</button>
          <button type="button" id="closeAdminModal">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector("#closeAdminModal").onclick = () => modal.remove();
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal
    .querySelector("#adminArticleForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        title: document.getElementById("artTitle").value.trim(),
        title_uz: document.getElementById("artTitleUz").value.trim() || null,
        summary: document.getElementById("artSummary").value.trim(),
        summary_uz:
          document.getElementById("artSummaryUz").value.trim() || null,
        content: document.getElementById("artContent").value.trim(),
        content_uz:
          document.getElementById("artContentUz").value.trim() || null,
        category: document.getElementById("artCategory").value,
      };
      try {
        if (article) {
          const { error } = await supabase
            .from("knowledge_base")
            .update(data)
            .eq("id", article.id);
          if (error) throw error;
          toast("✅ Article updated", "success");
        } else {
          const { error } = await supabase
            .from("knowledge_base")
            .insert({ ...data, created_at: new Date().toISOString() });
          if (error) throw error;
          toast("✅ Article added", "success");
        }
        modal.remove();
        await loadArticles();
      } catch (err) {
        toast("Error: " + err.message, "error");
      }
    });
}

export async function deleteArticle(id) {
  const confirmed = await new Promise((resolve) => {
    const toastEl = document.createElement("div");
    toastEl.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:14px 20px;border-radius:12px;z-index:9999;display:flex;gap:12px;align-items:center;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,0.3);";
    toastEl.innerHTML = `<span>Delete this article?</span><button id="cfYes" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:600;">Yes</button><button id="cfNo" style="background:#475569;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;">No</button>`;
    document.body.appendChild(toastEl);
    toastEl.querySelector("#cfYes").onclick = () => {
      toastEl.remove();
      resolve(true);
    };
    toastEl.querySelector("#cfNo").onclick = () => {
      toastEl.remove();
      resolve(false);
    };
    setTimeout(() => {
      toastEl.remove();
      resolve(false);
    }, 5000);
  });
  if (!confirmed) return;
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
  if (error) {
    toast("Xato: " + error.message, "error");
    return;
  }
  allArticles = allArticles.filter((a) => a.id !== id);
  applyFilters();
  toast("✅ Maqola o'chirildi", "success");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
