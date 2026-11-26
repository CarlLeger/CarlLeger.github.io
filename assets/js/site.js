/* Progressive navigation; content and links are static HTML. */
(() => {
  'use strict';
  if (window.__clSiteReady) return;
  window.__clSiteReady = true;
  const contents = document.querySelectorAll('.toc details');
  if (contents.length) {
    const compactContents = window.matchMedia('(max-width: 60rem)');
    const syncContents = () => contents.forEach(details => {
      details.open = !compactContents.matches;
      details.dataset.ready = 'true';
    });
    compactContents.addEventListener('change', syncContents);
    syncContents();
  }
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;
  const mobile = window.matchMedia('(max-width: 48rem)');
  const fr = document.documentElement.lang.startsWith('fr');
  const setOpen = (open, restore = false) => {
    nav.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? (fr ? 'Fermer le menu' : 'Close menu') : (fr ? 'Ouvrir le menu' : 'Open menu'));
    nav.hidden = mobile.matches && !open;
    if (restore) toggle.focus();
  };
  const sync = () => { toggle.hidden = !mobile.matches; setOpen(false); };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a') && mobile.matches) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mobile.matches && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true); });
  document.addEventListener('click', e => { if (mobile.matches && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false); });
  mobile.addEventListener('change', sync);
  sync();
})();
