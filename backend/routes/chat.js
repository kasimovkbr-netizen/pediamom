/**
 * Health AI Chat Route
 * POST /api/chat/health
 * - Takes symptoms + chat history
 * - Returns AI health advice (Gemini)
 * - 1 credit per message
 */

"use strict";

const express = require("express");
const router = express.Router();
const { supabase } = require("../config/supabase");

const CHAT_CREDIT_COST = 1;

async function getUserCredits(userId) {
  const { data } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();
  return typeof data?.credits === "number" ? data.credits : 0;
}

async function deductCredits(userId, amount) {
  const current = await getUserCredits(userId);
  if (current < amount) return false;
  await supabase
    .from("users")
    .update({ credits: current - amount })
    .eq("id", userId);
  return true;
}

async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const models = [
    "gemini-2.5-flash-preview-04-17",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ];

  // Convert chat history to Gemini format
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let lastError = null;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: `You are a compassionate women's health assistant for PediaMom app. 
You help mothers with:
- Menstrual cycle questions and symptoms
- Pregnancy-related concerns  
- General maternal health advice
- Child health questions

Rules:
- Always recommend consulting a doctor for serious symptoms
- Be warm, supportive and clear
- Keep responses concise (3-5 sentences max)
- Respond in the same language the user writes in (Uzbek or English)
- Never diagnose — only provide general health information`,
              },
            ],
          },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        }),
      });

      const json = await res.json();
      if (
        json.error?.code === 429 ||
        json.error?.code === 404 ||
        json.error?.status === "RESOURCE_EXHAUSTED" ||
        json.error?.status === "NOT_FOUND"
      ) {
        lastError = new Error(
          `${model}: ${json.error?.message || json.error?.code}`,
        );
        continue;
      }
      if (!res.ok) {
        lastError = new Error(json.error?.message || "failed");
        continue;
      }

      const parts = json.candidates?.[0]?.content?.parts || [];
      const text =
        parts.find((p) => p.text && !p.thought)?.text ||
        parts.find((p) => p.text)?.text ||
        "";
      if (!text) {
        lastError = new Error("empty response");
        continue;
      }
      return text;
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error("All models quota exceeded");
}

router.post("/chat/health", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userId = req.user.uid;

    if (!message?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Message is required" });
    }

    // Check credits (1 per message, free if 0 credits — allow 5 free messages)
    const credits = await getUserCredits(userId);
    const freeMessages = req.body.freeCount || 0;
    const needsCredit = freeMessages >= 5;

    if (needsCredit && credits < CHAT_CREDIT_COST) {
      return res.status(402).json({
        success: false,
        error: {
          code: "insufficient_credits",
          message: "Not enough credits",
          creditsNeeded: CHAT_CREDIT_COST,
        },
      });
    }

    // Build messages array with system context
    const messages = [
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    const reply = await callGemini(messages);

    // Deduct credit if needed
    if (needsCredit) {
      await deductCredits(userId, CHAT_CREDIT_COST);
    }

    res.json({
      success: true,
      data: {
        reply,
        creditsUsed: needsCredit ? CHAT_CREDIT_COST : 0,
        creditsRemaining: needsCredit ? credits - CHAT_CREDIT_COST : credits,
      },
    });
  } catch (err) {
    console.error("[chat] error:", err.message);
    res.status(500).json({
      success: false,
      error: { code: "chat_failed", message: err.message },
    });
  }
});

module.exports = router;
