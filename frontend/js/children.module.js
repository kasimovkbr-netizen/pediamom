// children.module.js — Professional, bug-free
import { supabase } from "./supabase.js";
import { computeScheduledDate } from "./vaccination_utils.js";
import { UZ_VACCINE_SCHEDULE } from "./uz_vaccine_schedule.js";
import { generateVaccinationRecords } from "./vaccination.module.js";

let userId = null;
let editId = null;
let channel = null;
let initialized = false;

// ─── Init / Destroy ───────────────────────────────────────────────────────────

export async function initChildrenModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "../auth/login.html";
    return;
  }

  userId = session.user.id;
  initialized = false; // reset so setupUI runs fresh

  await loadChildren();
  setupUI();
  subscribeRealtime();
}

export function destroyChildrenModule() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  userId = null;
  editId = null;
  initialized = false;
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

function subscribeRealtime() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  channel = supabase
    .channel("children-" + userId)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "children",
        filter: `parent_id=eq.${userId}`,
      },
      () => loadChildren(),
    )
    .subscribe();
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadChildren() {
  const list = document.getElementById("childList");
  if (!list || !userId) return;

  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("parent_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[children] load:", error);
    return;
  }

  list.innerHTML = "";

  if (!data?.length) {
    list.innerHTML = `<li class="child-empty">
      <div style="text-align:center;padding:32px;color:#94a3b8;">
        <div style="font-size:48px;margin-bottom:12px;">👶</div>
        <div style="font-size:15px;font-weight:600;">Hali bola qo'shilmagan</div>
        <div style="font-size:13px;margin-top:4px;">Quyidagi tugmani bosib bola qo'shing</div>
      </div>
    </li>`;
    return;
  }

  data.forEach((c) => {
    const li = document.createElement("li");
    li.className = "child-card";

    const ageLabel =
      c.age_unit === "months" ? `${c.age ?? 0} oy` : `${c.age ?? 0} yosh`;

    const genderIcon =
      c.gender === "male" ? "👦" : c.gender === "female" ? "👧" : "👶";
    const birthLabel = c.birth_date
      ? `<span class="child-birth">📅 ${c.birth_date}</span>`
      : "";

    li.innerHTML = `
      <div class="child-info">
        <span class="child-avatar">${genderIcon}</span>
        <div class="child-details">
          <span class="child-name">${esc(c.name)}</span>
          <div class="child-meta">
            <span>${ageLabel}</span>
            <span class="divider">·</span>
            <span>${esc(c.gender || "—")}</span>
            ${c.birth_date ? `<span class="divider">·</span>${birthLabel}` : ""}
          </div>
        </div>
      </div>
      <div class="child-actions">
        <button class="editBtn" data-id="${c.id}">✏️ Tahrir</button>
        <button class="deleteBtn" data-id="${c.id}">🗑️ O'chirish</button>
      </div>
    `;

    li.querySelector(".editBtn").onclick = () => openModal(c);
    li.querySelector(".deleteBtn").onclick = () => confirmDelete(c.id, c.name);
    list.appendChild(li);
  });
}

// ─── Setup UI (runs once per init) ───────────────────────────────────────────

function setupUI() {
  if (initialized) return;
  initialized = true;

  // Add button
  const addBtn = document.getElementById("addChildBtn");
  if (addBtn) {
    addBtn.onclick = null; // clear previous
    addBtn.onclick = () => openModal(null);
  }

  // Close modal
  const closeBtn = document.getElementById("closeChildModal");
  if (closeBtn) {
    closeBtn.onclick = null;
    closeBtn.onclick = closeModal;
  }

  // Age unit toggle
  const ageUnitYears = document.getElementById("ageUnitYears");
  const ageUnitMonths = document.getElementById("ageUnitMonths");
  const ageUnitInput = document.getElementById("ageUnit");
  const ageInput = document.getElementById("age");

  if (ageUnitYears) {
    ageUnitYears.onclick = () => {
      ageUnitYears.classList.add("active");
      ageUnitMonths?.classList.remove("active");
      if (ageUnitInput) ageUnitInput.value = "years";
      if (ageInput) ageInput.placeholder = "Yosh (yil)";
    };
  }
  if (ageUnitMonths) {
    ageUnitMonths.onclick = () => {
      ageUnitMonths.classList.add("active");
      ageUnitYears?.classList.remove("active");
      if (ageUnitInput) ageUnitInput.value = "months";
      if (ageInput) ageInput.placeholder = "Yosh (oy)";
    };
  }

  // Form submit — use onsubmit (not addEventListener) to prevent duplicates
  const form = document.getElementById("childForm");
  if (form) {
    form.onsubmit = handleFormSubmit;
  }

  // Confirm modal
  const yesBtn = document.getElementById("confirmYes");
  const noBtn = document.getElementById("confirmNo");
  if (yesBtn) yesBtn.onclick = handleConfirmYes;
  if (noBtn) noBtn.onclick = handleConfirmNo;
}

// ─── Form Submit ──────────────────────────────────────────────────────────────

async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.querySelector("#childForm button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Saqlanmoqda...";
  }

  try {
    const name = document.getElementById("childName")?.value.trim();
    const age = Number(document.getElementById("age")?.value);
    const gender = document.getElementById("gender")?.value;
    const age_unit = document.getElementById("ageUnit")?.value || "years";
    const birth_date = document.getElementById("birthDate")?.value || null;

    if (!name) {
      showFormError("Ism kiritilmadi");
      return;
    }
    if (!age || age <= 0) {
      showFormError("Yosh kiritilmadi");
      return;
    }
    if (!gender) {
      showFormError("Jins tanlanmadi");
      return;
    }

    const payload = { name, age, age_unit, gender, parent_id: userId };
    if (birth_date) payload.birth_date = birth_date;

    if (editId) {
      // Edit mode
      const { data: old } = await supabase
        .from("children")
        .select("birth_date")
        .eq("id", editId)
        .single();

      const { error } = await supabase
        .from("children")
        .update(payload)
        .eq("id", editId);
      if (error) throw error;

      if (birth_date && birth_date !== old?.birth_date) {
        await recalculatePendingRecords(editId, birth_date);
      }
    } else {
      // Add mode
      const { data: inserted, error } = await supabase
        .from("children")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      if (birth_date && inserted?.id) {
        await generateVaccinationRecords(inserted.id, userId, birth_date).catch(
          (err) => console.error("generateVaccinationRecords:", err),
        );
      }
    }

    closeModal();
    await loadChildren();
  } catch (err) {
    console.error("[children] submit:", err);
    showFormError("Xatolik: " + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Saqlash";
    }
  }
}

function showFormError(msg) {
  let el = document.getElementById("childFormError");
  if (!el) {
    el = document.createElement("p");
    el.id = "childFormError";
    el.style.cssText = "color:#ef4444;font-size:13px;margin:4px 0;";
    document.getElementById("childForm")?.prepend(el);
  }
  el.textContent = msg;
  setTimeout(() => {
    el.textContent = "";
  }, 3000);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(child = null) {
  editId = child?.id || null;

  const modal = document.getElementById("childModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const title = document.getElementById("childModalTitle");
  if (title) title.textContent = editId ? "Bolani tahrirlash" : "Bola qo'shish";

  document.getElementById("childName").value = child?.name || "";
  document.getElementById("age").value = child?.age || "";
  document.getElementById("gender").value = child?.gender || "";
  document.getElementById("birthDate").value = child?.birth_date || "";

  const unit = child?.age_unit || "years";
  document.getElementById("ageUnit").value = unit;
  document
    .getElementById("ageUnitYears")
    ?.classList.toggle("active", unit === "years");
  document
    .getElementById("ageUnitMonths")
    ?.classList.toggle("active", unit === "months");

  // Clear error
  const errEl = document.getElementById("childFormError");
  if (errEl) errEl.textContent = "";

  document.getElementById("childName")?.focus();
}

function closeModal() {
  editId = null;
  document.getElementById("childModal")?.classList.add("hidden");
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

let pendingDeleteId = null;

function confirmDelete(id, name) {
  pendingDeleteId = id;
  const modal = document.getElementById("confirmModal");
  const text = document.getElementById("confirmText");
  if (text)
    text.textContent = `"${name}" ni o'chirishni tasdiqlaysizmi? Barcha ma'lumotlar o'chadi.`;
  modal?.classList.remove("hidden");
}

function handleConfirmYes() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  pendingDeleteId = null;
  document.getElementById("confirmModal")?.classList.add("hidden");

  supabase
    .from("children")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.error("[children] delete:", error);
      else loadChildren();
    });
}

function handleConfirmNo() {
  pendingDeleteId = null;
  document.getElementById("confirmModal")?.classList.add("hidden");
}

// ─── Recalculate pending vaccination records ──────────────────────────────────

async function recalculatePendingRecords(childId, newBirthDate) {
  const { data: records } = await supabase
    .from("vaccination_records")
    .select("id, vaccine_name")
    .eq("child_id", childId)
    .eq("status", "pending");

  for (const r of records || []) {
    const vaccine = UZ_VACCINE_SCHEDULE.find((v) => v.name === r.vaccine_name);
    if (!vaccine) continue;
    await supabase
      .from("vaccination_records")
      .update({
        scheduled_date: computeScheduledDate(newBirthDate, vaccine.offsetDays),
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id);
  }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
