// dashboard.js
import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
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
    home: `
      <div class="home-page">
        <h1>Welcome back 👋</h1>

        <div class="home-quick-actions">
          <h2>Quick Actions</h2>
          <div class="quick-actions-grid">
            <button class="quick-action-btn" data-nav="children">
              <span class="qa-icon">➕</span> Add Child
            </button>
            <button class="quick-action-btn" data-nav="medicines">
              <span class="qa-icon">💊</span> Add Medicine
            </button>
            <button class="quick-action-btn" data-nav="addanalysis">
              <span class="qa-icon">🧪</span> Add Analysis
            </button>
            <button class="quick-action-btn" data-nav="checklist">
              <span class="qa-icon">📋</span> Daily Checklist
            </button>
          </div>
        </div>
      </div>
    `,

    children: `<div class="children-page">
  <div class="children-header">
    <h2>My Children</h2>
  </div>

  <ul id="childList"></ul>

  <!-- ADD / EDIT MODAL -->
  <div id="childModal" class="pm-modal hidden">
    <div class="pm-modal-box">
      <h3 id="childModalTitle">Add Child</h3>

      <form id="childForm">
        <input type="text" id="childName" name="childName" placeholder="Child name" required />

        <div class="age-input-group">
          <input type="number" id="age" name="age" placeholder="Age" min="0" required />
          <div class="age-unit-toggle">
            <button type="button" id="ageUnitYears" class="active">yrs</button>
            <button type="button" id="ageUnitMonths">mo</button>
          </div>
        </div>
        <input type="hidden" id="ageUnit" value="years" />

        <select id="gender" name="gender" required>
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <div style="margin-top:12px;">
          <label style="font-size:13px;color:#64748b;display:block;margin-bottom:4px;">Birth Date (optional)</label>
          <input type="date" id="birthDate" name="birthDate" />
        </div>

        <div class="pm-modal-actions">
          <button type="submit" class="pm-primary">Save</button>
          <button type="button" id="closeChildModal">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ADD CHILD BUTTON -->
  <button id="addChildBtn" class="pm-primary add-child-btn">➕ Add Child</button>
</div>

`,
    medicines: `
      <div class="medicine_list">
        <div class="container">
          <h2>Medicine List</h2>

          <div class="tab-content active" data-tab="child-medicines">
            <div class="medicine-child-filter">
              <label for="medicineChildSelect">Select child</label>
              <select id="medicineChildSelect">
                <option value="">— Select child —</option>
              </select>
            </div>

            <form id="addMedicineForm">
              <input type="text" id="medicineName" placeholder="Medicine name" required>
              <input type="text" id="dosage" placeholder="Dosage" required>
              <input type="number" id="timesPerDay" placeholder="Times per day" min="1" required>
              <button type="submit">Add Medicine</button>
            </form>

            <ul id="medicineList"></ul>
          </div>
        </div>
      </div>
    `,

    checklist: `
<div class="dailychecklist">
  <div class="container">
    <h2>Daily Medicine Checklist</h2>

    <div class="medicine-child-filter">
      <label for="childSelect">Select child</label>
      <select id="checklistChildSelect">
        <option value="">— All children —</option>
      </select>
    </div>

    <!-- 👇 HINT -->
    <p id="selectChildHint" class="hint">
      👶 Please select a child to see the checklist
    </p>

    <ul id="dailyChecklist"></ul>

    <div id="missedWarning" class="warning hidden">
      ⚠️ Yesterday you missed your medicines
    </div>
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
  <h2>⭐ Saved Articles</h2>
  <div id="savedArticlesGrid" class="saved-articles-grid"></div>
</div>
`,

    addanalysis: `
  <div class="addanalysis">
    <div class="container">

      <div class="header">
        <h2>Add Medical Analysis</h2>
        <div id="messageBox" style="display:none;"></div>
      </div>

      <form id="medicalForm" novalidate>

        <label>Child</label>
        <select id="analysisChildSelect">
          <option value="">Select child</option>
        </select>

        <label>Analysis Type</label>
        <select id="typeSelect">
          <option value="">Select type</option>
          <option value="blood">🩸 Blood (5 credits)</option>
          <option value="vitamin">💊 Vitamin (4 credits)</option>
        </select>

        <div id="bloodFields" style="display:none;">
          <h4>Blood Analysis</h4>
          <input type="number" id="hemoglobin" placeholder="Hemoglobin (g/dL)" step="0.1" />
          <input type="number" id="ferritin" name="ferritin" placeholder="Ferritin (ng/mL)" step="0.1" />
        </div>

        <div id="vitaminFields" style="display:none;">
          <h4>Vitamin Analysis</h4>
          <input type="number" id="vitaminD" placeholder="Vitamin D (ng/mL)" step="0.1" />
          <input type="number" id="vitaminB12" placeholder="Vitamin B12 (pg/mL)" step="1" />
        </div>

        <button type="submit">Save Analysis</button>
      </form>

      <!-- AI Analysis Block -->
      <div id="aiAnalysisSection" style="display:none;margin-top:20px;">
        <div class="ai-analysis-card">
          <div class="ai-analysis-header">
            <span>🤖 AI Analysis</span>
            <span id="aiCreditCost" class="ai-credit-badge"></span>
          </div>
          <p style="font-size:13px;color:#64748b;margin:8px 0 12px;">
            Get AI-powered interpretation of this analysis result.
          </p>
          <button id="runAIAnalysisBtn" class="ai-run-btn">Run AI Analysis</button>
        </div>
      </div>

      <div id="aiSummaryBlock" style="display:none;margin-top:16px;"></div>

    </div>
  </div>
`,
    results: `
  <div class="results-page">
    <div class="container">
      <h2>Medical Results History & Trends</h2>

      <div class="filters">
        <label for="childFilter">Filter by Child:</label>
        <select id="childFilter">
          <option value="">All Children</option>
        </select>

        <label for="typeFilter">Filter by Type:</label>
        <select id="typeFilter">
          <option value="">All Types</option>
          <option value="blood">Blood</option>
          <option value="vitamin">Vitamin</option>
        </select>
      </div>

      <div id="messageBox"></div>

      <div class="content">
        <div class="results">
          <h3>Analysis Results</h3>
          <ul id="resultsList"></ul>
        </div>

        <div class="chart">
          <h3>Trend Chart</h3>
          <p id="trendHint" class="hint">👶 Please select a child to see the trend</p>
          <canvas id="trendChart"></canvas>
        </div>
      </div>

      <div id="editModal">
        <h3>Edit Analysis</h3>
        <form id="editForm">
          <div id="editFields"></div>
          <div class="modal-buttons">
            <button type="submit">Save</button>
            <button type="button" id="closeEdit">Cancel</button>
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

    motherhealth: `
<div class="motherhealth-page">
  <div class="mh-header">
    <h2>👩 Mother Health</h2>
    <p>Your health, your journey</p>
  </div>
  <div class="mh-nav-cards">
    <div class="mh-nav-card" data-page="pregnancy">
      <span class="mh-icon">🩸</span>
      <h3>Period Tracker</h3>
      <p>Track your cycle, predict ovulation and fertile window</p>
    </div>
    <div class="mh-nav-card" data-page="medicines">
      <span class="mh-icon">💊</span>
      <h3>My Supplements</h3>
      <p>Manage your vitamins and supplements</p>
    </div>
  </div>

  <div class="mh-cards-grid">
    <div class="mh-card" id="waterIntakeCard">
      <h3>💧 Daily Water Goal</h3>
      <label>Daily goal (liters)</label>
      <input type="number" id="waterLiters" step="0.1" min="0.5" max="5" placeholder="e.g. 2.0" />
      <p id="waterGlassesDisplay" class="mh-glasses-display"></p>
      <label>Start hour (0–23)</label>
      <input type="number" id="waterStartHour" min="0" max="23" placeholder="e.g. 7" />
      <label>End hour (0–23)</label>
      <input type="number" id="waterEndHour" min="0" max="23" placeholder="e.g. 22" />
      <p id="waterError" class="mh-error"></p>
      <button id="saveWaterBtn">Save</button>
    </div>

    <div class="mh-card" id="appointmentCard">
      <h3>🏥 Next Doctor Appointment</h3>
      <label>Appointment date</label>
      <input type="date" id="appointmentDate" />
      <p id="appointmentWarning" class="mh-error"></p>
      <button id="saveAppointmentBtn">Save</button>
    </div>
  </div>
</div>
`,

    pregnancy: `
<div class="pregnancy-page">
  <div class="pregnancy-header">
    <h2>🩸 Period Tracker</h2>
    <p>Track your cycle, predict ovulation and fertile window</p>
  </div>

  <!-- Predictions -->
  <div id="periodPredictions" class="period-predictions"></div>

  <!-- Log Form -->
  <div class="period-calendar-section pregnancy-form-container">
    <h3>📝 Log Period</h3>
    <div class="period-inputs">
      <div>
        <label style="display:block;font-size:13px;color:#64748b;margin-bottom:4px;">Period Start Date</label>
        <input type="date" id="lastPeriodDate" />
      </div>
      <div>
        <label style="display:block;font-size:13px;color:#64748b;margin-bottom:4px;">Period End Date</label>
        <input type="date" id="periodEndDate" />
      </div>
      <div>
        <label style="display:block;font-size:13px;color:#64748b;margin-bottom:4px;">Cycle Length (21–35 days)</label>
        <input type="number" id="cycleLength" min="21" max="35" value="28" />
      </div>
      <div>
        <label style="display:block;font-size:13px;color:#64748b;margin-bottom:4px;">Flow Level</label>
        <select id="flowLevel" style="padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;font-size:14px;width:100%;">
          <option value="">Select flow</option>
          <option value="light">🩸 Light</option>
          <option value="medium">🩸🩸 Medium</option>
          <option value="heavy">🩸🩸🩸 Heavy</option>
        </select>
      </div>
      <div style="display:flex;align-items:flex-end;">
        <button id="savePeriodBtn" class="pm-primary" style="width:100%;">Save</button>
      </div>
    </div>
  </div>

  <!-- Calendar -->
  <div class="period-calendar-section">
    <div class="calendar-nav">
      <button id="calendarPrev">&#8592; Prev</button>
      <span id="calendarTitle" style="font-weight:600;font-size:16px;color:#1e293b;"></span>
      <button id="calendarNext">Next &#8594;</button>
    </div>
    <div id="periodCalendarGrid" class="calendar-grid"></div>
    <div id="calendarLegend" class="calendar-legend"></div>
  </div>

  <!-- Symptoms -->
  <div class="period-calendar-section pregnancy-form-container">
    <h3>🩺 Symptoms & Notes</h3>
    <textarea id="symptomsTextarea" placeholder="Note your symptoms, mood, or anything else..." rows="3" style="width:100%;padding:10px;border-radius:10px;border:1px solid #e2e8f0;font-size:13px;resize:vertical;box-sizing:border-box;"></textarea>
    <button id="updateSymptomsBtn" style="margin-top:8px;">Save Notes</button>
  </div>

  <!-- History -->
  <div class="period-calendar-section">
    <h3>📊 Cycle History</h3>
    <div id="cycleHistoryList"></div>
  </div>
</div>
`,

    billing: `
<div id="billingPage"></div>
`,

    vaccination: `
<div class="vaccination-page">
  <h2>💉 Vaccination Tracker</h2>
  <div class="medicine-child-filter">
    <label>Select child</label>
    <select id="vaccinationChildSelect">
      <option value="">— Select child —</option>
    </select>
  </div>
  <p id="vaccinationHint" class="hint">👶 Bolani tanlang</p>
  <ul id="vaccinationList" style="display:none"></ul>
</div>
`,

    settings: `
<div class="settings-page">
  <div class="settings-header">
    <h2>⚙️ Settings</h2>
    <p>Manage your account and preferences</p>
  </div>

  <div class="settings-section">
    <h3>👤 Profile Settings</h3>
    <div class="settings-field">
      <label>Display Name</label>
      <input type="text" id="settingsDisplayName" placeholder="Your name" />
    </div>
    <div class="settings-field">
      <label>Email</label>
      <input type="email" id="settingsEmail" placeholder="your@email.com" readonly class="readonly-field" />
      <small style="color:#94a3b8;font-size:12px;">Email cannot be changed here</small>
    </div>
    <div id="settingsCredits" style="font-size:15px;font-weight:700;color:#2563eb;margin:8px 0;"></div>
    <button id="saveProfileBtn" class="settings-save-btn">Save Profile</button>
  </div>

  <div class="settings-section">
    <h3>🔒 Change Password</h3>
    <div class="settings-field">
      <label>Current Password</label>
      <input type="password" id="currentPassword" placeholder="Current password" />
    </div>
    <div class="settings-field">
      <label>New Password</label>
      <input type="password" id="newPassword" placeholder="New password" />
    </div>
    <div class="settings-field">
      <label>Confirm New Password</label>
      <input type="password" id="confirmPassword" placeholder="Confirm new password" />
    </div>
    <p id="passwordError" class="settings-error" style="display:none;"></p>
    <button id="changePasswordBtn" class="settings-save-btn">Change Password</button>
  </div>

  <div class="settings-section">
    <h3>🔔 Notifications</h3>
    <div class="settings-toggle-row">
      <span>Enable Notifications</span>
      <label class="toggle-switch">
        <input type="checkbox" id="notificationsToggle" />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>

  <div class="settings-section">
  <h3>📱 Telegram Notifications</h3>
  <p style="font-size:13px;color:#64748b;">Telegram botdan chat ID olish: @userinfobot ga /start yuboring</p>
  <div class="settings-field">
    <label>Telegram Chat ID</label>
    <input type="text" id="telegramChatId" placeholder="-100xxxxxxxxx yoki 123456789" />
    <p id="telegramChatIdError" class="settings-error" style="display:none;">
      Noto'g'ri format. Faqat raqamlar (ixtiyoriy minus bilan).
    </p>
  </div>
  <button id="saveTelegramBtn" class="settings-save-btn">Saqlash</button>
</div>

  <div class="settings-section">
    <h3>🎨 App Preferences</h3>
    <div class="settings-field">
      <label>Language</label>
      <select id="languageSelect">
        <option value="en">English</option>
      </select>
    </div>
    <div class="settings-toggle-row">
      <span>Dark Mode</span>
      <label class="toggle-switch">
        <input type="checkbox" id="darkModeToggle" />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>

  <div class="settings-section danger-zone">
    <h3>⚠️ Danger Zone</h3>
    <p style="color:#64748b;font-size:14px;margin-bottom:16px;">Permanently delete your account and all associated data.</p>
    <button id="deleteAccountBtn" class="settings-danger-btn">Delete Account</button>
  </div>

  <div class="settings-section">
    <h3>🪙 Kredit tarixi</h3>
    <div id="creditHistoryList"></div>
  </div>

  <div id="settingsMessage" class="settings-message" style="display:none;"></div>
</div>
`,
  };

  /* ======================
     DEFAULT PAGE
  ====================== */
  content.innerHTML = pages.home;
  initHomePage();

  // Handle Stripe payment return
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get("payment");
  if (paymentStatus === "success") {
    // Clean URL
    window.history.replaceState({}, "", window.location.pathname);
    // Navigate to billing page to show updated balance
    setTimeout(() => {
      const billingItem = dashboard.querySelector(
        '.menu-item[data-page="billing"]',
      );
      if (billingItem) billingItem.click();
    }, 500);
  } else if (paymentStatus === "cancelled") {
    window.history.replaceState({}, "", window.location.pathname);
    import("./toast.js").then(({ toast }) =>
      toast("To'lov bekor qilindi", "info"),
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

      content.innerHTML = pages[pageKey];

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
            content.innerHTML = pages.home;
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
