// pregnancy.module.js — Full Period Tracker
import { supabase } from "./supabase.js";
import { toast } from "./toast.js";
import { t } from "./i18n.js";

/* ══════════════════════════════════════════════
   CALCULATION HELPERS
══════════════════════════════════════════════ */

export function calculateNextPeriod(lastDate, cycleLength) {
  const next = new Date(lastDate);
  next.setDate(next.getDate() + cycleLength);
  return next;
}

export function calculateFertileWindow(lastDate, cycleLength) {
  const ovulationDay = new Date(lastDate);
  ovulationDay.setDate(ovulationDay.getDate() + (cycleLength - 14));
  const fertileStart = new Date(ovulationDay);
  fertileStart.setDate(fertileStart.getDate() - 5);
  const fertileEnd = new Date(ovulationDay);
  fertileEnd.setDate(fertileEnd.getDate() + 1);
  return { fertileStart, fertileEnd, ovulationDay };
}

export function validateCycleLength(n) {
  return n >= 21 && n <= 35;
}

// Returns day type for calendar coloring
export function getDayType(date, periodData, cycleHistory) {
  if (!periodData?.lastPeriodDate) return "normal";

  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayStr = new Date().toISOString().split("T")[0];

  // Check cycle history for actual period days
  for (const cycle of cycleHistory || []) {
    const start = new Date(cycle.period_start);
    const end = cycle.period_end
      ? new Date(cycle.period_end)
      : new Date(start.getTime() + 5 * 86400000);
    if (d >= start && d <= end) return "period";
  }

  const last = new Date(periodData.lastPeriodDate);
  const cycleLength = periodData.cycleLength || 28;
  const duration = periodData.periodDuration || 5;

  // Current/upcoming period days
  const periodEnd = new Date(last);
  periodEnd.setDate(periodEnd.getDate() + duration - 1);
  if (d >= last && d <= periodEnd) return "period";

  // Next period prediction
  const nextStart = calculateNextPeriod(last, cycleLength);
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextEnd.getDate() + duration - 1);
  if (d >= nextStart && d <= nextEnd) return "period-predicted";

  // PMS window (3 days before next period)
  const pmsStart = new Date(nextStart);
  pmsStart.setDate(pmsStart.getDate() - 3);
  if (d >= pmsStart && d < nextStart) return "pms";

  // Fertile / ovulation window
  const { fertileStart, fertileEnd, ovulationDay } = calculateFertileWindow(
    last,
    cycleLength,
  );
  const ovDay = new Date(
    ovulationDay.getFullYear(),
    ovulationDay.getMonth(),
    ovulationDay.getDate(),
  );
  if (d.getTime() === ovDay.getTime()) return "ovulation";
  const fs = new Date(
    fertileStart.getFullYear(),
    fertileStart.getMonth(),
    fertileStart.getDate(),
  );
  const fe = new Date(
    fertileEnd.getFullYear(),
    fertileEnd.getMonth(),
    fertileEnd.getDate(),
  );
  if (d >= fs && d <= fe) return "fertile";

  return "normal";
}

/* ══════════════════════════════════════════════
   CALENDAR RENDER
══════════════════════════════════════════════ */

export function renderCalendar(year, month, periodData, cycleHistory) {
  const grid = document.getElementById("periodCalendarGrid");
  if (!grid) return;

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let html = dayNames
    .map((d) => `<div class="calendar-day day-header">${d}</div>`)
    .join("");

  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < offset; i++)
    html += `<div class="calendar-day day-empty"></div>`;

  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const type = getDayType(date, periodData, cycleHistory);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const classes = ["calendar-day", `day-${type}`, isToday ? "day-today" : ""]
      .filter(Boolean)
      .join(" ");
    html += `<div class="${classes}">${d}</div>`;
  }

  grid.innerHTML = html;
}

/* ══════════════════════════════════════════════
   SUPABASE DATA
══════════════════════════════════════════════ */

export async function savePeriodData({
  userId,
  lastPeriodDate,
  periodEndDate,
  cycleLength,
  flowLevel,
  symptoms,
}) {
  const duration =
    lastPeriodDate && periodEndDate
      ? Math.max(
          1,
          Math.round(
            (new Date(periodEndDate) - new Date(lastPeriodDate)) / 86400000,
          ) + 1,
        )
      : 5;

  const { error } = await supabase.from("mother_health").upsert(
    {
      user_id: userId,
      last_period_date: lastPeriodDate,
      period_end_date: periodEndDate || null,
      cycle_length: cycleLength,
      flow_level: flowLevel || null,
      period_duration: duration,
      symptoms: symptoms || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  // Save to cycle history
  if (lastPeriodDate) {
    const { error: histErr } = await supabase.from("cycle_history").upsert(
      {
        user_id: userId,
        period_start: lastPeriodDate,
        period_end: periodEndDate || null,
        flow_level: flowLevel || null,
        cycle_length: cycleLength,
      },
      { onConflict: "user_id,period_start" },
    );
    if (histErr) console.warn("cycle_history upsert:", histErr.message);
  }
}

export async function loadPeriodData(userId) {
  const { data, error } = await supabase
    .from("mother_health")
    .select(
      "last_period_date, period_end_date, cycle_length, flow_level, period_duration, symptoms",
    )
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  return {
    lastPeriodDate: data.last_period_date,
    periodEndDate: data.period_end_date,
    cycleLength: data.cycle_length || 28,
    flowLevel: data.flow_level,
    periodDuration: data.period_duration || 5,
    symptoms: data.symptoms,
  };
}

export async function loadCycleHistory(userId) {
  const { data, error } = await supabase
    .from("cycle_history")
    .select("*")
    .eq("user_id", userId)
    .order("period_start", { ascending: false })
    .limit(12);

  if (error) {
    console.warn("cycle_history load:", error.message);
    return [];
  }
  return data || [];
}

/* ══════════════════════════════════════════════
   PREDICTIONS PANEL
══════════════════════════════════════════════ */

function renderPredictions(periodData) {
  const el = document.getElementById("periodPredictions");
  if (!el || !periodData?.lastPeriodDate) return;

  const last = new Date(periodData.lastPeriodDate);
  const cycleLength = periodData.cycleLength || 28;
  const next = calculateNextPeriod(last, cycleLength);
  const { fertileStart, fertileEnd, ovulationDay } = calculateFertileWindow(
    last,
    cycleLength,
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntilNext = Math.round((next - today) / 86400000);
  const pmsStart = new Date(next);
  pmsStart.setDate(pmsStart.getDate() - 3);

  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  let statusMsg = "";
  if (daysUntilNext < 0) {
    statusMsg = `<div class="pred-alert pred-late">⚠️ ${t("period_late")}: ${Math.abs(daysUntilNext)} ${t("days_late")}</div>`;
  } else if (daysUntilNext <= 2) {
    statusMsg = `<div class="pred-alert pred-soon">🔴 ${t("period_expected")} ${daysUntilNext} ${t("days")}</div>`;
  } else if (today >= pmsStart && today < next) {
    statusMsg = `<div class="pred-alert pred-pms">🟡 ${t("pms_window")} ${daysUntilNext} ${t("days")}</div>`;
  }

  el.innerHTML = `
    ${statusMsg}
    <div class="pred-grid">
      <div class="pred-card pred-card-red">
        <span class="pred-icon">🔴</span>
        <div>
          <div class="pred-label">${t("next_period")}</div>
          <div class="pred-value">${fmt(next)}</div>
          <div class="pred-sub">${daysUntilNext > 0 ? `${t("remaining")} ${daysUntilNext} ${t("days")}` : daysUntilNext === 0 ? "today" : `${Math.abs(daysUntilNext)}d ${t("days_late")}`}</div>
        </div>
      </div>
      <div class="pred-card pred-card-blue">
        <span class="pred-icon">💙</span>
        <div>
          <div class="pred-label">${t("ovulation")}</div>
          <div class="pred-value">${fmt(ovulationDay)}</div>
          <div class="pred-sub">Day ${cycleLength - 14}</div>
        </div>
      </div>
      <div class="pred-card pred-card-green">
        <span class="pred-icon">🟢</span>
        <div>
          <div class="pred-label">${t("fertile_window")}</div>
          <div class="pred-value">${fmt(fertileStart)} – ${fmt(fertileEnd)}</div>
          <div class="pred-sub">6 ${t("days")}</div>
        </div>
      </div>
      <div class="pred-card pred-card-yellow">
        <span class="pred-icon">🟡</span>
        <div>
          <div class="pred-label">${t("cycle_length")}</div>
          <div class="pred-value">${cycleLength} ${t("days")}</div>
          <div class="pred-sub">avg</div>
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════
   CYCLE HISTORY TABLE
══════════════════════════════════════════════ */

function renderHistory(history) {
  const el = document.getElementById("cycleHistoryList");
  if (!el) return;

  if (!history.length) {
    el.innerHTML = `<p style="color:#94a3b8;font-size:14px;text-align:center;padding:16px;">${t("no_cycle_history")}</p>`;
    return;
  }

  const avgLen =
    history
      .filter((c) => c.cycle_length)
      .reduce((s, c) => s + c.cycle_length, 0) /
    (history.filter((c) => c.cycle_length).length || 1);

  const rows = history
    .map((c) => {
      const duration = c.period_end
        ? Math.round(
            (new Date(c.period_end) - new Date(c.period_start)) / 86400000,
          ) + 1
        : "—";
      const flowIcon =
        { light: "🩸", medium: "🩸🩸", heavy: "🩸🩸🩸" }[c.flow_level] || "—";
      return `<tr>
      <td>${new Date(c.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
      <td>${c.cycle_length || "—"} days</td>
      <td>${duration} days</td>
      <td>${flowIcon}</td>
    </tr>`;
    })
    .join("");

  el.innerHTML = `
    <div class="history-avg">Average cycle: <strong>${Math.round(avgLen)} days</strong></div>
    <table class="cycle-table">
      <thead><tr><th>Period Start</th><th>Cycle</th><th>Duration</th><th>Flow</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/* ══════════════════════════════════════════════
   LEGEND
══════════════════════════════════════════════ */

function renderLegend() {
  const el = document.getElementById("calendarLegend");
  if (!el) return;
  el.innerHTML = `
    <span class="legend-item"><span class="legend-dot dot-period"></span> Period</span>
    <span class="legend-item"><span class="legend-dot dot-period-predicted"></span> Predicted</span>
    <span class="legend-item"><span class="legend-dot dot-pms"></span> PMS</span>
    <span class="legend-item"><span class="legend-dot dot-ovulation"></span> Ovulation</span>
    <span class="legend-item"><span class="legend-dot dot-fertile"></span> Fertile</span>
  `;
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */

export async function initPregnancyModule() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const userId = session.user.id;
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let periodData = null;
  let cycleHistory = [];

  // Load data
  try {
    [periodData, cycleHistory] = await Promise.all([
      loadPeriodData(userId),
      loadCycleHistory(userId),
    ]);
  } catch (e) {
    console.error("Failed to load period data:", e);
  }

  // Populate form
  if (periodData) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.value = val;
    };
    setVal("lastPeriodDate", periodData.lastPeriodDate);
    setVal("periodEndDate", periodData.periodEndDate);
    setVal("cycleLength", periodData.cycleLength);
    setVal("flowLevel", periodData.flowLevel);
    setVal("symptomsTextarea", periodData.symptoms);
  }

  renderCalendar(currentYear, currentMonth, periodData, cycleHistory);
  renderPredictions(periodData);
  renderHistory(cycleHistory);
  renderLegend();
  updateCalendarTitle(currentYear, currentMonth);
  initHealthChat();

  // Save button
  document
    .getElementById("savePeriodBtn")
    ?.addEventListener("click", async () => {
      const lastPeriodDate = document.getElementById("lastPeriodDate")?.value;
      const periodEndDate = document.getElementById("periodEndDate")?.value;
      const cycleLength = parseInt(
        document.getElementById("cycleLength")?.value || "28",
        10,
      );
      const flowLevel = document.getElementById("flowLevel")?.value;
      const symptoms = document.getElementById("symptomsTextarea")?.value;

      if (!lastPeriodDate) {
        toast("Please enter the last period start date.", "warning");
        return;
      }
      if (!validateCycleLength(cycleLength)) {
        toast("Cycle length must be 21–35 days.", "warning");
        return;
      }

      try {
        await savePeriodData({
          userId,
          lastPeriodDate,
          periodEndDate,
          cycleLength,
          flowLevel,
          symptoms,
        });
        periodData = {
          lastPeriodDate,
          periodEndDate,
          cycleLength,
          flowLevel,
          periodDuration: periodEndDate
            ? Math.max(
                1,
                Math.round(
                  (new Date(periodEndDate) - new Date(lastPeriodDate)) /
                    86400000,
                ) + 1,
              )
            : 5,
        };
        cycleHistory = await loadCycleHistory(userId);
        renderCalendar(currentYear, currentMonth, periodData, cycleHistory);
        renderPredictions(periodData);
        renderHistory(cycleHistory);
        toast("Saved!", "success");
      } catch (e) {
        console.error("Save error:", e);
        toast("Failed to save. Please try again.", "error");
      }
    });

  // Symptoms save
  document
    .getElementById("updateSymptomsBtn")
    ?.addEventListener("click", async () => {
      const symptoms = document.getElementById("symptomsTextarea")?.value;
      const lastPeriodDate =
        periodData?.lastPeriodDate || new Date().toISOString().split("T")[0];
      const cycleLength = periodData?.cycleLength || 28;
      try {
        await savePeriodData({ userId, lastPeriodDate, cycleLength, symptoms });
        toast("Symptoms saved!", "success");
      } catch (e) {
        toast("Failed to save symptoms.", "error");
      }
    });

  // Calendar navigation
  document.getElementById("calendarPrev")?.addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar(currentYear, currentMonth, periodData, cycleHistory);
    updateCalendarTitle(currentYear, currentMonth);
  });

  document.getElementById("calendarNext")?.addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar(currentYear, currentMonth, periodData, cycleHistory);
    updateCalendarTitle(currentYear, currentMonth);
  });
}

function updateCalendarTitle(year, month) {
  const title = document.getElementById("calendarTitle");
  if (!title) return;
  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  title.textContent = `${names[month]} ${year}`;
}

/* ══════════════════════════════════════════════
   AI HEALTH CHAT
══════════════════════════════════════════════ */

let chatHistory = [];
let chatFreeCount = 0;

export function initHealthChat() {
  const sendBtn = document.getElementById("chatSendBtn");
  const input = document.getElementById("chatInput");
  if (!sendBtn || !input) return;

  sendBtn.addEventListener("click", sendChatMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Show welcome message
  appendChatMessage(
    "assistant",
    "👋 Hello! I'm PediaMom AI Health Assistant.\n\n" +
      "Ask me health questions — menstrual cycle, pregnancy, child health and more.\n\n" +
      "💡 First 5 messages are free!",
  );
}

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const message = input?.value.trim();
  if (!message) return;

  input.value = "";
  appendChatMessage("user", message);

  const sendBtn = document.getElementById("chatSendBtn");
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "...";
  }

  try {
    // Try backend first, fallback to direct Gemini API
    const apiBase = window.__API_BASE_URL__ || "http://localhost:3001";
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    let reply = null;

    // Try backend
    try {
      const res = await fetch(`${apiBase}/api/chat/health`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          history: chatHistory,
          freeCount: chatFreeCount,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data?.reply) {
          reply = result.data.reply;
          chatFreeCount++;
          if (result.data.creditsUsed > 0) {
            const badge = document.getElementById("chatCreditBadge");
            if (badge)
              badge.textContent = `${result.data.creditsRemaining} credits`;
          }
        }
      }
    } catch (_) {
      // Backend unavailable — fallback to direct Gemini
    }

    // Fallback: backend unavailable
    if (!reply) {
      reply =
        "⚠️ AI service is temporarily unavailable. Please try again later.";
    }

    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: reply });
    appendChatMessage("assistant", reply);
  } catch (err) {
    console.error("[chat] error:", err);
    appendChatMessage(
      "assistant",
      "❌ Could not connect to server. Please try again.",
    );
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
    scrollChatToBottom();
  }
}

function appendChatMessage(role, text) {
  const messages = document.getElementById("chatMessages");
  if (!messages) return;

  const div = document.createElement("div");
  div.className = `chat-msg chat-msg-${role}`;
  div.innerHTML = `<div class="chat-bubble">${text.replace(/\n/g, "<br>")}</div>`;
  messages.appendChild(div);
  scrollChatToBottom();
}

function scrollChatToBottom() {
  const messages = document.getElementById("chatMessages");
  if (messages) messages.scrollTop = messages.scrollHeight;
}
