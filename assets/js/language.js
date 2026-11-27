/* Progressive language navigation. Ordinary HTML links own the page pairing.
   A saved preference never redirects or overrides an explicitly requested URL. */
(() => {
  'use strict';
  if (window.__clLanguageReady) return;
  window.__clLanguageReady = true;
  const selector = document.querySelector('[data-language-selector]');
  if (!selector) return;
  const summary = selector.querySelector('summary');
  const links = document.querySelectorAll('a[data-language-link]');
  const KEY = 'cl.language.v1', MAX_AGE = 180 * 86400000;
  const languages = ['en-CA', 'fr-CA'];
  const current = document.documentElement.lang;
  let anchors = {};
  try { anchors = JSON.parse(selector.dataset.languageAnchors); } catch (_) { /* Plain links still work. */ }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && (saved.version !== 1 || !languages.includes(saved.language)
      || !Number.isFinite(saved.savedAt) || saved.savedAt > Date.now() || Date.now() - saved.savedAt >= MAX_AGE)) {
      localStorage.removeItem(KEY);
    }
  } catch (_) { /* Storage is optional; the URL always determines the language. */ }
  const bases = new Map([...links].map(a => [a, a.getAttribute('href')]));
  const syncAnchors = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { id = ''; }
    links.forEach(a => {
      const sameLanguage = a.hreflang === current;
      const target = sameLanguage ? (Object.hasOwn(anchors, id) ? id : '')
        : (Object.hasOwn(anchors, id) ? anchors[id] : '');
      // Only the prevalidated equivalence inventory supplies destination fragments.
      a.setAttribute('href', bases.get(a) + (target ? '#' + encodeURIComponent(target) : ''));
    });
  };
  const syncExpanded = () => summary.setAttribute('aria-expanded', String(selector.open));
  const close = restore => {
    selector.open = false;
    syncExpanded();
    if (restore) summary.focus();
  };
  selector.addEventListener('toggle', syncExpanded);
  selector.addEventListener('keydown', event => {
    if (event.key === 'Escape' && selector.open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  });
  document.addEventListener('click', event => {
    if (!selector.contains(event.target)) close(false);
  });
  document.addEventListener('focusin', event => {
    if (!selector.contains(event.target)) close(false);
  });
  links.forEach(a => a.addEventListener('click', () => {
    if (!languages.includes(a.hreflang)) return;
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, language: a.hreflang, savedAt: Date.now() })); } catch (_) { /* Navigate without storage. */ }
    close(false);
  }));
  // Keep a compact menu above the fixed consent panel even on short screens.
  const banner = document.getElementById('consent-banner');
  if (banner && 'ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      const height = banner.hidden ? 0 : banner.getBoundingClientRect().height + 32;
      document.documentElement.style.setProperty('--consent-clearance', height + 'px');
    });
    observer.observe(banner);
  }
  window.addEventListener('hashchange', syncAnchors);
  window.addEventListener('pageshow', () => { close(false); syncAnchors(); });
  syncExpanded();
  syncAnchors();
})();
