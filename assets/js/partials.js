// /assets/js/partials.js

async function loadPartial(selector, url) {
  const mount = document.querySelector(selector);
  if (!mount) return;

  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    mount.innerHTML = await res.text();
  } catch (error) {
    console.error(error);
  }
}

function initPartialYear() {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
}

function initMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const drawer = document.querySelector("[data-nav-drawer]");
  const overlay = document.querySelector("[data-nav-overlay]");
  const closeBtn = document.querySelector("[data-nav-close]");

  if (!toggle || !drawer || !overlay) return;

  const openNav = () => {
    drawer.hidden = false;
    overlay.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  };

  const closeNav = () => {
    drawer.hidden = true;
    overlay.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  toggle.addEventListener("click", openNav);
  if (closeBtn) closeBtn.addEventListener("click", closeNav);
  overlay.addEventListener("click", closeNav);

  drawer.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !drawer.hidden) {
      closeNav();
    }
  });
}

function initPresetLinks() {
  document.addEventListener("click", function (e) {
    const link = e.target.closest("[data-preset]");
    if (!link) return;

    const preset = link.getAttribute("data-preset") || "";
    const message = document.getElementById("message");
    if (!message || !preset) return;

    message.value = preset + "\n\n" + (message.value || "");
  });
}

function initPartialsUI() {
  initPartialYear();
  initMobileNav();
  initPresetLinks();
}

async function loadPartials() {
  await Promise.all([
    loadPartial("[data-partial='header']", "/partials/header/index.html"),
    loadPartial("[data-partial='footer']", "/partials/footer/index.html")
  ]);

  initPartialsUI();
  document.dispatchEvent(new CustomEvent("partials:loaded"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadPartials, { once: true });
} else {
  loadPartials();
}
