/**
 * main.js
 * Entry point loaded on every page. Responsible for:
 *  - rendering the shared site header + footer into their mount points
 *  - wiring the theme toggle
 *  - wiring the mobile nav drawer
 * Page-specific logic (builder, components explorer, etc.) lives in
 * its own module and is imported only by the HTML page that needs it.
 */

import { $, $$ } from './utils.js';
import { initTheme, bindThemeToggle } from './theme.js';

const NAV_LINKS = [
  { label: 'Home', href: 'index.html' },
  { label: 'Build Planner', href: 'builder.html' },
  { label: 'Component Explorer', href: 'components.html' },
  { label: 'Saved Builds', href: 'saved.html' },
  { label: 'Compare', href: 'compare.html' },
  { label: 'About', href: 'about.html' },
];

function currentPage() {
  const path = window.location.pathname.split('/').pop();
  return path === '' ? 'index.html' : path;
}

function renderHeader() {
  const mount = $('#site-header');
  if (!mount) return;

  const active = currentPage();

  mount.innerHTML = `
    <div class="site-header__inner">
      <div class="site-header__nav">
        <a href="index.html" class="brand">
          ${brandMarkSVG()}
          <span>Build<span class="brand__name-secondary">Forge</span></span>
        </a>
        <nav class="site-header__links" aria-label="Primary">
          ${NAV_LINKS.map((link) => `
            <a href="${link.href}" class="nav-link${link.href === active ? ' nav-link--active' : ''}">
              ${link.label}
            </a>
          `).join('')}
        </nav>
      </div>
      <div class="site-header__actions">
        <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark or light theme">
          <span class="theme-toggle__thumb">${sunIconSVG()}</span>
        </button>
        <a href="builder.html" class="btn btn--primary btn--sm">Start Building</a>
        <button class="icon-btn site-header__menu-toggle" id="mobile-menu-toggle" aria-label="Open menu">
          ${menuIconSVG()}
        </button>
      </div>
    </div>
  `;

  bindThemeToggle($('#theme-toggle'));
  renderMobileNav(active);
}

function renderMobileNav(active) {
  // Build the off-canvas drawer once and append to body.
  if ($('#mobile-nav-scrim')) return;

  const scrim = document.createElement('div');
  scrim.id = 'mobile-nav-scrim';
  scrim.className = 'slide-panel__scrim';

  const panel = document.createElement('nav');
  panel.id = 'mobile-nav-panel';
  panel.className = 'slide-panel slide-panel--from-left mobile-nav';
  panel.setAttribute('aria-label', 'Mobile navigation');
  panel.innerHTML = `
    <div class="mobile-nav__head">
      <a href="index.html" class="brand">${brandMarkSVG()}<span>Build<span class="brand__name-secondary">Forge</span></span></a>
      <button class="icon-btn" id="mobile-menu-close" aria-label="Close menu">${closeIconSVG()}</button>
    </div>
    <ul class="mobile-nav__links">
      ${NAV_LINKS.map((link) => `
        <li><a href="${link.href}" class="${link.href === active ? 'is-active' : ''}">${link.label}</a></li>
      `).join('')}
    </ul>
  `;
  
  document.body.append(scrim, panel);

  const open = () => {
    scrim.classList.add('is-open');
    panel.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    scrim.classList.remove('is-open');
    panel.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  $('#mobile-menu-toggle')?.addEventListener('click', open);
  $('#mobile-menu-close')?.addEventListener('click', close);
  scrim.addEventListener('click', close);
}

function renderFooter() {
  const mount = $('#site-footer');
  if (!mount) return;

  mount.innerHTML = `
    <div class="container site-footer__inner">
      <div class="site-footer__col">
        <a href="index.html" class="brand">${brandMarkSVG()}<span>Build<span class="brand__name-secondary">Forge</span></span></a>
        <p class="text-secondary" style="margin-top: var(--sp-3); font-size: var(--fs-sm); max-width: 320px;">
          A precision PC build planner. Pick parts, check compatibility, and ship a build you trust.
        </p>
      </div>
      <div class="site-footer__col">
        <h4>Plan</h4>
        <ul>
          <li><a href="builder.html">Build Planner</a></li>
          <li><a href="compare.html">Compare Builds</a></li>
          <li><a href="saved.html">Saved Builds</a></li>
        </ul>
      </div>
      <div class="site-footer__col">
        <h4>Browse</h4>
        <ul>
          <li><a href="components.html">Component Explorer</a></li>
          <li><a href="components.html?category=cpu">CPUs</a></li>
          <li><a href="components.html?category=gpu">GPUs</a></li>
        </ul>
      </div>
      <div class="site-footer__col">
        <h4>Company</h4>
        <ul>
          <li><a href="about.html">About</a></li>
        </ul>
      </div>
    </div>
    <div class="container site-footer__bottom">
      <span>&copy; ${new Date().getFullYear()} Build Forge. All sample data, for demo purposes.</span>
      <span class="text-mono">v1.0.0</span>
    </div>
  `;
}

/* ---------- Inline icon SVGs (kept tiny and dependency-free) ---------- */

function brandMarkSVG() {
  return `
    <svg class="brand__mark" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="6" fill="var(--accent)"/>
      <path d="M9 19V9h4.2c2.2 0 3.5 1.2 3.5 3.1 0 1.3-.7 2.2-1.8 2.6 1.3.4 2.1 1.4 2.1 2.9 0 2-1.5 3.4-3.9 3.4H9Zm2.6-2.1h1.6c1 0 1.6-.5 1.6-1.4 0-.9-.6-1.4-1.6-1.4h-1.6v2.8Zm0-4.7h1.4c.9 0 1.4-.5 1.4-1.2 0-.8-.5-1.2-1.4-1.2h-1.4v2.4Z" fill="var(--text-on-accent)"/>
    </svg>
  `;
}

function sunIconSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></svg>`;
}

function menuIconSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;
}

function closeIconSVG() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
}

/* ---------- Boot ---------- */

function initApp() {
  initTheme(); // must run before paint to avoid theme flash; called again safely here for pages that load main.js late
  renderHeader();
  renderFooter();

  // Fade the freshly-mounted main content in, per the animation spec.
  const mainEl = $('.page__main');
  if (mainEl) mainEl.classList.add('page-transition');
}

document.addEventListener('DOMContentLoaded', initApp);

export { NAV_LINKS };
