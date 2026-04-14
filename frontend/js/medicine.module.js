// Requirements: 5.5, 5.6, 6.1–6.7
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";
import { t } from "./i18n.js";

let userId = null;
let deleteTargetId = null;
let channel = null;
let childrenChannel = null;

/* ======================
   INIT
====================== */
export async function initMedicineModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "../auth/login.html";
    return;
  }

  userId = session.user.id;

  setupTabs();
  setupMedicineForm();
  setupSupplementForm();
  setupConfirmModal();
  await loadChildrenDropdown();
  setupChildFilter();
  loadSupplements();
}

/* ======================
   DESTROY (channel cleanup)
====================== */
export function destroyModule() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  if (childrenChannel) {
    supabase.removeChannel(childrenChannel);
    childrenChannel = null;
  }
}

/* ======================
   TABS
====================== */
export function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (tab === "child-medicines") {
        showChildMedicinesTab();
      } else if (tab === "my-supplements") {
        showSupplementsTab();
        loadSupplements();
      }
    });
  });
}

export function showChildMedicinesTab() {
  const childTab = document.querySelector(
    '.tab-content[data-tab="child-medicines"]',
  );
  const suppTab = document.querySelector(
    '.tab-content[data-tab="my-supplements"]',
  );
  if (childTab) childTab.classList.add("active");
  if (suppTab) suppTab.classList.remove("active");
}

export function showSupplementsTab() {
  const childTab = document.querySelector(
    '.tab-content[data-tab="child-medicines"]',
  );
  const suppTab = document.querySelector(
    '.tab-content[data-tab="my-supplements"]',
  );
  if (childTab) childTab.classList.remove("active");
  if (suppTab) suppTab.classList.add("active");
}

/* ======================
   ADD MEDICINE
====================== */
function setupMedicineForm() {
  const form = document.getElementById("addMedicineForm");
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById("medicineName").value.trim();
    const dosage = document.getElementById("dosage").value.trim();
    const times_per_day = parseInt(
      document.getElementById("timesPerDay").value,
      10,
    );

    const childSelect = document.getElementById("medicineChildSelect");
    const child_id = childSelect ? childSelect.value : "";

    if (!child_id) {
      toast(t("select_child_first"), "warning");
      return;
    }

    if (!name || !dosage || !times_per_day) return;

    const { error } = await supabase.from("medicine_list").insert({
      parent_id: userId,
      child_id,
      name,
      dosage,
      times_per_day,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[medicine] insert error:", error);
      toast("Failed to add medicine. Please try again.", "error");
      return;
    }

    form.reset();
    loadMedicineList(child_id);
  };
}

/* ======================
   CONFIRM MODAL (GLOBAL)
====================== */
let confirmWired = false;
function setupConfirmModal() {
  if (confirmWired) return;
  confirmWired = true;

  const modal = document.getElementById("confirmModal");
  const yesBtn = document.getElementById("confirmYes");
  const noBtn = document.getElementById("confirmNo");

  if (!modal || !yesBtn || !noBtn) return;

  noBtn.onclick = () => {
    modal.classList.add("hidden");
    deleteTargetId = null;
  };

  yesBtn.onclick = async () => {
    if (!deleteTargetId) return;

    const { error } = await supabase
      .from("medicine_list")
      .delete()
      .eq("id", deleteTargetId);

    if (error) {
      console.error("[medicine] delete error:", error);
      toast("Failed to delete medicine.", "error");
    }

    modal.classList.add("hidden");
    deleteTargetId = null;
  };
}

/* ======================
   CHILD DROPDOWN LOAD (REAL-TIME)
====================== */
async function loadChildrenDropdown() {
  const childSelect = document.getElementById("medicineChildSelect");
  if (!childSelect || !userId) return;

  await refreshChildrenDropdown(childSelect);

  // Remove existing channel before creating new one
  if (childrenChannel) {
    supabase.removeChannel(childrenChannel);
    childrenChannel = null;
  }

  // Subscribe to children changes for real-time dropdown updates
  childrenChannel = supabase
    .channel("medicine-children-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "children",
        filter: `parent_id=eq.${userId}`,
      },
      async () => {
        await refreshChildrenDropdown(childSelect);
        loadMedicineList(childSelect.value);
      },
    )
    .subscribe();
}

async function refreshChildrenDropdown(childSelect) {
  const prevSelected = childSelect.value;

  const { data, error } = await supabase
    .from("children")
    .select("id, name")
    .eq("parent_id", userId);

  if (error) {
    console.error("[medicine] loadChildren error:", error);
    return;
  }

  childSelect.innerHTML = `<option value="">— ${t("select_child")} —</option>`;

  const existingIds = new Set();
  (data || []).forEach((child) => {
    existingIds.add(child.id);
    const option = document.createElement("option");
    option.value = child.id;
    option.textContent = child.name;
    childSelect.appendChild(option);
  });

  if (prevSelected && existingIds.has(prevSelected)) {
    childSelect.value = prevSelected;
  } else {
    childSelect.value = "";
  }

  loadMedicineList(childSelect.value);
}

/* ======================
   CHILD FILTER
====================== */
function setupChildFilter() {
  const childSelect = document.getElementById("medicineChildSelect");
  if (!childSelect) return;

  childSelect.addEventListener("change", () => {
    loadMedicineList(childSelect.value);
  });
}

/* ======================
   REALTIME MEDICINE LIST
====================== */
function loadMedicineList(selectedChildId = "") {
  const ul = document.getElementById("medicineList");
  if (!ul || !userId) return;

  // Unsubscribe previous channel
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }

  if (!selectedChildId) {
    ul.innerHTML = "";
    return;
  }

  // Initial fetch
  fetchAndRenderMedicines(selectedChildId);

  // Subscribe to realtime changes
  channel = supabase
    .channel("medicine-list-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "medicine_list",
        filter: `parent_id=eq.${userId}`,
      },
      () => {
        fetchAndRenderMedicines(selectedChildId);
      },
    )
    .subscribe();
}

async function fetchAndRenderMedicines(selectedChildId) {
  const ul = document.getElementById("medicineList");
  if (!ul || !userId) return;

  const { data, error } = await supabase
    .from("medicine_list")
    .select("*")
    .eq("parent_id", userId)
    .eq("child_id", selectedChildId);

  if (error) {
    console.error("[medicine] fetchMedicines error:", error);
    toast("Failed to load medicines.", "error");
    return;
  }

  ul.innerHTML = "";

  if (!data || data.length === 0) {
    ul.style.display = "none";
    return;
  }

  ul.style.display = "flex";

  data.forEach((item) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span class="text">
        ${escapeHtml(item.name)} - ${escapeHtml(item.dosage)} (${Number(item.times_per_day)}x/${t("day_short") !== "day_short" ? t("day_short") : "day"})
      </span>
      <div class="actions">
        <button class="editBtn">${t("edit")}</button>
        <button class="deleteBtn">${t("delete")}</button>
      </div>
    `;

    // EDIT
    li.querySelector(".editBtn").onclick = () => {
      li.innerHTML = `
        <form class="editForm">
          <input type="text" value="${escapeAttr(item.name)}" required>
          <input type="text" value="${escapeAttr(item.dosage)}" required>
          <input type="number" value="${Number(item.times_per_day)}" min="1" required>

          <button type="submit" class="saveBtn">${t("save")}</button>
          <button type="button" class="cancelBtn">${t("cancel")}</button>
        </form>
      `;

      const form = li.querySelector(".editForm");
      form.querySelector(".cancelBtn").onclick = () =>
        fetchAndRenderMedicines(selectedChildId);

      form.onsubmit = async (e) => {
        e.preventDefault();
        const inputs = form.querySelectorAll("input");

        const { error } = await supabase
          .from("medicine_list")
          .update({
            name: inputs[0].value.trim(),
            dosage: inputs[1].value.trim(),
            times_per_day: parseInt(inputs[2].value, 10),
          })
          .eq("id", item.id);

        if (error) {
          console.error("[medicine] update error:", error);
          toast("Failed to update medicine.", "error");
        }
      };
    };

    // DELETE (GLOBAL MODAL)
    li.querySelector(".deleteBtn").onclick = () => {
      deleteTargetId = item.id;

      const modal = document.getElementById("confirmModal");
      const text = document.getElementById("confirmText");
      if (text) text.textContent = `Delete "${item.name}"?`;
      if (modal) modal.classList.remove("hidden");

      // Re-wire yes button for medicine deletion
      const yesBtn = document.getElementById("confirmYes");
      if (yesBtn) {
        yesBtn.onclick = async () => {
          if (!deleteTargetId) return;

          const { error } = await supabase
            .from("medicine_list")
            .delete()
            .eq("id", deleteTargetId);

          if (error) {
            console.error("[medicine] delete error:", error);
            toast("Failed to delete medicine.", "error");
          }

          modal.classList.add("hidden");
          deleteTargetId = null;
        };
      }
    };

    ul.appendChild(li);
  });
}

/* ======================
   Utils
====================== */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}

/* ======================
   SUPPLEMENTS (My Supplements tab)
   Stored in medicine_list with child_id = null
====================== */
function setupSupplementForm() {
  const form = document.getElementById("addSupplementForm");
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const name = document.getElementById("supplementName")?.value.trim();
    const dosage = document.getElementById("supplementDosage")?.value.trim();
    const times_per_day = parseInt(
      document.getElementById("supplementTimes")?.value,
      10,
    );

    if (!name || !dosage || !times_per_day) return;

    const { error } = await supabase.from("medicine_list").insert({
      parent_id: userId,
      child_id: null,
      name,
      dosage,
      times_per_day,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[supplement] insert error:", error);
      toast("Failed to add supplement.", "error");
      return;
    }

    form.reset();
    loadSupplements();
  };
}

async function loadSupplements() {
  const ul = document.getElementById("supplementList");
  if (!ul || !userId) return;

  const { data, error } = await supabase
    .from("medicine_list")
    .select("*")
    .eq("parent_id", userId)
    .is("child_id", null);

  if (error) {
    console.error("[supplement] load error:", error);
    return;
  }

  ul.innerHTML = "";

  if (!data || data.length === 0) {
    ul.innerHTML = `<li style="color:#94a3b8;padding:12px 0;">${t("no_supplements")}</li>`;
    return;
  }

  data.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="text">
        ${escapeHtml(item.name)} — ${escapeHtml(item.dosage)} (${Number(item.times_per_day)}x/${t("day_short") !== "day_short" ? t("day_short") : "day"})
      </span>
      <div class="actions">
        <button class="deleteBtn" data-id="${item.id}">${t("delete")}</button>
      </div>
    `;

    li.querySelector(".deleteBtn").onclick = async () => {
      const { error } = await supabase
        .from("medicine_list")
        .delete()
        .eq("id", item.id);

      if (error) {
        toast("Failed to delete supplement.", "error");
        return;
      }
      loadSupplements();
    };

    ul.appendChild(li);
  });
}
