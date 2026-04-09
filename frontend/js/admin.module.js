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
    { count: usersCount },
    { count: childrenCount },
    { count: analysesCount },
    { count: articlesCount },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("children").select("*", { count: "exact", head: true }),
    supabase
      .from("medical_analyses")
      .select("*", { count: "exact", head: true }),
    supabase.from("knowledge_base").select("*", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("email, display_name, credits, created_at, role")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  content.innerHTML = `
    <div class="adm-stats-grid">
      <div class="adm-stat-card" style="--c:#3b82f6">
        <div class="adm-stat-icon">👥</div>
        <div class="adm-stat-num">${usersCount || 0}</div>
        <div class="adm-stat-label">Foydalanuvchilar</div>
      </div>
      <div class="adm-stat-card" style="--c:#8b5cf6">
        <div class="adm-stat-icon">👶</div>
        <div class="adm-stat-num">${childrenCount || 0}</div>
        <div class="adm-stat-label">Bolalar</div>
      </div>
      <div class="adm-stat-card" style="--c:#059669">
        <div class="adm-stat-icon">🧪</div>
        <div class="adm-stat-num">${analysesCount || 0}</div>
        <div class="adm-stat-label">Tahlillar</div>
      </div>
      <div class="adm-stat-card" style="--c:#f59e0b">
        <div class="adm-stat-icon">📚</div>
        <div class="adm-stat-num">${articlesCount || 0}</div>
        <div class="adm-stat-label">Maqolalar</div>
      </div>
    </div>

    <div class="adm-section">
      <div class="adm-section-title">🕐 So'nggi foydalanuvchilar</div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead><tr><th>Email</th><th>Ism</th><th>Kredit</th><th>Rol</th><th>Sana</th></tr></thead>
          <tbody>
            ${(recentUsers || [])
              .map(
                (u) => `
              <tr>
                <td>${esc(u.email)}</td>
                <td>${esc(u.display_name || "—")}</td>
                <td><span class="adm-badge blue">${u.credits || 0}</span></td>
                <td><span class="adm-badge ${u.role === "admin" ? "red" : "gray"}">${u.role}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString("uz-UZ")}</td>
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

  const { data: users } = await supabase
    .from("users")
    .select(
      "id, email, display_name, role, credits, telegram_chat_id, created_at",
    )
    .order("created_at", { ascending: false });

  allUsers = users || [];

  content.innerHTML = `
    <div class="adm-toolbar">
      <input class="adm-search" id="userSearch" placeholder="🔍 Email yoki ism bo'yicha qidirish..." />
      <select class="adm-select" id="roleFilter">
        <option value="">Barcha rollar</option>
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
    wrap.innerHTML = `<div class="adm-empty">Foydalanuvchi topilmadi</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>Email</th><th>Ism</th><th>Rol</th>
            <th>Kredit</th><th>Telegram</th><th>Sana</th><th>Amallar</th>
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
              <td>${new Date(u.created_at).toLocaleDateString("uz-UZ")}</td>
              <td class="adm-actions">
                <button class="adm-btn-sm blue" onclick="window.__adminAddCredits('${u.id}','${esc(u.email)}')">+Kredit</button>
                <button class="adm-btn-sm ${u.role === "admin" ? "gray" : "purple"}" onclick="window.__adminToggleRole('${u.id}','${u.role}')">
                  ${u.role === "admin" ? "Parent qil" : "Admin qil"}
                </button>
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
  window.__adminToggleRole = (id, role) => toggleUserRole(id, role);
}

async function showAddCreditsModal(userId, email) {
  const amount = prompt(`${email} ga necha kredit qo'shish?`, "50");
  if (!amount || isNaN(amount) || parseInt(amount) <= 0) return;

  const { data: user } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();
  const newCredits = (user?.credits || 0) + parseInt(amount);

  const { error } = await supabase
    .from("users")
    .update({ credits: newCredits })
    .eq("id", userId);
  if (error) {
    toast("Xato: " + error.message, "error");
    return;
  }

  toast(
    `✅ ${amount} kredit qo'shildi. Yangi balans: ${newCredits}`,
    "success",
  );
  await loadUsers();
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
        <div class="adm-section-title">🏆 Eng ko'p kreditli foydalanuvchilar</div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead><tr><th>Email</th><th>Ism</th><th>Kredit</th></tr></thead>
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
        <div class="adm-section-title">⚠️ Kreditlari tugagan (${zeroUsers?.length || 0} ta)</div>
        <button class="adm-btn-primary" id="giveAllCreditsBtn" style="margin-bottom:12px;">
          🎁 Hammaga 10 kredit berish
        </button>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead><tr><th>Email</th><th>Amal</th></tr></thead>
            <tbody>
              ${(zeroUsers || [])
                .map(
                  (u) => `
                <tr>
                  <td>${esc(u.email)}</td>
                  <td><button class="adm-btn-sm blue" onclick="window.__adminAddCredits('${u.id}','${esc(u.email)}')">+Kredit</button></td>
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
      if (!confirm(`${zeroUsers?.length} ta foydalanuvchiga 10 kredit berish?`))
        return;
      for (const u of zeroUsers || []) {
        await supabase.from("users").update({ credits: 10 }).eq("id", u.id);
      }
      toast(
        `✅ ${zeroUsers?.length} ta foydalanuvchiga 10 kredit berildi`,
        "success",
      );
      await loadCreditsTab();
    });
}

// ─── Feedback Tab ─────────────────────────────────────────────────────────────

async function loadFeedback() {
  const content = document.getElementById("adm-content");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("*, users(email)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!tickets?.length) {
    content.innerHTML = `<div class="adm-empty">Hali fikr-mulohazalar yo'q</div>`;
    return;
  }

  content.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">💬 Qo'llab-quvvatlash so'rovlari (${tickets.length})</div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead><tr><th>Foydalanuvchi</th><th>Mavzu</th><th>Holat</th><th>Sana</th></tr></thead>
          <tbody>
            ${tickets
              .map(
                (t) => `
              <tr>
                <td>${esc(t.users?.email || "—")}</td>
                <td>${esc(t.subject)}</td>
                <td><span class="adm-badge ${t.status === "open" ? "red" : "green"}">${t.status}</span></td>
                <td>${new Date(t.created_at).toLocaleDateString("uz-UZ")}</td>
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
  showArticleModal({ title: "Yangi maqola qo'shish", article: null });
}

function openEditArticleModal(id) {
  const article = allArticles.find((a) => a.id === id);
  if (!article) return;
  showArticleModal({ title: "Maqolani tahrirlash", article });
}

function showArticleModal({ title, article }) {
  document.getElementById("adminArticleModal")?.remove();
  const modal = document.createElement("div");
  modal.id = "adminArticleModal";
  modal.className = "admin-modal-overlay";
  modal.innerHTML = `
    <div class="admin-modal-box" style="max-width:560px;">
      <h3>${title}</h3>
      <form id="adminArticleForm">
        <input type="text" id="artTitle" placeholder="Sarlavha *" value="${esc(article?.title || "")}" required />
        <input type="text" id="artSummary" placeholder="Qisqacha tavsif *" value="${esc(article?.summary || "")}" required />
        <textarea id="artContent" placeholder="To'liq matn *" rows="5" required>${esc(article?.content || "")}</textarea>
        <textarea id="artWarning" placeholder="Ogohlantirish (ixtiyoriy)" rows="2">${esc(article?.warning || "")}</textarea>
        <select id="artCategory" required>
          <option value="">Kategoriya tanlang</option>
          ${CATEGORIES.map((c) => `<option value="${c}" ${article?.category === c ? "selected" : ""}>${CAT_LABELS[c]}</option>`).join("")}
        </select>
        <div class="admin-modal-actions">
          <button type="submit" class="admin-add-btn">💾 Saqlash</button>
          <button type="button" id="closeAdminModal">Bekor qilish</button>
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
        summary: document.getElementById("artSummary").value.trim(),
        content: document.getElementById("artContent").value.trim(),
        warning: document.getElementById("artWarning").value.trim() || null,
        category: document.getElementById("artCategory").value,
        updated_at: new Date().toISOString(),
      };
      try {
        if (article) {
          const { error } = await supabase
            .from("knowledge_base")
            .update(data)
            .eq("id", article.id);
          if (error) throw error;
          toast("✅ Maqola yangilandi", "success");
        } else {
          const { error } = await supabase
            .from("knowledge_base")
            .insert({ ...data, created_at: new Date().toISOString() });
          if (error) throw error;
          toast("✅ Maqola qo'shildi", "success");
        }
        modal.remove();
        await loadArticles();
      } catch (err) {
        toast("Xato: " + err.message, "error");
      }
    });
}

export async function deleteArticle(id) {
  if (!confirm("Bu maqolani o'chirishni tasdiqlaysizmi?")) return;
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
