/**
 * storage.js
 * Single source of truth for everything persisted to localStorage:
 * saved builds and favorited components. Every other module reads
 * and writes builds/favorites through these functions only — no
 * other file should call localStorage directly. That keeps the
 * storage schema changeable in one place if it ever needs to evolve.
 */

import { generateId } from './utils.js';

const KEYS = {
  BUILDS: 'buildforge_builds',
  FAVORITES: 'buildforge_favorites',
  CURRENT_DRAFT: 'buildforge_current_draft',
};

/** Safely parse JSON from localStorage, falling back to a default on any error. */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`storage: failed to read ${key}`, err);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`storage: failed to write ${key}`, err);
    return false;
  }
}

/* ============================================================
   SAVED BUILDS
   A build shape:
   {
     id, name, createdAt, updatedAt,
     parts: { cpu, gpu, motherboard, ram, storage, psu, case,
               cooler, fans, monitor, keyboard, mouse },
     notes
   }
   Each `parts.*` value is either null or a component object id
   reference, resolved against the JSON data files at render time.
   ============================================================ */

export function getAllBuilds() {
  return readJSON(KEYS.BUILDS, []);
}

export function getBuildById(buildId) {
  return getAllBuilds().find((b) => b.id === buildId) || null;
}

export function saveBuild(build) {
  const builds = getAllBuilds();
  const now = new Date().toISOString();

  if (build.id) {
    const idx = builds.findIndex((b) => b.id === build.id);
    if (idx !== -1) {
      builds[idx] = { ...builds[idx], ...build, updatedAt: now };
      writeJSON(KEYS.BUILDS, builds);
      return builds[idx];
    }
  }

  const newBuild = {
    id: generateId('build'),
    name: build.name || 'Untitled Build',
    createdAt: now,
    updatedAt: now,
    parts: build.parts || {},
    notes: build.notes || '',
  };
  builds.push(newBuild);
  writeJSON(KEYS.BUILDS, builds);
  return newBuild;
}

export function renameBuild(buildId, newName) {
  const builds = getAllBuilds();
  const build = builds.find((b) => b.id === buildId);
  if (!build) return false;
  build.name = newName;
  build.updatedAt = new Date().toISOString();
  return writeJSON(KEYS.BUILDS, builds);
}

export function deleteBuild(buildId) {
  const builds = getAllBuilds().filter((b) => b.id !== buildId);
  return writeJSON(KEYS.BUILDS, builds);
}

export function duplicateBuild(buildId) {
  const original = getBuildById(buildId);
  if (!original) return null;
  const now = new Date().toISOString();
  const copy = {
    ...original,
    id: generateId('build'),
    name: `${original.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };
  const builds = getAllBuilds();
  builds.push(copy);
  writeJSON(KEYS.BUILDS, builds);
  return copy;
}

/** Serialize a build to a downloadable JSON string. */
export function exportBuildAsJSON(buildId) {
  const build = getBuildById(buildId);
  if (!build) return null;
  return JSON.stringify(build, null, 2);
}

/**
 * Import a build from a JSON string (as produced by exportBuildAsJSON).
 * Always assigns a fresh id so imported builds never collide with
 * an existing one, even if the file was exported from this same browser.
 */
export function importBuildFromJSON(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error('That file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.parts) {
    throw new Error('That file does not look like a Build Forge build.');
  }
  const now = new Date().toISOString();
  const imported = {
    id: generateId('build'),
    name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Build',
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    parts: parsed.parts,
    notes: parsed.notes || '',
  };
  const builds = getAllBuilds();
  builds.push(imported);
  writeJSON(KEYS.BUILDS, builds);
  return imported;
}

/* ============================================================
   FAVORITES
   Stored as an array of { category, id } pairs so the same
   numeric/string id across different categories can't collide.
   ============================================================ */

export function getFavorites() {
  return readJSON(KEYS.FAVORITES, []);
}

export function isFavorite(category, componentId) {
  return getFavorites().some((f) => f.category === category && f.id === componentId);
}

export function toggleFavorite(category, componentId) {
  const favorites = getFavorites();
  const idx = favorites.findIndex((f) => f.category === category && f.id === componentId);
  if (idx !== -1) {
    favorites.splice(idx, 1);
  } else {
    favorites.push({ category, id: componentId });
  }
  writeJSON(KEYS.FAVORITES, favorites);
  return idx === -1; // returns true if it is now favorited
}

/* ============================================================
   IN-PROGRESS DRAFT (the builder page autosaves here so a user
   doesn't lose their in-progress selection on accidental refresh)
   ============================================================ */

export function getDraft() {
  return readJSON(KEYS.CURRENT_DRAFT, { parts: {} });
}

export function saveDraft(draft) {
  writeJSON(KEYS.CURRENT_DRAFT, draft);
}

export function clearDraft() {
  localStorage.removeItem(KEYS.CURRENT_DRAFT);
}
