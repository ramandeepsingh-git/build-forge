/**
 * components-explorer.js
 * Page logic for components.html. Loads every category's JSON data,
 * normalizes it into a flat list, and renders a filterable, sortable
 * grid of component cards. Favorite state reads/writes through
 * storage.js; nothing here touches localStorage directly.
 */

import { $, $$, loadJSON, formatCurrency, formatWatts, capitalize, debounce, getQueryParam } from './utils.js';
import { searchComponents, bindSearchInput } from './search.js';
import { isFavorite, toggleFavorite, getDraft, saveDraft } from './storage.js';

const CATEGORY_CONFIG = [
  { key: 'cpu', label: 'CPUs', file: 'data/cpus.json' },
  { key: 'gpu', label: 'GPUs', file: 'data/gpus.json' },
  { key: 'motherboard', label: 'Motherboards', file: 'data/motherboards.json' },
  { key: 'ram', label: 'RAM', file: 'data/ram.json' },
  { key: 'storage', label: 'Storage', file: 'data/storage.json' },
  { key: 'psu', label: 'PSUs', file: 'data/psu.json' },
  { key: 'case', label: 'Cases', file: 'data/cases.json' },
];

const COMPARE_STORAGE_KEY = 'buildforge_compare_selection';
const MAX_COMPARE = 2;

/** State, scoped to this module instance (one Explorer page per load). */
const state = {
  allItems: [],          // every component across every category, flattened
  filtered: [],          // after search/filter/sort applied
  activeCategory: 'all',
  query: '',
  brand: 'all',
  priceMax: null,
  sort: 'popularity',
};

async function loadAllComponents() {
  const results = await Promise.all(
    CATEGORY_CONFIG.map((cfg) => loadJSON(cfg.file).catch((err) => {
      console.error(`Failed to load ${cfg.file}`, err);
      return [];
    }))
  );
  return results.flat();
}

/** Pull the one or two "headline" spec lines to show on a compact card. */
function getCardSpecLines(item) {
  if (Array.isArray(item.specs) && item.specs.length) {
    return item.specs.slice(0, 2);
  }
  return [];
}

/** Get a sensible secondary metric (power, capacity, wattage) per category for the card footer. */
function getSecondaryMetric(item) {
  switch (item.category) {
    case 'cpu':
    case 'gpu':
      return formatWatts(item.powerWatts);
    case 'motherboard':
      return item.socket;
    case 'ram':
      return `${item.capacityGB}GB`;
    case 'storage':
      return item.capacityGB >= 1000 ? `${item.capacityGB / 1000}TB` : `${item.capacityGB}GB`;
    case 'psu':
      return `${item.wattage}W`;
    case 'case':
      return `${item.maxGpuLengthMM}mm GPU`;
    default:
      return '';
  }
}

function renderCard(item) {
  const favorited = isFavorite(item.category, item.id);
  const specs = getCardSpecLines(item);

  return `
    <article class="component-card card card--interactive" data-id="${item.id}" data-category="${item.category}">
      <div class="component-card__top">
        <span class="badge badge--neutral">${capitalize(item.category)}</span>
        <button
          class="icon-btn favorite-btn${favorited ? ' icon-btn--active' : ''}"
          data-action="favorite"
          data-id="${item.id}"
          data-category="${item.category}"
          aria-label="${favorited ? 'Remove from favorites' : 'Add to favorites'}"
          data-tooltip="${favorited ? 'Favorited' : 'Add to favorites'}"
        >
          ${heartIconSVG(favorited)}
        </button>
      </div>

      <div class="component-card__image">
        ${componentPlaceholderSVG(item.category)}
      </div>

      <h3 class="component-card__title">${item.brand} ${item.model}</h3>

      <ul class="component-card__specs">
        ${specs.map((s) => `<li>${s}</li>`).join('')}
      </ul>

      <div class="component-card__footer">
        <span class="spec-value spec-value--lg">${formatCurrency(item.price)}</span>
        <span class="badge badge--neutral text-mono">${getSecondaryMetric(item)}</span>
      </div>

      <div class="component-card__actions">
        <button class="btn btn--secondary btn--sm" data-action="compare" data-id="${item.id}" data-category="${item.category}">
          Compare
        </button>
        <button class="btn btn--primary btn--sm" data-action="add-to-build" data-id="${item.id}" data-category="${item.category}">
          Add to Build
        </button>
      </div>
    </article>
  `;
}

function heartIconSVG(filled) {
  return filled
    ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="18" height="18"><path d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.6 5 6 5c2 0 3.5 1 6 3.5C14.5 6 16 5 18 5c3.4 0 5.5 3.4 4 6.9C19.5 16.4 12 21 12 21Z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.6 5 6 5c2 0 3.5 1 6 3.5C14.5 6 16 5 18 5c3.4 0 5.5 3.4 4 6.9C19.5 16.4 12 21 12 21Z"/></svg>`;
}

/** A minimal category-themed placeholder graphic, since no real product photography exists in this dataset. */
function componentPlaceholderSVG(category) {
  const icons = {
    cpu: `<rect x="20" y="20" width="40" height="40" rx="4"/><path d="M28 20v-6M40 20v-6M52 20v-6M28 60v6M40 60v6M52 60v6M20 28h-6M20 40h-6M20 52h-6M60 28h6M60 40h6M60 52h6"/>`,
    gpu: `<rect x="10" y="26" width="60" height="28" rx="4"/><circle cx="26" cy="40" r="7"/><circle cx="46" cy="40" r="7"/><rect x="10" y="54" width="14" height="8"/>`,
    motherboard: `<rect x="10" y="10" width="60" height="60" rx="4"/><rect x="20" y="20" width="18" height="18"/><rect x="44" y="20" width="6" height="18"/><rect x="54" y="20" width="6" height="18"/><rect x="20" y="44" width="40" height="6"/>`,
    ram: `<rect x="16" y="14" width="48" height="52" rx="2"/><path d="M24 14v10M32 14v10M40 14v10M48 14v10M56 14v10"/>`,
    storage: `<rect x="14" y="20" width="52" height="40" rx="3"/><circle cx="40" cy="40" r="10"/><circle cx="40" cy="40" r="2"/>`,
    psu: `<rect x="14" y="14" width="52" height="52" rx="3"/><circle cx="40" cy="40" r="14"/><path d="M40 30v20M30 40h20"/>`,
    case: `<rect x="22" y="8" width="36" height="64" rx="4"/><rect x="28" y="16" width="24" height="8"/><circle cx="40" cy="56" r="8"/>`,
  };
  return `
    <svg viewBox="0 0 80 80" fill="none" stroke="var(--text-tertiary)" stroke-width="1.4" stroke-linejoin="round">
      ${icons[category] || ''}
    </svg>
  `;
}

function applyFiltersAndSort() {
  let items = state.activeCategory === 'all'
    ? state.allItems
    : state.allItems.filter((it) => it.category === state.activeCategory);

  items = searchComponents(items, state.query);

  if (state.brand !== 'all') {
    items = items.filter((it) => it.brand === state.brand);
  }

  if (state.priceMax !== null) {
    items = items.filter((it) => it.price <= state.priceMax);
  }

  items = [...items].sort((a, b) => {
    switch (state.sort) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'newest':
        return (b.releaseYear || 0) - (a.releaseYear || 0);
      case 'popularity':
      default:
        return (b.popularity || 0) - (a.popularity || 0);
    }
  });

  state.filtered = items;
  renderGrid();
  renderResultCount();
}

function renderGrid() {
  const grid = $('#explorer-grid');
  if (!grid) return;

  if (!state.filtered.length) {
    grid.innerHTML = `
      <div class="explorer-empty">
        <p class="text-secondary">No components match your filters.</p>
        <button class="btn btn--ghost btn--sm" id="explorer-reset">Reset filters</button>
      </div>
    `;
    $('#explorer-reset')?.addEventListener('click', resetFilters);
    return;
  }

  grid.innerHTML = state.filtered.map(renderCard).join('');
  bindCardActions(grid);
}

function renderResultCount() {
  const el = $('#explorer-result-count');
  if (el) el.textContent = `${state.filtered.length} component${state.filtered.length === 1 ? '' : 's'}`;
}

function bindCardActions(grid) {
  $$('[data-action="favorite"]', grid).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { id, category } = btn.dataset;
      const nowFavorited = toggleFavorite(category, id);
      btn.classList.toggle('icon-btn--active', nowFavorited);
      btn.innerHTML = heartIconSVG(nowFavorited);
      btn.setAttribute('aria-label', nowFavorited ? 'Remove from favorites' : 'Add to favorites');
      btn.setAttribute('data-tooltip', nowFavorited ? 'Favorited' : 'Add to favorites');
    });
  });

  $$('[data-action="compare"]', grid).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCompare(btn.dataset.category, btn.dataset.id);
    });
  });

  $$('[data-action="add-to-build"]', grid).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { category, id } = btn.dataset;
      const draft = getDraft();
      if (!draft.parts) draft.parts = {};
      draft.parts[category] = id;
      saveDraft(draft);

      const items = state.allItems;
      const item = items.find((it) => it.id === id && it.category === category);
      const name = item ? `${item.brand} ${item.model}` : category.toUpperCase();
      showToast(`Added ${name} to build.`);
    });
  });
}

/* ---------- Compare selection (lightweight, separate from saved builds) ---------- */

function getCompareSelection() {
  try {
    return JSON.parse(sessionStorage.getItem(COMPARE_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function addToCompare(category, id) {
  const selection = getCompareSelection();
  const exists = selection.some((s) => s.category === category && s.id === id);
  if (exists) {
    showToast('Already added to compare.');
    return;
  }
  if (selection.length >= MAX_COMPARE) {
    showToast(`You can compare up to ${MAX_COMPARE} items at a time. Visit Compare Builds to clear your selection.`);
    return;
  }
  selection.push({ category, id });
  sessionStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(selection));
  showToast(selection.length === MAX_COMPARE ? 'Ready to compare — open the Compare page.' : 'Added to compare.');
}

function showToast(message) {
  let toastEl = $('#explorer-toast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'explorer-toast';
    toastEl.className = 'toast explorer-toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.remove('is-leaving');
  clearTimeout(toastEl._hideTimer);
  toastEl._hideTimer = setTimeout(() => {
    toastEl.classList.add('is-leaving');
  }, 2400);
}

/* ---------- Filter UI wiring ---------- */

function getBrandsForActiveCategory() {
  const pool = state.activeCategory === 'all'
    ? state.allItems
    : state.allItems.filter((it) => it.category === state.activeCategory);
  return [...new Set(pool.map((it) => it.brand))].sort();
}

function renderBrandOptions() {
  const select = $('#filter-brand');
  if (!select) return;
  const brands = getBrandsForActiveCategory();
  const current = state.brand;
  select.innerHTML = `
    <option value="all">All Brands</option>
    ${brands.map((b) => `<option value="${b}">${b}</option>`).join('')}
  `;
  // Preserve selection if still valid for this category, else reset to "all".
  select.value = brands.includes(current) ? current : 'all';
  state.brand = select.value;
}

function resetFilters() {
  state.query = '';
  state.brand = 'all';
  state.priceMax = null;
  state.sort = 'popularity';

  const searchInput = $('#explorer-search');
  if (searchInput) searchInput.value = '';
  const priceInput = $('#filter-price');
  if (priceInput) priceInput.value = '';
  const sortSelect = $('#filter-sort');
  if (sortSelect) sortSelect.value = 'popularity';

  renderBrandOptions();
  applyFiltersAndSort();
}

function bindCategoryTabs() {
  $$('.explorer-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.explorer-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      state.activeCategory = tab.dataset.category;
      renderBrandOptions();
      applyFiltersAndSort();
    });
  });
}

function bindFilterControls() {
  $('#filter-brand')?.addEventListener('change', (e) => {
    state.brand = e.target.value;
    applyFiltersAndSort();
  });

  $('#filter-price')?.addEventListener('input', debounce((e) => {
    const val = parseInt(e.target.value, 10);
    state.priceMax = Number.isNaN(val) || val <= 0 ? null : val;
    applyFiltersAndSort();
  }, 250));

  $('#filter-sort')?.addEventListener('change', (e) => {
    state.sort = e.target.value;
    applyFiltersAndSort();
  });

  $('#explorer-clear-filters')?.addEventListener('click', resetFilters);
}

function bindSearch() {
  const input = $('#explorer-search');
  const dropdown = $('#explorer-autocomplete');
  if (!input || !dropdown) return;

  bindSearchInput(input, dropdown, {
    getItems: () => (state.activeCategory === 'all'
      ? state.allItems
      : state.allItems.filter((it) => it.category === state.activeCategory)),
    onQueryChange: (query) => {
      state.query = query;
      applyFiltersAndSort();
    },
    onSelect: (item) => {
      state.query = `${item.brand} ${item.model}`;
      applyFiltersAndSort();
    },
  });
}

/* ---------- Boot ---------- */

export async function initComponentExplorer() {
  const grid = $('#explorer-grid');
  if (!grid) return; // not on this page

  grid.innerHTML = renderSkeletonCards(6);

  state.allItems = await loadAllComponents();

  // Read category query param to preselect category (e.g. from Build Planner redirects)
  const catParam = getQueryParam('category');
  if (catParam && CATEGORY_CONFIG.some((cfg) => cfg.key === catParam)) {
    state.activeCategory = catParam;
    $$('.explorer-tab').forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.category === catParam);
    });
  }

  renderBrandOptions();
  bindCategoryTabs();
  bindFilterControls();
  bindSearch();
  applyFiltersAndSort();
}

function renderSkeletonCards(count) {
  return Array.from({ length: count })
    .map(() => `<div class="component-card card skeleton" style="height: 320px;"></div>`)
    .join('');
}

document.addEventListener('DOMContentLoaded', initComponentExplorer);
