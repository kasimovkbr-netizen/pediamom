# PediaMom — Technical Documentation

> Smart health tracking platform for families. Manage children's health, medical records, medicines, vaccinations, and AI-powered analysis — all in one place.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema](#6-database-schema)
7. [Authentication](#7-authentication)
8. [API Reference](#8-api-reference)
9. [AI Analysis System](#9-ai-analysis-system)
10. [Monetization & Payments](#10-monetization--payments)
11. [Telegram Bot](#11-telegram-bot)
12. [Scheduler & Notifications](#12-scheduler--notifications)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Security](#14-security)
15. [Deployment](#15-deployment)
16. [Testing](#16-testing)

---

## 1. Project Overview

PediaMom is a full-stack web application designed for parents to track and manage the health of their children and themselves. The platform provides:

- **Child health profiles** — growth tracking, allergies, doctor visits
- **Medicine management** — schedules, dosage tracking, reminders
- **Vaccination tracking** — based on the Uzbek national immunization schedule (20 vaccines)
- **AI-powered medical analysis** — blood, urine, and vitamin test interpretation via Google Gemini
- **Mother health tracking** — menstrual cycle, pregnancy, breastfeeding
- **Knowledge base** — curated health articles
- **Telegram notifications** — automated reminders for medicines, vaccines, and water intake
- **Credit-based monetization** — free tier + one-time packs + monthly subscription via Stripe

**Target users:** Parents in Uzbekistan and CIS countries  
**Supported languages:** Uzbek (`uz`), English (`en`)

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend                         │
│         Vanilla JS + HTML5 + CSS3 (Static files)        │
│   Auth · Dashboard · Children · Analysis · Billing      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST API
                         │ Authorization: Bearer <JWT>
┌────────────────────────▼────────────────────────────────┐
│                    Backend (Node.js)                     │
│              Express.js REST API Server                  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │   Auth   │  │    AI    │  │ Payments │  │  Bot   │  │
│  │Middleware│  │ Analysis │  │  Stripe  │  │Telegram│  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Scheduler (node-cron)               │   │
│  │   Medicine · Vaccine · Water · Period reminders  │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
┌─────────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐
│    Supabase    │ │   Stripe   │ │  Gemini   │
│  PostgreSQL +  │ │  Payments  │ │    AI     │
│  Auth + RLS    │ │            │ │    API    │
└────────────────┘ └────────────┘ └───────────┘
```

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | ≥ 18 |
| Framework | Express.js | ^5.2.1 |
| Database | Supabase (PostgreSQL) | ^2.101.1 |
| Authentication | Supabase Auth (JWT) | — |
| AI | Google Gemini API | gemini-2.0-flash |
| Payments | Stripe | ^20.4.1 |
| Notifications | Telegram Bot API | — |
| Scheduler | node-cron | ^4.2.1 |
| Security | Helmet, express-rate-limit | — |
| Frontend | Vanilla JS, HTML5, CSS3 | — |
| Testing | Jest + fast-check (PBT) | ^29.7.0 |

---

## 4. Project Structure

```
BISP_FinalProject_Zebiniso_Isroilova_11973/
├── backend/
│   ├── config/
│   │   ├── supabase.js          # Supabase admin client (service_role)
│   │   ├── stripe.js            # Stripe SDK initialization
│   │   └── monetization.js      # Pricing config (credits, packages, tiers)
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication via Supabase
│   │   ├── security.js          # Helmet, rate limiting, sanitization
│   │   └── validation.js        # Request body validation
│   ├── models/
│   │   ├── UserPaymentProfile.js
│   │   ├── TransactionRecord.js
│   │   ├── UsageRecord.js
│   │   ├── FreeUsageTracking.js
│   │   └── index.js
│   ├── routes/
│   │   ├── ai.js                # POST /api/analysis/ai
│   │   ├── monetization.js      # GET/POST /api/monetization/*
│   │   ├── telegram.js          # POST /api/telegram/webhook
│   │   └── webhooks.js          # POST /api/webhooks/stripe
│   ├── services/
│   │   ├── AIAnalysisEngine.js  # AI analysis orchestration
│   │   ├── TelegramBot.js       # Bot commands & notifications
│   │   ├── Scheduler.js         # Cron jobs for reminders
│   │   ├── CreditSystem.js      # Credit balance management
│   │   ├── SubscriptionManager.js
│   │   ├── PaymentGateway.js
│   │   └── UsageTracker.js
│   ├── scripts/
│   │   └── full_schema.sql      # Complete PostgreSQL schema (52 tables)
│   ├── shared/
│   │   └── uz_vaccine_schedule.js  # Uzbek national vaccine schedule
│   ├── index.js                 # Express app entry point
│   └── package.json
└── frontend/
    ├── index.html               # Landing page
    ├── auth/
    │   ├── login.html
    │   ├── register.html
    │   └── dashboard.html
    ├── children/
    │   ├── addchild.html
    │   ├── childlist.html
    │   └── editchild.html
    ├── js/
    │   ├── auth.js              # Auth guard + login/register logic
    │   ├── dashboard.js         # SPA dashboard with page routing
    │   ├── supabase.js          # Frontend Supabase client (anon key)
    │   ├── i18n.js              # Internationalization (uz/en)
    │   ├── billing.module.js    # Stripe checkout UI
    │   ├── child_health.module.js
    │   ├── addanalysis.module.js
    │   └── ...
    └── css/
        └── style.css
```

---

## 5. Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PACK_100=price_...
STRIPE_PRICE_PACK_300=price_...
STRIPE_PRICE_PACK_800=price_...
STRIPE_PRICE_SUBSCRIPTION=price_...

# AI
GEMINI_API_KEY=your_gemini_api_key

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# App
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.com
FREE_MONTHLY_CREDITS=10
DEFAULT_CURRENCY=usd
```

---

## 6. Database Schema

The database consists of **52 tables** managed in Supabase PostgreSQL. Key tables:

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with credits, subscription, and Telegram info |
| `children` | Child profiles linked to parent users |
| `medicine_list` | Active medicines per child |
| `medicine_logs` | Daily medicine intake tracking |
| `vaccination_records` | Vaccine schedule and completion status |
| `medical_analyses` | Stored analysis results |
| `knowledge_base` | Health articles |

### Mother Health Tables

| Table | Description |
|-------|-------------|
| `cycle_history` | Menstrual cycle records |
| `pregnancy_records` | Pregnancy tracking |
| `breastfeeding_sessions` | Breastfeeding logs |

### Monetization Tables

| Table | Description |
|-------|-------------|
| `users.credits` | Credit balance (column on users table) |
| `users.stripe_subscription_id` | Active Stripe subscription |
| `users.free_credits_used` | Free tier usage counter |

### Users Table Schema

```sql
CREATE TABLE users (
  id                      UUID PRIMARY KEY,
  email                   TEXT UNIQUE,
  display_name            TEXT,
  role                    TEXT DEFAULT 'parent',
  telegram_chat_id        TEXT,
  credits                 INTEGER NOT NULL DEFAULT 50,
  free_credits_used       INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  subscription_status     TEXT,
  subscription_period_end TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
```

### Children Table Schema

```sql
CREATE TABLE children (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  age        INTEGER,
  age_unit   TEXT DEFAULT 'years',
  gender     TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> All child-related tables use `ON DELETE CASCADE` — deleting a child removes all associated records automatically.

---

## 7. Authentication

Authentication uses **Supabase Auth** with JWT tokens.

### Flow

```
1. User registers/logs in via frontend (supabase.auth.signUp / signInWithPassword)
2. Supabase returns a JWT access token
3. Frontend stores session via Supabase SDK (localStorage)
4. All API requests include: Authorization: Bearer <token>
5. Backend middleware verifies token via supabase.auth.getUser(token)
6. req.user = { uid, email } is set for downstream handlers
```

### Auth Middleware (`backend/middleware/auth.js`)

```js
async function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  req.user = { uid: user.id, email: user.email };
  next();
}
```

### Frontend Auth Guard (`frontend/js/auth.js`)

```js
supabase.auth.onAuthStateChange((event, session) => {
  // Redirect unauthenticated users away from dashboard
  // Redirect authenticated users away from login/register
});
```

---

## 8. API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### AI Analysis

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/analysis/ai` | ✅ | Run AI analysis on medical data |

**POST `/api/analysis/ai`**

Request body:
```json
{
  "type": "blood",
  "childId": "uuid",
  "values": {
    "hemoglobin": 120,
    "wbc": 6.5
  }
}
```

Response:
```json
{
  "success": true,
  "interpretation": "...",
  "recommendations": ["..."],
  "creditsUsed": 5,
  "creditsRemaining": 45
}
```

Credit costs: `blood` = 5, `vitamin` = 4, `urine` = 3, `growth` = 2, `nutrition` = 3

### Monetization

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/monetization/status` | ✅ | Get user's plan, credits, subscription |
| `GET` | `/api/monetization/credits/packages` | ✅ | List available credit packages |
| `GET` | `/api/monetization/credits/balance` | ✅ | Get current credit balance |
| `POST` | `/api/monetization/checkout/credits` | ✅ | Create Stripe checkout for credit pack |
| `POST` | `/api/monetization/checkout/subscription` | ✅ | Create Stripe checkout for subscription |
| `POST` | `/api/monetization/subscription/cancel` | ✅ | Cancel active subscription |

**GET `/api/monetization/status`** response:
```json
{
  "success": true,
  "data": {
    "freeTier": { "used": 3, "limit": 10, "remaining": 7 },
    "credits": 45,
    "subscription": null,
    "plan": "credits"
  }
}
```

### Telegram

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/telegram/webhook` | ❌ | Receive updates from Telegram |
| `POST` | `/api/telegram/test` | ✅ | Send test message to user |
| `GET` | `/api/telegram/setup` | ✅ | Register webhook URL with Telegram |

### Stripe Webhooks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/webhooks/stripe` | Signature | Handle Stripe payment events |

Handled events:
- `checkout.session.completed` — credit pack purchase or subscription start
- `invoice.payment_succeeded` — monthly subscription renewal
- `customer.subscription.deleted` — subscription cancellation

---

## 9. AI Analysis System

Medical analysis is powered by **Google Gemini API** with automatic model fallback.

### Model Fallback Chain

```
gemini-2.0-flash
  → gemini-2.0-flash-lite
    → gemini-1.5-flash-8b
      → gemini-1.5-flash
```

If a model returns a quota error, the next model in the chain is tried automatically.

### Analysis Flow

```
1. User submits analysis values (blood or vitamin)
2. Backend checks user credit balance
3. If insufficient credits → return 402 error
4. Build prompt with medical values + child context
5. Call Gemini API (30s timeout)
6. Parse JSON response (interpretation + recommendations)
7. Deduct credits from user balance
8. Store result in medical_analyses table
9. Return interpretation to frontend
```

### Supported Analysis Types

| Type | Credits | Description |
|------|---------|-------------|
| `blood` | 5 | Complete blood count interpretation (hemoglobin, ferritin, WBC) |
| `vitamin` | 4 | Vitamin deficiency analysis (Vitamin D, B12) |

> `wbc` = White Blood Cell count — one of the blood test parameters sent in the request body.

---

## 10. Monetization & Payments

### Pricing Tiers

| Plan | Price | Credits | Notes |
|------|-------|---------|-------|
| Free | $0 | 10/month | Resets monthly |
| Starter Pack | $3.99 | 100 | One-time |
| Value Pack | $8.99 | 300 | One-time, most popular |
| Pro Pack | $19.99 | 800 | One-time |
| Monthly Plan | $14.99/mo | 500/month | Subscription, renews monthly |

New users receive **50 free credits** on registration (via database trigger).

### Credit Deduction Logic

```
1. Check free tier remaining (free_credits_used < 10)
   → Use free credits first
2. Check paid credit balance (users.credits > 0)
   → Deduct from credits
3. Check active subscription
   → Use subscription credits
4. If none available → return insufficient credits error
```

### Stripe Integration

- Checkout sessions created server-side with `metadata` containing `userId`, `packageId`, `credits`
- Webhook endpoint verifies `stripe-signature` header before processing
- Credits added atomically after `checkout.session.completed` event
- Subscription status synced on `invoice.payment_succeeded` and `customer.subscription.deleted`

---

## 11. Telegram Bot

The Telegram bot provides automated health reminders and status queries.

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with feature overview |
| `/help` | List all available commands |
| `/chatid` | Display user's Telegram Chat ID (for setup) |
| `/status` | Show credit balance and subscription status |
| `/today` | Today's medicine schedule |
| `/vaccines` | Pending and overdue vaccinations |
| `/medicines` | Active medicine list |

### Setup

1. User opens bot and sends `/chatid`
2. User copies their Chat ID
3. User pastes it in Settings → Telegram Notifications in the app
4. Backend saves `telegram_chat_id` to `users` table
5. Scheduler uses this ID to send automated reminders

### Notification Types

- **Medicine reminders** — sent at scheduled hours based on `times_per_day`
- **Vaccine reminders** — sent 7 days before and on the scheduled date
- **Water intake reminders** — sent hourly between `start_hour` and `end_hour`
- **Period reminders** — sent based on predicted cycle dates

### Webhook vs Polling

- **Development:** Long polling via `getUpdates` (auto-started)
- **Production:** Webhook at `POST /api/telegram/webhook` (set via `/api/telegram/setup`)

---

## 12. Scheduler & Notifications

The scheduler runs cron jobs using `node-cron`. All times are in **Tashkent timezone (UTC+5)**.

### Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Medicine reminders | Every hour | Check `medicine_list` for scheduled doses |
| Vaccine reminders | Daily at 09:00 | Check `vaccination_records` for upcoming/overdue |
| Water reminders | Every hour | Check `water_intake` for active tracking |
| Period reminders | Daily at 08:00 | Check `cycle_history` for predicted dates |

### Medicine Reminder Logic

```
For each active medicine:
  1. Calculate scheduled hours based on times_per_day
     - 1x/day → [8]
     - 2x/day → [8, 20]
     - 3x/day → [8, 13, 20]
  2. If current Tashkent hour matches → send Telegram message
  3. Skip if user has no telegram_chat_id
```

---

## 13. Frontend Architecture

The frontend is a **Single Page Application (SPA)** built with Vanilla JS, served as static files.

### Page Structure

```
index.html          → Landing page (login/register links)
auth/login.html     → Login form
auth/register.html  → Registration form
auth/dashboard.html → Main SPA (all features loaded dynamically)
```

### Dashboard SPA

The dashboard uses a module-based architecture where each section is a JS module:

| Module | File | Description |
|--------|------|-------------|
| Children | `children.module.js` | Child profiles CRUD |
| Child Health | `child_health.module.js` | Health records |
| Analysis | `addanalysis.module.js` | Submit and view analyses |
| Medicines | (inline) | Medicine management |
| Billing | `billing.module.js` | Credit purchase UI |
| Admin | `admin.module.js` | Admin panel |
| Family | `family.module.js` | Family member management |
| Daily Checklist | `daily_checklist.module.js` | Daily health tasks |

### Internationalization

```js
import { t, initI18n, getLang } from './i18n.js';

// Usage
t('welcome_back')  // Returns translated string
setLang('uz')      // Switch to Uzbek
setLang('en')      // Switch to English
```

Language preference is stored in `localStorage`.

### Supabase Frontend Client

```js
// frontend/js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  window.__SUPABASE_URL__,
  window.__SUPABASE_ANON_KEY__
);
```

The anon key is injected via `window.__SUPABASE_URL__` and `window.__SUPABASE_ANON_KEY__` in `index.html`.

---

## 14. Security

### Middleware Stack

```
Request
  → CORS (origin whitelist)
  → Helmet (security headers)
  → Rate limiter (express-rate-limit)
  → Request size limit
  → Input sanitization
  → authenticateUser (JWT verification)
  → Route handler
```

### Rate Limiting

- Global API limiter applied to all `/api/*` routes
- Stripe webhook endpoint uses raw body parser (bypasses JSON middleware)

### Stripe Webhook Security

Every incoming webhook is verified using `stripe.webhooks.constructEvent()` with the `STRIPE_WEBHOOK_SECRET`. Requests without a valid `stripe-signature` header are rejected with `400`.

### Supabase RLS

The backend uses the `service_role` key which bypasses Row Level Security for server-side operations. Frontend uses the `anon` key which is subject to RLS policies defined in Supabase.

### Input Validation

- Request bodies are sanitized to prevent XSS
- SQL injection is prevented by Supabase's parameterized queries
- File upload is not supported (no attack surface)

---

## 15. Deployment

### Backend (Railway / Fly.io)

The backend includes configuration for both platforms:

**Railway** (`backend/railway.json`):
```json
{ "build": { "builder": "NIXPACKS" }, "deploy": { "startCommand": "node index.js" } }
```

**Fly.io** (`backend/fly.toml`):
```toml
[http_service]
  internal_port = 3000
  force_https = true
```

**Heroku** (`backend/Procfile`):
```
web: node index.js
```

### Environment Setup

1. Set all environment variables from [Section 5](#5-environment-variables)
2. Run database schema: execute `backend/scripts/full_schema.sql` in Supabase SQL Editor
3. Configure Stripe webhook endpoint: `https://your-backend.com/api/webhooks/stripe`
4. Set Telegram webhook: `GET /api/telegram/setup` (authenticated)

### Frontend

The frontend is pure static HTML/CSS/JS — deploy to any static host:
- Vercel, Netlify, GitHub Pages, Cloudflare Pages
- Update `window.__SUPABASE_URL__` and `window.__SUPABASE_ANON_KEY__` in `index.html`
- Set `FRONTEND_URL` in backend `.env` to allow CORS

---

## 16. Testing

Tests use **Jest** with **fast-check** for property-based testing (PBT).

### Running Tests

```bash
cd backend
npm test                    # Run all tests once
npm run test:watch          # Watch mode
npx jest --testPathPattern=CreditSystem   # Run specific test file
```

### Test Structure

```
backend/test/
├── services/
│   ├── CreditSystem.property.test.js
│   ├── SubscriptionManager.property.test.js
│   ├── FreemiumController.property.test.js
│   ├── AIAnalysisEngine.property.test.js
│   ├── PaymentGateway.property.test.js
│   ├── UsageTracker.property.test.js
│   ├── vaccination_schedule.property.test.js
│   └── ...
├── models/
│   └── UserPaymentProfile.test.js
└── setup.js
```

### Property-Based Testing

PBT is used to verify correctness properties across arbitrary inputs:

```js
// Example: credits never go negative
fc.assert(fc.asyncProperty(
  fc.integer({ min: 0, max: 1000 }),
  fc.integer({ min: 1, max: 500 }),
  async (balance, deduction) => {
    const result = await deductCredits(userId, deduction, balance);
    if (deduction > balance) {
      expect(result.success).toBe(false);
    } else {
      expect(result.newBalance).toBeGreaterThanOrEqual(0);
    }
  }
));
```

### Key Correctness Properties

- Credit balance never goes below zero
- Free tier usage never exceeds monthly limit
- Stripe webhook idempotency (duplicate events don't double-credit)
- Vaccination schedule dates are always in the future relative to birth date
- Round-trip data integrity for all database models

---

*Documentation generated for PediaMom v1.0 — April 2026*
buni yuklamay turing