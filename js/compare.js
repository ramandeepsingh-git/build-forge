/**
 * compare.js
 * Page controller for compare.html. Manages comparisons for both
 * selected components and complete saved builds.
 */

import { $, $$, loadJSON, formatCurrency, formatWatts, capitalize } from './utils.js';
import { getAllBuilds, getDraft, saveDraft } from './storage.js';
import { runCompatibilityReport } from './compatibility.js';
import { buildPowerReport } from './calculator.js';

const COMPARE_STORAGE_KEY = 'buildforge_compare_selection';

/** State scoped to the compare page */
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
  componentsMap: {},           // Dictionary mapping item ID -> item object
  activeTab: 'components',     // 'components' | 'builds'
  
  buildAId: '',
  buildBId: ''
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

function getCompareSelection() {
  try {
    return JSON.parse(sessionStorage.getItem(COMPARE_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCompareSelection(selection) {
  sessionStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(selection));
}

function addToCompare(category, id) {
  const selection = getCompareSelection();
  const exists = selection.some((s) => s.category === category && s.id === id);
  if (exists) {
    showToast('Already added to component comparison.');
    return;
  }
  if (selection.length >= 2) {
    showToast('You can compare up to 2 items at a time. Visit Compare Components to clear selection.');
    return;
  }
  selection.push({ category, id });
  saveCompareSelection(selection);
  showToast('Added to component comparison.');
}

/* ============================================================
   VIEW 1: COMPONENT COMPARISON
   ============================================================ */

function renderComponentCompareTable() {
  const selection = getCompareSelection();
  const container = $('#component-table-container');
  const clearBar = $('#comp-clear-bar');
  
  if (!container) return;
  
  if (selection.length === 0) {
    if (clearBar) clearBar.style.display = 'none';
    container.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <h3 class="empty-state-card__title">No Components Selected</h3>
        <p class="empty-state-card__text">Go to the Component Explorer and click "Compare" on up to two parts to see their specifications side-by-side.</p>
        <a href="components.html" class="btn btn--primary">Browse Components</a>
      </div>
    `;
    return;
  }
  
  if (clearBar) clearBar.style.display = 'flex';
  
  const item1 = selection[0] ? state.componentsMap[selection[0].id] : null;
  const item2 = selection[1] ? state.componentsMap[selection[1].id] : null;
  
  let rowsHTML = '';
  
  // Render Pricing & Base attributes
  rowsHTML += renderSpecRow('Price', item1 ? formatCurrency(item1.price) : '—', item2 ? formatCurrency(item2.price) : '—', true, false);
  rowsHTML += renderSpecRow('Popularity Score', item1?.popularity ? `${item1.popularity} / 100` : '—', item2?.popularity ? `${item2.popularity} / 100` : '—', true, true);
  rowsHTML += renderSpecRow('Release Year', item1?.releaseYear, item2?.releaseYear, true, true);
  
  const sameCategory = item1 && item2 && item1.category === item2.category;
  const activeCat = item1 ? item1.category : (item2 ? item2.category : null);
  
  if (sameCategory) {
    if (activeCat === 'cpu') {
      rowsHTML += renderSpecRow('Socket Type', item1.socket, item2.socket);
      rowsHTML += renderSpecRow('Cores / Threads', `${item1.cores} Cores / ${item1.threads} Threads`, `${item2.cores} Cores / ${item2.threads} Threads`);
      rowsHTML += renderSpecRow('Base Clock Speed', `${item1.baseClockGHz} GHz`, `${item2.baseClockGHz} GHz`, true, true);
      rowsHTML += renderSpecRow('Boost Clock Speed', `${item1.boostClockGHz} GHz`, `${item2.boostClockGHz} GHz`, true, true);
      rowsHTML += renderSpecRow('TDP Rating', `${item1.tdpWatts} W`, `${item2.tdpWatts} W`, true, false);
      rowsHTML += renderSpecRow('Load Power Consumption', `${item1.powerWatts} W`, `${item2.powerWatts} W`, true, false);
      rowsHTML += renderSpecRow('Integrated Graphics', item1.integratedGraphics ? 'Yes' : 'No', item2.integratedGraphics ? 'Yes' : 'No');
      rowsHTML += renderSpecRow('Supported RAM Types', item1.memorySupport?.join(', '), item2.memorySupport?.join(', '));
      rowsHTML += renderSpecRow('PCIe Version', item1.pcieVersion, item2.pcieVersion);
    } else if (activeCat === 'gpu') {
      rowsHTML += renderSpecRow('GPU Chipset', item1.chipset, item2.chipset);
      rowsHTML += renderSpecRow('VRAM Size', `${item1.vramGB} GB`, `${item2.vramGB} GB`, true, true);
      rowsHTML += renderSpecRow('Interface version', item1.interface, item2.interface);
      rowsHTML += renderSpecRow('Physical Card Length', `${item1.lengthMM} mm`, `${item2.lengthMM} mm`, true, false);
      rowsHTML += renderSpecRow('Power Draw', `${item1.powerWatts} W`, `${item2.powerWatts} W`, true, false);
      rowsHTML += renderSpecRow('Recommended PSU', `${item1.recommendedPsuWatts} W`, `${item2.recommendedPsuWatts} W`, true, false);
    } else if (activeCat === 'motherboard') {
      rowsHTML += renderSpecRow('Socket Compatibility', item1.socket, item2.socket);
      rowsHTML += renderSpecRow('Chipset', item1.chipset, item2.chipset);
      rowsHTML += renderSpecRow('Board Form Factor', item1.formFactor, item2.formFactor);
      rowsHTML += renderSpecRow('Memory Standard', item1.memoryType, item2.memoryType);
      rowsHTML += renderSpecRow('RAM Slots', item1.ramSlots, item2.ramSlots, true, true);
      rowsHTML += renderSpecRow('Max Memory Capacity', `${item1.maxMemoryGB} GB`, `${item2.maxMemoryGB} GB`, true, true);
      rowsHTML += renderSpecRow('Max Rated RAM Speed', `${item1.maxMemorySpeedMHz} MHz`, `${item2.maxMemorySpeedMHz} MHz`, true, true);
      rowsHTML += renderSpecRow('M.2 / SATA Slots', `${item1.m2Slots} M.2 / ${item1.sataSlots} SATA`, `${item2.m2Slots} M.2 / ${item2.sataSlots} SATA`);
      rowsHTML += renderSpecRow('PCIe Expansion Version', item1.pcieVersion, item2.pcieVersion);
    } else if (activeCat === 'ram') {
      rowsHTML += renderSpecRow('Memory Standard', item1.memoryType, item2.memoryType);
      rowsHTML += renderSpecRow('Total Kit Capacity', `${item1.capacityGB} GB`, `${item2.capacityGB} GB`, true, true);
      rowsHTML += renderSpecRow('Rated Clock Speed', `${item1.speedMHz} MHz`, `${item2.speedMHz} MHz`, true, true);
      rowsHTML += renderSpecRow('Modules Count', `${item1.modules} stick(s)`, `${item2.modules} stick(s)`);
      rowsHTML += renderSpecRow('CAS Latency', `CL${item1.casLatency}`, `CL${item2.casLatency}`, true, false);
      rowsHTML += renderSpecRow('Operating Voltage', `${item1.voltage} V`, `${item2.voltage} V`, true, false);
    } else if (activeCat === 'storage') {
      rowsHTML += renderSpecRow('Interface Standard', item1.interface, item2.interface);
      rowsHTML += renderSpecRow('Capacity', item1.capacityGB >= 1000 ? `${item1.capacityGB / 1000} TB` : `${item1.capacityGB} GB`, item2.capacityGB >= 1000 ? `${item2.capacityGB / 1000} TB` : `${item2.capacityGB} GB`);
      rowsHTML += renderSpecRow('Drive Type', item1.type, item2.type);
      rowsHTML += renderSpecRow('Read / Write Speeds', `R: ${item1.readSpeedMBs}MB/s / W: ${item1.writeSpeedMBs}MB/s`, `R: ${item2.readSpeedMBs}MB/s / W: ${item2.writeSpeedMBs}MB/s`);
      rowsHTML += renderSpecRow('Sustained Power Draw', `${item1.powerWatts} W`, `${item2.powerWatts} W`, true, false);
    } else if (activeCat === 'psu') {
      rowsHTML += renderSpecRow('Form Factor', item1.formFactor, item2.psu);
      rowsHTML += renderSpecRow('Wattage Output', `${item1.wattage} W`, `${item2.wattage} W`, true, true);
      rowsHTML += renderSpecRow('Efficiency Certification', item1.efficiency, item2.efficiency);
      rowsHTML += renderSpecRow('Cable Modularity', item1.modular ? 'Fully Modular' : 'Non-Modular', item2.modular ? 'Fully Modular' : 'Non-Modular');
    } else if (activeCat === 'case') {
      rowsHTML += renderSpecRow('Motherboards Support', item1.formFactorSupport?.join(', '), item2.formFactorSupport?.join(', '));
      rowsHTML += renderSpecRow('Max GPU Length', `${item1.maxGpuLengthMM} mm`, `${item2.maxGpuLengthMM} mm`, true, true);
      rowsHTML += renderSpecRow('Max CPU Cooler height', `${item1.maxCoolerHeightMM} mm`, `${item2.maxCoolerHeightMM} mm`, true, true);
      rowsHTML += renderSpecRow('PSU size supported', item1.psuFormFactor, item2.psuFormFactor);
      rowsHTML += renderSpecRow('Included Fan Count', `${item1.includedFans} fan(s)`, `${item2.includedFans} fan(s)`, true, true);
    }
  } else if (item1 && item2) {
    rowsHTML += `
      <tr>
        <td class="compare-table__label">Category Comparison</td>
        <td colspan="2" class="text-secondary" style="font-size: var(--fs-xs); text-align: center; padding-block: var(--sp-4);">
          Categories differ (${capitalize(item1.category)} vs ${capitalize(item2.category)}). Spec comparisons are only enabled for components of the same type.
        </td>
      </tr>
    `;
  }
  
  container.innerHTML = `
    <table class="compare-table">
      ${renderComponentHeaders(item1, item2)}
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
  `;
  
  bindComponentActions();
}

function renderComponentHeaders(item1, item2) {
  const cell1HTML = item1 ? renderComponentItemCard(item1) : renderComponentPlaceholderCell();
  const cell2HTML = item2 ? renderComponentItemCard(item2) : renderComponentPlaceholderCell();
  
  return `
    <thead>
      <tr>
        <th class="compare-table__label">Overview</th>
        <th class="compare-table__value">${cell1HTML}</th>
        <th class="compare-table__value">${cell2HTML}</th>
      </tr>
    </thead>
  `;
}

function renderComponentItemCard(item) {
  return `
    <div class="compare-table__item-card" data-id="${item.id}" data-category="${item.category}">
      <div class="compare-table__item-image" aria-hidden="true">
        ${componentPlaceholderSVG(item.category)}
      </div>
      <div>
        <span class="badge badge--neutral" style="margin-bottom: var(--sp-1);">${capitalize(item.category)}</span>
        <h3 class="compare-table__header">${item.brand} ${item.model}</h3>
      </div>
      <div style="margin-top: auto; display: flex; gap: var(--sp-2);">
        <button class="btn btn--primary btn--sm" data-action="add-to-build" data-id="${item.id}" data-category="${item.category}">Add to Build</button>
        <button class="btn btn--ghost btn--sm" data-action="remove-compare" data-id="${item.id}" data-category="${item.category}" style="color: var(--status-error);">Remove</button>
      </div>
    </div>
  `;
}

function renderComponentPlaceholderCell() {
  return `
    <div class="compare-table__item-card" style="justify-content: center; align-items: center; min-height: 160px; border: 1px dashed var(--border-default); border-radius: var(--radius-md); padding: var(--sp-4);">
      <p class="text-secondary" style="font-size: var(--fs-xs); text-align: center; margin-bottom: var(--sp-3);">Empty Slot</p>
      <a href="components.html" class="btn btn--secondary btn--sm">Add Component</a>
    </div>
  `;
}

function bindComponentActions() {
  $$('[data-action="remove-compare"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id } = btn.dataset;
      let selection = getCompareSelection();
      selection = selection.filter(s => s.id !== id);
      saveCompareSelection(selection);
      showToast('Removed item from comparison.');
      renderComponentCompareTable();
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

/* ============================================================
   VIEW 2: BUILD COMPARISON
   ============================================================ */

function populateBuildSelectors() {
  const selectA = $('#select-build-a');
  const selectB = $('#select-build-b');
  
  if (!selectA || !selectB) return;
  
  const builds = getAllBuilds();
  
  const optionsHTML = builds.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  
  selectA.innerHTML = `<option value="">Select Build A...</option>${optionsHTML}`;
  selectB.innerHTML = `<option value="">Select Build B...</option>${optionsHTML}`;
  
  selectA.value = state.buildAId;
  selectB.value = state.buildBId;
}

function renderBuildCompareTable() {
  const container = $('#build-table-container');
  if (!container) return;
  
  const builds = getAllBuilds();
  
  if (builds.length < 2) {
    container.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <h3 class="empty-state-card__title">Not Enough Saved Builds</h3>
        <p class="empty-state-card__text">You need at least two saved configurations to compare builds. Create them in the planner page.</p>
        <a href="builder.html" class="btn btn--primary">Start Planning</a>
      </div>
    `;
    return;
  }
  
  const buildA = builds.find(b => b.id === state.buildAId) || null;
  const buildB = builds.find(b => b.id === state.buildBId) || null;
  
  if (!buildA || !buildB) {
    container.innerHTML = `
      <div style="text-align: center; padding: var(--sp-6) var(--sp-5); border: 1px dashed var(--border-default); border-radius: var(--radius-lg); color: var(--text-secondary); font-size: var(--fs-sm);">
        Select two builds from the dropdown selectors above to run side-by-side calculations.
      </div>
    `;
    return;
  }
  
  // Resolve components for Build A
  const partsA = {};
  let priceA = 0;
  let countA = 0;
  for (const [key, id] of Object.entries(buildA.parts)) {
    if (id) {
      const part = state.componentsMap[id];
      if (part) {
        partsA[key] = part;
        priceA += part.price;
        countA++;
      }
    }
  }
  const powerA = buildPowerReport(partsA);
  const compatA = runCompatibilityReport(partsA, powerA.totalWatts);
  
  // Resolve components for Build B
  const partsB = {};
  let priceB = 0;
  let countB = 0;
  for (const [key, id] of Object.entries(buildB.parts)) {
    if (id) {
      const part = state.componentsMap[id];
      if (part) {
        partsB[key] = part;
        priceB += part.price;
        countB++;
      }
    }
  }
  const powerB = buildPowerReport(partsB);
  const compatB = runCompatibilityReport(partsB, powerB.totalWatts);
  
  let statusBadgeA = `<span class="badge badge--good">Good</span>`;
  if (compatA.overallStatus === 'warning') statusBadgeA = `<span class="badge badge--warn">Warning</span>`;
  if (compatA.overallStatus === 'error') statusBadgeA = `<span class="badge badge--error">Error</span>`;
  
  let statusBadgeB = `<span class="badge badge--good">Good</span>`;
  if (compatB.overallStatus === 'warning') statusBadgeB = `<span class="badge badge--warn">Warning</span>`;
  if (compatB.overallStatus === 'error') statusBadgeB = `<span class="badge badge--error">Error</span>`;
  
  const renderPartCell = (part, category) => {
    if (!part) return `<span class="text-tertiary" style="font-size: var(--fs-2xs);">Empty Slot</span>`;
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--sp-2); width: 100%;">
        <div>
          <div style="font-weight: 600; color: var(--text-primary);">${part.brand} ${part.model}</div>
          <div class="text-secondary" style="font-size: var(--fs-2xs); margin-top: 2px;">${formatCurrency(part.price)}</div>
        </div>
        <button class="btn btn--secondary btn--sm" data-action="compare-part" data-id="${part.id}" data-category="${category}" style="padding-inline: var(--sp-2); height: 26px; font-size: var(--fs-2xs); flex-shrink: 0;">
          Compare
        </button>
      </div>
    `;
  };
  
  container.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th class="compare-table__label">Overview</th>
          <th class="compare-table__value">
            <h3 class="compare-table__header">${buildA.name}</h3>
            <button class="btn btn--secondary btn--sm" data-action="load-build" data-id="${buildA.id}" style="margin-top: var(--sp-3);">Edit Build</button>
          </th>
          <th class="compare-table__value">
            <h3 class="compare-table__header">${buildB.name}</h3>
            <button class="btn btn--secondary btn--sm" data-action="load-build" data-id="${buildB.id}" style="margin-top: var(--sp-3);">Edit Build</button>
          </th>
        </tr>
      </thead>
      <tbody>
        ${renderSpecRow('Total price', formatCurrency(priceA), formatCurrency(priceB), true, false)}
        ${renderSpecRow('Est. Power Draw', formatWatts(powerA.totalWatts), formatWatts(powerB.totalWatts), true, false)}
        ${renderSpecRow('Recommended PSU', formatWatts(powerA.recommendedPsu), formatWatts(powerB.recommendedPsu), true, false)}
        ${renderSpecRow('Parts count', `${countA} / 7`, `${countB} / 7`, true, true)}
        <tr>
          <td class="compare-table__label">Compatibility Status</td>
          <td class="compare-table__value">${statusBadgeA}</td>
          <td class="compare-table__value">${statusBadgeB}</td>
        </tr>
        
        <tr>
          <td colspan="3" style="font-weight: 700; text-transform: uppercase; font-size: var(--fs-2xs); letter-spacing: 0.05em; color: var(--text-tertiary); background: var(--bg-inset); padding-block: var(--sp-3);">Component Configuration Details</td>
        </tr>
        
        <tr>
          <td class="compare-table__label">CPU</td>
          <td class="compare-table__value">${renderPartCell(partsA.cpu, 'cpu')}</td>
          <td class="compare-table__value">${renderPartCell(partsB.cpu, 'cpu')}</td>
        </tr>
        <tr>
          <td class="compare-table__label">Motherboard</td>
          <td class="compare-table__value">${renderPartCell(partsA.motherboard, 'motherboard')}</td>
          <td class="compare-table__value">${renderPartCell(partsB.motherboard, 'motherboard')}</td>
        </tr>
        <tr>
          <td class="compare-table__label">GPU</td>
          <td class="compare-table__value">${renderPartCell(partsA.gpu, 'gpu')}</td>
          <td class="compare-table__value">${renderPartCell(partsB.gpu, 'gpu')}</td>
        </tr>
        <tr>
          <td class="compare-table__label">RAM</td>
          <td class="compare-table__value">${renderPartCell(partsA.ram, 'ram')}</td>
          <td class="compare-table__value">${renderPartCell(partsB.ram, 'ram')}</td>
        </tr>
        <tr>
          <td class="compare-table__label">Storage</td>
          <td class="compare-table__value">${renderPartCell(partsA.storage, 'storage')}</td>
          <td class="compare-table__value">${renderPartCell(partsB.storage, 'storage')}</td>
        </tr>
        <tr>
          <td class="compare-table__label">PSU</td>
          <td class="compare-table__value">${renderPartCell(partsA.psu, 'psu')}</td>
          <td class="compare-table__value">${renderPartCell(partsB.psu, 'psu')}</td>
        </tr>
        <tr>
          <td class="compare-table__label">Case</td>
          <td class="compare-table__value">${renderPartCell(partsA.case, 'case')}</td>
          <td class="compare-table__value">${renderPartCell(partsB.case, 'case')}</td>
        </tr>
      </tbody>
    </table>
  `;
  
  bindBuildActions();
}

function bindBuildActions() {
  $$('[data-action="load-build"]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `builder.html?editBuildId=${btn.dataset.id}`;
    });
  });
  
  $$('[data-action="compare-part"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { category, id } = btn.dataset;
      addToCompare(category, id);
    });
  });
}

/* ============================================================
   TABS & INTERACTION BINDINGS
   ============================================================ */

function bindTabs() {
  $$('.compare-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.compare-tab').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      state.activeTab = tab.dataset.tab;
      
      if (state.activeTab === 'components') {
        $('#component-compare-view').style.display = 'block';
        $('#build-compare-view').style.display = 'none';
        renderComponentCompareTable();
      } else {
        $('#component-compare-view').style.display = 'none';
        $('#build-compare-view').style.display = 'block';
        populateBuildSelectors();
        renderBuildCompareTable();
      }
    });
  });
}

function bindSelectors() {
  const selectA = $('#select-build-a');
  const selectB = $('#select-build-b');
  
  selectA?.addEventListener('change', (e) => {
    state.buildAId = e.target.value;
    renderBuildCompareTable();
  });
  
  selectB?.addEventListener('change', (e) => {
    state.buildBId = e.target.value;
    renderBuildCompareTable();
  });
  
  $('#btn-clear-compare')?.addEventListener('click', () => {
    saveCompareSelection([]);
    showToast('Comparison selection cleared.');
    renderComponentCompareTable();
  });
}

/* ============================================================
   HELPERS & ICON UTILITIES
   ============================================================ */

function renderSpecRow(label, val1, val2, highlightBetter = false, higherIsBetter = true) {
  const val1Display = val1 ?? '—';
  const val2Display = val2 ?? '—';
  
  let cell1Class = '';
  let cell2Class = '';
  
  if (highlightBetter && val1 !== undefined && val2 !== undefined && val1 !== null && val2 !== null) {
    const raw1 = typeof val1 === 'string' ? val1.replace(/[^\d.]/g, '') : val1;
    const raw2 = typeof val2 === 'string' ? val2.replace(/[^\d.]/g, '') : val2;
    const num1 = parseFloat(raw1);
    const num2 = parseFloat(raw2);
    
    if (!Number.isNaN(num1) && !Number.isNaN(num2) && num1 !== num2) {
      const is1Better = higherIsBetter ? num1 > num2 : num1 < num2;
      if (is1Better) {
        cell1Class = 'compare-table__diff-value--better';
      } else {
        cell2Class = 'compare-table__diff-value--better';
      }
    }
  }
  
  return `
    <tr>
      <td class="compare-table__label">${label}</td>
      <td class="compare-table__value ${cell1Class}"><span class="compare-table__diff-value">${val1Display}</span></td>
      <td class="compare-table__value ${cell2Class}"><span class="compare-table__diff-value">${val2Display}</span></td>
    </tr>
  `;
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

/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initCompare() {
  const container = $('#component-table-container');
  if (!container) return; // not on compare page
  
  // Render skeletons first
  container.innerHTML = `<div class="card skeleton" style="height: 300px; border-radius: var(--radius-lg);"></div>`;
  
  await loadComponents();
  
  renderComponentCompareTable();
  bindTabs();
  bindSelectors();
}

document.addEventListener('DOMContentLoaded', initCompare);
