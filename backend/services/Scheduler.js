"use strict";

const cron = require("node-cron");
const { supabase } = require("../config/supabase");
const bot = require("./TelegramBot");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tashkentHour() {
  return (new Date().getUTCHours() + 5) % 24;
}

function todayStr() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function daysBetween(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

function scheduledHours(n) {
  if (n === 1) return [8];
  if (n === 2) return [8, 20];
  if (n === 3) return [8, 13, 20];
  const h = [];
  for (let i = 0; i < n; i++) h.push(Math.round(8 + (12 / (n - 1)) * i));
  return h;
}

async function getChatId(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from("users")
    .select("telegram_chat_id")
    .eq("id", userId)
    .single();
  return data?.telegram_chat_id || null;
}

async function getChildName(childId) {
  if (!childId) return "Farzand";
  const { data } = await supabase
    .from("children")
    .select("name")
    .eq("id", childId)
    .single();
  return data?.name || "Farzand";
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

async function runMedicineReminders() {
  const hour = tashkentHour();
  try {
    const { data: meds } = await supabase.from("medicine_list").select("*");
    for (const med of meds || []) {
      if (!scheduledHours(med.times_per_day || 1).includes(hour)) continue;
      const chatId = await getChatId(med.parent_id);
      if (!chatId) continue;
      const childName = await getChildName(med.child_id);
      await bot
        .notifyMedicine(chatId, childName, med.name, med.dosage)
        .catch((e) => console.error(`[Scheduler] med ${med.id}:`, e.message));
    }
  } catch (e) {
    console.error("[Scheduler] medicine:", e.message);
  }
}

async function runWaterReminders() {
  const hour = tashkentHour();
  try {
    const { data: records } = await supabase.from("water_intake").select("*");
    for (const w of records || []) {
      if (hour < (w.start_hour || 7) || hour > (w.end_hour || 22)) continue;
      const chatId = await getChatId(w.user_id);
      if (!chatId) continue;

      const activeHours = (w.end_hour || 22) - (w.start_hour || 7);
      const totalGlasses = Math.round((w.daily_liters || 2) * 4);
      const glassesPerHour =
        activeHours > 0
          ? Math.max(1, Math.round(totalGlasses / activeHours))
          : 1;

      // Calculate how many glasses should be drunk by now
      const hoursElapsed = hour - (w.start_hour || 7);
      const glassesSoFar = Math.round(
        (hoursElapsed / activeHours) * totalGlasses,
      );
      const glassesRemaining = Math.max(0, totalGlasses - glassesSoFar);

      const nextHour = hour + 1;
      const timeStr = `${String(nextHour).padStart(2, "0")}:00`;

      await bot
        .notifyWater(
          chatId,
          w.daily_liters,
          glassesPerHour,
          glassesRemaining,
          timeStr,
        )
        .catch((e) => console.error(`[Scheduler] water ${w.id}:`, e.message));
    }
  } catch (e) {
    console.error("[Scheduler] water:", e.message);
  }
}

async function runVaccinationReminders() {
  const today = todayStr();
  const notified = new Set();
  try {
    const { data: records } = await supabase
      .from("vaccination_records")
      .select("*")
      .in("status", ["pending", "overdue"]);

    for (const r of records || []) {
      const key = `${r.parent_id}:${r.vaccine_name}:${today}`;
      if (notified.has(key)) continue;

      const chatId = await getChatId(r.parent_id);
      if (!chatId) continue;

      const childName = await getChildName(r.child_id);
      const daysLate = daysBetween(r.scheduled_date, today);

      try {
        if (r.scheduled_date === today) {
          await bot.notifyVaccineToday(chatId, childName, r.vaccine_name);
        } else if (daysLate > 0) {
          await bot.notifyVaccineOverdue(
            chatId,
            childName,
            r.vaccine_name,
            daysLate,
          );
        }
        notified.add(key);
      } catch (e) {
        console.error(`[Scheduler] vaccine ${r.id}:`, e.message);
      }
    }
  } catch (e) {
    console.error("[Scheduler] vaccination:", e.message);
  }
}

async function runAppointmentReminders() {
  const today = todayStr();
  const in2 = new Date();
  in2.setDate(in2.getDate() + 2);
  const in2Str = in2.toISOString().split("T")[0];

  try {
    const { data: appts } = await supabase.from("appointments").select("*");
    for (const a of appts || []) {
      if (!a.appointment_date) continue;
      const chatId = await getChatId(a.user_id);
      if (!chatId) continue;

      if (a.appointment_date === today) {
        await bot
          .notifyAppointmentToday(chatId)
          .catch((e) => console.error(`[Scheduler] appt ${a.id}:`, e.message));
      } else if (a.appointment_date === in2Str) {
        await bot
          .notifyAppointmentSoon(chatId, a.appointment_date)
          .catch((e) => console.error(`[Scheduler] appt ${a.id}:`, e.message));
      }
    }
  } catch (e) {
    console.error("[Scheduler] appointments:", e.message);
  }
}

async function runArticleNotifications() {
  try {
    const { data: unnotified } = await supabase
      .from("knowledge_base")
      .select("*")
      .or("notified.eq.false,notified.is.null");

    if (!unnotified?.length) return;

    const { data: users } = await supabase
      .from("users")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null)
      .neq("telegram_chat_id", "");

    const chatIds = (users || [])
      .map((u) => u.telegram_chat_id)
      .filter(Boolean);
    if (!chatIds.length) return;

    for (const article of unnotified) {
      for (const chatId of chatIds) {
        await bot
          .notifyNewArticle(chatId, article.title, article.category)
          .catch((e) =>
            console.error(`[Scheduler] article ${article.id}:`, e.message),
          );
      }
      await supabase
        .from("knowledge_base")
        .update({ notified: true })
        .eq("id", article.id);
    }
  } catch (e) {
    console.error("[Scheduler] articles:", e.message);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

function startScheduler() {
  // Medicine & water — every hour
  cron.schedule("0 * * * *", async () => {
    await runMedicineReminders();
    await runWaterReminders();
  });

  // Vaccination & appointments — daily 09:00 Tashkent (04:00 UTC)
  cron.schedule("0 4 * * *", async () => {
    await runVaccinationReminders();
    await runAppointmentReminders();
  });

  // Articles — every 30 min
  cron.schedule("*/30 * * * *", async () => {
    await runArticleNotifications();
  });

  console.log("⏰ Scheduler started");
}

module.exports = {
  startScheduler,
  runMedicineReminders,
  runWaterReminders,
  runVaccinationReminders,
  runAppointmentReminders,
  runArticleNotifications,
};
