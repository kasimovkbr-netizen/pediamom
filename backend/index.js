/**
 * PediaMom - Standalone Express Server
 *
 * Cascade delete is handled by PostgreSQL ON DELETE CASCADE constraints.
 * See backend/scripts/schema.sql for the schema definition.
 */

// Load environment variables
require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Initialize Stripe configuration
const { validateStripeConfig } = require("./config/stripe");

try {
  validateStripeConfig();
} catch (error) {
  console.error("❌ Stripe configuration error:", error.message);
}

// Import security middleware
const {
  securityHeaders,
  apiLimiter,
  sanitizeInput,
  limitRequestSize,
  securityLogger,
} = require("./middleware/security");

// Create Express app
const app = express();

// ── CORS — must be first, before helmet ───────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Allow any localhost/127.0.0.1 in development
      if (
        process.env.NODE_ENV !== "production" &&
        (origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:"))
      ) {
        return callback(null, true);
      }
      const allowed = [
        process.env.FRONTEND_URL,
        process.env.FRONTEND_URL_2,
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean);
      // Allow any vercel.app domain
      if (origin.endsWith(".vercel.app")) return callback(null, true);
      // Allow exact Vercel production URL
      if (origin === "https://pediamom.vercel.app") return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Handle preflight for all routes
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(204);
  }
  next();
});

// ── Security headers (helmet) ──────────────────────────────────────────────
app.use(securityHeaders);

// ── Request size guard ─────────────────────────────────────────────────────
app.use(limitRequestSize);

// ── Body parsing (raw body preserved for Stripe webhooks) ─────────────────
app.use(
  express.json({
    limit: "50kb",
    verify: (req, res, buf) => {
      if (req.originalUrl.includes("/webhooks/")) {
        req.rawBody = buf;
      }
    },
  }),
);

// ── Input sanitization ─────────────────────────────────────────────────────
app.use(sanitizeInput);

// ── Global rate limiter ────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ── Security logger ────────────────────────────────────────────────────────
// Import routes and middleware
const monetizationRoutes = require("./routes/monetization");
const webhookRoutes = require("./routes/webhooks");
const aiRoutes = require("./routes/ai");
const telegramRoutes = require("./routes/telegram");
const { authenticateUser } = require("./middleware/auth");
const { supabase: supabaseAdmin } = require("./config/supabase");

// Apply authentication middleware to all /api routes except webhooks, telegram webhook, and health
app.use("/api", (req, res, next) => {
  if (
    req.path.startsWith("/webhooks/") ||
    req.path === "/telegram/webhook" ||
    req.path === "/health"
  ) {
    return next();
  }
  return authenticateUser(req, res, next);
});

// Security logger AFTER auth so req.user is populated
app.use(securityLogger);

// Mount webhook routes (Stripe signature verification used instead of auth)
app.use("/api/webhooks", webhookRoutes);

// Mount Telegram bot routes
app.use("/api", telegramRoutes);

// Mount monetization routes
app.use("/api", monetizationRoutes);

// Mount AI analysis routes
app.use("/api", aiRoutes);

// Mount chat routes
const chatRoutes = require("./routes/chat");
app.use("/api", chatRoutes);

// Delete account endpoint — backend calls supabase.auth.admin.deleteUser()
// which cascades all related data via ON DELETE CASCADE (Requirement 10.6)
app.delete("/api/account", async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: { code: "unauthenticated", message: "Not authenticated" },
    });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[DELETE /api/account] error:", error.message);
    return res.status(500).json({
      success: false,
      error: { code: "delete_failed", message: "Failed to delete account" },
    });
  }

  return res.json({ success: true });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "PediaMom API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((error, req, res, next) => {
  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      error: { code: "cors_error", message: "Origin not allowed" },
    });
  }

  console.error("API Error:", error.message);

  res.status(500).json({
    success: false,
    error: {
      code: "internal_error",
      message: "An unexpected error occurred",
    },
  });
});

// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ PediaMom API server running on port ${PORT}`);

  // Telegram bot
  if (process.env.TELEGRAM_BOT_TOKEN) {
    setImmediate(() => {
      try {
        const bot = require("./services/TelegramBot");
        if (process.env.NODE_ENV === "production") {
          // Production: webhook rejimi — Telegram /setWebhook orqali sozlang
          console.log("🤖 Telegram bot: webhook mode (production)");
        } else {
          // Development: polling rejimi
          bot.startPolling();
        }
      } catch (e) {
        console.error("Telegram bot error:", e.message);
      }
    });
  }

  // Scheduler — async, non-blocking
  setImmediate(() => {
    try {
      const { startScheduler } = require("./services/Scheduler");
      startScheduler();
      console.log("⏰ Scheduler started");
    } catch (e) {
      console.error("Scheduler error:", e.message);
    }
  });
});

// Keep-alive
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

module.exports = app;
