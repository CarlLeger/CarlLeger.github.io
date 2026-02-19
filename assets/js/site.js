/* =========================================================
   site.js — CarlLeger.github.io (Ultra-complete, vanilla JS)
   - Mobile drawer menu (open/close, overlay, escape, focus trap)
   - Smooth anchor scroll (+ reduced motion support)
   - Active nav highlighting (scroll spy)
   - GA4 event tracking (if gtag exists):
       * affiliate_click (PartnerStack/Teachable)
       * outbound_click
       * tel_click / mailto_click
       * scroll_depth (25/50/75/90)
       * form_submit / form_success / form_error
       * cta_click (data-cta)
   - UTM capture (persist in sessionStorage, append to outbound, inject into forms)
   - Form handling (AJAX submit if same-origin or Formspree-like endpoint)
   - Year auto-update
   - Utility helpers
   ========================================================= */

(() => {
  "use strict";

  /* -----------------------------
     Config
  ----------------------------- */
  const CONFIG = {
    // Mobile drawer selectors (match your existing markup/classes)
    drawer: ".navDrawer",
    overlay: ".navOverlay",
    openBtn: ".navToggle",
    closeBtn: ".navClose",
    drawerOpenClass: "is-open",
    bodyOpenClass: "nav-open",

    // Scroll spy
    spy: {
      enabled: true,
      // Sections must have IDs; nav links point to #id
      sectionSelector: "main section[id], main article[id], section[id]",
      // Links to update as active
      navLinkSelector: 'a[href^="#"]',
      // Active class to add
      activeClass: "is-active",
      // Offset in px (header height)
      offset: 96
    },

    // Affiliate tracking
    affiliate: {
      teachableDomain: "partnerstack.teachable.com",
      network: "partnerstack",
      program: "teachable"
    },

    // Outbound tracking
    outbound: {
      enabled: true,
      // Add UTM params to outbound links
      appendUtmToOutbound: true,
      // Don’t decorate these domains (add your own domains if needed)
      utmExcludeDomains: [
        "carlleger.github.io",
        "github.io"
      ]
    },

    // Scroll depth thresholds (%)
    scrollDepthPercents: [25, 50, 75, 90],

    // Form handling
    forms: {
      enabled: true,
      selector: "form",
      statusSelector: ".status", // matches your CSS
      // If true, will try AJAX submit for forms with action attribute
      ajaxSubmit: true,
      // Timeout for fetch
      timeoutMs: 12000
    }
  };

  /* -----------------------------
     Helpers
  ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isExternalUrl = (url) => {
    try {
      const u = new URL(url, window.location.href);
      return u.origin !== window.location.origin;
    } catch {
      return false;
    }
  };

  const getDomain = (url) => {
    try {
      return new URL(url, window.location.href).hostname;
    } catch {
      return "";
    }
  };

  const safeNowISO = () => new Date().toISOString();

  const debounce = (fn, wait = 100) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  /* -----------------------------
     UTM capture & persistence
  ----------------------------- */
  const UTM_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid"
  ];

  const getUrlParams = () => {
    const out = {};
    const sp = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach((k) => {
      const v = sp.get(k);
      if (v) out[k] = v;
    });
    return out;
  };

  const readStoredUtm = () => {
    try {
      const raw = sessionStorage.getItem("cl_utm");
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  };

  const storeUtm = (obj) => {
    try {
      sessionStorage.setItem("cl_utm", JSON.stringify(obj || {}));
      sessionStorage.setItem("cl_utm_ts", safeNowISO());
    } catch {
      // ignore
    }
  };

  const mergeUtm = (fresh, stored) => {
    // Fresh values override stored ones
    return { ...(stored || {}), ...(fresh || {}) };
  };

  const getUtm = () => {
    const fresh = getUrlParams();
    const stored = readStoredUtm();
    const merged = mergeUtm(fresh, stored);
    // If any fresh values exist, store merged
    if (Object.keys(fresh).length) storeUtm(merged);
    return merged;
  };

  const shouldDecorateOutbound = (href) => {
    const domain = getDomain(href);
    if (!domain) return false;
    return !CONFIG.outbound.utmExcludeDomains.includes(domain);
  };

  const decorateUrlWithUtm = (href, utmObj) => {
    try {
      const u = new URL(href, window.location.href);
      Object.entries(utmObj || {}).forEach(([k, v]) => {
        if (!v) return;
        // Don’t overwrite existing utm values on link
        if (!u.searchParams.get(k)) u.searchParams.set(k, v);
      });
      return u.toString();
    } catch {
      return href;
    }
  };

  /* -----------------------------
     GA4 tracking wrapper (gtag)
  ----------------------------- */
  const hasGtag = () => typeof window.gtag === "function";

  const track = (eventName, params = {}) => {
    if (!hasGtag()) return;
    window.gtag("event", eventName, params);
  };

  const trackCtaClick = (el, extra = {}) => {
    const cta = el.getAttribute("data-cta") || "unknown";
    track("cta_click", {
      cta_placement: cta,
      text: (el.textContent || "").trim().slice(0, 80),
      ...extra
    });
  };

  /* -----------------------------
     Mobile Drawer Menu
  ----------------------------- */
  function setupDrawer() {
    const drawer = $(CONFIG.drawer);
    const overlay = $(CONFIG.overlay);
    const openBtn = $(CONFIG.openBtn);
    const closeBtn = $(CONFIG.closeBtn);

    if (!drawer || !openBtn) return;

    // If overlay doesn't exist, create it
    let ov = overlay;
    if (!ov) {
      ov = document.createElement("div");
      ov.className = "navOverlay";
      ov.hidden = true;
      document.body.appendChild(ov);
    }

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    let lastFocused = null;

    const open = () => {
      lastFocused = document.activeElement;
      document.body.classList.add(CONFIG.bodyOpenClass);
      drawer.classList.add(CONFIG.drawerOpenClass);
      ov.hidden = false;
      ov.setAttribute("aria-hidden", "false");

      // Focus first focusable element inside drawer
      const focusables = $$(focusableSelector, drawer);
      if (focusables.length) focusables[0].focus();

      track("menu_open", { location: "drawer" });
    };

    const close = () => {
      drawer.classList.remove(CONFIG.drawerOpenClass);
      document.body.classList.remove(CONFIG.bodyOpenClass);
      ov.hidden = true;
      ov.setAttribute("aria-hidden", "true");

      // Restore focus
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();

      track("menu_close", { location: "drawer" });
    };

    const isOpen = () => drawer.classList.contains(CONFIG.drawerOpenClass);

    // Focus trap within drawer
    const trapFocus = (e) => {
      if (!isOpen() || e.key !== "Tab") return;
      const focusables = $$(focusableSelector, drawer).filter((x) => x.offsetParent !== null);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    on(openBtn, "click", (e) => {
      e.preventDefault();
      open();
    });

    if (closeBtn) on(closeBtn, "click", (e) => {
      e.preventDefault();
      close();
    });

    on(ov, "click", () => close());

    on(document, "keydown", (e) => {
      if (e.key === "Escape" && isOpen()) close();
      trapFocus(e);
    });

    // Close drawer on clicking a link inside (common UX)
    on(drawer, "click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      // Let anchor navigation happen
      close();
    });
  }

  /* -----------------------------
     Smooth anchor scrolling
  ----------------------------- */
  function setupSmoothAnchors() {
    on(document, "click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();

      const top = target.getBoundingClientRect().top + window.pageYOffset - CONFIG.spy.offset;
      const behavior = prefersReducedMotion() ? "auto" : "smooth";
      window.scrollTo({ top, behavior });

      trackCtaClick(a, { type: "anchor", anchor: id });
    });
  }

  /* -----------------------------
     Scroll spy (active nav link)
  ----------------------------- */
  function setupScrollSpy() {
    if (!CONFIG.spy.enabled) return;

    const sections = $$(CONFIG.spy.sectionSelector);
    if (!sections.length) return;

    const links = $$(CONFIG.spy.navLinkSelector).filter((a) => {
      const href = a.getAttribute("href") || "";
      return href.startsWith("#") && href.length > 1;
    });

    if (!links.length) return;

    const linkById = new Map();
    links.forEach((a) => {
      const id = (a.getAttribute("href") || "").slice(1);
      if (id) linkById.set(id, a);
    });

    const setActive = (id) => {
      links.forEach((a) => a.classList.remove(CONFIG.spy.activeClass));
      const a = linkById.get(id);
      if (a) a.classList.add(CONFIG.spy.activeClass);
    };

    const handler = () => {
      const y = window.scrollY + CONFIG.spy.offset + 8;
      let currentId = null;

      for (const s of sections) {
        const top = s.offsetTop;
        const bottom = top + s.offsetHeight;
        if (y >= top && y < bottom) {
          currentId = s.id;
          break;
        }
      }

      if (!currentId) {
        // If near top, clear active
        if (window.scrollY < 140) {
          links.forEach((a) => a.classList.remove(CONFIG.spy.activeClass));
        }
        return;
      }

      setActive(currentId);
    };

    on(window, "scroll", debounce(handler, 80), { passive: true });
    handler();
  }

  /* -----------------------------
     Outbound + Affiliate click tracking
  ----------------------------- */
  function setupLinkTracking() {
    const utm = getUtm();

    // Decorate outbound links on load (optional)
    if (CONFIG.outbound.enabled && CONFIG.outbound.appendUtmToOutbound && Object.keys(utm).length) {
      $$('a[href]').forEach((a) => {
        const href = a.getAttribute("href");
        if (!href) return;
        if (!isExternalUrl(href)) return;
        if (!shouldDecorateOutbound(href)) return;

        // Don’t decorate mailto/tel
        if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

        const decorated = decorateUrlWithUtm(href, utm);
        if (decorated !== href) a.setAttribute("href", decorated);
      });
    }

    on(document, "click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;

      const href = a.getAttribute("href") || "";
      if (!href) return;

      // CTA tracking (if data-cta present)
      if (a.hasAttribute("data-cta")) trackCtaClick(a, { href });

      // Tel / Mailto
      if (href.startsWith("tel:")) {
        track("tel_click", { href });
        return;
      }
      if (href.startsWith("mailto:")) {
        track("mailto_click", { href });
        return;
      }

      // Affiliate: Teachable PartnerStack
      if (href.includes(CONFIG.affiliate.teachableDomain)) {
        const placement = a.getAttribute("data-cta") || "unknown";
        track("affiliate_click", {
          affiliate_network: CONFIG.affiliate.network,
          affiliate_program: CONFIG.affiliate.program,
          destination_domain: CONFIG.affiliate.teachableDomain,
          cta_placement: placement,
          outbound: true
        });
        return;
      }

      // Generic outbound
      if (CONFIG.outbound.enabled && isExternalUrl(href)) {
        track("outbound_click", {
          href,
          domain: getDomain(href),
          outbound: true
        });
      }
    }, true);
  }

  /* -----------------------------
     Scroll depth tracking
  ----------------------------- */
  function setupScrollDepth() {
    const thresholds = CONFIG.scrollDepthPercents.slice().sort((a, b) => a - b);
    const fired = new Set();

    const handler = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const height = Math.max(doc.scrollHeight, doc.offsetHeight, doc.clientHeight);
      const win = window.innerHeight || doc.clientHeight || 1;
      const maxScroll = Math.max(1, height - win);
      const pct = clamp(Math.round((scrollTop / maxScroll) * 100), 0, 100);

      thresholds.forEach((t) => {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          track("scroll_depth", { percent: t });
        }
      });
    };

    on(window, "scroll", debounce(handler, 120), { passive: true });
    handler();
  }

  /* -----------------------------
     Inject UTM into forms (hidden fields)
  ----------------------------- */
  function injectUtmIntoForms() {
    const utm = getUtm();
    if (!Object.keys(utm).length) return;

    $$(CONFIG.forms.selector).forEach((form) => {
      Object.entries(utm).forEach(([k, v]) => {
        if (!v) return;
        // Add or update hidden input
        let input = form.querySelector(`input[name="${k}"]`);
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          form.appendChild(input);
        }
        input.value = v;
      });
    });
  }

  /* -----------------------------
     Form handling (AJAX + status UI)
  ----------------------------- */
  function setupForms() {
    if (!CONFIG.forms.enabled) return;

    const forms = $$(CONFIG.forms.selector);
    if (!forms.length) return;

    const setStatus = (form, type, msg) => {
      const status = $(CONFIG.forms.statusSelector, form);
      if (!status) return;

      status.classList.remove("ok", "err");
      status.style.display = "block";

      if (type === "ok") status.classList.add("ok");
      if (type === "err") status.classList.add("err");

      status.textContent = msg;
    };

    const clearStatus = (form) => {
      const status = $(CONFIG.forms.statusSelector, form);
      if (!status) return;
      status.classList.remove("ok", "err");
      status.style.display = "none";
      status.textContent = "";
    };

    const withTimeout = (promise, ms) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), ms);
      const p = promise(controller.signal).finally(() => clearTimeout(t));
      return p;
    };

    forms.forEach((form) => {
      on(form, "submit", async (e) => {
        e.preventDefault();
        clearStatus(form);

        // Basic required validation
        const required = $$("[required]", form);
        for (const el of required) {
          if ((el.value || "").trim() === "") {
            setStatus(form, "err", "Please fill in the required fields.");
            el.focus();
            track("form_error", { reason: "required_missing" });
            return;
          }
        }

        track("form_submit", { form_id: form.id || "unknown" });

        if (!CONFIG.forms.ajaxSubmit) {
          form.submit();
          return;
        }

        const action = form.getAttribute("action") || "";
        const method = (form.getAttribute("method") || "POST").toUpperCase();

        if (!action) {
          setStatus(form, "err", "Form action is missing. Please configure the endpoint.");
          track("form_error", { reason: "missing_action" });
          return;
        }

        const data = new FormData(form);

        try {
          const res = await withTimeout((signal) => fetch(action, {
            method,
            body: data,
            headers: { "Accept": "application/json" },
            signal
          }), CONFIG.forms.timeoutMs);

          // Many services return 200/201 on success
          if (res.ok) {
            setStatus(form, "ok", "Message sent. I’ll get back to you soon.");
            form.reset();
            injectUtmIntoForms(); // re-inject UTM after reset

            track("form_success", {
              form_id: form.id || "unknown"
            });
          } else {
            let errMsg = "Something went wrong. Please try again.";
            try {
              const json = await res.json();
              if (json && json.errors && json.errors.length) errMsg = json.errors[0].message || errMsg;
            } catch { /* ignore */ }
            setStatus(form, "err", errMsg);
            track("form_error", { reason: "server_error", status: res.status });
          }
        } catch (err) {
          const msg = (err && err.name === "AbortError")
            ? "Request timed out. Please try again."
            : "Network error. Please try again.";
          setStatus(form, "err", msg);
          track("form_error", { reason: err && err.name ? err.name : "network_error" });
        }
      });

      // Clear status when user starts typing again
      on(form, "input", debounce(() => clearStatus(form), 250));
    });
  }

  /* -----------------------------
     Year auto-update
  ----------------------------- */
  function setupYear() {
    const y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* -----------------------------
     Optional: reveal-on-scroll (if you add .reveal)
  ----------------------------- */
  function setupReveal() {
    const items = $$(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });

    items.forEach((el) => io.observe(el));
  }

  /* -----------------------------
     Init
  ----------------------------- */
  function init() {
    // Capture UTM early
    getUtm();

    setupDrawer();
    setupSmoothAnchors();
    setupScrollSpy();
    setupLinkTracking();
    setupScrollDepth();
    injectUtmIntoForms();
    setupForms();
    setupYear();
    setupReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
