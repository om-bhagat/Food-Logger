// /register/script2.js
// Handles only the email/password forms. Do NOT add any Google OAuth code here.

"use strict";

window.addEventListener("DOMContentLoaded", () => {
  const $ = (sel) => document.querySelector(sel);

  const signupForm = $("#signup-form");
  const signinForm = $("#signin-form");

  // helper to read inputs by prefix: su-* or si-*
  const readCreds = (prefix) => {
    const email = $(`#${prefix}-email`)?.value?.trim() ?? "";
    const password = $(`#${prefix}-pass`)?.value ?? "";
    return { email, password };
  };

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { email, password } = readCreds("su");
      console.log("[signup] (stub) ->", { email, password: "••••" });

      // TODO: call your register API here, e.g.:
      // await fetch("/api/register", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, password })
      // });

      alert("Signup handler stub. Implement your API call.");
    });
  }

  if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { email, password } = readCreds("si");
      console.log("[signin] (stub) ->", { email, password: "••••" });

      // TODO: call your login API here, and on success:
      // window.location.href = "/test.html";

      alert("Signin handler stub. Implement your API call.");
    });
  }
});
