// =====================================================
// home.js — CarlLeger.github.io
// Mobile drawer menu (A11Y + focus trap + scroll lock + inert + restore + iOS-safe)
// Uses data-attrs: [data-nav-toggle], [data-nav-overlay], [data-nav-drawer], [data-nav-close]
// PLUS: Back to top reliable (anchor or button) + closes drawer safely
// UPDATED: works with injected partials (header/footer)
// =====================================================

(() => {
  "use strict";

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  // ---------- Global preset fill (delegated, works before/after partials) ----------
  const initPresetFill = () => {
    if (document.documentElement.dataset.presetFillBound === "true") return;
    document.documentElement.dataset.presetFillBound = "true";

    document.addEventListener(
      "click",
      (e) => {
        const a = e.target.closest("[data-preset]");
        if (!a) return;

        const preset = a.getAttribute("data-preset") || "";
        const msg = document.getElementById("message");
        if (msg && preset) {
          msg.value = preset + "\n\n" + (msg.value || "");
          setTimeout(() => {
            try {
              msg.focus({ preventScroll: false });
            } catch (_e) {}
          }, 120);
        }
      },
      { passive: true }
    );
  };

  // ---------- Global year sync (safe to rerun) ----------
  const syncYear = () => {
    const years = $$("#year");
    if (!years.length) return;
    const y = String(new Date().getFullYear());
    years.forEach((node) => {
      node.textContent = y;
    });
  };

  // ---------- Nav module ----------
  let navApi = null;

  const destroyNav = () => {
    if (navApi && typeof navApi.destroy === "function") {
      navApi.destroy();
    }
    navApi = null;
  };

  const initNav = () => {
    destroyNav();

    // ---------- Elements ----------
    const toggle = $("[data-nav-toggle]");
    const overlay = $("[data-nav-overlay]");
    const drawer = $("[data-nav-drawer]");
    const closeBtn = $("[data-nav-close]");
    const backToTopEl = $(".footerTop, [data-back-to-top]");

    if (!toggle || !overlay || !drawer) {
      syncYear();
      return;
    }

    // ✅ Match CSS: @media (max-width: 980px) => desktop starts at 981px
    const DESKTOP_MEDIA = "(min-width: 981px)";

    // Inert background targets (keep drawer + header interactive)
    const INERT_TARGETS = ["main", "#main", ".wrap"].join(",");

    // ---------- State ----------
    let lastFocus = null;
    let removeTrap = null;
    let unlockScroll = null;
    let removeInert = null;
    let isClosing = false;

    const cleanups = [];

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

    // ---------- Scroll lock ----------
    const lockBodyScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

      document.body.dataset.scrollY = String(scrollY);
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";

      return () => {
        const y = parseInt(document.body.dataset.scrollY || "0", 10) || 0;
        delete document.body.dataset.scrollY;

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
      const targets = $$(INERT_TARGETS).filter(Boolean);
      if (!targets.length) return () => {};

      const supportsInert = "inert" in HTMLElement.prototype;

      const set = (el, state) => {
        if (supportsInert) el.inert = state;
        else {
          if (state) el.setAttribute("aria-hidden", "true");
          else el.removeAttribute("aria-hidden");
        }
      };

      targets.forEach((el) => set(el, !!open));
      return () => targets.forEach((el) => set(el, false));
    };

    // ---------- A11Y setup ----------
    const setupA11Y = () => {
      toggle.setAttribute("aria-expanded", "false");

      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.setAttribute("aria-hidden", "true");

      overlay.setAttribute("aria-hidden", "true");
      overlay.style.pointerEvents = "none";

      overlay.hidden = true;
      drawer.hidden = true;
    };

    // ---------- Cleanup helpers ----------
    const restoreBackgroundState = () => {
      removeTrap?.();
      removeTrap = null;

      unlockScroll?.();
      unlockScroll = null;

      removeInert?.();
      removeInert = null;

      applyInertToBackground(false);
    };

    const hideAfterClose = () => {
      if (isOpen()) return;

      drawer.hidden = true;
      overlay.hidden = true;
      overlay.style.pointerEvents = "none";
      isClosing = false;

      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
      } else {
        toggle?.focus?.({ preventScroll: true });
      }
      lastFocus = null;
    };

    const closeWithTransition = () => {
      isClosing = true;

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        drawer.removeEventListener("transitionend", onEnd);
        hideAfterClose();
      };

      const onEnd = (e) => {
        if (e && e.target !== drawer) return;
        finish();
      };

      drawer.addEventListener("transitionend", onEnd);
      setTimeout(finish, 260);
    };

    // ---------- Nav open/close ----------
    const setNavOpen = (open) => {
      if (open === isOpen()) return;
      if (!open && isClosing) return;

      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);

      overlay.hidden = !open;
      drawer.hidden = !open;

      drawer.setAttribute("aria-hidden", open ? "false" : "true");
      overlay.setAttribute("aria-hidden", open ? "false" : "true");

      if (open) {
        overlay.style.pointerEvents = "auto";
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

        closeWithTransition();
      }
    };

    // ---------- Back to top ----------
    const scrollToTop = () => {
      if (isOpen()) setNavOpen(false);
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

      if (history.replaceState) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };

    // ---------- Wire events ----------
    setupA11Y();
    syncYear();

    const bind = (target, event, handler, options) => {
      target.addEventListener(event, handler, options);
      cleanups.push(() => target.removeEventListener(event, handler, options));
    };

    bind(toggle, "click", () => setNavOpen(!isOpen()));
    bind(overlay, "click", () => setNavOpen(false));

    if (closeBtn) {
      bind(closeBtn, "click", () => setNavOpen(false));
    }

    bind(drawer, "click", (e) => {
      const a = e.target.closest("a");
      if (a) setNavOpen(false);
    });

    bind(document, "keydown", (e) => {
      if (e.key === "Escape" && isOpen()) setNavOpen(false);
    });

    bind(
      window,
      "resize",
      () => {
        if (isOpen() && window.matchMedia(DESKTOP_MEDIA).matches) {
          setNavOpen(false);
        }
      },
      { passive: true }
    );

    bind(document, "click", (e) => {
      if (!isOpen()) return;
      const target = e.target;
      if (!(target instanceof Element)) return;

      const clickedInsideDrawer = drawer.contains(target);
      const clickedToggle = toggle.contains(target);
      if (!clickedInsideDrawer && !clickedToggle) setNavOpen(false);
    });

    bind(window, "pagehide", () => {
      try {
        document.body.classList.remove("nav-open");
        drawer.classList.remove("is-open");

        overlay.hidden = true;
        drawer.hidden = true;
        overlay.style.pointerEvents = "none";

        restoreBackgroundState();

        toggle.setAttribute("aria-expanded", "false");
        drawer.setAttribute("aria-hidden", "true");
        overlay.setAttribute("aria-hidden", "true");

        isClosing = false;
        lastFocus = null;
      } catch (_e) {}
    });

    if (backToTopEl) {
      bind(backToTopEl, "click", (e) => {
        if (backToTopEl.tagName?.toLowerCase() === "a") e.preventDefault();
        scrollToTop();
      });
    }

    navApi = {
      destroy() {
        try {
          document.body.classList.remove("nav-open");
          drawer.classList.remove("is-open");

          overlay.hidden = true;
          drawer.hidden = true;
          overlay.style.pointerEvents = "none";

          restoreBackgroundState();

          toggle.setAttribute("aria-expanded", "false");
          drawer.setAttribute("aria-hidden", "true");
          overlay.setAttribute("aria-hidden", "true");

          isClosing = false;
          lastFocus = null;
        } catch (_e) {}

        cleanups.forEach((fn) => {
          try {
            fn();
          } catch (_e) {}
        });
      }
    };
  };

  // ---------- Boot ----------
  const boot = () => {
    initPresetFill();
    syncYear();
    initNav();
  };

  onReady(boot);
  document.addEventListener("partials:loaded", boot);
})();
