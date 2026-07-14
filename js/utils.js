/**
 * utils.js
 * Small, pure helper functions shared across the app.
 * No DOM side effects beyond the explicit $/$$ query helpers —
 * everything else here is a pure function so it can be unit
 * tested in isolation if this project ever grows test coverage.
 */

/** Query a single element, scoped optionally to a root. */
export const $ = (selector, root = document) => root.querySelector(selector);

/** Query all matching elements as a real array (not a NodeList). */
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/**
 * Format a number as Indian Rupees, no decimal places.
 * PC component prices are always whole rupees in our data set.
 */
export function formatCurrency(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a wattage value consistently, e.g. 65 -> "65W". */
export function formatWatts(watts) {
  if (typeof watts !== 'number' || Number.isNaN(watts)) return '—';
  return `${Math.round(watts)}W`;
}

/** Format large numbers with thin thousands separators (e.g. clock speeds). */
export function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN').format(value);
}

/** Debounce: delay invoking fn until `wait` ms after the last call. */
export function debounce(fn, wait = 250) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

/** Clamp a number between min and max. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Generate a reasonably unique id for builds/favorites saved client-side. */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a DOM element from an HTML string. Returns the first element. */
export function createElementFromHTML(htmlString) {
  const template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  return template.content.firstElementChild;
}

/**
 * Fetch and parse a JSON file from the data/ directory.
 * Centralized so every module hits the same caching layer later
 * if we add one, without touching call sites.
 */
const jsonCache = new Map();

export async function loadJSON(path) {
  if (jsonCache.has(path)) return jsonCache.get(path);
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  const data = await response.json();
  jsonCache.set(path, data);
  return data;
}

/** Capitalize the first letter only; used for category labels. */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Simple fuzzy-ish substring match for search, case/diacritic insensitive. */
export function matchesQuery(haystack, query) {
  if (!query) return true;
  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalize(haystack).includes(normalize(query));
}

/** Read a query param from the current URL. */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Build a query string from a params object, skipping empty values. */
export function buildQueryString(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      usp.set(key, value);
    }
  });
  const str = usp.toString();
  return str ? `?${str}` : '';
}
