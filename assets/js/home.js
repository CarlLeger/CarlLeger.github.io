// =====================================================
// Mobile drawer menu — ULTRA COMPLETE (A11Y + focus trap + scroll lock + inert + restore + iOS-safe)
// Requires: a `$` helper that returns `document.querySelector(...)`
// Uses your existing data-attrs: [data-nav-toggle], [data-nav-overlay], [data-nav-drawer], [data-nav-close]
// PLUS: Back to top reliable (anchor or button) + closes drawer safely
// =====================================================

// If you don't already have it elsewhere, uncomment this helper:
// const $ = (sel) => document.querySelector(sel);

const toggle = $("[data-nav-toggle]");
const overlay = $("[data-nav-overlay]");
const drawer = $("[data-nav-drawer]");
const closeBtn = $("[data-nav-close]");

// Optional: set your real desktop breakpoint here to match CSS
const DESKTOP_MEDIA = "(min-width: 900px)";

// Optional: main wrapper to inert when menu open (best a11y). Falls back safely if not found.
const MAIN_SELECTOR = "main, #main, .wrap";

let lastFocus = null;
let removeTrap = null;
let unlockScroll = null;
let removeInert = null;

const isOpen = () => document.body.classList.contains("nav-open");

const getFocusable = (root) => {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      "a[href], button:not([disabled]), textarea, input, select, details, summary, [tabindex]:not([tabindex='-1'])"
    )
  ).filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;

    // Hide elements that are not actually visible (prevents trapping to hidden nodes)
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;

    // Also ignore if element is not in layout (rare but can happen)
    if (el.offsetParent === null && style.position !== "fixed") return false;

    return true;
  });
};

const trapFocus = (container) => {
  if (!container) return () => {};
  const focusables = getFocusable(container);
  if (!focusables.length) return () => {};

  const focusFirst = () => {
    const items = getFocusable(container);
    if (items.length) items[0].focus();
  };

  const onKeyDown = (e) => {
    if (e.key !== "Tab") return;

    const items = getFocusable(container);
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    // If focus somehow escapes, pull it back in
    if (!container.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
      return;
    }

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  container.addEventListener("keydown", onKeyDown);
  setTimeout(focusFirst, 40);

  return () => container.removeEventListener("keydown", onKeyDown);
};

// Scroll lock without jump (iOS-friendly enough)
const lockBodyScroll = () => {
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

  // Prevent background scroll
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";

  return () => {
    const y = Math.abs(parseInt(document.body.style.top || "0", 10)) || 0;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, y);
  };
};

// Make background "non-interactive" while drawer is open (best practice)
const applyInertToBackground = (open) => {
  const main = document.querySelector(MAIN_SELECTOR);
  if (!main) return () => {};

  const supportsInert = "inert" in HTMLElement.prototype;

  if (open) {
    if (supportsInert) {
      main.inert = true;
    } else {
      main.setAttribute("aria-hidden", "true");
    }
  } else {
    if (supportsInert) {
      main.inert = false;
    } else {
      main.removeAttribute("aria-hidden");
    }
  }

  return () => {
    if (supportsInert) main.inert = false;
    else main.removeAttribute("aria-hidden");
  };
};

const setNavOpen = (open) => {
  if (!toggle || !overlay || !drawer) return;

  if (open === isOpen()) return;

  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  document.body.classList.toggle("nav-open", open);

  overlay.hidden = !open;
  drawer.hidden = !open;

  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-hidden", open ? "false" : "true");
  overlay.setAttribute("aria-hidden", open ? "false" : "true");

  overlay.style.pointerEvents = open ? "auto" : "none";

  if (open) {
    lastFocus = document.activeElement;

    unlockScroll?.();
    unlockScroll = lockBodyScroll();

    removeInert?.();
    removeInert = applyInertToBackground(true);

    requestAnimationFrame(() => drawer.classList.add("is-open"));

    removeTrap?.();
    removeTrap = trapFocus(drawer);
  } else {
    drawer.classList.remove("is-open");

    removeTrap?.();
    removeTrap = null;

    unlockScroll?.();
    unlockScroll = null;

    removeInert?.();
    removeInert = null;
    applyInertToBackground(false);

    setTimeout(() => {
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
      else toggle?.focus?.();
      lastFocus = null;
    }, 50);
  }
};

if (toggle && overlay && drawer) {
  // Click handlers
  toggle.addEventListener("click", () => {
    setNavOpen(!isOpen());
  });

  overlay.addEventListener("click", () => setNavOpen(false));
  closeBtn?.addEventListener("click", () => setNavOpen(false));

  // Close when clicking a drawer link
  drawer.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) setNavOpen(false);
  });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) setNavOpen(false);
  });

  // Close on resize to desktop breakpoint
  window.addEventListener(
    "resize",
    () => {
      if (isOpen() && window.matchMedia(DESKTOP_MEDIA).matches) setNavOpen(false);
    },
    { passive: true }
  );

  // Optional: close if user clicks anywhere outside drawer
  document.addEventListener("click", (e) => {
    if (!isOpen()) return;
    const target = e.target;
    if (!(target instanceof Element)) return;

    const clickedInsideDrawer = drawer.contains(target);
    const clickedToggle = toggle.contains(target);
    if (!clickedInsideDrawer && !clickedToggle) {
      if (overlay.contains(target) || target === overlay) setNavOpen(false);
    }
  });

  // Ensure initial aria state matches hidden state
  toggle.setAttribute("aria-expanded", "false");
  drawer.setAttribute("aria-hidden", "true");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.pointerEvents = "none";
}

/* =====================================================
   Back to top — reliable (anchor or button)
   Works with:
   - <a class="footerTop" href="#top">Back to top</a>
   - <button class="footerTop" type="button">Back to top</button>
   Or use: data-back-to-top on any element
   ===================================================== */

const backToTopEl = document.querySelector(".footerTop, [data-back-to-top]");

const scrollToTop = () => {
  // If drawer is open, close it first to avoid fixed-body/anchor weirdness
  try {
    if (isOpen()) setNavOpen(false);
  } catch (e) {}

  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

  // Optional: keep URL clean (remove #top if it appears)
  if (history.replaceState) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
};

if (backToTopEl) {
  backToTopEl.addEventListener("click", (e) => {
    // If it's a link, prevent default anchor jump and use reliable scroll
    if (backToTopEl.tagName && backToTopEl.tagName.toLowerCase() === "a") {
      e.preventDefault();
    }
    scrollToTop();
  });
}
