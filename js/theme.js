/**
 * theme.js
 * Handles dark/light theme switching and persistence.
 * The actual colors live entirely in CSS custom properties
 * (see base.css [data-theme] block) — this module only ever
 * toggles the `data-theme` attribute on <html> and remembers
 * the choice in localStorage.
 */

const STORAGE_KEY = 'buildforge_theme';
const DARK = 'dark';
const LIGHT = 'light';

function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY);
}

function getPreferredTheme() {
  const stored = getStoredTheme();
  if (stored === DARK || stored === LIGHT) return stored;
  // Fall back to OS preference, default to dark (the app's primary identity).
  return window.matchMedia('(prefers-color-scheme: light)').matches ? LIGHT : DARK;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

/** Call once, as early as possible, to avoid a flash of the wrong theme. */
export function initTheme() {
  applyTheme(getPreferredTheme());
}

/** Wire up a toggle button (or any element) to flip the theme on click. */
export function bindThemeToggle(toggleEl) {
  if (!toggleEl) return;
  toggleEl.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === DARK ? LIGHT : DARK);
  });
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || DARK;
}
