// dashboard.js
import { supabase } from "./supabase.js";
import { t, initI18n, getLang } from "./i18n.js";

document.addEventListener("DOMContentLoaded", async () => {
  initI18n();
  const dashboard = document.getElementById("dashboardPage");
  if (!dashboard) return;

  const menuItems = dashboard.querySelectorAll(".menu-item");
  const content = dashboard.querySelector("#page-content");
  const logoutBtn = document.getElementById("logoutBtn");

  if (!content || menuItems.length === 0) return;

  /* ======================
     PAGE TEMPLATES
  ====================== */
  const pages = {
    home: () => `
      <div class="home-page">
        <h1>${t("welcome_back")}</h1>
        <div class="home-quick-actions">
          <h2>${t("quick_actions")}</h2>
          <div class="quick-actions-grid">
            <button class="quick-action-btn" data-nav="children">
              <span class="qa-icon">➕</span> ${t("add_child")}
            </button>
            <button class="quick-action-btn" data-nav="medicines">
              <span class="qa-icon">💊</span> ${t("add_medicine")}
            </button>
            <button class="quick-action-btn" data-nav="addanalysis">
              <span class="qa-icon">🧪</span> ${t("add_analysis")}
            </button>
            <button class="quick-action-btn" data-nav="checklist">
              <span class="qa-icon">📋</span> ${t("daily_checklist")}
            </button>
          </div>
        </div>
      </div>
    `,

    children: () => `<div class="children-page">
  <div class="children-header">
    <h2>${t("my_children")}</h2>
  </div>
  <ul id="childList"></ul>
  <div id="childModal" class="pm-modal hidden">
    <div class="pm-modal-box">
      <h3 id="childModalTitle">${t("add_child")}</h3>
      <form id="childForm">
        <input type="text" id="childName" name="childName" placeholder="${t("child_name")}" required />
        <div class="age-input-group">
          <input type="number" id="age" name="age" placeholder="${t("age")}" min="0" required />
          <div class="age-unit-toggle">
            <button type="button" id="ageUnitYears" class="active">${t("years_short")}</button>
            <button type="button" id="ageUnitMonths">${t("months_short")}</button>
          </div>
        </div>
        <input type="hidden" id="ageUnit" value="years" />
        <select id="gender" name="gender" required>
          <option value="">${t("select_gender")}</option>
          <option value="male">${t("male")}</option>
          <option value="female">${t("female")}</option>
        </select>
        <div style="margin-top:12px;">
          <label style="font-size:13px;color:#64748b;display:block;margin-bottom:4px;">${t("birth_date")}</label>
          <input type="date" id="birthDate" name="birthDate" />
        </div>
        <div class="pm-modal-actions">
          <button type="submit" class="pm-primary">${t("save")}</button>
          <button type="button" id="closeChildModal">${t("cancel")}</button>
        </div>
      </form>
    </div>
  </div>
  <button id="addChildBtn" class="pm-primary add-child-btn">➕ ${t("add_child")}</button>
</div>`,
    medicines: () => `
      <div class="medicine_list">
        <div class="container">
          <h2>${t("medicine_list")}</h2>
          <div class="tab-content active" data-tab="child-medicines">
            <div class="medicine-child-filter">
              <label for="medicineChildSelect">${t("select_child")}</label>
              <select id="medicineChildSelect">
                <option value="">— ${t("select_child")} —</option>
              </select>
            </div>
            <form id="addMedicineForm">
              <input type="text" id="medicineName" placeholder="${t("medicine_name")}" required>
              <input type="text" id="dosage" placeholder="${t("dosage")}" required>
              <input type="number" id="timesPerDay" placeholder="${t("times_per_day")}" min="1" required>
              <button type="submit">${t("add_medicine")}</button>
            </form>
            <ul id="medicineList"></ul>
          </div>
        </div>
      </div>
    `,

    checklist: () => `
<div class="dailychecklist">
  <div class="container">
    <h2>${t("checklist_title")}</h2>
    <div class="medicine-child-filter">
      <label for="childSelect">${t("select_child")}</label>
      <select id="checklistChildSelect">
        <option value="">— ${t("select_child")} —</option>
      </select>
    </div>
    <p id="selectChildHint" class="hint">👶 ${t("select_child_hint")}</p>
    <ul id="dailyChecklist"></ul>
    <div id="missedWarning" class="warning hidden">⚠️ ${t("missed_yesterday")}</div>
  </div>
</div>
`,

    knowledgebase: `
  <div class="knowledge-page">
    <div class="kb-container">
      <div class="kb-header">
        <h2>Knowledge Base</h2>
        <p>Helpful educational content for parents</p>
      </div>

      <div id="kbHomeView">
        <div class="kb-categories">
          <button class="kb-category-card" data-category="harmful">
            <span class="kb-icon">⚠️</span>
            <h3>Harmful Medicines</h3>
            <p>Important warnings about unsafe medicine use for children.</p>
          </button>

          <button class="kb-category-card" data-category="immunity">
            <span class="kb-icon">🛡️</span>
            <h3>Immunity Tips</h3>
            <p>Simple ways to support your child’s immunity and daily health.</p>
          </button>

          <button class="kb-category-card" data-category="vaccines">
            <span class="kb-icon">💉</span>
            <h3>Vaccines Info</h3>
            <p>Basic vaccine education and guidance for parents.</p>
          </button>

          <button class="kb-category-card" data-category="herbal">
            <span class="kb-icon">🌿</span>
            <h3>Natural Herbal Beverages</h3>
            <p>Safe and beneficial herbal drinks for children's health.</p>
          </button>

          <button class="kb-category-card" data-category="nutrition">
            <span class="kb-icon">🥗</span>
            <h3>Child Nutrition Tips</h3>
            <p>Practical nutrition advice for healthy child development.</p>
          </button>

          <button class="kb-category-card" data-category="sleep">
            <span class="kb-icon">😴</span>
            <h3>Sleep & Development</h3>
            <p>Understanding sleep patterns and their role in child growth.</p>
          </button>
        </div>
      </div>

      <div id="kbListView" class="hidden">
        <div class="kb-topbar">
          <button id="kbBackToHome" class="kb-back-btn">← Back</button>
          <h3 id="kbCategoryTitle"></h3>
        </div>
        <div id="kbArticlesList" class="kb-articles-list"></div>
      </div>

      <div id="kbDetailView" class="hidden">
        <div class="kb-topbar">
          <button id="kbBackToList" class="kb-back-btn">← Back</button>
        </div>

        <article class="kb-article-detail">
          <h3 id="kbDetailTitle"></h3>
          <p id="kbDetailSummary" class="kb-summary"></p>

          <div id="kbDetailWarning" class="kb-warning hidden"></div>

          <div id="kbDetailContent" class="kb-content"></div>
        </article>
      </div>
    </div>
  </div>
`,

    savedarticles: `
<div class="saved-articles-page">
  <h2>⭐ ${t("saved_articles_title")}</h2>
  <div id="savedArticlesGrid" class="saved-articles-grid"></div>
</div>
`,

    addanalysis: () => `
  <div class="addanalysis">
    <div class="container">
      <div class="header">
        <h2>${t("add_analysis")}</h2>
        <div id="messageBox" style="display:none;"></div>
      </div>
      <form id="medicalForm" novalidate>
        <label>${t("select_child")}</label>
        <select id="analysisChildSelect">
          <option value="">${t("select_child")}</option>
        </select>        <label>Analysis Type</label>
        <select id="typeSelect">
          <option value="">Select type</option>
          <option value="blood">🩸 Blood (5 credits)</option>
          <option value="vitamin">💊 ${t("vitamin_analysis")}</option>
        </select>
        <div id="bloodFields" style="display:none;">
          <h4>${t("blood_analysis")}</h4>
          <input type="number" id="hemoglobin" placeholder="${t("hemoglobin")}" step="0.1" />
          <input type="number" id="ferritin" name="ferritin" placeholder="${t("ferritin")}" step="0.1" />
        </div>
        <div id="vitaminFields" style="display:none;">
          <h4>${t("vitamin_analysis")}</h4>
          <input type="number" id="vitaminD" placeholder="${t("vitamin_d")}" step="0.1" />
          <input type="number" id="vitaminB12" placeholder="${t("vitamin_b12")}" step="1" />
        </div>
        <button type="submit">${t("save_analysis")}</button>
      </form>
      <div id="aiAnalysisSection" style="display:none;margin-top:20px;">
        <div class="ai-analysis-card">
          <div class="ai-analysis-header">
            <span>🤖 AI Analysis</span>
            <span id="aiCreditCost" class="ai-credit-badge"></span>
          </div>
          <p style="font-size:13px;color:#64748b;margin:8px 0 12px;">${t("run_ai")}</p>
          <button id="runAIAnalysisBtn" class="ai-run-btn">${t("run_ai")}</button>
        </div>
      </div>
      <div id="aiSummaryBlock" style="display:none;margin-top:16px;"></div>
    </div>
  </div>
`,
    results: () => `
  <div class="results-page">
    <div class="container">
      <h2>${t("results_title")}</h2>
      <div class="filters">
        <label for="childFilter">${t("filter_by_child")}:</label>
        <select id="childFilter">
          <option value="">${t("all_children")}</option>
        </select>
        <label for="typeFilter">${t("filter_by_type")}:</label>
        <select id="typeFilter">
          <option value="">${t("all_types")}</option>
          <option value="blood">${t("blood")}</option>
          <option value="vitamin">${t("vitamin")}</option>
        </select>
      </div>
      <div id="messageBox"></div>
      <div class="content">
        <div class="results">
          <h3>${t("results_title")}</h3>
          <ul id="resultsList"></ul>
        </div>
        <div class="chart">
          <h3>📈 Trend</h3>
          <p id="trendHint" class="hint">👶 ${t("select_child_hint")}</p>
          <canvas id="trendChart"></canvas>
        </div>
      </div>
      <div id="editModal">
        <h3>${t("edit")}</h3>
        <form id="editForm">
          <div id="editFields"></div>
          <div class="modal-buttons">
            <button type="submit">${t("save")}</button>
            <button type="button" id="closeEdit">${t("cancel")}</button>
          </div>
        </form>
      </div>
      <div id="overlay"></div>
    </div>
  </div>
`,

    admin: `<div class="admin-page"></div>`,
    childhealth: `<div class="child-health-page"></div>`,
    family: `<div class="family-page"></div>`,
    notifications: `<div class="notifications-page"></div>`,

    motherhealth: () => `
<div class="motherhealth-page">
  <div class="mh-header">
    <h2>👩 ${t("mh_title")}</h2>
    <p>${t("mh_subtitle")}</p>
  </div>
  <div class="mh-nav-cards">
    <div class="mh-nav-card" data-page="pregnancy">
      <span class="mh-icon">🩸</span>
      <h3>${t("period_title")}</h3>
    </div>
    <div class="mh-nav-card" data-page="medicines">
      <span class="mh-icon">💊</span>
      <h3>${t("my_supplements")}</h3>
    </div>
  </div>
  <div class="mh-cards-grid">
    <div class="mh-card" id="waterIntakeCard">
      <h3>💧 ${t("water_goal")}</h3>
      <label>${t("daily_liters")}</label>
      <input type="number" id="waterLiters" step="0.1" min="0.5" max="5" placeholder="2.0" />
      <p id="waterGlassesDisplay" class="mh-glasses-display"></p>
      <label>${t("start_hour")}</label>
      <input type="number" id="waterStartHour" min="0" max="23" placeholder="7" />
      <label>${t("end_hour")}</label>
      <input type="number" id="waterEndHour" min="0" max="23" placeholder="22" />
      <p id="waterError" class="mh-error"></p>
      <button id="saveWaterBtn">${t("save")}</button>
    </div>
    <div class="mh-card" id="appointmentCard">
      <h3>🏥 ${t("next_appointment")}</h3>
      <label>${t("appointment_date")}</label>
      <input type="date" id="appointmentDate" />
      <p id="appointmentWarning" class="mh-error"></p>
      <button id="saveAppointmentBtn">${t("save")}</button>
    </div>
  </div>
</div>
`,

    pregnancy: () => `
<div class="pregnancy-page">
  <div class="pregnancy-header">
    <h2>🩸 ${t("period_title")}</h2>
  </div>
  <div id="periodPredictions" class="period-predictions"></div>
  <div class="period-calendar-section pregnancy-form-container">
    <h3>📝 ${t("log_period")}</h3>
    <div class="period-inputs">
      <div>
        <label style="display:block;font-size:13px;color:#64748b;margin-bottom:4px;">${t("period_start")}</label>
        <input type="date" id="lastPeriodDate" />
      </div>
      <div>
        <label style="display:block;font-size:13px;color:#64748b;margin-bottom:4px;">${t("period_end")}</label>
        <input type="date" id="periodEndDate" />
      </div>
      <div>
        <label style="display:block;font-size:13px;color:#64748b;margin-bottom:4px;">${t("cycle_length")}</label>
        <input type="number" id="cycleLength" min="21" max="35" value="28" />
      </div>
      <div>
        <label style="display:block;font-size:13px;color:#64748b;margin-bottom:4px;">${t("flow_level")}</label>
        <select id="flowLevel" style="padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;font-size:14px;width:100%;">
          <option value="">${t("select_child")}</option>
          <option value="light">${t("flow_light")}</option>
          <option value="medium">${t("flow_medium")}</option>
          <option value="heavy">${t("flow_heavy")}</option>
        </select>
      </div>
      <div style="display:flex;align-items:flex-end;">
        <button id="savePeriodBtn" class="pm-primary" style="width:100%;">${t("save")}</button>
      </div>
    </div>
  </div>
  <div class="period-calendar-section">
    <div class="calendar-nav">
      <button id="calendarPrev">← ${t("back")}</button>
      <span id="calendarTitle" style="font-weight:600;font-size:16px;color:#1e293b;"></span>
      <button id="calendarNext">${t("next") !== "next" ? t("next") : "Next"} →</button>
    </div>
    <div id="periodCalendarGrid" class="calendar-grid"></div>
    <div id="calendarLegend" class="calendar-legend"></div>
  </div>
  <div class="period-calendar-section pregnancy-form-container">
    <h3>🩺 ${t("symptoms_notes")}</h3>
    <textarea id="symptomsTextarea" placeholder="${t("symptoms_placeholder")}" rows="3" style="width:100%;padding:10px;border-radius:10px;border:1px solid #e2e8f0;font-size:13px;resize:vertical;box-sizing:border-box;"></textarea>
    <button id="updateSymptomsBtn" style="margin-top:8px;">${t("save_notes")}</button>
  </div>
  <div class="period-calendar-section">
    <h3>📊 ${t("cycle_history")}</h3>
    <div id="cycleHistoryList"></div>
  </div>

  <!-- AI Health Chat -->
  <div class="period-calendar-section">
    <div class="chat-header">
      <h3>🤖 AI Health Assistant</h3>
      <span id="chatCreditBadge" class="ai-credit-badge">5 ta bepul</span>
    </div>
    <p style="font-size:13px;color:#64748b;margin:0 0 12px;">Sog'liq haqida savollar bering — hayz, homiladorlik, bola sog'lig'i</p>
    <div id="chatMessages" class="chat-messages"></div>
    <div class="chat-input-row">
      <textarea id="chatInput" class="chat-input" placeholder="Savolingizni yozing..." rows="2"></textarea>
      <button id="chatSendBtn" class="chat-send-btn">Yuborish</button>
    </div>
  </div>
</div>
`,

    billing: `<div id="billingPage"></div>`,

    vaccination: () => `
<div class="vaccination-page">
  <h2>💉 ${t("vaccination_title")}</h2>
  <div class="medicine-child-filter">
    <label>${t("select_child")}</label>
    <select id="vaccinationChildSelect">
      <option value="">${t("select_child_placeholder")}</option>
    </select>
  </div>
  <p id="vaccinationHint" class="hint">👶 ${t("select_child_hint")}</p>
  <ul id="vaccinationList" style="display:none"></ul>
</div>
`,

    settings: () => `
<div class="settings-page">
  <div class="settings-header">
    <h2>⚙️ ${t("settings_title")}</h2>
    <p>${t("settings_subtitle")}</p>
  </div>
  <div class="settings-section">
    <h3>👤 ${t("profile_settings")}</h3>
    <div class="settings-field">
      <label>${t("display_name")}</label>
      <input type="text" id="settingsDisplayName" placeholder="${t("display_name")}" />
    </div>
    <div class="settings-field">
      <label>Email</label>
      <input type="email" id="settingsEmail" readonly class="readonly-field" />
      <small style="color:#94a3b8;font-size:12px;">${t("email_readonly")}</small>
    </div>
    <div id="settingsCredits" style="font-size:15px;font-weight:700;color:#2563eb;margin:8px 0;"></div>
    <button id="saveProfileBtn" class="settings-save-btn">${t("profile_settings")}</button>
  </div>
  <div class="settings-section">
    <h3>🔒 ${t("change_password")}</h3>
    <div class="settings-field">
      <label>${t("current_password")}</label>
      <input type="password" id="currentPassword" placeholder="${t("current_password")}" />
    </div>
    <div class="settings-field">
      <label>${t("new_password")}</label>
      <input type="password" id="newPassword" placeholder="${t("new_password")}" />
    </div>
    <div class="settings-field">
      <label>${t("confirm_password")}</label>
      <input type="password" id="confirmPassword" placeholder="${t("confirm_password")}" />
    </div>
    <p id="passwordError" class="settings-error" style="display:none;"></p>
    <button id="changePasswordBtn" class="settings-save-btn">${t("change_password")}</button>
  </div>
  <div class="settings-section">
    <h3>🔔 ${t("notifications_label")}</h3>
    <div class="settings-toggle-row">
      <span>${t("notifications_label")}</span>
      <label class="toggle-switch">
        <input type="checkbox" id="notificationsToggle" />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>
  <div class="settings-section">
    <h3>📱 ${t("telegram_notifications")}</h3>
    <p style="font-size:13px;color:#64748b;">${t("telegram_hint")}</p>
    <div class="settings-field">
      <label>${t("telegram_chat_id")}</label>
      <input type="text" id="telegramChatId" placeholder="-100xxxxxxxxx" />
      <p id="telegramChatIdError" class="settings-error" style="display:none;">${t("telegram_invalid")}</p>
    </div>
    <button id="saveTelegramBtn" class="settings-save-btn">${t("save")}</button>
  </div>
  <div class="settings-section">
    <h3>🎨 ${t("app_preferences")}</h3>
    <div class="settings-field">
      <label>${t("language")}</label>
      <select id="languageSelect">
        <option value="en">🇬🇧 English</option>
        <option value="uz">🇺🇿 O'zbek</option>
      </select>
    </div>
    <div class="settings-toggle-row">
      <span>${t("dark_mode")}</span>
      <label class="toggle-switch">
        <input type="checkbox" id="darkModeToggle" />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>
  <div class="settings-section danger-zone">
    <h3>⚠️ ${t("danger_zone")}</h3>
    <p style="color:#64748b;font-size:14px;margin-bottom:16px;">${t("delete_account_desc")}</p>
    <button id="deleteAccountBtn" class="settings-danger-btn">${t("delete_account")}</button>
  </div>
  <div class="settings-section">
    <h3>🪙 ${t("credit_history")}</h3>
    <div id="creditHistoryList"></div>
  </div>
  <div id="settingsMessage" class="settings-message" style="display:none;"></div>
</div>
`,
  };

  /* ======================
     DEFAULT PAGE
  ====================== */
  content.innerHTML = pages.home();
  initHomePage();

  // Handle Stripe payment return
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get("payment");
  if (paymentStatus === "success") {
    window.history.replaceState({}, "", window.location.pathname);
    setTimeout(() => {
      const billingItem = dashboard.querySelector(
        '.menu-item[data-page="billing"]',
      );
      if (billingItem) billingItem.click();
    }, 500);
  } else if (paymentStatus === "cancelled") {
    window.history.replaceState({}, "", window.location.pathname);
    import("./toast.js").then(({ toast }) =>
      toast(t("payment_cancelled"), "info"),
    );
  }

  /* ======================
   AUTH + ROLE CHECK
====================== */

  // Check current session on load
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "../auth/login.html";
    return;
  }

  await checkAdminRole(session.user.id);

  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session) {
      window.location.href = "../auth/login.html";
      return;
    }
    await checkAdminRole(session.user.id);
  });

  async function checkAdminRole(uid) {
    const adminMenu = document.getElementById("adminMenu");

    // Default: hidden until confirmed admin
    if (adminMenu) adminMenu.classList.add("hidden");
    window.__userRole = "user";

    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", uid)
        .single();

      if (!error && data?.role === "admin") {
        window.__userRole = "admin";
        if (adminMenu) adminMenu.classList.remove("hidden");
      }
    } catch {
      // keep hidden on any error
    }
  }
  /* ======================
   MOBILE SIDEBAR TOGGLE
====================== */
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebar = dashboard.querySelector(".sidebar");

  function openSidebar() {
    sidebar?.classList.add("open");
    sidebarOverlay?.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.remove("active");
    document.body.style.overflow = "";
  }

  sidebarToggle?.addEventListener("click", () => {
    sidebar?.classList.contains("open") ? closeSidebar() : openSidebar();
  });

  sidebarOverlay?.addEventListener("click", closeSidebar);

  /* ======================
   MENU NAVIGATION
====================== */
  menuItems.forEach((item) => {
    item.addEventListener("click", async () => {
      // Don't allow clicking hidden menu items (e.g. admin for non-admins)
      if (item.classList.contains("hidden")) return;

      menuItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      closeSidebar(); // close sidebar on mobile after nav

      const pageKey = item.dataset.page;
      if (!pages[pageKey]) return;

      // ✅ Old page cleanup
      if (window.__destroyCurrentPage) {
        try {
          window.__destroyCurrentPage();
        } catch (e) {
          console.warn(e);
        }
        window.__destroyCurrentPage = null;
      }

      content.innerHTML =
        typeof pages[pageKey] === "function"
          ? pages[pageKey]()
          : pages[pageKey];

      // Home page stats
      if (pageKey === "home") initHomePage();

      // 🔥 INIT MODULES
      if (pageKey === "children") {
        const module = await import("./children.module.js");
        module.initChildrenModule();
      }

      if (pageKey === "medicines") {
        const module = await import("./medicine.module.js");
        module.initMedicineModule();
      }

      if (pageKey === "checklist") {
        const module = await import("./daily_checklist.module.js");
        module.initDailyChecklist();

        if (typeof module.destroyDailyChecklist === "function") {
          window.__destroyCurrentPage = module.destroyDailyChecklist;
        }
      }

      if (pageKey === "addanalysis") {
        const module = await import("./addanalysis.module.js");
        module.initAddAnalysisModule();

        if (typeof module.destroyAddAnalysisModule === "function") {
          window.__destroyCurrentPage = module.destroyAddAnalysisModule;
        }
      }

      if (pageKey === "results") {
        const module = await import("./results.module.js");
        module.initResultsModule();

        if (typeof module.destroyResultsModule === "function") {
          window.__destroyCurrentPage = module.destroyResultsModule;
        }
      }

      if (pageKey === "knowledgebase") {
        const module = await import("./knowledgebase.module.js");
        module.initKnowledgeBaseModule();

        if (typeof module.destroyKnowledgeBaseModule === "function") {
          window.__destroyCurrentPage = module.destroyKnowledgeBaseModule;
        }
      }

      if (pageKey === "savedarticles") {
        const module = await import("./savedarticles.module.js");
        module.initSavedArticlesModule();
      }

      if (pageKey === "admin") {
        // Extra security: verify admin role before loading
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (currentSession) {
          const { data: userRow } = await supabase
            .from("users")
            .select("role")
            .eq("id", currentSession.user.id)
            .single();
          if (userRow?.role !== "admin") {
            content.innerHTML = pages.home();
            initHomePage();
            return;
          }
        }
        const module = await import("./admin.module.js");
        module.initAdminModule();
      }

      if (pageKey === "motherhealth") {
        const module = await import("./motherhealth.module.js");
        module.initMotherHealthModule();
      }

      if (pageKey === "pregnancy") {
        const module = await import("./pregnancy.module.js");
        module.initPregnancyModule();
      }

      if (pageKey === "billing") {
        const module = await import("./billing.module.js");
        module.initBillingModule();
      }

      if (pageKey === "settings") {
        const module = await import("./settings.module.js");
        module.initSettingsModule();
      }

      if (pageKey === "vaccination") {
        const module = await import("./vaccination.module.js");
        module.initVaccinationModule();
        if (typeof module.destroyVaccinationModule === "function") {
          window.__destroyCurrentPage = module.destroyVaccinationModule;
        }
      }

      if (pageKey === "childhealth") {
        const module = await import("./child_health.module.js");
        module.initChildHealthModule();
        if (typeof module.destroyChildHealthModule === "function") {
          window.__destroyCurrentPage = module.destroyChildHealthModule;
        }
      }

      if (pageKey === "family") {
        const module = await import("./family.module.js");
        module.initFamilyModule();
        if (typeof module.destroyFamilyModule === "function") {
          window.__destroyCurrentPage = module.destroyFamilyModule;
        }
      }

      if (pageKey === "notifications") {
        const module = await import("./notifications.module.js");
        module.initNotificationsModule();
        if (typeof module.destroyNotificationsModule === "function") {
          window.__destroyCurrentPage = module.destroyNotificationsModule;
        }
      }
    });
  });
  /* ======================
     HOME PAGE — STATS & QUICK NAV
  ====================== */
  function initHomePage() {
    // Quick action buttons → navigate to page
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        const target = el.dataset.nav;
        const menuItem = dashboard.querySelector(
          `.menu-item[data-page="${target}"]`,
        );
        if (menuItem) menuItem.click();
      });
    });
  }

  // Re-render home page on language change
  window.addEventListener("langchange", () => {
    const activeItem = dashboard.querySelector(".menu-item.active");
    const activePage = activeItem?.dataset.page;
    if (!activePage || activePage === "home") {
      content.innerHTML = pages.home();
      initHomePage();
    }
    // Re-apply translations to sidebar
    import("./i18n.js").then(({ applyTranslations }) => applyTranslations());
  });

  /* ======================
     LOGOUT
  ====================== */
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      const modal = document.getElementById("logoutModal");
      if (modal) modal.classList.remove("hidden");
    });

    document
      .getElementById("logoutConfirmYes")
      ?.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "../index.html";
      });

    document
      .getElementById("logoutConfirmNo")
      ?.addEventListener("click", () => {
        document.getElementById("logoutModal")?.classList.add("hidden");
      });

    document.getElementById("logoutModal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("logoutModal")) {
        document.getElementById("logoutModal").classList.add("hidden");
      }
    });
  }
});
