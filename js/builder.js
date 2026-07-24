/**
 * builder.js
 * Page logic for builder.html. Manages the PC Build Planner workflow.
 * Loads all category JSON files, restores or initializes the build draft,
 * renders parts slots, and updates cost, power draw, and compatibility
 * estimates in real-time.
 */

import { $, $$, loadJSON, formatCurrency, formatWatts, capitalize, debounce, getQueryParam } from './utils.js';
import { getDraft, saveDraft, clearDraft, saveBuild, getBuildById } from './storage.js';
import { runCompatibilityReport } from './compatibility.js';
import { buildPowerReport } from './calculator.js';

/** State scoped to the builder module */
const state = {
  categories: [
    { key: 'cpu', label: 'CPU', file: 'data/cpus.json' },
    { key: 'motherboard', label: 'Motherboard', file: 'data/motherboards.json' },
    { key: 'gpu', label: 'GPU', file: 'data/gpus.json' },
    { key: 'ram', label: 'RAM', file: 'data/ram.json' },
    { key: 'storage', label: 'Storage', file: 'data/storage.json' },
    { key: 'psu', label: 'PSU', file: 'data/psu.json' },
    { key: 'case', label: 'Case', file: 'data/cases.json' }
  ],
  allComponents: [],           // flat list of all components across categories
  componentsByCategory: {},    // key: category key, value: array of components

  draft: {
    id: null,
    name: 'Untitled Build',
    parts: {
      cpu: null,
      motherboard: null,
      gpu: null,
      ram: null,
      storage: null,
      psu: null,
      case: null
    },
    notes: '',
    createdAt: null,
    updatedAt: null
  }
};

const checkRequirements = {
  'CPU Socket': ['cpu', 'motherboard'],
  'RAM Generation': ['ram', 'motherboard'],
  'RAM Speed': ['ram', 'motherboard'],
  'RAM Slots': ['ram', 'motherboard'],
  'RAM Capacity': ['ram', 'motherboard'],
  'Storage Interface': ['storage', 'motherboard'],
  'Storage PCIe Generation': ['storage', 'motherboard'],
  'GPU / Case Clearance': ['gpu', 'case'],
  'Motherboard / Case Fit': ['motherboard', 'case'],
  'PSU / Case Fit': ['psu', 'case'],
  'PSU Wattage': ['psu'],
  'GPU Recommended PSU': ['gpu', 'psu'],
  'CPU Cooler Socket': ['cpu'],
  'CPU Cooler Clearance': ['case']
};

/* ============================================================
   DATA LOADING
   ============================================================ */

async function loadAllComponents() {
  const loadedPromises = state.categories.map(async (cat) => {
    try {
      const data = await loadJSON(cat.file);
      state.componentsByCategory[cat.key] = data;
      return data;
    } catch (err) {
      console.error(`Failed to load ${cat.file}`, err);
      state.componentsByCategory[cat.key] = [];
      return [];
    }
  });

  const allResults = await Promise.all(loadedPromises);
  state.allComponents = allResults.flat();
}

/* ============================================================
   DRAFT MANAGEMENT
   ============================================================ */

async function loadDraftState() {
  const editId = getQueryParam('editBuildId');
  let loaded = null;

  if (editId) {
    loaded = getBuildById(editId);
    if (loaded) {
      state.draft = {
        id: loaded.id,
        name: loaded.name || 'Untitled Build',
        parts: loaded.parts || {},
        notes: loaded.notes || '',
        createdAt: loaded.createdAt || null,
        updatedAt: loaded.updatedAt || null
      };
    }
    saveDraft(state.draft);
  }

  if (!loaded) {
    const draft = getDraft();
    state.draft = {
      id: draft.id || null,
      name: draft.name || 'Untitled Build',
      parts: {
        cpu: null,
        motherboard: null,
        gpu: null,
        ram: null,
        storage: null,
        psu: null,
        case: null,
        ...draft.parts
      },
      notes: draft.notes || '',
      createdAt: draft.createdAt || null,
      updatedAt: draft.updatedAt || null
    };
  }

  // Check for add-to-build parameters (retained for backward compatibility or direct links)
  const addCat = getQueryParam('addCategory');
  const addId = getQueryParam('addId');
  if (addCat && addId && state.categories.some(c => c.key === addCat)) {
    state.draft.parts[addCat] = addId;
    saveDraft(state.draft);
    showToast(`Added part to ${capitalize(addCat)} slot.`);
  }

  // Clean URL query parameters so refreshes are clean
  if (window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // Populate form elements
  const nameInput = $('#build-name');
  if (nameInput) {
    nameInput.value = state.draft.name;
  }

  const notesTextarea = $('#build-notes');
  if (notesTextarea) {
    notesTextarea.value = state.draft.notes;
  }

  updateBuildMetaTimestamps();
}

function updateBuildMetaTimestamps() {
  const createdEl = $('#build-created');
  const updatedEl = $('#build-updated');
  if (!createdEl || !updatedEl) return;

  if (state.draft.createdAt) {
    createdEl.textContent = new Date(state.draft.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  } else {
    createdEl.textContent = 'Not Saved';
  }
  if (state.draft.updatedAt) {
    updatedEl.textContent = new Date(state.draft.updatedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'long' });
  } else {
    updatedEl.textContent = 'Not Saved';
  }
}


/* ============================================================
   UI RENDERING: MAIN PAGE
   ============================================================ */

/** Resolves draft part string IDs into full component objects from catalog */
function resolveParts() {
  const resolved = {};
  for (const [key, id] of Object.entries(state.draft.parts)) {
    if (id) {
      resolved[key] = state.allComponents.find(c => c.id === id && c.category === key) || null;
    } else {
      resolved[key] = null;
    }
  }
  return resolved;
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

function renderSlots() {
  const container = $('#slots-container');
  if (!container) return;

  const resolved = resolveParts();

  container.innerHTML = state.categories.map(cat => {
    const item = resolved[cat.key];
    if (!item) {
      return `
        <div class="part-slot part-slot--empty" data-category="${cat.key}">
          <div class="part-slot__icon-container" aria-hidden="true">
            ${componentPlaceholderSVG(cat.key)}
          </div>
          <div class="part-slot__body">
            <span class="part-slot__category">${cat.label}</span>
            <span class="part-slot__name">No ${cat.label} selected</span>
          </div>
          <div class="part-slot__actions">
            <button class="btn btn--secondary btn--sm" data-action="choose" data-category="${cat.key}">
              Choose ${cat.label}
            </button>
          </div>
        </div>
      `;
    }

    const specLine = (item.specs && item.specs.length) ? item.specs.slice(0, 2).join(' • ') : '';

    return `
      <div class="part-slot" data-category="${cat.key}" data-id="${item.id}">
        <div class="part-slot__icon-container" aria-hidden="true">
          ${componentPlaceholderSVG(cat.key)}
        </div>
        <div class="part-slot__body">
          <span class="part-slot__category">${cat.label}</span>
          <span class="part-slot__name">${item.brand} ${item.model}</span>
          <span class="part-slot__specs">${specLine}</span>
        </div>
        <div class = "part-slot__grid">
          <div class="part-slot__meta">
            <span class="part-slot__price">${formatCurrency(item.price)}</span>
            <span class="badge badge--neutral text-mono">${getSecondaryMetric(item)}</span>
          </div>
          <div class="part-slot__actions">
            <button class="btn btn--secondary btn--sm" data-action="change" data-category="${cat.key}">
              Change
            </button>
            <button class="icon-btn" data-action="remove" data-category="${cat.key}" aria-label="Remove ${item.brand} ${item.model}" data-tooltip="Remove part">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  bindSlotEventListeners();
}

function bindSlotEventListeners() {
  $$('[data-action="choose"]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `components.html?category=${btn.dataset.category}`;
    });
  });

  $$('[data-action="change"]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `components.html?category=${btn.dataset.category}`;
    });
  });

  $$('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => {
      removePart(btn.dataset.category);
    });
  });
}

function renderSummary() {
  const resolved = resolveParts();

  // 1. Calculate price
  const totalPrice = Object.values(resolved).reduce((sum, item) => sum + (item ? item.price : 0), 0);
  const priceEl = $('#summary-price');
  if (priceEl) priceEl.textContent = formatCurrency(totalPrice);

  // 2. Power Report
  const powerReport = buildPowerReport(resolved);
  const wattageEl = $('#summary-wattage');
  if (wattageEl) wattageEl.textContent = formatWatts(powerReport.totalWatts);

  const recPsuEl = $('#summary-rec-psu');
  if (recPsuEl) recPsuEl.textContent = formatWatts(powerReport.recommendedPsu);

  const psu = resolved.psu;
  const loadEl = $('#summary-psu-load');
  const barFill = $('#power-bar-fill');

  if (loadEl && barFill) {
    if (psu) {
      const pct = powerReport.efficiencyPct;
      loadEl.textContent = `${pct}%`;

      barFill.style.width = `${Math.min(pct, 100)}%`;
      barFill.className = 'power-bar__fill';
      if (pct > 100) {
        barFill.classList.add('power-bar__fill--error');
      } else if (pct > 80) {
        barFill.classList.add('power-bar__fill--warn');
      }
    } else {
      loadEl.textContent = '—';
      barFill.style.width = '0%';
      barFill.className = 'power-bar__fill';
    }
  }

  // 3. Compatibility Report
  const compatReport = runCompatibilityReport(resolved, powerReport.totalWatts);

  // 4. Checklist rendering with pending checks condition
  const checklist = $('#compatibility-checklist');
  if (checklist) {
    checklist.innerHTML = compatReport.checks.map(chk => {
      const reqs = checkRequirements[chk.label] || [];
      const isPending = reqs.some(req => !resolved[req]);

      let statusClass = 'compat-item--good';
      let icon = '✓';

      if (isPending) {
        statusClass = 'compat-item--pending';
        icon = '○';
      } else if (chk.status === 'warning') {
        statusClass = 'compat-item--warning';
        icon = '⚠';
      } else if (chk.status === 'error') {
        statusClass = 'compat-item--error';
        icon = '✕';
      }

      return `
        <div class="compat-item ${statusClass}">
          <div class="compat-item__label">
            <span>${chk.label}</span>
            <span>${icon}</span>
          </div>
          <div class="compat-item__message">${chk.message}</div>
        </div>
      `;
    }).join('');
  }

  // 5. Update overall badge: Good only if all active checks are good AND components are not null
  const badge = $('#compatibility-badge');
  if (badge) {
    const hasError = compatReport.checks.some(c => c.status === 'error');
    const hasWarning = compatReport.checks.some(c => c.status === 'warning');
    const hasPending = compatReport.checks.some(c => {
      const reqs = checkRequirements[c.label] || [];
      return reqs.some(r => !resolved[r]);
    });

    badge.className = 'badge';
    if (hasError) {
      badge.textContent = 'Error';
      badge.classList.add('badge--error');
    } else if (hasWarning) {
      badge.textContent = 'Warning';
      badge.classList.add('badge--warn');
    } else if (hasPending) {
      badge.textContent = 'Incomplete';
      badge.classList.add('badge--neutral');
    } else {
      badge.textContent = 'Good';
      badge.classList.add('badge--good');
    }
  }
}

/* ============================================================
   SELECTION MUTATIONS
   ============================================================ */

function removePart(category) {
  state.draft.parts[category] = null;
  state.draft.updatedAt = new Date().toISOString();
  saveDraft(state.draft);
  updateBuildMetaTimestamps();
  renderSlots();
  renderSummary();

  showToast(`Removed ${category.toUpperCase()} from build.`);
}

/* ============================================================
   PAGE ACTIONS
   ============================================================ */

function saveCurrentBuild() {
  const saved = saveBuild(state.draft);
  if (saved) {
    state.draft.id = saved.id;
    state.draft.createdAt = saved.createdAt;
    state.draft.updatedAt = saved.updatedAt;

    saveDraft(state.draft);
    updateBuildMetaTimestamps();

    showToast(`Build "${state.draft.name}" saved locally.`);
  } else {
    showToast('Error saving build.');
  }
}

function clearCurrentBuild() {
  if (confirm('Clear all selected parts? This resets the draft.')) {
    state.draft.id = null;
    state.draft.parts = {
      cpu: null,
      motherboard: null,
      gpu: null,
      ram: null,
      storage: null,
      psu: null,
      case: null
    };
    state.draft.name = 'Untitled Build';
    state.draft.notes = '';
    state.draft.createdAt = null;
    state.draft.updatedAt = null;

    clearDraft();

    const nameInput = $('#build-name');
    if (nameInput) nameInput.value = state.draft.name;
    const notesText = $('#build-notes');
    if (notesText) notesText.value = state.draft.notes;

    renderSlots();
    renderSummary();
    updateBuildMetaTimestamps();

    showToast('Build draft cleared.');
  }
}

function exportCurrentBuild() {
  const resolved = resolveParts();
  const data = {
    ...state.draft,
    resolvedParts: Object.fromEntries(
      Object.entries(resolved).map(([k, v]) => [k, v ? { brand: v.brand, model: v.model, price: v.price } : null])
    )
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const safeName = state.draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.download = `buildforge-${safeName || 'untitled'}.json`;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Build config exported.');
}

/* ============================================================
   ICON AND UI UTILITIES
   ============================================================ */

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

/* ============================================================
   BOOTSTRAP / INITIALIZATION
   ============================================================ */

async function initBuilder() {
  const container = $('#slots-container');
  if (!container) return; // not on the builder page

  // Render skeletons first
  container.innerHTML = Array.from({ length: 7 })
    .map(() => `<div class="part-slot card skeleton" style="height: 90px; border-radius: var(--radius-lg);"></div>`)
    .join('');

  await loadAllComponents();
  await loadDraftState();

  renderSlots();
  renderSummary();

  $('#btn-save-build')?.addEventListener('click', saveCurrentBuild);
  $('#btn-clear-build')?.addEventListener('click', clearCurrentBuild);
  $('#btn-export-build')?.addEventListener('click', exportCurrentBuild);

  // Auto-saving name
  $('#build-name')?.addEventListener('input', debounce((e) => {
    state.draft.name = e.target.value.trim() || 'Untitled Build';
    state.draft.updatedAt = new Date().toISOString();
    saveDraft(state.draft);
    updateBuildMetaTimestamps();
  }, 250));

  // Auto-saving notes
  $('#build-notes')?.addEventListener('input', debounce((e) => {
    state.draft.notes = e.target.value.trim();
    state.draft.updatedAt = new Date().toISOString();
    saveDraft(state.draft);
    updateBuildMetaTimestamps();
  }, 250));
  //Auto-saving time updated

}

document.addEventListener('DOMContentLoaded', initBuilder);
