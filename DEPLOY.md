# 🚀 PediaMom — Deploy Qo'llanmasi

## Arxitektura

```
Frontend  → Firebase Hosting  (bepul, CDN)
Backend   → Railway           (bepul tier, Node.js)
Database  → Supabase          (bepul tier, PostgreSQL)
```

---

## 1-QADAM: GitHub ga yuklash

```bash
# Loyiha papkasida (pediamom/)
git init
git add .
git commit -m "PediaMom v1.0"

# GitHub da yangi repo yarating: github.com/new
# Keyin:
git remote add origin https://github.com/YOUR_USERNAME/pediamom.git
git push -u origin main
```

---

## 2-QADAM: Backend — Railway deploy

### 2.1 Railway hisob
1. [railway.app](https://railway.app) → **Login with GitHub**

### 2.2 Yangi project
1. **New Project** → **Deploy from GitHub repo**
2. `pediamom` reponi tanlang
3. **Root Directory** → `backend` yozing
4. **Deploy** bosing

### 2.3 Environment Variables
Railway → Loyiha → **Variables** → quyidagilarni qo'shing:

```
SUPABASE_URL=https://wgexnndxnfjzxlxncezu.supabase.co
SUPABASE_ANON_KEY=sb_publishable_E1JW4R0JEpe_V5PmCIGDVw_zMiLXtJT
SUPABASE_SERVICE_ROLE_KEY=sb_secret_3gaivT0AV_7eydEbGFCHIA_VE_HyKbf
SUPABASE_JWT_SECRET=vH6yEVHRGEiespAcXDtivQBLZxf6H71g2uDP/Sj1y01xXmwcZC2Ky1r9HcNpvbQ4U9p2X8RDTtT3A/moKPJv7w==
GEMINI_API_KEY=AIzaSyDwz_TOpjWFzk9n9MBbuze5JoBeUbf6Btc
TELEGRAM_BOT_TOKEN=8542031888:AAGzZEuxuPv3ZTFg5bJXKaMkyp3kJaDropw
STRIPE_SECRET_KEY=sk_test_51TJTtlCYKkVQ4JcTV6ohLdhQeH5ACD52wEvbpvDtHHkKfN4cyuFlYtdPie1VFzg1BGbR20NayNkfzrQNT6p4LDeT00YL60nrJD
STRIPE_PUBLISHABLE_KEY=pk_test_51TJTtlCYKkVQ4JcTgWiHPEvb3hS0NdvnOTT2vRuY9UoBP0HbYQKCH4u3T1MsZpyqUYmKmd0OrPx1gl0bitcuztS1003n7HXD8d
STRIPE_WEBHOOK_SECRET=whsec_9323faf9d3cd881f191ccfb50e21734b0150df14f08668657334b82e926a57bf
NODE_ENV=production
PORT=3001
FREE_MONTHLY_CREDITS=10
DEFAULT_CURRENCY=usd
FRONTEND_URL=https://pediamom.web.app
```

### 2.4 Railway URL olish
Deploy tugagandan keyin Railway sizga URL beradi:
```
https://pediamom-production.up.railway.app
```
Bu URL ni eslab qoling — keyingi qadamda kerak.

### 2.5 Health check
```
https://pediamom-production.up.railway.app/api/health
```
`{"success":true}` chiqsa — backend ishlayapti ✅

---

## 3-QADAM: Frontend URL ni yangilash

`frontend/auth/dashboard.html` da Railway URL ni qo'ying:

```html
window.__API_BASE_URL__ = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://pediamom-production.up.railway.app';
```

Keyin commit qiling:
```bash
git add frontend/auth/dashboard.html
git commit -m "Update API URL"
git push
```

---

## 4-QADAM: Frontend — Firebase Hosting deploy

### 4.1 Firebase CLI o'rnatish (bir marta)
```bash
npm install -g firebase-tools
firebase login
```

### 4.2 Firebase project tanlash
```bash
firebase use --add
# Loyihangizni tanlang
```

### 4.3 Deploy
```bash
firebase deploy --only hosting
```

Deploy tugagandan keyin URL:
```
https://pediamom.web.app
```

---

## 5-QADAM: Stripe Webhook yangilash

Production da Stripe webhook URL ni yangilash kerak:

```bash
# Stripe Dashboard → Developers → Webhooks → Add endpoint
# URL: https://pediamom-production.up.railway.app/api/webhooks/stripe
# Events: checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted
```

Yangi `whsec_...` ni Railway Variables ga qo'ying.

---

## 6-QADAM: Telegram Webhook (ixtiyoriy)

Production da polling o'rniga webhook ishlatish:

```bash
# Railway URL bilan:
curl "https://api.telegram.org/bot8542031888:AAGzZEuxuPv3ZTFg5bJXKaMkyp3kJaDropw/setWebhook?url=https://pediamom-production.up.railway.app/api/telegram/webhook"
```

---

## Tekshirish ro'yxati

```
✅ Railway deploy — /api/health ishlaydi
✅ Firebase Hosting — frontend ochiladi
✅ Login/Register ishlaydi
✅ Dashboard ochiladi
✅ AI tahlil ishlaydi
✅ Telegram bot ishlaydi
✅ Stripe to'lov ishlaydi
```

---

## Yangilash (keyingi deploylar)

```bash
# Kod o'zgartirgandan keyin:
git add .
git commit -m "Update"
git push

# Railway avtomatik qayta deploy qiladi
# Firebase uchun:
firebase deploy --only hosting
```

---

## Muammolar

### Backend ishlamayapti
```
Railway → Logs ni ko'ring
```

### CORS xato
```
Railway Variables da FRONTEND_URL ni to'g'ri qo'ying
```

### Telegram bot ishlamayapti
```
Production da NODE_ENV=production bo'lgani uchun polling o'chirilgan
Webhook sozlang (6-qadam)
```
