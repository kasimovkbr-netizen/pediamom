// addanalysis.module.js
import { supabase } from "./supabase.js";
import { t } from "./i18n.js";

let userId = null;
let realtimeChannel = null;

/* ======================
   VALIDATION HELPERS
====================== */

export function calculateAge(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
}

export function validateHemoglobin(value, ageMonths, gender) {
  if (value < 0 || value > 25) return "invalid";
  let threshold;
  if (ageMonths >= 6 && ageMonths <= 59) threshold = 11.0;
  else if (ageMonths >= 60 && ageMonths <= 143) threshold = 11.5;
  else if (ageMonths >= 144) threshold = gender === "female" ? 12.0 : 13.0;
  else return "ok";
  return value < threshold ? "low" : "ok";
}

export function validateFerritin(value, ageMonths) {
  if (value < 0 || value > 2000) return "invalid";
  let threshold;
  if (ageMonths >= 6 && ageMonths <= 59) threshold = 12;
  else if (ageMonths >= 60 && ageMonths <= 143) threshold = 15;
  else if (ageMonths >= 144) threshold = 12;
  else return "ok";
  return value < threshold ? "low" : "ok";
}

export function showValidationWarning(message) {
  let warning = document.getElementById("validationWarning");
  if (!warning) {
    warning = document.createElement("div");
    warning.id = "validationWarning";
    const submitBtn = document.querySelector(
      "#medicalForm button[type='submit']",
    );
    if (submitBtn) submitBtn.parentNode.insertBefore(warning, submitBtn);
  }
  if (!message) {
    warning.style.display = "none";
    warning.textContent = "";
  } else {
    warning.style.display = "block";
    warning.textContent = message;
  }
}

export async function getChildData(childId) {
  try {
    const { data, error } = await supabase
      .from("children")
      .select("birth_date, gender")
      .eq("id", childId)
      .single();
    if (error || !data) return null;
    return { birthDate: data.birth_date, gender: data.gender };
  } catch {
    return null;
  }
}

/* ======================
   INIT
====================== */

export function initAddAnalysisModule() {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return;
    userId = session.user.id;
    setupUI();
    loadChildrenDropdown();
  });
}

export function destroyAddAnalysisModule() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  userId = null;
}

/* ======================
   UI SETUP
====================== */

const CREDIT_COSTS = { blood: 5, vitamin: 4 };

function setupUI() {
  const childSelect = document.getElementById("analysisChildSelect");
  const typeSelect = document.getElementById("typeSelect");
  const bloodFields = document.getElementById("bloodFields");
  const vitaminFields = document.getElementById("vitaminFields");
  const form = document.getElementById("medicalForm");
  const messageBox = document.getElementById("messageBox");
  const aiSection = document.getElementById("aiAnalysisSection");
  const aiCreditBadge = document.getElementById("aiCreditCost");

  if (!childSelect || !typeSelect || !form || !messageBox) return;

  // Last saved analysis id for AI button
  let lastSavedAnalysisId = null;
  let lastSavedType = null;
  let lastSavedData = null;

  typeSelect.onchange = () => {
    if (bloodFields) bloodFields.style.display = "none";
    if (vitaminFields) vitaminFields.style.display = "none";
    // Only hide AI section if user is changing type (not on form reset)
    if (typeSelect.value === "") return;
    if (aiSection) aiSection.style.display = "none";
    if (typeSelect.value === "blood" && bloodFields)
      bloodFields.style.display = "flex";
    if (typeSelect.value === "vitamin" && vitaminFields)
      vitaminFields.style.display = "flex";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      showMessage("You are not logged in", "error");
      return;
    }
    if (!childSelect.value) {
      showMessage(t("select_child_first"), "error");
      return;
    }
    if (!typeSelect.value) {
      showMessage(t("select_type_first"), "error");
      return;
    }

    const type = typeSelect.value;
    let data = {};

    if (type === "blood") {
      const hemoglobin = document.getElementById("hemoglobin")?.value;
      const ferritin = document.getElementById("ferritin")?.value;
      if (!hemoglobin || !ferritin) {
        showMessage(t("fill_blood_fields"), "error");
        return;
      }

      const hgbNum = Number(hemoglobin);
      const ferNum = Number(ferritin);
      const childData = await getChildData(childSelect.value);
      if (childData) {
        const ageMonths = calculateAge(childData.birthDate);
        const hgbResult = validateHemoglobin(
          hgbNum,
          ageMonths,
          childData.gender,
        );
        const ferResult = validateFerritin(ferNum, ageMonths);
        if (hgbResult === "invalid" || ferResult === "invalid") {
          showMessage("Invalid value entered", "error");
          return;
        }
        const warnings = [];
        if (hgbResult === "low") warnings.push("⚠️ Hemoglobin is low");
        if (ferResult === "low") warnings.push("⚠️ Ferritin is low");
        showValidationWarning(
          warnings.length > 0 ? warnings.join(" | ") : null,
        );
      }
      data = { hemoglobin: hgbNum, ferritin: ferNum };
    }

    if (type === "vitamin") {
      const vitaminD = document.getElementById("vitaminD")?.value;
      const vitaminB12 = document.getElementById("vitaminB12")?.value;
      if (!vitaminD || !vitaminB12) {
        showMessage("Please fill all vitamin fields", "error");
        return;
      }
      data = { vitaminD: Number(vitaminD), vitaminB12: Number(vitaminB12) };
    }

    try {
      const { data: inserted, error } = await supabase
        .from("medical_analyses")
        .insert({
          parent_id: userId,
          child_id: childSelect.value,
          type,
          data,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;

      lastSavedAnalysisId = inserted?.id;
      lastSavedType = type;
      lastSavedData = data;

      showMessage("Analysis saved successfully!", "success");

      // Show AI analysis section BEFORE form.reset() to prevent it being hidden
      if (aiSection) {
        aiSection.style.display = "block";
        if (aiCreditBadge)
          aiCreditBadge.textContent = `${CREDIT_COSTS[type] || 5} credits`;
      }

      // Reset form fields manually (not form.reset() — it triggers typeSelect.onchange)
      document.getElementById("hemoglobin") &&
        (document.getElementById("hemoglobin").value = "");
      document.getElementById("ferritin") &&
        (document.getElementById("ferritin").value = "");
      document.getElementById("vitaminD") &&
        (document.getElementById("vitaminD").value = "");
      document.getElementById("vitaminB12") &&
        (document.getElementById("vitaminB12").value = "");
      if (bloodFields) bloodFields.style.display = "none";
      if (vitaminFields) vitaminFields.style.display = "none";
      typeSelect.value = "";
      showValidationWarning(null);
    } catch (err) {
      console.error("Analysis error:", err);
      showMessage("Error saving analysis", "error");
    }
  };

  // AI Analysis button
  document
    .getElementById("runAIAnalysisBtn")
    ?.addEventListener("click", async () => {
      if (!lastSavedAnalysisId) return;
      await runAIAnalysis(lastSavedAnalysisId, lastSavedType, lastSavedData);
    });
}

/* ======================
   CHILDREN DROPDOWN
====================== */

function loadChildrenDropdown() {
  const childSelect = document.getElementById("analysisChildSelect");
  if (!childSelect || !userId) return;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  // Initial load
  supabase
    .from("children")
    .select("id, name")
    .eq("parent_id", userId)
    .then(({ data }) => {
      const current = childSelect.value;
      childSelect.innerHTML = `<option value="">Select child</option>`;
      (data || []).forEach((child) => {
        const option = document.createElement("option");
        option.value = child.id;
        option.textContent = child.name;
        childSelect.appendChild(option);
      });
      if (
        current &&
        Array.from(childSelect.options).some((o) => o.value === current)
      ) {
        childSelect.value = current;
      }
    });

  // Realtime subscription
  realtimeChannel = supabase
    .channel("addanalysis-children")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "children",
        filter: `parent_id=eq.${userId}`,
      },
      () => loadChildrenDropdown(),
    )
    .subscribe();
}

/* ======================
   AI ANALYSIS
====================== */

async function runAIAnalysis(analysisId, type, data) {
  const btn = document.getElementById("runAIAnalysisBtn");
  const block = document.getElementById("aiSummaryBlock");
  if (!btn || !block) return;

  btn.disabled = true;
  btn.textContent = "⏳ Analyzing...";
  block.innerHTML = `<div style="color:#64748b;font-size:14px;padding:12px;">⏳ AI analysis in progress, please wait...</div>`;
  block.style.display = "block";

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      block.innerHTML = `<div class="ai-error-box">❌ Session expired. Please log in again.</div>`;
      return;
    }

    const token = session.access_token;
    const apiBase = window.__API_BASE_URL__ || "http://localhost:3001";

    const res = await fetch(`${apiBase}/api/analysis/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ analysisId, type, data }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      if (result.error?.code === "insufficient_credits") {
        block.innerHTML = `<div class="ai-error-box">❌ Insufficient credits. Required: <b>${result.error.creditsNeeded}</b>, available: <b>${result.error.creditsAvailable ?? 0}</b>. <a href="#" onclick="document.querySelector('[data-page=billing]')?.click();return false;">Buy credits →</a></div>`;
      } else {
        block.innerHTML = `<div class="ai-error-box">❌ ${result.error?.message || "AI analysis failed"}</div>`;
      }
      return;
    }

    renderAISummary(block, result.data);
    btn.textContent = "🔄 Re-analyze";
  } catch (err) {
    console.error("AI analysis error:", err);
    const msg = err.message?.includes("quota")
      ? "❌ AI service temporarily unavailable (quota exceeded). Please try again later."
      : "❌ Could not connect to server. Please try again.";
    block.innerHTML = `<div class="ai-error-box">${msg}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function renderAISummary(block, result) {
  if (!block || !result) return;

  let html = `<div class="ai-summary-block">`;
  html += `<h4 style="margin:0 0 12px;color:#1e293b;font-size:16px;">🤖 AI Analysis Result</h4>`;

  if (result.creditsUsed) {
    html += `<div class="ai-credit-used">${result.creditsUsed} credits used · Remaining: ${result.creditsRemaining ?? "?"}</div>`;
  }

  if (result.interpretation) {
    html += `<p style="color:#334155;font-size:14px;line-height:1.6;margin:10px 0;">${result.interpretation}</p>`;
  }

  if (result.recommendations?.length > 0) {
    html += `<p style="font-weight:600;color:#1e293b;margin:12px 0 6px;font-size:14px;">Recommendations:</p><ul style="margin:0;padding-left:20px;">`;
    result.recommendations.forEach((rec) => {
      html += `<li style="color:#475569;font-size:13px;margin-bottom:4px;">${rec}</li>`;
    });
    html += `</ul>`;
  }

  html += `</div>`;
  block.innerHTML = html;
  block.style.display = "block";
}

export function showAISummary(result) {
  const block = document.getElementById("aiSummaryBlock");
  if (!block) return;
  renderAISummary(block, result);
}

function showMessage(text, type = "success") {
  const messageBox = document.getElementById("messageBox");
  if (!messageBox) return;
  messageBox.style.display = "block";
  messageBox.textContent = text;
  messageBox.className = type === "error" ? "error" : "success";
  setTimeout(() => {
    messageBox.style.display = "none";
  }, 3000);
}
