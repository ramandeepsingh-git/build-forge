/**
 * favorites.js
 * Page controller for saved.html. Manages and displays saved PC builds
 * from backend API and favorited components with backend persistence.
 */

import { $, $$, loadJSON, formatCurrency, formatWatts, capitalize } from './utils.js';
import { apiRequest } from './api.js';
import {
  getAllBuilds,
  deleteBuild,
  duplicateBuild,
  importBuildFromJSON,
  getFavorites,
  toggleFavorite,
  isFavorite,
  fetchUserFavoriteComponents,
  toggleUserFavoriteComponent,
  getDraft,
  saveDraft,
  getAuthToken
} from './storage.js';
import { runCompatibilityReport } from './compatibility.js';
import { buildPowerReport } from './calculator.js';

/** State scoped to the saved builds page */
const state = {
  categories: [
    { key: 'cpu', file: 'data/cpus.json' },
    { key: 'motherboard', file: 'data/motherboards.json' },
    { key: 'gpu', file: 'data/gpus.json' },
    { key: 'ram', file: 'data/ram.json' },
    { key: 'storage', file: 'data/storage.json' },
    { key: 'psu', file: 'data/psu.json' },
    { key: 'case', file: 'data/cases.json' }
  ],
  allComponents: [],
  componentsMap: {},           // Dictionary lookup mapping item ID -> item object
  activeTab: 'builds',         // 'builds' | 'favorites'
  savedBuilds: []
};

/* ============================================================
   DATA LOADING
   ============================================================ */

async function loadComponents() {
  const loadedPromises = state.categories.map(async (cat) => {
    try {
      const data = await loadJSON(cat.file);
      data.forEach(item => {
        state.componentsMap[item.id] = item;
      });
      return data;
    } catch (err) {
      console.error(`Failed to load ${cat.file}`, err);
      return [];
    }
  });

  const results = await Promise.all(loadedPromises);
  state.allComponents = results.flat();
}

async function loadSavedBuildsFromBackend() {
  try {
    const res = await apiRequest('/builds?size=100');
    if (res.ok) {
      const data = await res.json();
      state.savedBuilds = Array.isArray(data) ? data : (data.builds || []);
      return state.savedBuilds;
    }
  } catch (err) {
    console.warn('API builds load failed, using localStorage fallback', err);
  }
  state.savedBuilds = getAllBuilds();
  return state.savedBuilds;
}

/* ============================================================
   TAB RENDERING & COUNTS
   ============================================================ */

function updateTabCounts() {
  const buildsCount = state.savedBuilds.length;
  const favoritesCount = getFavorites().length;

  const buildsCountEl = $('#builds-count');
  if (buildsCountEl) buildsCountEl.textContent = buildsCount;

  const favoritesCountEl = $('#favorites-count');
  if (favoritesCountEl) favoritesCountEl.textContent = favoritesCount;
}

async function renderGrid() {
  const grid = $('#saved-items-grid');
  if (!grid) return;

  await loadSavedBuildsFromBackend();
  await fetchUserFavoriteComponents();
  updateTabCounts();

  if (state.activeTab === 'builds') {
    const builds = state.savedBuilds;
    if (builds.length === 0) {
      grid.innerHTML = renderBuildsEmptyState();
      grid.style.gridTemplateColumns = '1fr';
      return;
    }

    grid.style.gridTemplateColumns = '';
    grid.innerHTML = builds.map(build => renderBuildCardHTML(build)).join('');
    bindBuildActions();
  } else {
    const favorites = getFavorites();
    if (favorites.length === 0) {
      grid.innerHTML = renderFavoritesEmptyState();
      grid.style.gridTemplateColumns = '1fr';
      return;
    }

    grid.style.gridTemplateColumns = '';
    const cardsHTML = favorites.map(fav => {
      const favId = fav.id || fav.componentId;
      const item = state.componentsMap[favId];
      if (!item) return '';
      return renderFavoriteComponentCard(item);
    }).filter(Boolean).join('');

    if (!cardsHTML) {
      grid.innerHTML = renderFavoritesEmptyState();
      grid.style.gridTemplateColumns = '1fr';
      return;
    }

    grid.innerHTML = cardsHTML;
    bindFavoriteActions();
  }
}

function renderBuildCardHTML(build) {
  const resolved = {};
  let partsCount = 0;
  let totalPrice = 0;

  const parts = build.parts || build.components || {};

  for (const [key, id] of Object.entries(parts)) {
    if (id && typeof id === 'string') {
      const part = state.componentsMap[id];
      if (part) {
        resolved[key] = part;
        partsCount++;
        totalPrice += part.price;
      }
    }
  }

  const power = buildPowerReport(resolved);
  const compat = runCompatibilityReport(resolved, power.totalWatts);

  let statusBadgeClass = 'badge--good';
  if (compat.overallStatus === 'warning') {
    statusBadgeClass = 'badge--warn';
  } else if (compat.overallStatus === 'error') {
    statusBadgeClass = 'badge--error';
  }

  return `
    <article class="card saved-build-card" data-id="${build.id}">
      <div class="saved-build-card__header">
        <h3 class="saved-build-card__title" title="${build.name}">${build.name}</h3>
        <span class="badge ${statusBadgeClass}">${capitalize(compat.overallStatus)}</span>
      </div>

      <div class="saved-build-card__dates">
        <span>Created: ${formatDate(build.createdAt)}</span>
        <span>Updated: ${formatDate(build.updatedAt)}</span>
      </div>

      <div class="saved-build-card__stats">
        <div class="spec-row">
          <span class="spec-row__label">Total Price</span>
          <span class="spec-value spec-value--accent">${formatCurrency(totalPrice)}</span>
        </div>
        <div class="spec-row">
          <span class="spec-row__label">Components</span>
          <span class="spec-value">${partsCount} / 7</span>
        </div>
        <div class="spec-row">
          <span class="spec-row__label">Est. Wattage</span>
          <span class="spec-value">${formatWatts(power.totalWatts)}</span>
        </div>
      </div>

      <div class="saved-build-card__actions">
        <button class="btn btn--primary btn--sm" data-action="edit-build" data-id="${build.id}">
          Edit Build
        </button>
        <button class="icon-btn" data-action="duplicate-build" data-id="${build.id}" data-tooltip="Duplicate build" aria-label="Duplicate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="icon-btn" data-action="export-build" data-id="${build.id}" data-tooltip="Export JSON" aria-label="Export">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        </button>
        <button class="icon-btn text-error" data-action="delete-build" data-id="${build.id}" data-tooltip="Delete build" aria-label="Delete" style="color: var(--status-error);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </article>
  `;
}

/* ============================================================
   TEMPLATES & RENDERERS
   ============================================================ */

function renderBuildsEmptyState() {
  return `
    <div class="empty-state-card">
      <div class="empty-state-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      </div>
      <h3 class="empty-state-card__title">No Saved Builds</h3>
      <p class="empty-state-card__text">You haven't saved any PC builds yet. Design your custom rig in the Build Planner.</p>
      <a href="builder.html" class="btn btn--primary">Start Building</a>
    </div>
  `;
}

function renderFavoritesEmptyState() {
  return `
    <div class="empty-state-card">
      <div class="empty-state-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.6 5 6 5c2 0 3.5 1 6 3.5C14.5 6 16 5 18 5c3.4 0 5.5 3.4 4 6.9C19.5 16.4 12 21 12 21Z"/></svg>
      </div>
      <h3 class="empty-state-card__title">No Favorites Yet</h3>
      <p class="empty-state-card__text">Browse the Component Explorer and favorite components to save them here for quick access.</p>
      <a href="components.html" class="btn btn--primary">Explore Components</a>
    </div>
  `;
}

function renderFavoriteComponentCard(item) {
  const favorited = isFavorite(item.category, item.id);
  const specs = item.specs ? item.specs.slice(0, 2) : [];

  return `
    <article class="component-card card card--interactive" data-id="${item.id}" data-category="${item.category}">
      <div class="component-card__top">
        <span class="badge badge--neutral">${capitalize(item.category)}</span>
        <button
          class="icon-btn favorite-btn${favorited ? ' icon-btn--active' : ''}"
          data-action="toggle-fav"
          data-id="${item.id}"
          data-category="${item.category}"
          aria-label="Remove from favorites"
          data-tooltip="Favorited"
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
        <button class="btn btn--primary btn--sm btn--block" data-action="add-to-build" data-id="${item.id}" data-category="${item.category}">
          Add to Build
        </button>
      </div>
    </article>
  `;
}

/* ============================================================
   EVENT BINDINGS & ACTIONS
   ============================================================ */

function bindBuildActions() {
  $$('[data-action="edit-build"]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `builder.html?editBuildId=${btn.dataset.id}`;
    });
  });

  $$('[data-action="duplicate-build"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const buildId = btn.dataset.id;
      const original = state.savedBuilds.find(b => String(b.id) === String(buildId));
      if (original) {
        try {
          const payload = {
            name: `${original.name} (Copy)`,
            notes: original.notes || '',
            parts: original.parts || original.components || {}
          };
          const createRes = await apiRequest('/builds', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (createRes.ok) {
            showToast(`Duplicated build as "${payload.name}"`);
            await renderGrid();
            return;
          }
        } catch (err) {
          console.warn('Backend duplicate failed', err);
        }
      }
      const dup = duplicateBuild(buildId);
      if (dup) {
        showToast(`Duplicated build as "${dup.name}"`);
        await renderGrid();
      } else {
        showToast('Failed to duplicate build.');
      }
    });
  });

  $$('[data-action="export-build"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const buildId = btn.dataset.id;
      const buildObj = state.savedBuilds.find(b => String(b.id) === String(buildId)) || getAllBuilds().find(b => String(b.id) === String(buildId));
      if (!buildObj) return;

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(buildObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const filename = (buildObj.name || 'build-forge-build').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      downloadAnchor.setAttribute("download", `${filename}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Build exported successfully.');
    });
  });

  $$('[data-action="delete-build"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to permanently delete this build?')) {
        const id = btn.dataset.id;
        try {
          const res = await apiRequest(`/builds/${id}`, { method: 'DELETE' });
          if (res.ok || res.status === 204) {
            deleteBuild(id);
            showToast('Build deleted successfully.');
            await renderGrid();
            return;
          } else {
            showToast('Failed to delete build from server.');
            return;
          }
        } catch (err) {
          console.error('Backend delete failed', err);
          showToast('Network error while deleting build.');
          return;
        }
      }
    });
  });
}

function bindFavoriteActions() {
  $$('[data-action="toggle-fav"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { category, id } = btn.dataset;
      await toggleUserFavoriteComponent(category, id);
      showToast('Removed from favorites.');
      await renderGrid();
    });
  });

  $$('[data-action="add-to-build"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { category, id } = btn.dataset;
      const draft = getDraft();
      if (!draft.parts) draft.parts = {};
      draft.parts[category] = id;
      saveDraft(draft);

      const item = state.componentsMap[id];
      const name = item ? `${item.brand} ${item.model}` : category.toUpperCase();
      showToast(`Added ${name} to build.`);
    });
  });
}

function bindImport() {
  const importBtn = $('#btn-import-build');
  const fileInput = $('#file-import');

  if (!importBtn || !fileInput) return;

  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = importBuildFromJSON(evt.target.result);
        if (imported) {
          showToast(`Imported build "${imported.name}" successfully!`);
          fileInput.value = '';

          if (state.activeTab === 'builds') {
            await renderGrid();
          } else {
            state.activeTab = 'builds';
            $$('.saved-tab').forEach(t => {
              t.classList.toggle('is-active', t.dataset.tab === 'builds');
            });
            await renderGrid();
          }
        }
      } catch (err) {
        showToast(err.message || 'Failed to import build JSON file.');
        fileInput.value = '';
      }
    };
    reader.readAsText(file);
  });
}

function bindTabs() {
  $$('.saved-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      $$('.saved-tab').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      state.activeTab = tab.dataset.tab;
      await renderGrid();
    });
  });
}

/* ============================================================
   HELPERS & ICON UTILITIES
   ============================================================ */

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' ' + d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (err) {
    return '—';
  }
}

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

function heartIconSVG(filled) {
  return filled
    ? `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="18" height="18"><path d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.6 5 6 5c2 0 3.5 1 6 3.5C14.5 6 16 5 18 5c3.4 0 5.5 3.4 4 6.9C19.5 16.4 12 21 12 21Z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><path d="M12 21s-7.5-4.6-10-9.1C.5 8.4 2.6 5 6 5c2 0 3.5 1 6 3.5C14.5 6 16 5 18 5c3.4 0 5.5 3.4 4 6.9C19.5 16.4 12 21 12 21Z"/></svg>`;
}

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

function renderGuestState(root) {
  root.innerHTML = `
    <div class="profile-container" style="margin: var(--sp-8) auto;">
      <div class="profile-guest-card">
        <div class="profile-guest-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h1 class="profile-guest-title">Sign In Required</h1>
        <p class="profile-guest-desc">
          Sign in or create an account to view and manage your saved PC configurations and component favorites.
        </p>
        <div class="profile-guest-actions">
          <a href="login.html?redirect=saved.html" class="btn btn--primary">Sign In</a>
          <a href="login.html?mode=signup&redirect=saved.html" class="btn btn--secondary">Create Account</a>
        </div>
      </div>
    </div>
  `;
}

function renderAuthenticatedSavedUI(root) {
  root.innerHTML = `
    <!-- ============ HEADER ============ -->
    <section class="saved-header">
      <div class="container">
        <div class="saved-header__inner">
          <div>
            <span class="eyebrow">Build Forge / Hub</span>
            <h1 class="section-title">Saved Builds &amp; Favorites</h1>
            <p class="section-subtitle">Manage your custom configurations and saved components in one place. Export, duplicate, or restore them anytime.</p>
          </div>
          <div>
            <button class="btn btn--secondary btn--sm" id="btn-import-build">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16" style="margin-right: var(--sp-1);"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              Import Build
            </button>
            <input type="file" id="file-import" accept=".json" style="display: none;" />
          </div>
        </div>

        <!-- ============ TABS ============ -->
        <div class="saved-tabs" role="tablist" aria-label="Saved items">
          <button class="saved-tab is-active" data-tab="builds" role="tab" aria-selected="true">
            Saved Builds (<span id="builds-count">0</span>)
          </button>
          <button class="saved-tab" data-tab="favorites" role="tab" aria-selected="false">
            Favorites (<span id="favorites-count">0</span>)
          </button>
        </div>
      </div>
    </section>

    <!-- ============ CONTENT GRID ============ -->
    <section class="container saved-container">
      <div class="saved-grid" id="saved-items-grid">
        <div class="card skeleton" style="height: 240px; border-radius: var(--radius-lg);"></div>
        <div class="card skeleton" style="height: 240px; border-radius: var(--radius-lg);"></div>
        <div class="card skeleton" style="height: 240px; border-radius: var(--radius-lg);"></div>
      </div>
    </section>
  `;
}

/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initSaved() {
  const root = $('#saved-root') || document.querySelector('.page__main');
  if (!root) return;

  const token = getAuthToken();
  if (!token) {
    renderGuestState(root);
    return;
  }

  renderAuthenticatedSavedUI(root);
  await loadComponents();
  await renderGrid();
  bindTabs();
  bindImport();
}

document.addEventListener('DOMContentLoaded', initSaved);
