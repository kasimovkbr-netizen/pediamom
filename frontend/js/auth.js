import { supabase } from "./supabase.js";
import { toast } from "./toast.js";
import { t } from "./i18n.js";

// 🔥 Flag: registratsiya jarayonida redirect ni to'xtatish uchun
let isRegistering = false;

/* =======================
   AUTH GUARD (FINAL)
======================= */
supabase.auth.onAuthStateChange((event, session) => {
  const user = session?.user ?? null;
  const path = window.location.pathname;

  const isIndex = path.endsWith("/") || path.endsWith("index.html");

  const isLogin = path.includes("login.html");
  const isRegister = path.includes("register.html");
  const isAuthPage = isLogin || isRegister;

  const isDashboard = path.includes("dashboard.html");

  // 🚫 login bo'lmagan user dashboardga kira olmaydi
  if (!user && isDashboard) {
    window.location.href = "./login.html";
    return;
  }

  // 🔥 Registratsiya jarayonida redirect qilmaslik
  if (isRegistering) {
    return;
  }

  // 🚫 login bo'lgan user login/registerga kirmaydi
  if (user && isAuthPage) {
    window.location.href = "./dashboard.html";
    return;
  }

  // ✅ AUTH PAGE
  const authPage = document.getElementById("authPage");
  if (authPage) {
    authPage.style.display = "block";
  }

  // ✅ INDEX
  if (isIndex) {
    const app = document.getElementById("app");
    if (app) app.style.display = "block";
  }
});

/* =======================
   DOM READY
======================= */
document.addEventListener("DOMContentLoaded", () => {
  /* ========= REGISTER ========= */
  const registerForm = document.getElementById("registerForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = registerForm.querySelector("#email").value;
      const password = registerForm.querySelector("#password").value;

      try {
        // 🔥 Registratsiya boshlanmoqda
        isRegistering = true;

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) throw error;

        console.log("User registered:", data.user?.id);
        // Users table row is created automatically via database trigger (Requirement 4.2 / 10.1)

        // 🔥 Endi redirect qilishimiz mumkin
        isRegistering = false;
        window.location.href = "./dashboard.html";
      } catch (err) {
        console.error("REGISTER ERROR:", err);
        toast(friendlyAuthError(err.message), "error");
        isRegistering = false;
      }
    });
  }

  /* ========= LOGIN ========= */
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = loginForm.querySelector("#email").value;
      const password = loginForm.querySelector("#password").value;

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.href = "./dashboard.html";
      } catch (err) {
        toast(friendlyAuthError(err.message), "error");
      }
    });
  }

  /* ========= FORGOT PASSWORD ========= */
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotPasswordSection = document.getElementById(
    "forgotPasswordSection",
  );
  const sendResetBtn = document.getElementById("sendResetBtn");

  if (forgotPasswordLink && forgotPasswordSection) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      forgotPasswordSection.style.display =
        forgotPasswordSection.style.display === "none" ? "block" : "none";
    });
  }

  if (sendResetBtn) {
    sendResetBtn.addEventListener("click", async () => {
      const email = document.getElementById("resetEmail").value;
      const resetMessage = document.getElementById("resetMessage");
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        resetMessage.textContent = "✅ Reset email sent! Check your inbox.";
      } catch (err) {
        resetMessage.textContent = friendlyAuthError(err.message);
      }
    });
  }
});

/* =======================
   FRIENDLY ERROR MESSAGES
======================= */
function friendlyAuthError(message) {
  if (!message) return t("something_went_wrong");
  if (
    message.includes("Invalid login credentials") ||
    message.includes("invalid_credentials") ||
    message.includes("invalid-credential") ||
    message.includes("wrong-password") ||
    message.includes("user-not-found")
  ) {
    return t("wrong_credentials");
  }
  if (
    message.includes("User already registered") ||
    message.includes("email-already-in-use")
  ) {
    return t("email_already_registered");
  }
  if (
    message.includes("Password should be at least") ||
    message.includes("weak-password")
  ) {
    return t("password_too_short");
  }
  if (
    message.includes("Unable to validate email") ||
    message.includes("invalid-email")
  ) {
    return t("invalid_email");
  }
  if (
    message.includes("too many requests") ||
    message.includes("too-many-requests") ||
    message.includes("over_email_send_rate_limit")
  ) {
    return t("too_many_attempts");
  }
  return message;
}
