// billing.module.js — Stripe Checkout Integration
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";
import { t } from "./i18n.js";

const API_BASE = (window.__API_BASE_URL__ || "http://localhost:3001") + "/api";

const PACKAGES = [
  {
    id: "pack_100",
    name: "Starter",
    credits: 100,
    price: "$3.99",
    color: "#3b82f6",
    emoji: "⚡",
  },
  {
    id: "pack_300",
    name: "Value",
    credits: 300,
    price: "$8.99",
    color: "#8b5cf6",
    emoji: "🚀",
    popular: true,
  },
  {
    id: "pack_800",
    name: "Pro",
    credits: 800,
    price: "$19.99",
    color: "#059669",
    emoji: "💎",
  },
];

const TIERS = [
  {
    id: "monthly_500",
    name: () => t("monthly_plan"),
    price: "$14.99/mo",
    credits: 500,
    features: () => [
      `500 ${t("credits")}/month`,
      "Renews every month",
      "All analysis types",
      "Telegram reminders",
    ],
    color: "#7c3aed",
    popular: true,
  },
];

let currentUser = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initBillingModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  currentUser = session.user;
  await renderBilling();
}

// ─── API Helper ───────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return res.json();
}

// ─── Load user data ───────────────────────────────────────────────────────────

async function getUserData() {
  if (!currentUser) return null;
  const { data } = await supabase
    .from("users")
    .select("credits, free_credits_used, subscription_status")
    .eq("id", currentUser.id)
    .single();
  return data;
}

// ─── Render ───────────────────────────────────────────────────────────────────

async function renderBilling() {
  const container = document.getElementById("billingPage");
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;">
    <div style="font-size:32px;margin-bottom:12px;">⏳</div>
    <div>Loading...</div>
  </div>`;

  const userData = await getUserData();
  const credits = userData?.credits || 0;
  const freeUsed = userData?.free_credits_used || 0;
  const freeLimit = 10;
  const freeRemaining = Math.max(0, freeLimit - freeUsed);
  const freePercent = Math.min(100, Math.round((freeUsed / freeLimit) * 100));

  container.innerHTML = buildHTML(
    credits,
    freeRemaining,
    freePercent,
    freeUsed,
    freeLimit,
  );
  attachEvents(container);
}

function buildHTML(credits, freeRemaining, freePercent, freeUsed, freeLimit) {
  return `
<div class="bl-page">
  <div class="bl-header">
    <div class="bl-header-left">
      <div class="bl-header-title">💳 ${t("billing_title")}</div>
      <div class="bl-header-sub">${t("billing_subtitle")}</div>
    </div>
    <div class="bl-balance-card">
      <div class="bl-balance-icon">🪙</div>
      <div>
        <div class="bl-balance-num">${credits}</div>
        <div class="bl-balance-label">${t("available_credits")}</div>
      </div>
    </div>
  </div>
  <div class="bl-free-card">
    <div class="bl-free-top">
      <span class="bl-free-title">🎁 ${t("free_credits")}</span>
      <span class="bl-free-count">${freeRemaining}/${freeLimit} left</span>
    </div>
    <div class="bl-progress-bar">
      <div class="bl-progress-fill ${freePercent >= 80 ? "bl-progress-warn" : ""}" style="width:${freePercent}%"></div>
    </div>
    <div class="bl-free-note">${t("free_credits_note")}</div>
  </div>
  <div class="bl-tabs">
    <button class="bl-tab active" data-tab="credits">${t("buy_credits_tab")}</button>
    <button class="bl-tab" data-tab="subscription">${t("subscription_tab")}</button>
  </div>
  <div class="bl-tab-content active" data-tab="credits">
    <p class="bl-desc">${t("one_time_payment")}</p>
    <div class="bl-packages">
      ${PACKAGES.map(
        (pkg) => `
        <div class="bl-pkg ${pkg.popular ? "bl-pkg-popular" : ""}" style="--pkg-color:${pkg.color}">
          ${pkg.popular ? `<div class="bl-pkg-badge">${t("most_popular")}</div>` : ""}
          <div class="bl-pkg-emoji">${pkg.emoji}</div>
          <div class="bl-pkg-name">${pkg.name}</div>
          <div class="bl-pkg-credits">${pkg.credits}<span> Credits</span></div>
          <div class="bl-pkg-price">${pkg.price}</div>
          <div class="bl-pkg-per">${((parseFloat(pkg.price.replace("$", "")) / pkg.credits) * 100).toFixed(1)}¢ / credit</div>
          <button class="bl-buy-btn" data-pkg="${pkg.id}" data-credits="${pkg.credits}" data-name="${pkg.name}" data-price="${pkg.price}">
            Buy
          </button>
        </div>
      `,
      ).join("")}
    </div>
    <div class="bl-info-row">
      <span>${t("blood_cost")}</span>
      <span>${t("vitamin_cost")}</span>
    </div>
  </div>
  <div class="bl-tab-content" data-tab="subscription">
    <p class="bl-desc">${t("subscription_tab")}</p>
    <div class="bl-tiers">
      ${TIERS.map((tier) => {
        const features =
          typeof tier.features === "function" ? tier.features() : tier.features;
        const name = typeof tier.name === "function" ? tier.name() : tier.name;
        return `
        <div class="bl-tier" style="--tier-color:${tier.color}">
          ${tier.popular ? `<div class="bl-tier-badge">${t("recommended")}</div>` : ""}
          <div class="bl-tier-name">${name}</div>
          <div class="bl-tier-price">${tier.price}</div>
          <div class="bl-tier-credits">${tier.credits} credits/month</div>
          <ul class="bl-tier-features">
            ${features.map((f) => `<li>✓ ${f}</li>`).join("")}
          </ul>
          <button class="bl-sub-btn" data-tier="${tier.id}" data-credits="${tier.credits}" data-name="${name}">
            ${t("subscribe_btn")}
          </button>
        </div>
      `;
      }).join("")}
    </div>
  </div>
</div>`;
}

// ─── Events ───────────────────────────────────────────────────────────────────

function attachEvents(container) {
  // Tabs
  container.querySelectorAll(".bl-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      container
        .querySelectorAll(".bl-tab")
        .forEach((b) => b.classList.remove("active"));
      container
        .querySelectorAll(".bl-tab-content")
        .forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      container
        .querySelector(`.bl-tab-content[data-tab="${btn.dataset.tab}"]`)
        ?.classList.add("active");
    });
  });

  // Buy buttons
  container.querySelectorAll(".bl-buy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showConfirmModal({
        title: t("confirm_purchase"),
        emoji: "🪙",
        rows: [
          ["Package", btn.dataset.name],
          ["Credits", btn.dataset.credits],
          ["Price", btn.dataset.price],
        ],
        note: "You will be redirected to Stripe payment page",
        confirmText: t("pay_stripe"),
        onConfirm: async () => {
          await handleBuyStripe(
            btn.dataset.pkg,
            btn.dataset.name,
            btn.dataset.credits,
          );
        },
      });
    });
  });

  // Subscribe buttons
  container.querySelectorAll(".bl-sub-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showConfirmModal({
        title: t("subscribe_btn"),
        emoji: "📅",
        rows: [
          ["Plan", btn.dataset.name],
          ["Credits", `${btn.dataset.credits}/month`],
        ],
        note: "You will be redirected to Stripe payment page",
        confirmText: t("pay_stripe"),
        onConfirm: async () => {
          await handleSubscribeStripe(btn.dataset.tier, btn.dataset.name);
        },
      });
    });
  });
}

// ─── Stripe Checkout Handlers ────────────────────────────────────────────────

async function handleBuyStripe(packageId, name, credits) {
  try {
    const res = await apiFetch("/monetization/credits/checkout", {
      method: "POST",
      body: JSON.stringify({ packageId }),
    });

    console.log("[billing] checkout response:", res);

    if (res.success && res.data?.checkoutUrl) {
      window.location.href = res.data.checkoutUrl;
    } else if (res.success && res.demo) {
      toast(`✅ Demo: ${credits} credits added!`, "success");
      setTimeout(() => renderBilling(), 1000);
    } else {
      const errMsg = res.error?.message || res.error || "Something went wrong";
      toast("❌ " + errMsg, "error");
    }
  } catch (e) {
    console.error("[billing] fetch error:", e);
    toast("❌ Could not connect to server.", "error");
  }
}

async function handleSubscribeStripe(tierId, name) {
  try {
    const res = await apiFetch("/monetization/subscriptions/checkout", {
      method: "POST",
      body: JSON.stringify({ tierId }),
    });

    console.log("[billing] subscribe response:", res);

    if (res.success && res.data?.checkoutUrl) {
      window.location.href = res.data.checkoutUrl;
    } else if (res.success && res.demo) {
      toast(`✅ Demo: Subscription activated!`, "success");
      setTimeout(() => renderBilling(), 1000);
    } else {
      const errMsg = res.error?.message || res.error || "Something went wrong";
      toast("❌ " + errMsg, "error");
    }
  } catch (e) {
    console.error("[billing] fetch error:", e);
    toast("❌ Could not connect to server.", "error");
  }
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function showConfirmModal({
  title,
  emoji,
  rows,
  note,
  confirmText,
  onConfirm,
}) {
  document.getElementById("blModal")?.remove();

  const modal = document.createElement("div");
  modal.id = "blModal";
  modal.className = "bl-modal-overlay";
  modal.innerHTML = `
    <div class="bl-modal">
      <div class="bl-modal-emoji">${emoji}</div>
      <h3 class="bl-modal-title">${title}</h3>
      <div class="bl-modal-rows">
        ${rows
          .map(
            ([k, v]) => `
          <div class="bl-modal-row">
            <span>${k}</span><strong>${v}</strong>
          </div>
        `,
          )
          .join("")}
      </div>
      ${note ? `<div class="bl-modal-note">ℹ️ ${note}</div>` : ""}
      <div class="bl-modal-actions">
        <button class="bl-modal-confirm" id="blConfirm">${confirmText}</button>
        <button class="bl-modal-cancel" id="blCancel">${t("cancel")}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#blCancel").onclick = () => modal.remove();
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#blConfirm").onclick = async () => {
    const btn = modal.querySelector("#blConfirm");
    const cancelBtn = modal.querySelector("#blCancel");
    btn.disabled = true;
    cancelBtn.disabled = true;
    btn.textContent = "⏳ Loading...";
    await onConfirm();
    modal.remove();
  };
}
