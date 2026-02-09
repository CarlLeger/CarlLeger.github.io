/* ============================
   home.js — CarlLeger.github.io
   ============================ */

(() => {
  "use strict";

  // Helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Year (safe)
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Preset project type + smooth jump + focus form
  $$("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = btn.getAttribute("data-preset");
      const project = $("#project");
      if (project && preset) project.value = preset;

      // Optional: move user to form and focus (conversion-friendly)
      const contact = $("#contact");
      if (contact) {
        try { contact.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
        const nameField = $("#name");
        if (nameField) setTimeout(() => nameField.focus({ preventScroll: true }), 250);
      }

      // Track CTA click
      if (typeof gtag === "function") {
        try {
          gtag("event", "cta_click", {
            event_category: "navigation",
            event_label: preset || "cta"
          });
        } catch {}
      }
    });
  });

  // Form wiring (supports both ids: auditForm or contactForm)
  const form = $("#auditForm") || $("#contactForm");
  const statusBox = $("#formStatus");

  if (!form || !statusBox) return;

  // Ensure status styling works with either CSS naming
  const setStatus = (type, msg) => {
    // type: "ok" | "err" | "info"
    statusBox.className = `status ${type === "info" ? "" : type}`.trim();
    statusBox.textContent = msg;
    statusBox.style.display = "block";
  };

  let formStartTime = 0;

  form.addEventListener("focusin", () => {
    if (!form.dataset.started) {
      form.dataset.started = "1";
      formStartTime = Date.now();
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const started = Number(formStartTime || Date.now());
    const secondsSpent = (Date.now() - started) / 1000;

    // Basic bot timing check (forgiving, but stops instant posts)
    if (secondsSpent < 2) {
      setStatus("err", "Submission blocked. Please try again.");
      return;
    }

    // Honeypots: support either hidden #company or _gotcha
    const company = ($("#company")?.value || "").trim();
    const gotcha = (form.querySelector("[name='_gotcha']")?.value || "").trim();
    if (company || gotcha) {
      setStatus("err", "Submission blocked.");
      return;
    }

    setStatus("info", "Sending...");

    const data = new FormData(form);

    // Accept either field names: website/message OR site/message
    const website = (data.get("website") || data.get("site") || "").toString().trim();
    const message = (data.get("message") || "").toString().trim();
    const chosenType = (data.get("project_type") || data.get("project") || "").toString();

    // URL validation (better than regex)
    try { new URL(website); }
    catch {
      setStatus("err", "Please enter a valid website URL (include https://).");
      return;
    }

    if (message.length < 20) {
      setStatus("err", "Please provide a bit more detail (at least 20 characters).");
      return;
    }

    try {
      const res = await fetch(form.action, {
        method: "POST",
        body: data,
        headers: { "Accept": "application/json" }
      });

      if (res.ok) {
        form.reset();
        formStartTime = 0;
        delete form.dataset.started;

        setStatus("ok", "Thanks! Your request was sent. I’ll reply within 24 hours.");

        // Track successful lead
        if (typeof gtag === "function") {
          try {
            gtag("event", "lead_submit", {
              event_category: "form",
              event_label: chosenType || "home"
            });
          } catch {}
        }
      } else {
        setStatus("err", "Something went wrong. Please email me directly: carlleger.dev@gmail.com");
      }
    } catch (err) {
      setStatus("err", "Network error. Please email me directly: carlleger.dev@gmail.com");
    }
  });
})();
