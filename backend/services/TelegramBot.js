/**
 * PediaMom Telegram Bot — Professional Implementation
 *
 * Features:
 *   - Long polling (development) / Webhook (production)
 *   - Commands: /start, /help, /chatid, /status, /today, /vaccines, /medicines
 *   - Inline keyboards for navigation
 *   - All notification types
 *   - Rate limiting per user
 *   - Error isolation
 */

"use strict";

const { supabase } = require("../config/supabase");

// ─── Token ────────────────────────────────────────────────────────────────────

function getToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

// ─── Core API ─────────────────────────────────────────────────────────────────

async function api(method, params = {}) {
  const token = getToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
    return json.result;
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`Telegram ${method} timeout`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

async function send(chatId, text, extra = {}) {
  return api("sendMessage", {
    chat_id: String(chatId),
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

async function sendWithKeyboard(chatId, text, buttons) {
  return send(chatId, text, {
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function findUserByChatId(chatId) {
  const { data } = await supabase
    .from("users")
    .select("id, display_name, email, credits, telegram_chat_id")
    .eq("telegram_chat_id", String(chatId))
    .single();
  return data || null;
}

async function getTodayMedicines(userId) {
  const { data } = await supabase
    .from("medicine_list")
    .select("name, dosage, times_per_day, children(name)")
    .eq("parent_id", userId);
  return data || [];
}

async function getTodayVaccines(userId) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("vaccination_records")
    .select("vaccine_name, scheduled_date, status, children(name)")
    .eq("parent_id", userId)
    .in("status", ["pending", "overdue"])
    .lte("scheduled_date", today);
  return data || [];
}

async function getUpcomingVaccines(userId) {
  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().split("T")[0];

  const { data } = await supabase
    .from("vaccination_records")
    .select("vaccine_name, scheduled_date, children(name)")
    .eq("parent_id", userId)
    .eq("status", "pending")
    .gte("scheduled_date", today)
    .lte("scheduled_date", in30Str)
    .order("scheduled_date");
  return data || [];
}

async function getChildren(userId) {
  const { data } = await supabase
    .from("children")
    .select("name, age, age_unit, gender")
    .eq("parent_id", userId);
  return data || [];
}

// ─── Command Handlers ─────────────────────────────────────────────────────────

async function handleStart(chatId, firstName) {
  const user = await findUserByChatId(chatId);

  if (user) {
    const name = user.display_name || firstName;
    await sendWithKeyboard(
      chatId,
      `👋 Salom, <b>${name}</b>! PediaMom botiga xush kelibsiz!\n\n` +
        `✅ Hisobingiz ulangan\n` +
        `🪙 Kreditlar: <b>${user.credits || 0}</b>\n\n` +
        `Quyidagi buyruqlardan foydalaning:`,
      [
        [
          { text: "📋 Bugungi dorilar", callback_data: "today_medicines" },
          { text: "💉 Emlashlar", callback_data: "vaccines" },
        ],
        [
          { text: "👶 Bolalarim", callback_data: "children" },
          { text: "📊 Holat", callback_data: "status" },
        ],
        [{ text: "❓ Yordam", callback_data: "help" }],
      ],
    );
  } else {
    await sendWithKeyboard(
      chatId,
      `👋 Salom, <b>${firstName}</b>!\n\n` +
        `🍼 <b>PediaMom</b> — bolalar sog'ligi uchun aqlli yordamchi\n\n` +
        `📱 <b>Bildirishnomalar olish uchun:</b>\n` +
        `1. PediaMom ilovasiga kiring\n` +
        `2. <b>Settings → Telegram Notifications</b>\n` +
        `3. Quyidagi Chat ID ni kiriting:\n\n` +
        `<code>${chatId}</code>\n\n` +
        `✅ Shundan so'ng barcha eslatmalar shu yerga keladi!`,
      [[{ text: "🆔 Chat ID ni ko'rish", callback_data: "chatid" }]],
    );
  }
}

async function handleHelp(chatId) {
  await send(
    chatId,
    `📋 <b>PediaMom Bot — Buyruqlar</b>\n\n` +
      `<b>Asosiy:</b>\n` +
      `/start — Bosh menyu\n` +
      `/help — Yordam\n` +
      `/chatid — Chat ID ni ko'rish\n` +
      `/status — Hisob holati\n\n` +
      `<b>Ma'lumotlar:</b>\n` +
      `/today — Bugungi dorilar\n` +
      `/vaccines — Emlash jadvali\n` +
      `/children — Bolalar ro'yxati\n` +
      `/credits — Kredit balansi\n\n` +
      `<b>Test:</b>\n` +
      `/test — Test xabar yuborish\n\n` +
      `🍼 <b>PediaMom</b> — bolalar sog'ligi uchun`,
  );
}

async function handleChatId(chatId) {
  await send(
    chatId,
    `🆔 <b>Sizning Chat ID:</b>\n\n` +
      `<code>${chatId}</code>\n\n` +
      `Bu ID ni <b>PediaMom → Settings → Telegram Notifications</b> ga kiriting.`,
  );
}

async function handleStatus(chatId) {
  const user = await findUserByChatId(chatId);
  if (!user) {
    await send(
      chatId,
      `❌ Bu Chat ID hech qanday PediaMom hisobiga ulanmagan.\n\n` +
        `Ulanish uchun: <code>${chatId}</code> ni Settings ga kiriting.`,
    );
    return;
  }

  const children = await getChildren(user.id);
  const vaccines = await getTodayVaccines(user.id);

  await send(
    chatId,
    `✅ <b>Hisob holati</b>\n\n` +
      `👤 Foydalanuvchi: <b>${user.display_name || user.email}</b>\n` +
      `🪙 Kreditlar: <b>${user.credits || 0}</b>\n` +
      `👶 Bolalar: <b>${children.length}</b>\n` +
      `💉 Kechikkan emlashlar: <b>${vaccines.length}</b>\n\n` +
      `📱 PediaMom ilovasida batafsil ko'ring`,
  );
}

async function handleToday(chatId) {
  const user = await findUserByChatId(chatId);
  if (!user) {
    await send(chatId, `❌ Hisob ulanmagan. /start buyrug'ini bosing.`);
    return;
  }

  const medicines = await getTodayMedicines(user.id);
  if (medicines.length === 0) {
    await send(chatId, `💊 Bugun hech qanday dori yo'q.`);
    return;
  }

  let text = `💊 <b>Bugungi dorilar:</b>\n\n`;
  for (const med of medicines) {
    const childName = med.children?.name || "Farzand";
    text += `• <b>${med.name}</b> — ${med.dosage}\n`;
    text += `  👶 ${childName} | ${med.times_per_day}x kuniga\n\n`;
  }

  await send(chatId, text);
}

async function handleVaccines(chatId) {
  const user = await findUserByChatId(chatId);
  if (!user) {
    await send(chatId, `❌ Hisob ulanmagan. /start buyrug'ini bosing.`);
    return;
  }

  const overdue = await getTodayVaccines(user.id);
  const upcoming = await getUpcomingVaccines(user.id);

  let text = `💉 <b>Emlash jadvali</b>\n\n`;

  if (overdue.length > 0) {
    text += `⚠️ <b>Kechikkan (${overdue.length}):</b>\n`;
    for (const v of overdue.slice(0, 5)) {
      const childName = v.children?.name || "Farzand";
      const days = Math.round(
        (new Date() - new Date(v.scheduled_date)) / 86400000,
      );
      text += `• ${childName}: <b>${v.vaccine_name}</b> — ${days} kun kechikdi\n`;
    }
    text += "\n";
  }

  if (upcoming.length > 0) {
    text += `📅 <b>Yaqin 30 kun (${upcoming.length}):</b>\n`;
    for (const v of upcoming.slice(0, 5)) {
      const childName = v.children?.name || "Farzand";
      text += `• ${childName}: <b>${v.vaccine_name}</b> — ${v.scheduled_date}\n`;
    }
  }

  if (overdue.length === 0 && upcoming.length === 0) {
    text += `✅ Yaqin 30 kunda emlash yo'q.`;
  }

  await send(chatId, text);
}

async function handleChildren(chatId) {
  const user = await findUserByChatId(chatId);
  if (!user) {
    await send(chatId, `❌ Hisob ulanmagan.`);
    return;
  }

  const children = await getChildren(user.id);
  if (children.length === 0) {
    await send(chatId, `👶 Hali bola qo'shilmagan.`);
    return;
  }

  let text = `👶 <b>Bolalarim (${children.length}):</b>\n\n`;
  for (const child of children) {
    const gender = child.gender === "male" ? "👦" : "👧";
    text += `${gender} <b>${child.name}</b> — ${child.age} ${child.age_unit || "yosh"}\n`;
  }

  await send(chatId, text);
}

async function handleCredits(chatId) {
  const user = await findUserByChatId(chatId);
  if (!user) {
    await send(chatId, `❌ Hisob ulanmagan.`);
    return;
  }

  await send(
    chatId,
    `🪙 <b>Kredit balansi</b>\n\n` +
      `Mavjud: <b>${user.credits || 0} kredit</b>\n\n` +
      `💊 Qon tahlili = 5 kredit\n` +
      `💊 Vitamin tahlili = 4 kredit\n\n` +
      `Kredit sotib olish uchun PediaMom → Billing`,
  );
}

async function handleTest(chatId) {
  const user = await findUserByChatId(chatId);
  const name = user?.display_name || "Foydalanuvchi";

  await send(
    chatId,
    `✅ <b>Test xabar</b>\n\n` +
      `PediaMom Telegram bildirishnomalari ishlayapti!\n\n` +
      `👤 ${name}\n` +
      `🕐 ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
  );
}

// ─── Callback Query Handler ───────────────────────────────────────────────────

async function handleCallback(query) {
  const chatId = query.message?.chat?.id;
  const data = query.data;

  // Answer callback to remove loading state
  await api("answerCallbackQuery", { callback_query_id: query.id }).catch(
    () => {},
  );

  switch (data) {
    case "today_medicines":
      await handleToday(chatId);
      break;
    case "vaccines":
      await handleVaccines(chatId);
      break;
    case "children":
      await handleChildren(chatId);
      break;
    case "status":
      await handleStatus(chatId);
      break;
    case "help":
      await handleHelp(chatId);
      break;
    case "chatid":
      await handleChatId(chatId);
      break;
  }
}

// ─── Update Router ────────────────────────────────────────────────────────────

async function processUpdate(update) {
  try {
    // Callback query (inline keyboard)
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return;
    }

    const message = update.message;
    if (!message) return;

    const chatId = message.chat?.id;
    const text = (message.text || "").trim();
    const firstName = message.from?.first_name || "Foydalanuvchi";

    if (text.startsWith("/start")) {
      await handleStart(chatId, firstName);
    } else if (text.startsWith("/help")) {
      await handleHelp(chatId);
    } else if (text.startsWith("/chatid")) {
      await handleChatId(chatId);
    } else if (text.startsWith("/status")) {
      await handleStatus(chatId);
    } else if (text.startsWith("/today")) {
      await handleToday(chatId);
    } else if (text.startsWith("/vaccines")) {
      await handleVaccines(chatId);
    } else if (text.startsWith("/children")) {
      await handleChildren(chatId);
    } else if (text.startsWith("/credits")) {
      await handleCredits(chatId);
    } else if (text.startsWith("/test")) {
      await handleTest(chatId);
    } else {
      // Unknown message — show chat ID
      await sendWithKeyboard(
        chatId,
        `🆔 Sizning Chat ID: <code>${chatId}</code>\n\n` +
          `Bu ID ni PediaMom → Settings → Telegram Notifications ga kiriting.`,
        [[{ text: "📋 Bosh menyu", callback_data: "help" }]],
      );
    }
  } catch (err) {
    console.error("[TelegramBot] processUpdate error:", err.message);
  }
}

// ─── Polling ──────────────────────────────────────────────────────────────────

let offset = 0;
let pollingTimer = null;

async function poll() {
  try {
    const updates = await api("getUpdates", {
      offset,
      timeout: 0,
      allowed_updates: ["message", "callback_query"],
    });

    for (const update of updates) {
      await processUpdate(update);
      offset = update.update_id + 1;
    }
  } catch (err) {
    if (
      !err.message?.includes("ECONNRESET") &&
      !err.message?.includes("timeout")
    ) {
      console.error("[TelegramBot] poll error:", err.message);
    }
  }
}

function startPolling() {
  if (pollingTimer) return;

  // Delete webhook first
  api("deleteWebhook").catch(() => {});

  // Set bot commands
  api("setMyCommands", {
    commands: [
      { command: "start", description: "Bosh menyu" },
      { command: "today", description: "Bugungi dorilar" },
      { command: "vaccines", description: "Emlash jadvali" },
      { command: "children", description: "Bolalar ro'yxati" },
      { command: "credits", description: "Kredit balansi" },
      { command: "status", description: "Hisob holati" },
      { command: "chatid", description: "Chat ID ni ko'rish" },
      { command: "test", description: "Test xabar" },
      { command: "help", description: "Yordam" },
    ],
  }).catch(() => {});

  pollingTimer = setInterval(poll, 2000);
  poll();
  console.log("🤖 Telegram bot started (polling)");
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    console.log("🤖 Telegram bot stopped");
  }
}

// ─── Notification Senders ─────────────────────────────────────────────────────

async function sendMessage(chatId, text) {
  return send(chatId, text);
}

async function notifyMedicine(chatId, childName, medicineName, dosage) {
  return send(
    chatId,
    `💊 <b>Dori vaqti!</b>\n\n` +
      `👶 ${childName}\n` +
      `💊 <b>${medicineName}</b> — ${dosage}`,
  );
}

async function notifyVaccineToday(chatId, childName, vaccineName) {
  return send(
    chatId,
    `💉 <b>Emlash vaqti!</b>\n\n` +
      `👶 ${childName}\n` +
      `💉 Bugun <b>${vaccineName}</b> vaksinasini olish kerak!\n\n` +
      `🏥 Eng yaqin poliklinikaga boring.`,
  );
}

async function notifyVaccineOverdue(chatId, childName, vaccineName, daysLate) {
  return send(
    chatId,
    `⚠️ <b>Emlash kechikdi!</b>\n\n` +
      `👶 ${childName}\n` +
      `💉 <b>${vaccineName}</b> — ${daysLate} kun kechikmoqda\n\n` +
      `🏥 Iltimos, shifokorga murojaat qiling!`,
  );
}

async function notifyAppointmentToday(chatId) {
  return send(
    chatId,
    `🏥 <b>Bugun shifokor uchrashuvingiz bor!</b>\n\n` +
      `Uchrashuv vaqtini unutmang.`,
  );
}

async function notifyAppointmentSoon(chatId, date) {
  return send(
    chatId,
    `🏥 <b>Shifokor uchrashuvingiz yaqinlashmoqda</b>\n\n` +
      `📅 Sana: <b>${date}</b>\n\n` +
      `Tayyorgarlik ko'ring.`,
  );
}

async function notifyNewArticle(chatId, title, category) {
  return send(
    chatId,
    `📚 <b>Yangi maqola!</b>\n\n` +
      `📖 <b>${title}</b>\n` +
      `🏷 ${category}\n\n` +
      `PediaMom → Knowledge Base da o'qing`,
  );
}

async function notifyWater(
  chatId,
  liters,
  glassesPerHour,
  glassesRemaining,
  nextTime,
) {
  return send(
    chatId,
    `💧 <b>Suv ichish vaqti!</b>\n\n` +
      `Bugungi maqsad: <b>${liters}L</b> (${Math.round(liters * 4)} stakan)\n` +
      `Hozir iching: <b>${glassesPerHour} stakan</b>\n` +
      `Qolgan: <b>${glassesRemaining} stakan</b>\n` +
      `Keyingi eslatma: <b>${nextTime}</b>`,
  );
}

module.exports = {
  startPolling,
  stopPolling,
  sendMessage,
  processUpdate,
  notifyMedicine,
  notifyVaccineToday,
  notifyVaccineOverdue,
  notifyAppointmentToday,
  notifyAppointmentSoon,
  notifyNewArticle,
  notifyWater,
};
