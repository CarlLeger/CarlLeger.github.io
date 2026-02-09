  // Mobile drawer menu
  const toggle = $("[data-nav-toggle]");
  const overlay = $("[data-nav-overlay]");
  const drawer = $("[data-nav-drawer]");
  const closeBtn = $("[data-nav-close]");

  const setNavOpen = (open) => {
    if (!toggle || !overlay || !drawer) return;

    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);

    // show/hide elements
    overlay.hidden = !open;
    drawer.hidden = !open;

    // animate drawer
    if (open) {
      requestAnimationFrame(() => drawer.classList.add("is-open"));
      // focus first link
      const firstLink = drawer.querySelector("a,button,[tabindex]:not([tabindex='-1'])");
      if (firstLink) setTimeout(() => firstLink.focus(), 50);
    } else {
      drawer.classList.remove("is-open");
      // return focus to burger
      setTimeout(() => toggle.focus(), 50);
    }
  };

  if (toggle && overlay && drawer) {
    toggle.addEventListener("click", () => setNavOpen(toggle.getAttribute("aria-expanded") !== "true"));
    overlay.addEventListener("click", () => setNavOpen(false));
    closeBtn?.addEventListener("click", () => setNavOpen(false));

    // Close when clicking a drawer link
    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) setNavOpen(false);
    });

    // ESC to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
        setNavOpen(false);
      }
    });
  }
