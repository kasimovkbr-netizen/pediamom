// child_health.module.js
// Tables: child_growth, child_allergies, child_doctor_visits,
//         child_symptoms, child_temperature_log, child_sleep_log,
//         child_feeding_log, child_diaper_log, milestones
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";
import {
  renderSleep,
  renderFeeding,
  renderDiaper,
  renderDental,
  renderEye,
  renderHearing,
  renderSolidFood,
  renderMedHistory,
  renderCertificates,
} from "./child_health_extra.js";

let userId = null;
let selectedChildId = null;
let children = [];

export async function initChildHealthModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  userId = session.user.id;
  await loadChildren();
  renderShell();
  setupTabs();
}

export function destroyChildHealthModule() {
  userId = null;
  selectedChildId = null;
  children = [];
}

async function loadChildren() {
  const { data } = await supabase
    .from("children")
    .select("id, name")
    .eq("parent_id", userId);
  children = data || [];
}

function childSelect(id) {
  return `<select id="${id}" class="ch-child-select">
    <option value="">— Select child —</option>
    ${children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}
  </select>`;
}

function renderShell() {
  const page = document.querySelector(".child-health-page");
  if (!page) return;
  page.innerHTML = `
    <div class="adm-header">
      <div class="adm-title">🏥 Child Health</div>
      <div class="adm-sub">Growth, doctor visits, symptoms, temperature and more</div>
    </div>
    <div class="adm-tabs" id="chTabs" style="flex-wrap:wrap;">
      <button class="adm-tab active" data-tab="growth">📏 Growth</button>
      <button class="adm-tab" data-tab="doctor">🏥 Doctor Visits</button>
      <button class="adm-tab" data-tab="symptoms">🤒 Symptoms</button>
      <button class="adm-tab" data-tab="temperature">🌡️ Temperature</button>
      <button class="adm-tab" data-tab="dental">🦷 Dental</button>
      <button class="adm-tab" data-tab="eye">👁️ Eye</button>
      <button class="adm-tab" data-tab="hearing">👂 Hearing</button>
      <button class="adm-tab" data-tab="medhistory">💊 Med History</button>
    </div>
    <div id="chContent"></div>
  `;
}

function setupTabs() {
  document.querySelectorAll("#chTabs .adm-tab").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document
        .querySelectorAll("#chTabs .adm-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      await loadTab(btn.dataset.tab);
    });
  });
  loadTab("growth");
}

async function loadTab(tab) {
  const content = document.getElementById("chContent");
  if (!content) return;
  content.innerHTML = `<div class="adm-loading">⏳ Loading...</div>`;
  switch (tab) {
    case "growth":
      await renderGrowth(content);
      break;
    case "doctor":
      await renderDoctorVisits(content);
      break;
    case "symptoms":
      await renderSymptoms(content);
      break;
    case "temperature":
      await renderTemperature(content);
      break;
    case "dental":
      await renderDental(content);
      break;
    case "eye":
      await renderEye(content);
      break;
    case "hearing":
      await renderHearing(content);
      break;
    case "medhistory":
      await renderMedHistory(content, selectedChildId, userId);
      break;
  }
}

// ─── GROWTH ───────────────────────────────────────────────────────────────────
async function renderGrowth(el) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">📏 Growth Measurements</div>
      ${childSelect("growthChild")}
      <form id="growthForm" class="ch-form" style="margin-top:14px;">
        <div class="ch-form-grid">
          <div><label>Weight (kg)</label><input type="number" id="gWeight" step="0.1" placeholder="12.5" /></div>
          <div><label>Height (cm)</label><input type="number" id="gHeight" step="0.1" placeholder="85" /></div>
          <div><label>Head circumference (cm)</label><input type="number" id="gHead" step="0.1" placeholder="46" /></div>
          <div><label>Date</label><input type="date" id="gDate" required /></div>
        </div>
        <textarea id="gNotes" placeholder="Notes (optional)" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 Save</button>
      </form>
      <div id="growthList" style="margin-top:20px;"></div>
    </div>
  `;
  document.getElementById("growthChild").addEventListener("change", (e) => {
    selectedChildId = e.target.value;
    loadGrowthList();
  });
  document
    .getElementById("growthForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!selectedChildId) {
        toast("Please select a child", "warning");
        return;
      }
      const { error } = await supabase.from("child_growth").insert({
        child_id: selectedChildId,
        parent_id: userId,
        weight_kg: parseFloat(document.getElementById("gWeight").value) || null,
        height_cm: parseFloat(document.getElementById("gHeight").value) || null,
        head_cm: parseFloat(document.getElementById("gHead").value) || null,
        measured_at: document.getElementById("gDate").value,
        notes: document.getElementById("gNotes").value.trim() || null,
      });
      if (error) {
        toast("Error: " + error.message, "error");
        return;
      }
      toast("✅ Saved", "success");
      e.target.reset();
      loadGrowthList();
    });
}

async function loadGrowthList() {
  const el = document.getElementById("growthList");
  if (!el || !selectedChildId) return;
  const { data } = await supabase
    .from("child_growth")
    .select("*")
    .eq("child_id", selectedChildId)
    .order("measured_at", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">No records found</div>`;
    return;
  }
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Date</th><th>Weight</th><th>Height</th><th>Head</th><th>Notes</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td>${r.measured_at}</td>
      <td>${r.weight_kg ? r.weight_kg + " kg" : "—"}</td>
      <td>${r.height_cm ? r.height_cm + " cm" : "—"}</td>
      <td>${r.head_cm ? r.head_cm + " cm" : "—"}</td>
      <td>${r.notes || "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDel('child_growth','${r.id}','growthList',loadGrowthList)">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── ALLERGIES ────────────────────────────────────────────────────────────────
async function renderAllergies(el) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">⚠️ Allergiyalar</div>
      ${childSelect("allergyChild")}
      <form id="allergyForm" class="ch-form" style="margin-top:14px;">
        <div class="ch-form-grid">
          <div><label>Allergen *</label><input type="text" id="aAllergen" placeholder="Yong'oq, sut..." required /></div>
          <div><label>Darajasi</label>
            <select id="aSeverity">
              <option value="mild">Yengil</option>
              <option value="moderate">O'rtacha</option>
              <option value="severe">Og'ir</option>
            </select>
          </div>
          <div><label>Reaktsiya</label><input type="text" id="aReaction" placeholder="Toshma, yo'tal..." /></div>
          <div><label>Aniqlangan sana</label><input type="date" id="aDiagnosed" /></div>
        </div>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div id="allergyList" style="margin-top:20px;"></div>
    </div>
  `;
  document.getElementById("allergyChild").addEventListener("change", (e) => {
    selectedChildId = e.target.value;
    loadAllergyList();
  });
  document
    .getElementById("allergyForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!selectedChildId) {
        toast("Bola tanlang", "warning");
        return;
      }
      const { error } = await supabase.from("child_allergies").insert({
        child_id: selectedChildId,
        parent_id: userId,
        allergen: document.getElementById("aAllergen").value.trim(),
        severity: document.getElementById("aSeverity").value,
        reaction: document.getElementById("aReaction").value.trim() || null,
        diagnosed_at: document.getElementById("aDiagnosed").value || null,
      });
      if (error) {
        toast("Xato: " + error.message, "error");
        return;
      }
      toast("✅ Saqlandi", "success");
      e.target.reset();
      loadAllergyList();
    });
}

async function loadAllergyList() {
  const el = document.getElementById("allergyList");
  if (!el || !selectedChildId) return;
  const { data } = await supabase
    .from("child_allergies")
    .select("*")
    .eq("child_id", selectedChildId)
    .order("created_at", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Allergiya yo'q</div>`;
    return;
  }
  const sev = { mild: "green", moderate: "yellow", severe: "red" };
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Allergen</th><th>Daraja</th><th>Reaktsiya</th><th>Sana</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td><strong>${r.allergen}</strong></td>
      <td><span class="adm-badge ${sev[r.severity] || "gray"}">${r.severity}</span></td>
      <td>${r.reaction || "—"}</td>
      <td>${r.diagnosed_at || "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_allergies','${r.id}','allergyList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── DOCTOR VISITS ────────────────────────────────────────────────────────────
async function renderDoctorVisits(el) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🏥 Doctor Visits</div>
      ${childSelect("doctorChild")}
      <form id="doctorForm" class="ch-form" style="margin-top:14px;">
        <div class="ch-form-grid">
          <div><label>Date *</label><input type="date" id="dDate" required /></div>
          <div><label>Doctor</label><input type="text" id="dDoctor" placeholder="Dr. Smith" /></div>
          <div><label>Clinic</label><input type="text" id="dClinic" placeholder="City Clinic" /></div>
          <div><label>Diagnosis</label><input type="text" id="dDiagnosis" placeholder="ARVI, bronchitis..." /></div>
        </div>
        <textarea id="dPrescription" placeholder="Prescription / medicines" rows="2"></textarea>
        <textarea id="dNotes" placeholder="Notes" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 Save</button>
      </form>
      <div id="doctorList" style="margin-top:20px;"></div>
    </div>
  `;
  document.getElementById("doctorChild").addEventListener("change", (e) => {
    selectedChildId = e.target.value;
    loadDoctorList();
  });
  document
    .getElementById("doctorForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!selectedChildId) {
        toast("Please select a child", "warning");
        return;
      }
      const { error } = await supabase.from("child_doctor_visits").insert({
        child_id: selectedChildId,
        parent_id: userId,
        visit_date: document.getElementById("dDate").value,
        doctor_name: document.getElementById("dDoctor").value.trim() || null,
        clinic: document.getElementById("dClinic").value.trim() || null,
        diagnosis: document.getElementById("dDiagnosis").value.trim() || null,
        prescription:
          document.getElementById("dPrescription").value.trim() || null,
        notes: document.getElementById("dNotes").value.trim() || null,
      });
      if (error) {
        toast("Error: " + error.message, "error");
        return;
      }
      toast("✅ Saved", "success");
      e.target.reset();
      loadDoctorList();
    });
}

async function loadDoctorList() {
  const el = document.getElementById("doctorList");
  if (!el || !selectedChildId) return;
  const { data } = await supabase
    .from("child_doctor_visits")
    .select("*")
    .eq("child_id", selectedChildId)
    .order("visit_date", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">No visits found</div>`;
    return;
  }
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Date</th><th>Doctor</th><th>Diagnosis</th><th>Prescription</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td>${r.visit_date}</td>
      <td>${r.doctor_name || "—"}</td>
      <td>${r.diagnosis || "—"}</td>
      <td>${r.prescription ? r.prescription.substring(0, 40) + "..." : "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_doctor_visits','${r.id}','doctorList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── SYMPTOMS ─────────────────────────────────────────────────────────────────
async function renderSymptoms(el) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🤒 Illness Symptoms</div>
      ${childSelect("symptomChild")}
      <form id="symptomForm" class="ch-form" style="margin-top:14px;">
        <div class="ch-form-grid">
          <div><label>Symptom *</label><input type="text" id="sSymptom" placeholder="Fever, cough..." required /></div>
          <div><label>Severity</label>
            <select id="sSeverity">
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          <div><label>Started</label><input type="date" id="sStart" /></div>
          <div><label>Ended</label><input type="date" id="sEnd" /></div>
        </div>
        <button type="submit" class="adm-btn-primary">💾 Save</button>
      </form>
      <div id="symptomList" style="margin-top:20px;"></div>
    </div>
  `;
  document.getElementById("symptomChild").addEventListener("change", (e) => {
    selectedChildId = e.target.value;
    loadSymptomList();
  });
  document
    .getElementById("symptomForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!selectedChildId) {
        toast("Please select a child", "warning");
        return;
      }
      const { error } = await supabase.from("child_symptoms").insert({
        child_id: selectedChildId,
        parent_id: userId,
        symptom: document.getElementById("sSymptom").value.trim(),
        severity: document.getElementById("sSeverity").value,
        started_at: document.getElementById("sStart").value || null,
        ended_at: document.getElementById("sEnd").value || null,
      });
      if (error) {
        toast("Error: " + error.message, "error");
        return;
      }
      toast("✅ Saved", "success");
      e.target.reset();
      loadSymptomList();
    });
}

async function loadSymptomList() {
  const el = document.getElementById("symptomList");
  if (!el || !selectedChildId) return;
  const { data } = await supabase
    .from("child_symptoms")
    .select("*")
    .eq("child_id", selectedChildId)
    .order("created_at", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">No symptoms found</div>`;
    return;
  }
  const sev = { mild: "green", moderate: "yellow", severe: "red" };
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Symptom</th><th>Severity</th><th>Started</th><th>Ended</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td>${r.symptom}</td>
      <td><span class="adm-badge ${sev[r.severity] || "gray"}">${r.severity}</span></td>
      <td>${r.started_at || "—"}</td>
      <td>${r.ended_at || "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_symptoms','${r.id}','symptomList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── TEMPERATURE ──────────────────────────────────────────────────────────────
async function renderTemperature(el) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🌡️ Temperature Log</div>
      ${childSelect("tempChild")}
      <form id="tempForm" class="ch-form" style="margin-top:14px;">
        <div class="ch-form-grid">
          <div><label>Temperature *</label><input type="number" id="tTemp" step="0.1" placeholder="36.6" required /></div>
          <div><label>Method</label>
            <select id="tMethod">
              <option value="axillary">Axillary</option>
              <option value="oral">Oral</option>
              <option value="rectal">Rectal</option>
              <option value="ear">Ear</option>
            </select>
          </div>
          <div><label>Date & Time</label><input type="datetime-local" id="tTime" required /></div>
        </div>
        <textarea id="tNotes" placeholder="Notes" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 Save</button>
      </form>
      <div id="tempList" style="margin-top:20px;"></div>
    </div>
  `;
  document.getElementById("tempChild").addEventListener("change", (e) => {
    selectedChildId = e.target.value;
    loadTempList();
  });
  document.getElementById("tempForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedChildId) {
      toast("Please select a child", "warning");
      return;
    }
    const { error } = await supabase.from("child_temperature_log").insert({
      child_id: selectedChildId,
      parent_id: userId,
      temperature: parseFloat(document.getElementById("tTemp").value),
      method: document.getElementById("tMethod").value,
      measured_at: document.getElementById("tTime").value,
      notes: document.getElementById("tNotes").value.trim() || null,
    });
    if (error) {
      toast("Error: " + error.message, "error");
      return;
    }
    toast("✅ Saved", "success");
    e.target.reset();
    loadTempList();
  });
}

async function loadTempList() {
  const el = document.getElementById("tempList");
  if (!el || !selectedChildId) return;
  const { data } = await supabase
    .from("child_temperature_log")
    .select("*")
    .eq("child_id", selectedChildId)
    .order("measured_at", { ascending: false })
    .limit(20);
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">No records found</div>`;
    return;
  }
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Time</th><th>Temperature</th><th>Method</th><th>Notes</th><th></th></tr></thead>
    <tbody>${data
      .map((r) => {
        const t = parseFloat(r.temperature);
        const badge = t >= 38.5 ? "red" : t >= 37.5 ? "yellow" : "green";
        return `<tr>
        <td>${new Date(r.measured_at).toLocaleString("en-US")}</td>
        <td><span class="adm-badge ${badge}">${r.temperature}°C</span></td>
        <td>${r.method}</td>
        <td>${r.notes || "—"}</td>
        <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_temperature_log','${r.id}','tempList')">🗑</button></td>
      </tr>`;
      })
      .join("")}</tbody>
  </table></div>`;
}

// ─── MILESTONES ───────────────────────────────────────────────────────────────
async function renderMilestones(el) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🎯 Rivojlanish bosqichlari</div>
      ${childSelect("msChild")}
      <form id="msForm" class="ch-form" style="margin-top:14px;">
        <div class="ch-form-grid">
          <div><label>Bosqich *</label><input type="text" id="msMilestone" placeholder="Birinchi qadam, birinchi so'z..." required /></div>
          <div><label>Kategoriya</label>
            <select id="msCategory">
              <option value="motor">Harakat</option>
              <option value="speech">Nutq</option>
              <option value="social">Ijtimoiy</option>
              <option value="cognitive">Bilish</option>
            </select>
          </div>
          <div><label>Erishilgan sana</label><input type="date" id="msDate" /></div>
        </div>
        <textarea id="msNotes" placeholder="Izoh" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div id="msList" style="margin-top:20px;"></div>
    </div>
  `;
  document.getElementById("msChild").addEventListener("change", (e) => {
    selectedChildId = e.target.value;
    loadMilestoneList();
  });
  document.getElementById("msForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedChildId) {
      toast("Bola tanlang", "warning");
      return;
    }
    const { error } = await supabase.from("milestones").insert({
      child_id: selectedChildId,
      parent_id: userId,
      milestone: document.getElementById("msMilestone").value.trim(),
      category: document.getElementById("msCategory").value,
      achieved_at: document.getElementById("msDate").value || null,
      notes: document.getElementById("msNotes").value.trim() || null,
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Saqlandi", "success");
    e.target.reset();
    loadMilestoneList();
  });
}

async function loadMilestoneList() {
  const el = document.getElementById("msList");
  if (!el || !selectedChildId) return;
  const { data } = await supabase
    .from("milestones")
    .select("*")
    .eq("child_id", selectedChildId)
    .order("achieved_at", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Bosqich yo'q</div>`;
    return;
  }
  const catColor = {
    motor: "blue",
    speech: "purple",
    social: "green",
    cognitive: "yellow",
  };
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Bosqich</th><th>Kategoriya</th><th>Sana</th><th>Izoh</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td>${r.milestone}</td>
      <td><span class="adm-badge ${catColor[r.category] || "gray"}">${r.category}</span></td>
      <td>${r.achieved_at || "—"}</td>
      <td>${r.notes || "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('milestones','${r.id}','msList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── Global delete helper ─────────────────────────────────────────────────────
window.__chDelReload = async (table, id, listId) => {
  if (!confirm("Are you sure you want to delete this record?")) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    toast("Error: " + error.message, "error");
    return;
  }
  toast("✅ Deleted", "success");
  document
    .getElementById(listId)
    ?.querySelectorAll("tr")
    .forEach((tr) => {
      if (tr.innerHTML.includes(id)) tr.remove();
    });
};
