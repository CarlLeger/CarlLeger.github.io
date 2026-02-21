// =====================================================
// home.js — CarlLeger.github.io
// Mobile drawer menu (A11Y + focus trap + scroll lock + inert + restore + iOS-safe)
// Uses data-attrs: [data-nav-toggle], [data-nav-overlay], [data-nav-drawer], [data-nav-close]
// PLUS: Back to top reliable (anchor or button) + closes drawer safely
// =====================================================

(() => {
  "use strict";

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // If script is loaded without defer, this guarantees DOM exists
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  onReady(() => {
    // ---------- Elements ----------
    const toggle = $("[data-nav-toggle]");
    const overlay = $("[data-nav-overlay]");
    const drawer = $("[data-nav-drawer]");
    const closeBtn = $("[data-nav-close]");

    // Optional: match your CSS breakpoint (set to 900px or 980px etc.)
    const DESKTOP_MEDIA = "(min-width: 900px)";

    // Optional: what to inert while drawer open
    const MAIN_SELECTOR = "main, #main, .wrap";

    // Back-to-top selector (supports class or data-attr)
    const backToTopEl = $(".footerTop, [data-back-to-top]");

    // ---------- State ----------
    let lastFocus = null;
    let removeTrap = null;
    let unlockScroll = null;
    let removeInert = null;

    const isOpen = () => document.body.classList.contains("nav-open");

    // ---------- Focusables ----------
    const getFocusable = (root) => {
      if (!root) return [];
      const nodes = $$(
        "a[href], button:not([disabled]), textarea, input, select, details, summary, [tabindex]:not([tabindex='-1'])",
        root
      );

      return nodes.filter((el) => {
        if (!el) return false;
        if (el.hasAttribute("disabled")) return false;
        if (el.getAttribute("aria-hidden") === "true") return false;

        const style = window.getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") return false;

        // If not in layout (common for hidden drawer content), ignore
        // Note: fixed elements can have offsetParent null, allow those
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
        if (items.length) items[0].focus({ preventScroll: true });
      };

      const onKeyDown = (e) => {
        if (e.key !== "Tab") return;

        const items = getFocusable(container);
        if (!items.length) return;

        const first = items[0];
        const last = items[items.length - 1];

        // If focus escapes, pull it back
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
      // Small delay so drawer transition can start, then focus
      setTimeout(focusFirst, 40);

      return () => container.removeEventListener("keydown", onKeyDown);
    };

    // ---------- Scroll lock (no jump) ----------
    // Stores scroll position while body is fixed (iOS-friendly)
    const lockBodyScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

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

    // ---------- Inert background ----------
    const applyInertToBackground = (open) => {
      const main = document.querySelector(MAIN_SELECTOR);
      if (!main) return () => {};

      const supportsInert = "inert" in HTMLElement.prototype;

      if (open) {
        if (supportsInert) main.inert = true;
        else main.setAttribute("aria-hidden", "true");
      } else {
        if (supportsInert) main.inert = false;
        else main.removeAttribute("aria-hidden");
      }

      return () => {
        if (supportsInert) main.inert = false;
        else main.removeAttribute("aria-hidden");
      };
    };

    // ---------- Nav open/close ----------
    const setNavOpen = (open) => {
      if (!toggle || !overlay || !drawer) return;
      if (open === isOpen()) return;

      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);

      // show/hide
      overlay.hidden = !open;
      drawer.hidden = !open;

      // A11Y semantics
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
      overlay.setAttribute("aria-hidden", open ? "false" : "true");

      // allow overlay interaction only when open
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

        // restore focus
        setTimeout(() => {
          if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
          else toggle?.focus?.();
          lastFocus = null;
        }, 50);
      }
    };

    // ---------- Wire nav events ----------
    if (toggle && overlay && drawer) {
      toggle.addEventListener("click", () => setNavOpen(!isOpen()));
      overlay.addEventListener("click", () => setNavOpen(false));
      closeBtn?.addEventListener("click", () => setNavOpen(false));

      // Close when clicking any link in drawer
      drawer.addEventListener("click", (e) => {
        const a = e.target.closest("a");
        if (a) setNavOpen(false);
      });

      // ESC to close
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isOpen()) setNavOpen(false);
      });

      // Resize to desktop closes drawer
      window.addEventListener(
        "resize",
        () => {
          if (isOpen() && window.matchMedia(DESKTOP_MEDIA).matches) setNavOpen(false);
        },
        { passive: true }
      );

      // Safety: if overlay behavior changes, still close on outside click
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

      // Initial state
      toggle.setAttribute("aria-expanded", "false");
      drawer.setAttribute("aria-hidden", "true");
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.pointerEvents = "none";

      // Ensure hidden matches aria on load
      overlay.hidden = true;
      drawer.hidden = true;
    }

    // ---------- Back to top (reliable) ----------
    const scrollToTop = () => {
      // Close drawer first to avoid fixed-body scroll weirdness
      if (isOpen()) setNavOpen(false);

      // Smooth scroll
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

      // Keep URL clean
      if (history.replaceState) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };

    if (backToTopEl) {
      backToTopEl.addEventListener("click", (e) => {
        // If it's a link, prevent default anchor jump and use reliable scroll
        if (backToTopEl.tagName?.toLowerCase() === "a") e.preventDefault();
        scrollToTop();
      });
    }
  });
})();
