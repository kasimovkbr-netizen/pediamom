import { supabase } from "./supabase.js";
import { t, getLang } from "./i18n.js";

let savedArticles = [];

export async function initSavedArticlesModule() {
  const grid = document.getElementById("savedArticlesGrid");
  if (!grid) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const userId = session.user.id;

  grid.innerHTML = `<div class="saved-article-card"><p>${t("loading")}</p></div>`;

  const { data, error } = await supabase
    .from("saved_articles")
    .select(
      "id, article_id, knowledge_base(id, title, title_uz, summary, summary_uz, content, content_uz, category)",
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error loading saved articles:", error);
    renderSavedArticles([]);
    return;
  }

  savedArticles = (data || []).map((row) => ({
    bookmarkId: row.id,
    id: row.article_id,
    ...row.knowledge_base,
  }));

  renderSavedArticles(savedArticles);
}

// Helper: get localized field
function loc(article, field) {
  const lang = getLang();
  if (lang === "uz" && article[`${field}_uz`]) return article[`${field}_uz`];
  return article[field] || "";
}

export function renderSavedArticles(articles) {
  const grid = document.getElementById("savedArticlesGrid");
  if (!grid) return;

  if (!articles || articles.length === 0) {
    grid.innerHTML = `
      <div class="saved-article-card saved-articles-empty">
        <p>${t("no_saved_articles")}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = articles
    .map(
      (article) => `
    <div class="saved-article-card" data-id="${article.id}">
      <h3>${escapeHtml(loc(article, "title"))}</h3>
      <p class="card-summary">${escapeHtml(loc(article, "summary"))}</p>
      <div class="card-footer">
        <span class="article-badge ${getCategoryBadgeClass(article.category)}">${t("kb_category_" + article.category) || article.category || ""}</span>
        <button class="read-article-btn" data-id="${article.id}">${t("read")} →</button>
      </div>
    </div>
  `,
    )
    .join("");

  grid.querySelectorAll(".read-article-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const articleId = btn.dataset.id;
      const article = savedArticles.find((a) => a.id === articleId);
      if (article) openArticleDetail(article);
    });
  });
}

export function getCategoryBadgeClass(category) {
  const map = {
    harmful: "badge-harmful",
    immunity: "badge-immunity",
    vaccines: "badge-vaccines",
    herbal: "badge-herbal",
    nutrition: "badge-nutrition",
    sleep: "badge-sleep",
  };
  return map[category] || "";
}

export async function saveArticle(articleId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("saved_articles")
    .insert({ user_id: session.user.id, article_id: articleId });

  return { data, error };
}

export async function unsaveArticle(articleId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("saved_articles")
    .delete()
    .eq("user_id", session.user.id)
    .eq("article_id", articleId);

  return { data, error };
}

function openArticleDetail(article) {
  const existing = document.getElementById("savedArticleModal");
  if (existing) existing.remove();

  const categoryColors = {
    harmful: {
      bg: "#fef2f2",
      color: "#b91c1c",
      label: `⚠️ ${t("kb_category_harmful")}`,
    },
    immunity: {
      bg: "#f0fdf4",
      color: "#166534",
      label: `🛡️ ${t("kb_category_immunity")}`,
    },
    vaccines: {
      bg: "#eff6ff",
      color: "#1d4ed8",
      label: `💉 ${t("kb_category_vaccines")}`,
    },
    herbal: {
      bg: "#f0fdf4",
      color: "#15803d",
      label: `🌿 ${t("kb_category_herbal")}`,
    },
    nutrition: {
      bg: "#fefce8",
      color: "#854d0e",
      label: `🥗 ${t("kb_category_nutrition")}`,
    },
    sleep: {
      bg: "#f5f3ff",
      color: "#6d28d9",
      label: `😴 ${t("kb_category_sleep")}`,
    },
  };
  const cat = categoryColors[article.category] || {
    bg: "#f8fafc",
    color: "#475569",
    label: article.category || "",
  };

  const displayTitle = loc(article, "title");
  const displaySummary = loc(article, "summary");
  const displayContent = loc(article, "content");

  const contentHtml = (displayContent || "")
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:0 0 10px;color:#374151;font-size:14px;line-height:1.7;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const modal = document.createElement("div");
  modal.id = "savedArticleModal";
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(15,23,42,0.5);
    display:flex;align-items:center;justify-content:center;
    z-index:3000;padding:20px;backdrop-filter:blur(4px);
  `;

  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:20px;width:100%;max-width:600px;
      max-height:85vh;overflow:hidden;display:flex;flex-direction:column;
      box-shadow:0 25px 60px rgba(0,0,0,0.25);animation:articleModalIn 0.25s ease;
    ">
      <!-- Header -->
      <div style="padding:24px 24px 16px;border-bottom:1px solid #f1f5f9;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="
            background:${cat.bg};color:${cat.color};
            padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;
          ">${cat.label}</span>
          <button id="closeSavedArticleModal" style="
            background:#f1f5f9;border:none;border-radius:50%;
            width:32px;height:32px;cursor:pointer;font-size:16px;
            display:flex;align-items:center;justify-content:center;
            color:#64748b;transition:background 0.2s;
          ">✕</button>
        </div>
        <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 8px;">${escapeHtml(displayTitle)}</h2>
        <p style="font-size:14px;color:#64748b;margin:0;font-style:italic;">${escapeHtml(displaySummary)}</p>
      </div>
      <!-- Content -->
      <div style="padding:20px 24px;overflow-y:auto;flex:1;">
        ${contentHtml || `<p style="color:#94a3b8;font-size:14px;">No content available.</p>`}
      </div>
      <!-- Footer -->
      <div style="padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;">
        <button id="closeSavedArticleModalFooter" style="
          background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;
          border:none;border-radius:12px;padding:10px 24px;
          font-size:14px;font-weight:600;cursor:pointer;
        ">${t("close")}</button>
      </div>
    </div>
    <style>
      @keyframes articleModalIn {
        from { opacity:0; transform:scale(0.95) translateY(10px); }
        to { opacity:1; transform:scale(1) translateY(0); }
      }
    </style>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById("closeSavedArticleModal").onclick = close;
  document.getElementById("closeSavedArticleModalFooter").onclick = close;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
