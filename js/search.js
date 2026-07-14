/**
 * search.js
 * Reusable search utilities: instant substring filtering across a
 * flat list of components, plus a lightweight autocomplete dropdown
 * that can be wired to any text input. Pure functions + one small
 * UI binder — no page-specific knowledge lives here so both the
 * Component Explorer and (later) the Builder page can share it.
 */

import { matchesQuery, debounce, createElementFromHTML } from './utils.js';

/**
 * Filter a flat array of component objects against a free-text query.
 * Matches against brand + model (the two fields every category has).
 */
export function searchComponents(items, query) {
  if (!query) return items;
  return items.filter((item) => {
    const haystack = `${item.brand} ${item.model}`;
    return matchesQuery(haystack, query);
  });
}

/**
 * Build a simple autocomplete suggestion list: up to `limit` unique
 * "Brand Model" strings from items whose brand/model match the query.
 */
export function getAutocompleteSuggestions(items, query, limit = 6) {
  if (!query) return [];
  const matches = searchComponents(items, query);
  const seen = new Set();
  const suggestions = [];
  for (const item of matches) {
    const label = `${item.brand} ${item.model}`;
    if (!seen.has(label)) {
      seen.add(label);
      suggestions.push({ id: item.id, category: item.category, label });
    }
    if (suggestions.length >= limit) break;
  }
  return suggestions;
}

/**
 * Wire a text input to a live autocomplete dropdown.
 * `getItems` is a function returning the current full item list (so
 * the caller can swap in category-filtered data without rebinding).
 * `onSelect(item)` fires when a suggestion is clicked or chosen.
 * `onQueryChange(query)` fires on every debounced keystroke so the
 * caller can also drive its own results grid.
 */
export function bindSearchInput(inputEl, dropdownEl, { getItems, onSelect, onQueryChange }) {
  if (!inputEl || !dropdownEl) return;

  const renderDropdown = (query) => {
    const items = getItems();
    const suggestions = getAutocompleteSuggestions(items, query);

    if (!suggestions.length) {
      dropdownEl.innerHTML = '';
      dropdownEl.classList.remove('is-open');
      return;
    }

    dropdownEl.innerHTML = suggestions
      .map((s) => `<li class="autocomplete__item" data-id="${s.id}" data-category="${s.category}">${s.label}</li>`)
      .join('');
    dropdownEl.classList.add('is-open');

    dropdownEl.querySelectorAll('.autocomplete__item').forEach((li) => {
      li.addEventListener('click', () => {
        const items2 = getItems();
        const found = items2.find((it) => it.id === li.dataset.id && it.category === li.dataset.category);
        inputEl.value = li.textContent;
        dropdownEl.innerHTML = '';
        dropdownEl.classList.remove('is-open');
        if (found && onSelect) onSelect(found);
      });
    });
  };

  const debouncedChange = debounce((query) => {
    if (onQueryChange) onQueryChange(query);
    renderDropdown(query);
  }, 180);

  inputEl.addEventListener('input', () => debouncedChange(inputEl.value.trim()));

  inputEl.addEventListener('focus', () => {
    if (inputEl.value.trim()) renderDropdown(inputEl.value.trim());
  });

  // Close dropdown when clicking outside.
  document.addEventListener('click', (e) => {
    if (!dropdownEl.contains(e.target) && e.target !== inputEl) {
      dropdownEl.classList.remove('is-open');
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdownEl.classList.remove('is-open');
      inputEl.blur();
    }
  });
}
