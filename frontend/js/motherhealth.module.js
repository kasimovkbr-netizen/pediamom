// motherhealth.module.js
import { supabase } from "./supabase.js";
import { t } from "./i18n.js";

/* ── Navigation cards ─────────────────────────────────────────────────────── */
function initNavCards() {
  const cards = document.querySelectorAll(".mh-nav-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const targetPage = card.dataset.page;
      if (!targetPage) return;

      // My Supplements — show inline supplements section instead of navigating
      if (targetPage === "medicines") {
        showSupplementsSection();
        return;
      }

      // Pregnancy Calendar
      if (targetPage === "pregnancy_calendar") {
        showPregnancyCalendar();
        return;
      }

      const menuItem = document.querySelector(
        `.menu-item[data-page="${targetPage}"]`,
      );
      if (menuItem) menuItem.click();
    });
  });
}

/* ── Pregnancy Calendar ───────────────────────────────────────────────────── */
async function showPregnancyCalendar() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  const userId = session.user.id;

  document.getElementById("mhPregnancySection")?.remove();

  const section = document.createElement("div");
  section.id = "mhPregnancySection";
  section.className = "mh-cards-grid";
  section.style.marginTop = "16px";

  section.innerHTML = `
    <div class="mh-card" style="grid-column:1/-1;">
      <h3>🤰 Pregnancy Calendar</h3>
      <p style="font-size:13px;color:#64748b;margin:0 0 16px;">Enter your last menstrual period (LMP) date to calculate your pregnancy timeline.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:20px;">
        <div>
          <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Last Menstrual Period (LMP)</label>
          <input type="date" id="pregLmpDate" style="padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;font-size:14px;" />
        </div>
        <button id="calcPregBtn" style="background:#2563eb;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-weight:600;cursor:pointer;">Calculate</button>
      </div>
      <div id="pregCalendarResult"></div>
    </div>
  `;

  const navCards = document.querySelector(".mh-nav-cards");
  navCards?.insertAdjacentElement("afterend", section);

  document.getElementById("calcPregBtn")?.addEventListener("click", () => {
    const lmpVal = document.getElementById("pregLmpDate")?.value;
    if (!lmpVal) return;
    renderPregnancyCalendar(lmpVal);
  });

  // Load saved LMP from DB
  const { data } = await supabase
    .from("mother_health")
    .select("last_period_date")
    .eq("user_id", userId)
    .single();

  if (data?.last_period_date) {
    const lmpInput = document.getElementById("pregLmpDate");
    if (lmpInput) {
      lmpInput.value = data.last_period_date;
      renderPregnancyCalendar(data.last_period_date);
    }
  }
}

function renderPregnancyCalendar(lmpDate) {
  const el = document.getElementById("pregCalendarResult");
  if (!el) return;

  const lmp = new Date(lmpDate);
  const today = new Date();
  const daysPregnant = Math.floor((today - lmp) / 86400000);
  const weeksPregnant = Math.floor(daysPregnant / 7);
  const daysExtra = daysPregnant % 7;

  // Due date = LMP + 280 days
  const dueDate = new Date(lmp);
  dueDate.setDate(dueDate.getDate() + 280);

  const daysLeft = Math.floor((dueDate - today) / 86400000);
  const trimester = weeksPregnant < 13 ? 1 : weeksPregnant < 27 ? 2 : 3;
  const progress = Math.min(100, Math.round((daysPregnant / 280) * 100));

  const milestones = [
    { week: 4, label: "Implantation complete" },
    { week: 8, label: "Heartbeat detectable" },
    { week: 12, label: "End of 1st trimester" },
    { week: 16, label: "Gender may be visible" },
    { week: 20, label: "Halfway point 🎉" },
    { week: 24, label: "Viability milestone" },
    { week: 28, label: "End of 2nd trimester" },
    { week: 32, label: "Baby gains weight rapidly" },
    { week: 36, label: "Baby considered full-term soon" },
    { week: 40, label: "Due date 🍼" },
  ];

  const nextMilestone = milestones.find((m) => m.week > weeksPregnant);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;">
      <div style="background:#eff6ff;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#2563eb;">${weeksPregnant}</div>
        <div style="font-size:13px;color:#64748b;">weeks ${daysExtra} days</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Pregnant</div>
      </div>
      <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#16a34a;">${trimester}</div>
        <div style="font-size:13px;color:#64748b;">Trimester</div>
      </div>
      <div style="background:#fef9c3;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:#ca8a04;">${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
        <div style="font-size:13px;color:#64748b;">Due Date</div>
        <div style="font-size:12px;color:#94a3b8;">${daysLeft > 0 ? daysLeft + " days left" : "Past due date"}</div>
      </div>
    </div>

    <div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;margin-bottom:6px;">
        <span>Progress</span><span>${progress}%</span>
      </div>
      <div style="background:#e2e8f0;border-radius:99px;height:10px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#2563eb,#7c3aed);height:100%;width:${progress}%;border-radius:99px;transition:width 0.5s;"></div>
      </div>
    </div>

    ${
      nextMilestone
        ? `
    <div style="background:#f5f3ff;border-radius:12px;padding:14px;margin-bottom:20px;">
      <div style="font-size:12px;color:#7c3aed;font-weight:600;margin-bottom:4px;">NEXT MILESTONE</div>
      <div style="font-size:14px;color:#1e293b;">Week ${nextMilestone.week}: ${nextMilestone.label}</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${nextMilestone.week - weeksPregnant} weeks away</div>
    </div>`
        : ""
    }

    <div>
      <div style="font-size:13px;font-weight:600;color:#1e293b;margin-bottom:10px;">📅 Pregnancy Timeline</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${milestones
          .map(
            (m) => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:${m.week <= weeksPregnant ? "#f0fdf4" : "#f8fafc"};">
            <span style="font-size:16px;">${m.week <= weeksPregnant ? "✅" : "⏳"}</span>
            <span style="font-size:13px;color:${m.week <= weeksPregnant ? "#166534" : "#64748b"};">Week ${m.week}: ${m.label}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

/* ── Mother Supplements ───────────────────────────────────────────────────── */
async function showSupplementsSection() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  const userId = session.user.id;

  // Remove existing if any
  document.getElementById("mhSupplementsSection")?.remove();

  const section = document.createElement("div");
  section.id = "mhSupplementsSection";
  section.className = "mh-cards-grid";
  section.style.marginTop = "16px";
  section.innerHTML = `
    <div class="mh-card" style="grid-column:1/-1;">
      <h3>💊 My Supplements</h3>
      <form id="suppForm" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
        <input type="text" id="suppName" placeholder="Supplement name" required style="flex:1;min-width:140px;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;font-size:14px;" />
        <input type="text" id="suppDosage" placeholder="Dosage (e.g. 1 tablet)" style="flex:1;min-width:120px;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;font-size:14px;" />
        <input type="number" id="suppTimes" placeholder="Times/day" min="1" max="6" value="1" style="width:110px;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;font-size:14px;" />
        <button type="submit" style="background:#2563eb;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-weight:600;cursor:pointer;">Add</button>
      </form>
      <div id="suppList"></div>
    </div>
  `;

  // Insert after nav cards
  const navCards = document.querySelector(".mh-nav-cards");
  navCards?.insertAdjacentElement("afterend", section);

  await loadSupplements(userId);

  document.getElementById("suppForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("suppName").value.trim();
    const dosage = document.getElementById("suppDosage").value.trim();
    const times = parseInt(document.getElementById("suppTimes").value) || 1;
    if (!name) return;

    const { error } = await supabase.from("medicine_list").insert({
      parent_id: userId,
      child_id: null,
      name,
      dosage: dosage || null,
      times_per_day: times,
      notes: "mother_supplement",
    });

    if (error) {
      import("./toast.js").then(({ toast }) =>
        toast("Error: " + error.message, "error"),
      );
      return;
    }
    e.target.reset();
    document.getElementById("suppTimes").value = "1";
    await loadSupplements(userId);
  });
}

async function loadSupplements(userId) {
  const el = document.getElementById("suppList");
  if (!el) return;

  const { data } = await supabase
    .from("medicine_list")
    .select("id, name, dosage, times_per_day")
    .eq("parent_id", userId)
    .is("child_id", null)
    .eq("notes", "mother_supplement")
    .order("created_at", { ascending: false });

  if (!data?.length) {
    el.innerHTML = `<p style="color:#94a3b8;font-size:13px;">No supplements added yet.</p>`;
    return;
  }

  el.innerHTML = data
    .map(
      (s) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f8fafc;border-radius:10px;margin-bottom:8px;">
      <div>
        <strong style="font-size:14px;">${s.name}</strong>
        ${s.dosage ? `<span style="color:#64748b;font-size:13px;margin-left:8px;">${s.dosage}</span>` : ""}
        <span style="color:#94a3b8;font-size:12px;margin-left:8px;">${s.times_per_day}x/day</span>
      </div>
      <button onclick="window.__delSupp('${s.id}')" style="background:#fee2e2;color:#ef4444;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;">Delete</button>
    </div>
  `,
    )
    .join("");

  window.__delSupp = async (id) => {
    await supabase.from("medicine_list").delete().eq("id", id);
    await loadSupplements(userId);
  };
}

/* ── Water Intake Card ────────────────────────────────────────────────────── */
export function calculateGlasses(liters) {
  return Math.round(liters * 4);
}

async function initWaterIntakeCard(userId) {
  const litersInput = document.getElementById("waterLiters");
  const startInput = document.getElementById("waterStartHour");
  const endInput = document.getElementById("waterEndHour");
  const glassesDisplay = document.getElementById("waterGlassesDisplay");
  const errorEl = document.getElementById("waterError");
  const saveBtn = document.getElementById("saveWaterBtn");

  if (!litersInput) return;

  // Load existing data
  try {
    const { data, error } = await supabase
      .from("water_intake")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Water intake load error:", error);
    }
    if (data) {
      litersInput.value = data.daily_liters ?? "";
      startInput.value = data.start_hour ?? "";
      endInput.value = data.end_hour ?? "";
      if (data.daily_liters) {
        glassesDisplay.textContent = `≈ ${calculateGlasses(data.daily_liters)} ${t("glasses_per_day") !== "glasses_per_day" ? t("glasses_per_day") : "glasses per day"}`;
      }
    }
  } catch (e) {
    console.error("Water intake load error:", e);
  }

  // Real-time glasses calculation
  litersInput.addEventListener("input", () => {
    const val = parseFloat(litersInput.value);
    if (!isNaN(val) && val > 0) {
      glassesDisplay.textContent = `≈ ${calculateGlasses(val)} ${t("glasses_per_day") !== "glasses_per_day" ? t("glasses_per_day") : "glasses per day"}`;
    } else {
      glassesDisplay.textContent = "";
    }
  });

  // Save
  saveBtn?.addEventListener("click", async () => {
    const daily_liters = parseFloat(litersInput.value);
    const start_hour = parseInt(startInput.value, 10);
    const end_hour = parseInt(endInput.value, 10);

    if (isNaN(daily_liters) || daily_liters < 0.5 || daily_liters > 5) {
      errorEl.textContent = "Please enter a valid daily goal (0.5–5 liters)";
      errorEl.style.display = "block";
      return;
    }
    if (isNaN(start_hour) || isNaN(end_hour) || end_hour <= start_hour) {
      errorEl.textContent = "End time must be after start time";
      errorEl.style.display = "block";
      return;
    }
    errorEl.style.display = "none";

    try {
      const { error } = await supabase.from("water_intake").upsert(
        {
          user_id: userId,
          daily_liters,
          start_hour,
          end_hour,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) throw error;
      saveBtn.textContent = "✅ Saved";
      setTimeout(() => {
        saveBtn.textContent = "Save";
      }, 1500);
    } catch (e) {
      console.error("Water intake save error:", e);
      errorEl.textContent = "Failed to save. Please try again.";
      errorEl.style.display = "block";
    }
  });
}

/* ── Doctor Appointment Card ──────────────────────────────────────────────── */
async function initAppointmentCard(userId) {
  const dateInput = document.getElementById("appointmentDate");
  const warningEl = document.getElementById("appointmentWarning");
  const saveBtn = document.getElementById("saveAppointmentBtn");

  if (!dateInput) return;

  // Load existing data
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("appointment_date")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Appointment load error:", error);
    }
    if (data?.appointment_date) {
      dateInput.value = data.appointment_date;
    }
  } catch (e) {
    console.error("Appointment load error:", e);
  }

  // Save
  saveBtn?.addEventListener("click", async () => {
    const appointment_date = dateInput.value;
    if (!appointment_date) {
      warningEl.textContent = "Please select a date";
      warningEl.style.display = "block";
      return;
    }

    // Past date warning (non-blocking)
    const today = new Date().toISOString().split("T")[0];
    if (appointment_date < today) {
      warningEl.textContent = "The selected date is in the past. Are you sure?";
      warningEl.style.display = "block";
    } else {
      warningEl.style.display = "none";
    }

    try {
      const { error } = await supabase.from("appointments").upsert(
        {
          user_id: userId,
          appointment_date,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) throw error;
      saveBtn.textContent = "✅ Saved";
      setTimeout(() => {
        saveBtn.textContent = "Save";
      }, 1500);
    } catch (e) {
      console.error("Appointment save error:", e);
    }
  });
}

/* ── Main init ────────────────────────────────────────────────────────────── */
export async function initMotherHealthModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "../auth/login.html";
    return;
  }

  const userId = session.user.id;

  initNavCards();
  initWaterIntakeCard(userId);
  initAppointmentCard(userId);
}
