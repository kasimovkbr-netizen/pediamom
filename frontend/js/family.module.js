// family.module.js
// Tables: emergency_contacts, pediatrician_info, insurance_info,
//         blood_type_records, health_goals, daily_notes
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";

let userId = null;
let children = [];

export async function initFamilyModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  userId = session.user.id;
  const { data } = await supabase
    .from("children")
    .select("id,name")
    .eq("parent_id", userId);
  children = data || [];
  renderShell();
  setupTabs();
}

export function destroyFamilyModule() {
  userId = null;
  children = [];
}

function childOpts() {
  return `<option value="">— Bola tanlang —</option>${children.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}`;
}

function renderShell() {
  const page = document.querySelector(".family-page");
  if (!page) return;
  page.innerHTML = `
    <div class="adm-header">
      <div class="adm-title">👨‍👩‍👧 Oila Ma'lumotlari</div>
      <div class="adm-sub">Shoshilinch aloqa, shifokor, sug'urta, qon guruhi, maqsadlar</div>
    </div>
    <div class="adm-tabs" id="famTabs">
      <button class="adm-tab active" data-tab="emergency">🆘 Shoshilinch</button>
      <button class="adm-tab" data-tab="pediatrician">👨‍⚕️ Shifokor</button>
      <button class="adm-tab" data-tab="insurance">🛡️ Sug'urta</button>
      <button class="adm-tab" data-tab="bloodtype">🩸 Qon guruhi</button>
      <button class="adm-tab" data-tab="goals">🎯 Maqsadlar</button>
      <button class="adm-tab" data-tab="notes">📝 Kunlik eslatmalar</button>
    </div>
    <div id="famContent"></div>
  `;
}

function setupTabs() {
  document.querySelectorAll("#famTabs .adm-tab").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document
        .querySelectorAll("#famTabs .adm-tab")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      await loadTab(btn.dataset.tab);
    });
  });
  loadTab("emergency");
}

async function loadTab(tab) {
  const el = document.getElementById("famContent");
  if (!el) return;
  el.innerHTML = `<div class="adm-loading">⏳ Yuklanmoqda...</div>`;
  switch (tab) {
    case "emergency":
      await renderEmergency(el);
      break;
    case "pediatrician":
      await renderPediatrician(el);
      break;
    case "insurance":
      await renderInsurance(el);
      break;
    case "bloodtype":
      await renderBloodType(el);
      break;
    case "goals":
      await renderGoals(el);
      break;
    case "notes":
      await renderNotes(el);
      break;
  }
}

// ─── EMERGENCY CONTACTS ───────────────────────────────────────────────────────
async function renderEmergency(el) {
  const { data } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🆘 Shoshilinch aloqa raqamlari</div>
      <form id="ecForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Ism *</label><input type="text" id="ecName" placeholder="Buvisi Malika" required /></div>
          <div><label>Munosabat</label><input type="text" id="ecRel" placeholder="Buvi, amaki..." /></div>
          <div><label>Telefon *</label><input type="tel" id="ecPhone" placeholder="+998901234567" required /></div>
        </div>
        <button type="submit" class="adm-btn-primary">➕ Qo'shish</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>Ism</th><th>Munosabat</th><th>Telefon</th><th></th></tr></thead>
          <tbody id="ecList">
            ${(data || [])
              .map(
                (r) => `<tr>
              <td><strong>${r.name}</strong></td>
              <td>${r.relationship || "—"}</td>
              <td><a href="tel:${r.phone}">${r.phone}</a></td>
              <td><button class="adm-btn-sm red" onclick="window.__famDel('emergency_contacts','${r.id}',this)">🗑</button></td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("ecForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: userId,
      name: document.getElementById("ecName").value.trim(),
      relationship: document.getElementById("ecRel").value.trim() || null,
      phone: document.getElementById("ecPhone").value.trim(),
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Qo'shildi", "success");
    await renderEmergency(el);
  });
}

// ─── PEDIATRICIAN ─────────────────────────────────────────────────────────────
async function renderPediatrician(el) {
  const { data } = await supabase
    .from("pediatrician_info")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">👨‍⚕️ Pediatr shifokorlar</div>
      <form id="pedForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Ism *</label><input type="text" id="pedName" placeholder="Dr. Karimov" required /></div>
          <div><label>Klinika</label><input type="text" id="pedClinic" placeholder="1-son poliklinika" /></div>
          <div><label>Telefon</label><input type="tel" id="pedPhone" placeholder="+998..." /></div>
          <div><label>Manzil</label><input type="text" id="pedAddr" placeholder="Toshkent, Chilonzor..." /></div>
        </div>
        <button type="submit" class="adm-btn-primary">➕ Qo'shish</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>Shifokor</th><th>Klinika</th><th>Telefon</th><th>Manzil</th><th></th></tr></thead>
          <tbody>${(data || [])
            .map(
              (r) => `<tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.clinic || "—"}</td>
            <td>${r.phone ? `<a href="tel:${r.phone}">${r.phone}</a>` : "—"}</td>
            <td>${r.address || "—"}</td>
            <td><button class="adm-btn-sm red" onclick="window.__famDel('pediatrician_info','${r.id}',this)">🗑</button></td>
          </tr>`,
            )
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("pedForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("pediatrician_info").insert({
      user_id: userId,
      name: document.getElementById("pedName").value.trim(),
      clinic: document.getElementById("pedClinic").value.trim() || null,
      phone: document.getElementById("pedPhone").value.trim() || null,
      address: document.getElementById("pedAddr").value.trim() || null,
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Qo'shildi", "success");
    await renderPediatrician(el);
  });
}

// ─── INSURANCE ────────────────────────────────────────────────────────────────
async function renderInsurance(el) {
  const { data } = await supabase
    .from("insurance_info")
    .select("*")
    .eq("user_id", userId)
    .single()
    .catch(() => ({ data: null }));
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🛡️ Sug'urta ma'lumotlari</div>
      <form id="insForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Sug'urta kompaniyasi</label><input type="text" id="insProvider" value="${data?.provider || ""}" placeholder="Uzinstrakh..." /></div>
          <div><label>Polis raqami</label><input type="text" id="insPolicy" value="${data?.policy_number || ""}" placeholder="INS-12345" /></div>
          <div><label>Amal qilish muddati</label><input type="date" id="insValid" value="${data?.valid_until || ""}" /></div>
        </div>
        <textarea id="insCoverage" placeholder="Qamrov haqida izoh" rows="3">${data?.coverage_notes || ""}</textarea>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
    </div>
  `;
  document.getElementById("insForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      user_id: userId,
      provider: document.getElementById("insProvider").value.trim() || null,
      policy_number: document.getElementById("insPolicy").value.trim() || null,
      valid_until: document.getElementById("insValid").value || null,
      coverage_notes:
        document.getElementById("insCoverage").value.trim() || null,
    };
    const { error } = data
      ? await supabase
          .from("insurance_info")
          .update(payload)
          .eq("user_id", userId)
      : await supabase.from("insurance_info").insert(payload);
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Saqlandi", "success");
  });
}

// ─── BLOOD TYPE ───────────────────────────────────────────────────────────────
async function renderBloodType(el) {
  const { data } = await supabase
    .from("blood_type_records")
    .select("*")
    .eq("user_id", userId);
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🩸 Qon guruhi</div>
      <form id="btForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Bola</label><select id="btChild">${childOpts()}</select></div>
          <div><label>Qon guruhi *</label>
            <select id="btType" required>
              <option value="">Tanlang</option>
              ${["O", "A", "B", "AB"].map((t) => `<option value="${t}">${t}</option>`).join("")}
            </select>
          </div>
          <div><label>Rh faktor</label>
            <select id="btRh">
              <option value="+">Rh+ (musbat)</option>
              <option value="-">Rh- (manfiy)</option>
            </select>
          </div>
        </div>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>Bola</th><th>Qon guruhi</th><th>Rh</th><th></th></tr></thead>
          <tbody>${(data || [])
            .map((r) => {
              const child = children.find((c) => c.id === r.child_id);
              return `<tr>
              <td>${child?.name || "Ona"}</td>
              <td><span class="adm-badge red">${r.blood_type}</span></td>
              <td><span class="adm-badge ${r.rh_factor === "+" ? "blue" : "gray"}">${r.rh_factor}</span></td>
              <td><button class="adm-btn-sm red" onclick="window.__famDel('blood_type_records','${r.id}',this)">🗑</button></td>
            </tr>`;
            })
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("btForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("blood_type_records").insert({
      user_id: userId,
      child_id: document.getElementById("btChild").value || null,
      blood_type: document.getElementById("btType").value,
      rh_factor: document.getElementById("btRh").value,
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Saqlandi", "success");
    await renderBloodType(el);
  });
}

// ─── HEALTH GOALS ─────────────────────────────────────────────────────────────
async function renderGoals(el) {
  const { data } = await supabase
    .from("health_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🎯 Sog'liq maqsadlari</div>
      <form id="goalForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Bola</label><select id="goalChild">${childOpts()}</select></div>
          <div><label>Maqsad turi *</label><input type="text" id="goalType" placeholder="Vazn oshirish, emlash..." required /></div>
          <div><label>Maqsad</label><input type="text" id="goalTarget" placeholder="12 kg ga yetish" /></div>
          <div><label>Muddat</label><input type="date" id="goalDue" /></div>
        </div>
        <button type="submit" class="adm-btn-primary">➕ Qo'shish</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>Maqsad</th><th>Bola</th><th>Muddat</th><th>Holat</th><th></th></tr></thead>
          <tbody>${(data || [])
            .map((r) => {
              const child = children.find((c) => c.id === r.child_id);
              return `<tr>
              <td>${r.goal_type}${r.target ? ` — ${r.target}` : ""}</td>
              <td>${child?.name || "—"}</td>
              <td>${r.due_date || "—"}</td>
              <td>
                <button class="adm-btn-sm ${r.achieved ? "green" : "gray"}"
                  onclick="window.__goalToggle('${r.id}',${r.achieved})">
                  ${r.achieved ? "✅ Bajarildi" : "⏳ Jarayonda"}
                </button>
              </td>
              <td><button class="adm-btn-sm red" onclick="window.__famDel('health_goals','${r.id}',this)">🗑</button></td>
            </tr>`;
            })
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("goalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("health_goals").insert({
      user_id: userId,
      child_id: document.getElementById("goalChild").value || null,
      goal_type: document.getElementById("goalType").value.trim(),
      target: document.getElementById("goalTarget").value.trim() || null,
      due_date: document.getElementById("goalDue").value || null,
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Qo'shildi", "success");
    await renderGoals(el);
  });
  window.__goalToggle = async (id, current) => {
    await supabase
      .from("health_goals")
      .update({ achieved: !current })
      .eq("id", id);
    await renderGoals(el);
  };
}

// ─── DAILY NOTES ──────────────────────────────────────────────────────────────
async function renderNotes(el) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_notes")
    .select("*, children(name)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(30);
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">📝 Kunlik eslatmalar</div>
      <form id="noteForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Bola</label><select id="noteChild">${childOpts()}</select></div>
          <div><label>Sana</label><input type="date" id="noteDate" value="${today}" /></div>
          <div><label>Kayfiyat</label>
            <select id="noteMood">
              <option value="">—</option>
              <option value="great">😊 Ajoyib</option>
              <option value="good">🙂 Yaxshi</option>
              <option value="neutral">😐 O'rtacha</option>
              <option value="bad">😟 Yomon</option>
            </select>
          </div>
        </div>
        <textarea id="noteText" placeholder="Bugungi kuzatuvlar..." rows="3" required></textarea>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div style="margin-top:20px;">
        ${(data || [])
          .map(
            (r) => `
          <div class="adm-section" style="margin-bottom:12px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-weight:600;color:#1e293b;">${r.date} ${r.children?.name ? `— ${r.children.name}` : ""}</span>
              <div>
                ${r.mood ? `<span class="adm-badge gray">${r.mood}</span>` : ""}
                <button class="adm-btn-sm red" style="margin-left:8px;" onclick="window.__famDel('daily_notes','${r.id}',this)">🗑</button>
              </div>
            </div>
            <p style="font-size:14px;color:#475569;margin:0;">${r.note}</p>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
  document.getElementById("noteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("daily_notes").insert({
      user_id: userId,
      child_id: document.getElementById("noteChild").value || null,
      date: document.getElementById("noteDate").value,
      mood: document.getElementById("noteMood").value || null,
      note: document.getElementById("noteText").value.trim(),
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Saqlandi", "success");
    await renderNotes(el);
  });
}

// ─── Global delete ────────────────────────────────────────────────────────────
window.__famDel = async (table, id, btn) => {
  if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    toast("Xato: " + error.message, "error");
    return;
  }
  toast("✅ O'chirildi", "success");
  btn?.closest("tr")?.remove();
};

// ─── PREGNANCY RECORDS ────────────────────────────────────────────────────────
export async function renderPregnancyRecords(el, userId) {
  const { data } = await supabase
    .from("pregnancy_records")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🤰 Homiladorlik yozuvlari</div>
      <form id="pregForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Kutilgan sana</label><input type="date" id="prDue" /></div>
          <div><label>Oxirgi hayz</label><input type="date" id="prLast" /></div>
          <div><label>Shifokor</label><input type="text" id="prDoctor" placeholder="Dr. Nazarova" /></div>
          <div><label>Shifoxona</label><input type="text" id="prHospital" placeholder="1-son tug'ruqxona" /></div>
        </div>
        <textarea id="prNotes" placeholder="Izoh" rows="2"></textarea>
        <button type="submit" class="adm-btn-primary">💾 Saqlash</button>
      </form>
      <div class="adm-table-wrap" style="margin-top:16px;">
        <table class="adm-table">
          <thead><tr><th>Kutilgan sana</th><th>Shifokor</th><th>Shifoxona</th><th>Holat</th><th></th></tr></thead>
          <tbody>${(data || [])
            .map(
              (r) => `<tr>
            <td>${r.due_date || "—"}</td>
            <td>${r.doctor || "—"}</td>
            <td>${r.hospital || "—"}</td>
            <td><span class="adm-badge ${r.status === "active" ? "green" : "gray"}">${r.status}</span></td>
            <td><button class="adm-btn-sm red" onclick="window.__famDel('pregnancy_records','${r.id}',this)">🗑</button></td>
          </tr>`,
            )
            .join("")}</tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById("pregForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("pregnancy_records").insert({
      user_id: userId,
      due_date: document.getElementById("prDue").value || null,
      last_period: document.getElementById("prLast").value || null,
      doctor: document.getElementById("prDoctor").value.trim() || null,
      hospital: document.getElementById("prHospital").value.trim() || null,
      notes: document.getElementById("prNotes").value.trim() || null,
    });
    if (error) {
      toast("Xato: " + error.message, "error");
      return;
    }
    toast("✅ Saqlandi", "success");
    await renderPregnancyRecords(el, userId);
  });
}

// ─── SUPPORT TICKET ───────────────────────────────────────────────────────────
export async function renderSupportTicket(el, userId) {
  el.innerHTML = `
    <div class="adm-section">
      <div class="adm-section-title">🎫 Qo'llab-quvvatlash so'rovi</div>
      <form id="ticketForm" class="ch-form">
        <div class="ch-form-grid">
          <div><label>Mavzu *</label><input type="text" id="tkSubject" placeholder="Muammo tavsifi" required /></div>
          <div><label>Muhimlik</label>
            <select id="tkPriority">
              <option value="low">Past</option>
              <option value="normal" selected>O'rtacha</option>
              <option value="high">Yuqori</option>
              <option value="urgent">Shoshilinch</option>
            </select>
          </div>
        </div>
        <textarea id="tkMessage" placeholder="Muammoni batafsil yozing..." rows="4" required></textarea>
        <button type="submit" class="adm-btn-primary">📤 Yuborish</button>
      </form>
    </div>
  `;
  document
    .getElementById("ticketForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId,
        subject: document.getElementById("tkSubject").value.trim(),
        message: document.getElementById("tkMessage").value.trim(),
        priority: document.getElementById("tkPriority").value,
      });
      if (error) {
        toast("Xato: " + error.message, "error");
        return;
      }
      toast("✅ So'rovingiz yuborildi! Tez orada javob beramiz.", "success");
      document.getElementById("ticketForm").reset();
    });
}
