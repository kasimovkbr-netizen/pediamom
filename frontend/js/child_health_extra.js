// child_health_extra.js — qo'shimcha render funksiyalar
// child_health.module.js ga import qilinadi
// Tables: child_sleep_log, child_feeding_log, child_diaper_log,
//         child_dental_records, child_eye_records, child_hearing_records,
//         solid_food_intro, medication_history, vaccination_certificates
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";

// ─── SLEEP LOG ────────────────────────────────────────────────────────────────
export async function renderSleep(el, childId, userId) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">😴 Uyqu jurnali</div>
      <form id="sleepForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Uxlagan vaqt *</label><input type="datetime-local" id="slStart" required /></div>
          <div><label>Uyg'ongan vaqt</label><input type="datetime-local" id="slEnd" /></div>
          <div><label>Sifat</label>
            <select id="slQuality">
              <option value="good">😊 Yaxshi</option>
              <option value="fair">😐 O'rtacha</option>
              <option value="poor">😟 Yomon</option>
            </select>
          </div>
        </div>
        <textarea id="slNotes" placeholder="Izoh" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div id="sleepList" style="margin-top:16px;"></div>
    </div>
  `;
  if (!childId) return;
  await loadSleepList(childId);
  document.getElementById("sleepForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("child_sleep_log").insert({
      child_id: childId,
      parent_id: userId,
      sleep_start: document.getElementById("slStart").value,
      sleep_end: document.getElementById("slEnd").value || null,
      quality: document.getElementById("slQuality").value,
      notes: document.getElementById("slNotes").value.trim() || null,
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Saqlandi", "success");
    e.target.reset();
    await loadSleepList(childId);
  });
}

async function loadSleepList(childId) {
  const el = document.getElementById("sleepList");
  if (!el) return;
  const { data } = await supabase
    .from("child_sleep_log")
    .select("*")
    .eq("child_id", childId)
    .order("sleep_start", { ascending: false })
    .limit(20);
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Yozuv yo'q</div>`;
    return;
  }
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Uxlagan</th><th>Uyg'ongan</th><th>Davomiyligi</th><th>Sifat</th><th></th></tr></thead>
    <tbody>${data
      .map((r) => {
        const dur = r.sleep_end
          ? Math.round(
              ((new Date(r.sleep_end) - new Date(r.sleep_start)) / 3600000) *
                10,
            ) / 10
          : "—";
        const qc = { good: "green", fair: "yellow", poor: "red" };
        return `<tr>
        <td>${new Date(r.sleep_start).toLocaleString("uz-UZ")}</td>
        <td>${r.sleep_end ? new Date(r.sleep_end).toLocaleString("uz-UZ") : "—"}</td>
        <td>${dur !== "—" ? dur + " soat" : "—"}</td>
        <td><span class="adm-badge ${qc[r.quality] || "gray"}">${r.quality}</span></td>
        <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_sleep_log','${r.id}','sleepList')">🗑</button></td>
      </tr>`;
      })
      .join("")}</tbody>
  </table></div>`;
}

// ─── FEEDING LOG ──────────────────────────────────────────────────────────────
export async function renderFeeding(el, childId, userId) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🍼 Ovqatlanish jurnali</div>
      <form id="feedingForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Tur</label>
            <select id="fType">
              <option value="breast">Ko'krak suti</option>
              <option value="formula">Aralashma</option>
              <option value="solid">Qattiq ovqat</option>
              <option value="water">Suv</option>
            </select>
          </div>
          <div><label>Miqdor (ml)</label><input type="number" id="fAmount" placeholder="120" /></div>
          <div><label>Davomiyligi (min)</label><input type="number" id="fDuration" placeholder="15" /></div>
          <div><label>Vaqt *</label><input type="datetime-local" id="fTime" required /></div>
        </div>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div id="feedingList" style="margin-top:16px;"></div>
    </div>
  `;
  if (!childId) return;
  await loadFeedingList(childId);
  document
    .getElementById("feedingForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await supabase.from("child_feeding_log").insert({
        child_id: childId,
        parent_id: userId,
        feeding_type: document.getElementById("fType").value,
        amount_ml: parseInt(document.getElementById("fAmount").value) || null,
        duration_min:
          parseInt(document.getElementById("fDuration").value) || null,
        fed_at: document.getElementById("fTime").value,
      });
      if (error) {
        toast("Xato: " + error.message, "error");
        return;
      }
      toast("✅ Saqlandi", "success");
      e.target.reset();
      await loadFeedingList(childId);
    });
}

async function loadFeedingList(childId) {
  const el = document.getElementById("feedingList");
  if (!el) return;
  const { data } = await supabase
    .from("child_feeding_log")
    .select("*")
    .eq("child_id", childId)
    .order("fed_at", { ascending: false })
    .limit(20);
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Yozuv yo'q</div>`;
    return;
  }
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Vaqt</th><th>Tur</th><th>Miqdor</th><th>Davomiylik</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td>${new Date(r.fed_at).toLocaleString("uz-UZ")}</td>
      <td>${r.feeding_type}</td>
      <td>${r.amount_ml ? r.amount_ml + " ml" : "—"}</td>
      <td>${r.duration_min ? r.duration_min + " min" : "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_feeding_log','${r.id}','feedingList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── DIAPER LOG ───────────────────────────────────────────────────────────────
export async function renderDiaper(el, childId, userId) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">👶 Baxmal jurnali</div>
      <form id="diaperForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Tur *</label>
            <select id="dpType" required>
              <option value="wet">Ho'l</option>
              <option value="dirty">Iflos</option>
              <option value="both">Ikkalasi</option>
              <option value="dry">Quruq</option>
            </select>
          </div>
          <div><label>Rang</label><input type="text" id="dpColor" placeholder="Sariq, yashil..." /></div>
          <div><label>Vaqt *</label><input type="datetime-local" id="dpTime" required /></div>
        </div>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div id="diaperList" style="margin-top:16px;"></div>
    </div>
  `;
  if (!childId) return;
  await loadDiaperList(childId);
  document
    .getElementById("diaperForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await supabase.from("child_diaper_log").insert({
        child_id: childId,
        parent_id: userId,
        type: document.getElementById("dpType").value,
        color: document.getElementById("dpColor").value.trim() || null,
        logged_at: document.getElementById("dpTime").value,
      });
      if (error) {
        toast("Xato: " + error.message, "error");
        return;
      }
      toast("✅ Saqlandi", "success");
      e.target.reset();
      await loadDiaperList(childId);
    });
}

async function loadDiaperList(childId) {
  const el = document.getElementById("diaperList");
  if (!el) return;
  const { data } = await supabase
    .from("child_diaper_log")
    .select("*")
    .eq("child_id", childId)
    .order("logged_at", { ascending: false })
    .limit(20);
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Yozuv yo'q</div>`;
    return;
  }
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Vaqt</th><th>Tur</th><th>Rang</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td>${new Date(r.logged_at).toLocaleString("uz-UZ")}</td>
      <td>${r.type}</td>
      <td>${r.color || "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_diaper_log','${r.id}','diaperList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── DENTAL ───────────────────────────────────────────────────────────────────
export async function renderDental(el, childId, userId, children) {
  const effectiveChildId = childId || (children?.[0]?.id ?? null);
  const childOpts = `<option value="">— Select child —</option>${(children || []).map((c) => `<option value="${c.id}" ${c.id === effectiveChildId ? "selected" : ""}>${c.name}</option>`).join("")}`;

  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🦷 Dental Visits</div>
      <select id="dentalChildSel" class="ch-child-select" style="margin-bottom:14px;">${childOpts}</select>
      <form id="dentalForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Date *</label><input type="date" id="dtDate" required /></div>
          <div><label>Dentist</label><input type="text" id="dtDentist" placeholder="Dr. Smith" /></div>
          <div><label>Procedure</label><input type="text" id="dtProc" placeholder="Cleaning..." /></div>
          <div><label>Next visit</label><input type="date" id="dtNext" /></div>
        </div>
        <textarea id="dtNotes" placeholder="Notes" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 Save</button>
      </form>
      <div id="dentalList" style="margin-top:16px;"></div>
    </div>
  `;

  let activeChildId = effectiveChildId;

  document
    .getElementById("dentalChildSel")
    .addEventListener("change", async (e) => {
      activeChildId = e.target.value;
      if (activeChildId) await loadDentalList(activeChildId);
      else document.getElementById("dentalList").innerHTML = "";
    });

  if (activeChildId) await loadDentalList(activeChildId);

  document
    .getElementById("dentalForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!activeChildId) {
        toast("Please select a child", "warning");
        return;
      }
      const { error } = await supabase.from("child_dental_records").insert({
        child_id: activeChildId,
        parent_id: userId,
        visit_date: document.getElementById("dtDate").value,
        dentist: document.getElementById("dtDentist").value.trim() || null,
        procedure: document.getElementById("dtProc").value.trim() || null,
        next_visit: document.getElementById("dtNext").value || null,
        notes: document.getElementById("dtNotes").value.trim() || null,
      });
      if (error) {
        toast("Error: " + error.message, "error");
        return;
      }
      toast("✅ Saved", "success");
      e.target.reset();
      await loadDentalList(activeChildId);
    });
}

async function loadDentalList(childId) {
  const el = document.getElementById("dentalList");
  if (!el) return;
  const { data } = await supabase
    .from("child_dental_records")
    .select("*")
    .eq("child_id", childId)
    .order("visit_date", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Yozuv yo'q</div>`;
    return;
  }
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Sana</th><th>Shifokor</th><th>Muolaja</th><th>Keyingi</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td>${r.visit_date}</td>
      <td>${r.dentist || "—"}</td>
      <td>${r.procedure || "—"}</td>
      <td>${r.next_visit || "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_dental_records','${r.id}','dentalList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── EYE ──────────────────────────────────────────────────────────────────────
export async function renderEye(el, childId, userId, children) {
  const effectiveChildId = childId || (children?.[0]?.id ?? null);
  const childOpts = `<option value="">— Select child —</option>${(children || []).map((c) => `<option value="${c.id}" ${c.id === effectiveChildId ? "selected" : ""}>${c.name}</option>`).join("")}`;

  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">👁️ Eye Examination</div>
      <select id="eyeChildSel" class="ch-child-select" style="margin-bottom:14px;">${childOpts}</select>
      <form id="eyeForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Date *</label><input type="date" id="eyDate" required /></div>
          <div><label>Right eye</label><input type="text" id="eyRight" placeholder="20/20" /></div>
          <div><label>Left eye</label><input type="text" id="eyLeft" placeholder="20/20" /></div>
          <div><label>Diagnosis</label><input type="text" id="eyDiag" placeholder="Myopia..." /></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
          <input type="checkbox" id="eyGlasses" />
          <label for="eyGlasses" style="font-size:14px;">Glasses needed</label>
        </div>
        <button type="submit" class="adm-btn-primary" style="margin-top:12px;">💾 Save</button>
      </form>
      <div id="eyeList" style="margin-top:16px;"></div>
    </div>
  `;

  let activeChildId = effectiveChildId;

  document
    .getElementById("eyeChildSel")
    .addEventListener("change", async (e) => {
      activeChildId = e.target.value;
      if (activeChildId) await loadEyeList(activeChildId);
      else document.getElementById("eyeList").innerHTML = "";
    });

  if (activeChildId) await loadEyeList(activeChildId);

  document.getElementById("eyeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeChildId) {
      toast("Please select a child", "warning");
      return;
    }
    const { error } = await supabase.from("child_eye_records").insert({
      child_id: activeChildId,
      parent_id: userId,
      visit_date: document.getElementById("eyDate").value,
      right_eye: document.getElementById("eyRight").value.trim() || null,
      left_eye: document.getElementById("eyLeft").value.trim() || null,
      diagnosis: document.getElementById("eyDiag").value.trim() || null,
      glasses: document.getElementById("eyGlasses").checked,
    });
    if (error) {
      toast("Error: " + error.message, "error");
      return;
    }
    toast("✅ Saved", "success");
    e.target.reset();
    await loadEyeList(activeChildId);
  });
}

async function loadEyeList(childId) {
  const el = document.getElementById("eyeList");
  if (!el) return;
  const { data } = await supabase
    .from("child_eye_records")
    .select("*")
    .eq("child_id", childId)
    .order("visit_date", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Yozuv yo'q</div>`;
    return;
  }
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Sana</th><th>O'ng</th><th>Chap</th><th>Tashxis</th><th>Ko'zoynak</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td>${r.visit_date}</td>
      <td>${r.right_eye || "—"}</td>
      <td>${r.left_eye || "—"}</td>
      <td>${r.diagnosis || "—"}</td>
      <td>${r.glasses ? "✅" : "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_eye_records','${r.id}','eyeList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── HEARING ──────────────────────────────────────────────────────────────────
export async function renderHearing(el, childId, userId, children) {
  const effectiveChildId = childId || (children?.[0]?.id ?? null);
  const childOpts = `<option value="">— Select child —</option>${(children || []).map((c) => `<option value="${c.id}" ${c.id === effectiveChildId ? "selected" : ""}>${c.name}</option>`).join("")}`;

  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">👂 Hearing Test</div>
      <select id="hearingChildSel" class="ch-child-select" style="margin-bottom:14px;">${childOpts}</select>
      <form id="hearingForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Date *</label><input type="date" id="hrDate" required /></div>
          <div><label>Result</label>
            <select id="hrResult">
              <option value="normal">Normal</option>
              <option value="mild_loss">Mild loss</option>
              <option value="moderate_loss">Moderate loss</option>
              <option value="severe_loss">Severe loss</option>
            </select>
          </div>
        </div>
        <textarea id="hrNotes" placeholder="Notes" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 Save</button>
      </form>
      <div id="hearingList" style="margin-top:16px;"></div>
    </div>
  `;

  let activeChildId = effectiveChildId;

  document
    .getElementById("hearingChildSel")
    .addEventListener("change", async (e) => {
      activeChildId = e.target.value;
      if (activeChildId) await loadHearingList(activeChildId);
      else document.getElementById("hearingList").innerHTML = "";
    });

  if (activeChildId) await loadHearingList(activeChildId);

  document
    .getElementById("hearingForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!activeChildId) {
        toast("Please select a child", "warning");
        return;
      }
      const { error } = await supabase.from("child_hearing_records").insert({
        child_id: activeChildId,
        parent_id: userId,
        test_date: document.getElementById("hrDate").value,
        result: document.getElementById("hrResult").value,
        notes: document.getElementById("hrNotes").value.trim() || null,
      });
      if (error) {
        toast("Error: " + error.message, "error");
        return;
      }
      toast("✅ Saved", "success");
      e.target.reset();
      await loadHearingList(activeChildId);
    });
}

async function loadHearingList(childId) {
  const el = document.getElementById("hearingList");
  if (!el) return;
  const { data } = await supabase
    .from("child_hearing_records")
    .select("*")
    .eq("child_id", childId)
    .order("test_date", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Yozuv yo'q</div>`;
    return;
  }
  const rc = {
    normal: "green",
    mild_loss: "yellow",
    moderate_loss: "yellow",
    severe_loss: "red",
  };
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Sana</th><th>Natija</th><th>Izoh</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td>${r.test_date}</td>
      <td><span class="adm-badge ${rc[r.result] || "gray"}">${r.result}</span></td>
      <td>${r.notes || "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('child_hearing_records','${r.id}','hearingList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── SOLID FOOD ───────────────────────────────────────────────────────────────
export async function renderSolidFood(el, childId, userId) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🥣 Qo'shimcha ovqat kiritish</div>
      <form id="solidForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Ovqat nomi *</label><input type="text" id="sfFood" placeholder="Sabzi, olma..." required /></div>
          <div><label>Kiritilgan sana *</label><input type="date" id="sfDate" required /></div>
          <div><label>Reaktsiya</label>
            <select id="sfReaction">
              <option value="none">Reaktsiya yo'q</option>
              <option value="liked">Yoqdi</option>
              <option value="disliked">Yoqmadi</option>
              <option value="allergic">Allergiya</option>
            </select>
          </div>
        </div>
        <textarea id="sfNotes" placeholder="Izoh" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div id="solidList" style="margin-top:16px;"></div>
    </div>
  `;
  if (!childId) return;
  await loadSolidList(childId);
  document.getElementById("solidForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("solid_food_intro").insert({
      child_id: childId,
      parent_id: userId,
      food_name: document.getElementById("sfFood").value.trim(),
      introduced_at: document.getElementById("sfDate").value,
      reaction: document.getElementById("sfReaction").value,
      notes: document.getElementById("sfNotes").value.trim() || null,
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Saqlandi", "success");
    e.target.reset();
    await loadSolidList(childId);
  });
}

async function loadSolidList(childId) {
  const el = document.getElementById("solidList");
  if (!el) return;
  const { data } = await supabase
    .from("solid_food_intro")
    .select("*")
    .eq("child_id", childId)
    .order("introduced_at", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Yozuv yo'q</div>`;
    return;
  }
  const rc = {
    none: "green",
    liked: "blue",
    disliked: "gray",
    allergic: "red",
  };
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Ovqat</th><th>Sana</th><th>Reaktsiya</th><th>Izoh</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td><strong>${r.food_name}</strong></td>
      <td>${r.introduced_at}</td>
      <td><span class="adm-badge ${rc[r.reaction] || "gray"}">${r.reaction}</span></td>
      <td>${r.notes || "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('solid_food_intro','${r.id}','solidList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── MEDICATION HISTORY ───────────────────────────────────────────────────────
export async function renderMedHistory(el, childId, userId) {
  // Build child select using the children array from parent module
  const childSelectHtml = `<select id="medHistChild" class="ch-child-select">
    <option value="">— Select child —</option>
  </select>`;

  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">💊 Med History</div>
      <p style="font-size:13px;color:#64748b;margin:0 0 14px;">
        Medicines added in the <strong>Medicines</strong> section appear here automatically.
        Select a child to view their medicine history.
      </p>
      ${childSelectHtml}
      <div id="medHistList" style="margin-top:16px;"></div>
    </div>
  `;

  // Populate child select from Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  const uid = session.user.id;

  const { data: kids } = await supabase
    .from("children")
    .select("id, name")
    .eq("parent_id", uid);

  const sel = document.getElementById("medHistChild");
  (kids || []).forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });

  // If childId already selected, pre-select and load
  if (childId) {
    sel.value = childId;
    await loadMedHistList(childId);
  }

  sel.addEventListener("change", async (e) => {
    if (e.target.value) await loadMedHistList(e.target.value);
    else document.getElementById("medHistList").innerHTML = "";
  });
}

async function loadMedHistList(childId) {
  const el = document.getElementById("medHistList");
  if (!el) return;

  const { data: medicines, error } = await supabase
    .from("medicine_list")
    .select("id, name, dosage, times_per_day, created_at")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });

  if (error) {
    el.innerHTML = `<div class="adm-empty" style="color:#ef4444;">Error: ${error.message}</div>`;
    return;
  }

  if (!medicines?.length) {
    el.innerHTML = `<div class="adm-empty">No medicines found for this child. Add medicines in the Medicines section.</div>`;
    return;
  }

  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Medicine</th><th>Dosage</th><th>Times/day</th><th>Added</th></tr></thead>
    <tbody>${medicines
      .map(
        (r) => `<tr>
      <td><strong>${r.name}</strong></td>
      <td>${r.dosage || "—"}</td>
      <td>${r.times_per_day || 1}x/day</td>
      <td>${new Date(r.created_at).toLocaleDateString("en-US")}</td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

// ─── VACCINATION CERTIFICATES ─────────────────────────────────────────────────
export async function renderCertificates(el, childId, userId) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">📜 Emlash sertifikatlari</div>
      <form id="certForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Vaksina nomi *</label><input type="text" id="ctVaccine" placeholder="BCG, DTP..." required /></div>
          <div><label>Sertifikat raqami</label><input type="text" id="ctNo" placeholder="CERT-12345" /></div>
          <div><label>Bergan muassasa</label><input type="text" id="ctIssuer" placeholder="1-son poliklinika" /></div>
          <div><label>Berilgan sana</label><input type="date" id="ctDate" /></div>
        </div>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div id="certList" style="margin-top:16px;"></div>
    </div>
  `;
  if (!childId) return;
  await loadCertList(childId);
  document.getElementById("certForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("vaccination_certificates").insert({
      child_id: childId,
      parent_id: userId,
      vaccine_name: document.getElementById("ctVaccine").value.trim(),
      certificate_no: document.getElementById("ctNo").value.trim() || null,
      issued_by: document.getElementById("ctIssuer").value.trim() || null,
      issued_at: document.getElementById("ctDate").value || null,
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Saqlandi", "success");
    e.target.reset();
    await loadCertList(childId);
  });
}

async function loadCertList(childId) {
  const el = document.getElementById("certList");
  if (!el) return;
  const { data } = await supabase
    .from("vaccination_certificates")
    .select("*")
    .eq("child_id", childId)
    .order("issued_at", { ascending: false });
  if (!data?.length) {
    el.innerHTML = `<div class="adm-empty">Sertifikat yo'q</div>`;
    return;
  }
  el.innerHTML = `<div class="adm-table-wrap"><table class="adm-table">
    <thead><tr><th>Vaksina</th><th>Raqam</th><th>Muassasa</th><th>Sana</th><th></th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td><strong>${r.vaccine_name}</strong></td>
      <td>${r.certificate_no || "—"}</td>
      <td>${r.issued_by || "—"}</td>
      <td>${r.issued_at || "—"}</td>
      <td><button class="adm-btn-sm red" onclick="window.__chDelReload('vaccination_certificates','${r.id}','certList')">🗑</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}
