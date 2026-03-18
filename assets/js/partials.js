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

async function loadPartials() {
  await Promise.all([
    loadPartial("[data-partial='header']", "/partials/header/index.html"),
    loadPartial("[data-partial='footer']", "/partials/footer/index.html")
  ]);

  document.dispatchEvent(new CustomEvent("partials:loaded"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadPartials, { once: true });
} else {
  loadPartials();
}
