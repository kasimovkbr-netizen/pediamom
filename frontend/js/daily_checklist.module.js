// Requirements: 5.6, 6.4
import { supabase } from "./supabase.js";
import { t } from "./i18n.js";

let userId = null;
let selectedChildId = "";
let checklistChannel = null;

const today = new Date().toISOString().split("T")[0];

/* ======================
   INIT
====================== */
export async function initDailyChecklist() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "../auth/login.html";
    return;
  }

  userId = session.user.id;

  supabase.auth.onAuthStateChange((event, sess) => {
    if (event === "SIGNED_OUT" || !sess) {
      window.location.href = "../auth/login.html";
    }
  });

  await loadChildrenDropdown();
  setupChildFilter();
  toggleStats(false);
}

/* ======================
   DESTROY (channel cleanup)
====================== */
export function destroyDailyChecklist() {
  if (checklistChannel) {
    supabase.removeChannel(checklistChannel);
    checklistChannel = null;
  }
}

/* ======================
   CHILD DROPDOWN
====================== */
async function loadChildrenDropdown() {
  const select = document.getElementById("checklistChildSelect");
  if (!select || !userId) return;

  const { data, error } = await supabase
    .from("children")
    .select("id, name")
    .eq("parent_id", userId);

  if (error) {
    console.error("[daily_checklist] loadChildren error:", error);
    return;
  }

  select.innerHTML = `<option value="">— ${t("select_child")} —</option>`;
  (data || []).forEach((child) => {
    const opt = document.createElement("option");
    opt.value = child.id;
    opt.textContent = child.name;
    select.appendChild(opt);
  });
}

function setupChildFilter() {
  const select = document.getElementById("checklistChildSelect");
  if (!select) return;

  select.onchange = () => {
    selectedChildId = select.value;

    // Cleanup previous realtime channel
    if (checklistChannel) {
      supabase.removeChannel(checklistChannel);
      checklistChannel = null;
    }

    if (!selectedChildId) {
      toggleStats(false);
      return;
    }

    toggleStats(true);
    loadChecklistRealtime();
    checkMissedYesterday();
  };
}

/* ======================
   DAILY CHECKLIST
====================== */
const TIME_SLOTS_EN = ["Morning", "Afternoon", "Evening", "Night"];
const TIME_SLOTS_KEYS = ["morning", "afternoon", "evening", "night"];
const TIME_SLOTS = TIME_SLOTS_EN; // used for DB storage (always English)

function loadChecklistRealtime() {
  // Initial render
  renderChecklist();

  // Subscribe to medicine_list changes via Supabase Realtime
  checklistChannel = supabase
    .channel("checklist-medicine-list-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "medicine_list",
        filter: `parent_id=eq.${userId}`,
      },
      () => {
        renderChecklist();
      },
    )
    .subscribe();
}

async function renderChecklist() {
  const ul = document.getElementById("dailyChecklist");
  if (!ul) return;

  const { data: medicines, error } = await supabase
    .from("medicine_list")
    .select("*")
    .eq("parent_id", userId)
    .eq("child_id", selectedChildId);

  if (error) {
    console.error("[daily_checklist] fetchMedicines error:", error);
    return;
  }

  ul.innerHTML = "";

  for (const med of medicines || []) {
    const timesPerDay = Number(med.times_per_day) || 1;
    const slots = TIME_SLOTS.slice(0, timesPerDay);

    for (const slot of slots) {
      const { data: logs, error: logError } = await supabase
        .from("medicine_logs")
        .select("id, taken")
        .eq("parent_id", userId)
        .eq("medicine_id", med.id)
        .eq("date", today)
        .eq("time_slot", slot);

      if (logError) {
        console.error("[daily_checklist] fetchLog error:", logError);
      }

      const existingLog = logs && logs.length > 0 ? logs[0] : null;
      const taken = existingLog ? existingLog.taken : false;

      const li = document.createElement("li");
      const slotLabel =
        t(TIME_SLOTS_KEYS[TIME_SLOTS.indexOf(slot)] || slot.toLowerCase()) ||
        slot;
      li.innerHTML = `
        <label>${med.name} – ${med.dosage} (${slotLabel})</label>
        <input type="checkbox" ${taken ? "checked" : ""}>
      `;

      li.querySelector("input").onchange = async (e) => {
        if (!existingLog) {
          const { error: insertError } = await supabase
            .from("medicine_logs")
            .insert({
              parent_id: userId,
              medicine_id: med.id,
              child_id: med.child_id || "",
              date: today,
              time_slot: slot,
              taken: e.target.checked,
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("[daily_checklist] insert log error:", insertError);
          }
        } else {
          const { error: updateError } = await supabase
            .from("medicine_logs")
            .update({
              taken: e.target.checked,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingLog.id);

          if (updateError) {
            console.error("[daily_checklist] update log error:", updateError);
          }
        }

        checkMissedYesterday();
      };

      ul.appendChild(li);
    }
  }
}

/* ======================
   MISSED YESTERDAY
====================== */
async function checkMissedYesterday() {
  // Removed: this warning was showing incorrectly and is not needed
  const warning = document.getElementById("missedWarning");
  if (warning) warning.classList.add("hidden");
}

/* ======================
   TOGGLE UI
====================== */
function toggleStats(show) {
  const checklist = document.getElementById("dailyChecklist");
  const chartBox = document.getElementById("weeklyChart")?.closest("div");
  const warning = document.getElementById("missedWarning");
  const hint = document.getElementById("selectChildHint");

  if (checklist) checklist.style.display = show ? "flex" : "none";
  if (chartBox) chartBox.style.display = show ? "block" : "none";
  if (warning) warning.classList.add("hidden"); // always hidden
  if (hint) hint.style.display = show ? "none" : "block";
}
