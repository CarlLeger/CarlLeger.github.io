/* Basic consent mode: no Google request before explicit optional analytics consent. */
(() => {
  'use strict';
  if (window.__clAnalyticsReady) return;
  window.__clAnalyticsReady = true;
  const ID = 'G-3KXQFTWTBD', KEY = 'cl.analytics-consent.v1', MAX_AGE = 180 * 86400000;
  // Release hold: automatic collection in the GA4 stream must be verified first.
  // Keep false until outbound/search/history and user-provided data settings are certified.
  const MEASUREMENT_RELEASED = true;
  const disabledKey = 'ga-disable-' + ID;
  window[disabledKey] = true;
  const params = new URLSearchParams(location.search);
  const production = MEASUREMENT_RELEASED && location.protocol === 'https:' && location.hostname === 'carlleger.github.io'
    && !['preview', 'cl_preview', 'dev', 'debug', 'draft', 'staging'].some(key => params.has(key))
    && params.get('analytics') !== 'off' && !navigator.webdriver;
  const banner = document.getElementById('consent-banner'), dialog = document.getElementById('privacy-dialog');
  const checkbox = document.getElementById('analytics-consent'), status = document.getElementById('consent-status');
  const fr = document.documentElement.lang.startsWith('fr');
  const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  let choice = null, initialized = false, returnFocus = null;
  const readChoice = raw => {
    try {
      const saved = JSON.parse(raw);
      if (saved && saved.version === 1 && typeof saved.analytics === 'boolean' && Number.isFinite(saved.savedAt)
        && saved.savedAt <= Date.now() && Date.now() - saved.savedAt < MAX_AGE) return saved.analytics;
    } catch (_) { /* Invalid storage: remain denied. */ }
    return null;
  };
  try { choice = readChoice(localStorage.getItem(KEY)); } catch (_) { /* Storage unavailable: remain denied. */ }
  const cleanUrl = value => {
    try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.origin + u.pathname : ''; } catch (_) { return ''; }
  };
  const initialize = () => {
    if (!production || choice !== true || initialized) return;
    initialized = true;
    window[disabledKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', denied);
    window.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', ID, { send_page_view: true, page_location: location.origin + location.pathname,
      page_referrer: cleanUrl(document.referrer), allow_google_signals: false, allow_ad_personalization_signals: false });
    const script = document.createElement('script');
    script.id = 'cl-google-tag'; script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(script);
  };
  const clearCookies = () => {
    document.cookie.split(';').forEach(part => {
      const name = part.split('=')[0].trim();
      if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) return;
      const end = '=; Max-Age=0; path=/; SameSite=Lax';
      document.cookie = name + end;
      document.cookie = name + end + '; domain=' + location.hostname;
      document.cookie = name + end + '; domain=.' + location.hostname;
    });
  };
  const refreshUi = () => {
    if (banner) banner.hidden = choice !== null;
    if (checkbox) checkbox.checked = choice === true;
    if (status) status.textContent = choice === true ? (fr ? 'Mesure facultative acceptée.' : 'Optional analytics accepted.')
      : (fr ? 'Mesure facultative désactivée.' : 'Optional analytics disabled.');
  };
  const closePreferences = () => {
    if (dialog?.open) dialog.close();
    if (returnFocus?.isConnected) returnFocus.focus();
  };
  const choose = allowed => {
    const revokeLoadedTag = initialized && !allowed;
    choice = allowed;
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, analytics: allowed, savedAt: Date.now() })); } catch (_) { /* Choice still applies on this page. */ }
    if (!allowed) { window[disabledKey] = true; clearCookies(); }
    refreshUi(); closePreferences();
    if (allowed) initialize();
    // Withdrawal unloads Google's listeners, with denied persisted before reload.
    if (revokeLoadedTag) location.reload();
  };
  const openPreferences = () => {
    if (!dialog) return;
    returnFocus = document.activeElement; refreshUi(); dialog.showModal();
  };
  document.querySelectorAll('[data-consent-open]').forEach(button => { button.hidden = false; button.addEventListener('click', openPreferences); });
  document.querySelectorAll('[data-consent-accept]').forEach(button => button.addEventListener('click', () => choose(true)));
  document.querySelectorAll('[data-consent-reject]').forEach(button => button.addEventListener('click', () => choose(false)));
  document.querySelectorAll('[data-consent-save]').forEach(button => button.addEventListener('click', () => choose(!!checkbox?.checked)));
  document.querySelectorAll('[data-consent-close]').forEach(button => button.addEventListener('click', closePreferences));
  if (dialog) {
    dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus(); });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]')]
        .filter(control => control.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  }
  refreshUi(); if (choice !== true) clearCookies(); initialize();
  // A withdrawal or cleared preference in another tab applies to this document too.
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    choice = readChoice(event.newValue);
    refreshUi(); closePreferences();
    if (choice === true) initialize();
    else {
      window[disabledKey] = true; clearCookies();
      if (initialized) location.reload();
    }
  });
  const providers = { cloudways: ['www.cloudways.com', 'cloudways.com'], kinsta: ['kinsta.com'], wpengine: ['www.wqwln8trk.com'],
    siteground: ['www.siteground.com', 'world.siteground.com'], hostingdotcom: ['hosting.com'], flyingpress: ['flyingpress.com'],
    shopify: ['shopify.pxf.io'], teachable: ['partnerstack.teachable.com'] };
  const pageTypes = ['home', 'resource_hub', 'hosting_review', 'hosting_hub', 'hosting_comparison', 'guide', 'service', 'about', 'contact', 'case_study'];
  const pageType = pageTypes.includes(document.body.dataset.pageType) ? document.body.dataset.pageType : 'guide';
  const locations = ['header', 'hero', 'table', 'article', 'conclusion', 'footer', 'related', 'content'];
  const placement = a => {
    const value = a.dataset.ctaLocation || a.closest('[data-cta-location]')?.dataset.ctaLocation;
    return locations.includes(value) ? value : (a.closest('header.site-header') ? 'header' : a.closest('footer.site-footer') ? 'footer' : 'content');
  };
  const dispatch = event => {
    if ((event.type === 'click' && event.button !== 0) || (event.type === 'auxclick' && event.button !== 1)) return;
    if (!event.isTrusted || event.defaultPrevented || !production || choice !== true || !initialized || window[disabledKey]) return;
    const a = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!a) return;
    // Changing language is navigation, including on comparison pages.
    if (a.hasAttribute('data-language-link') || a.closest('[data-language-selector]')) return;
    let url; try { url = new URL(a.href, location.href); } catch (_) { return; }
    const where = placement(a), provider = a.dataset.provider;
    let name, values;
    if (a.relList.contains('sponsored') && providers[provider]?.includes(url.hostname) && /^https?:$/.test(url.protocol)) {
      name = 'affiliate_click'; values = { provider, page_type: pageType, cta_location: where, link_domain: url.hostname };
    } else if (url.protocol === 'mailto:' || (url.hostname === 'www.linkedin.com' && url.pathname.replace(/\/$/, '') === '/in/carlleger')) {
      name = 'contact_click'; values = { contact_method: url.protocol === 'mailto:' ? 'email' : 'linkedin', page_type: pageType };
    } else if ((url.origin === location.origin || url.hostname === 'carlleger.github.io') && /\/cloudways-vs-(kinsta|wp-engine|siteground)\/$/.test(url.pathname)) {
      const competitor = url.pathname.match(/cloudways-vs-(kinsta|wp-engine|siteground)/)[1];
      name = 'comparison_click'; values = { provider: competitor === 'wp-engine' ? 'wpengine' : competitor,
        comparison_type: 'cloudways_vs_' + competitor.replace('-', '_'), cta_location: where };
    } else if (/^[a-z_]{2,40}$/.test(a.dataset.ctaType || '')) {
      name = 'cta_click'; values = { cta_type: a.dataset.ctaType, cta_location: where, page_type: pageType };
    } else return;
    window.gtag('event', name, { ...values, transport_type: 'beacon' });
  };
  document.addEventListener('click', dispatch);
  document.addEventListener('auxclick', dispatch);
})();
