/**
 * profile.js
 * Page controller for profile.html. Renders authenticated user details,
 * saved build metrics, component favorite metrics, quick action links,
 * logout mechanism, and guest state.
 */

import { $ } from './utils.js';
import { apiRequest } from './api.js';
import { getAuthToken, clearAuthToken } from './storage.js';

async function initProfile() {
  const root = $('#profile-root');
  if (!root) return;

  const token = getAuthToken();
  if (!token) {
    renderGuestState(root);
    return;
  }

  try {
    const userRes = await apiRequest('/users/me');
    if (!userRes.ok) {
      clearAuthToken();
      renderGuestState(root);
      return;
    }

    const user = await userRes.json();

    // Fetch user metrics concurrently
    let buildsCount = 0;
    let favoritesCount = 0;

    try {
      const buildsRes = await apiRequest('/builds?size=100');
      if (buildsRes.ok) {
        const buildsData = await buildsRes.json();
        buildsCount = buildsData.totalElements ?? (Array.isArray(buildsData) ? buildsData.length : (buildsData.builds ? buildsData.builds.length : 0));
      }
    } catch (err) {
      console.warn('Could not fetch builds count', err);
    }

    try {
      const favsRes = await apiRequest('/users/me/favorites/components');
      if (favsRes.ok) {
        const favsData = await favsRes.json();
        favoritesCount = Array.isArray(favsData) ? favsData.length : 0;
      }
    } catch (err) {
      console.warn('Could not fetch favorites count', err);
    }

    renderAuthenticatedState(root, user, buildsCount, favoritesCount);
  } catch (err) {
    console.error('Failed to load profile:', err);
    renderGuestState(root);
  }
}

function renderAuthenticatedState(root, user, buildsCount, favoritesCount) {
  const initial = (user.username || 'U').charAt(0).toUpperCase();

  root.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <div class="profile-avatar">${initial}</div>
        <div class="profile-info">
          <div class="eyebrow" style="margin-bottom: var(--sp-1);">Account Profile</div>
          <h1 class="profile-name">${user.username}</h1>
          <div class="profile-email">${user.email || 'No email registered'}</div>
        </div>
      </div>

      <div class="profile-stats-grid">
        <div class="profile-stat-card">
          <div class="profile-stat-val">${buildsCount}</div>
          <div class="profile-stat-label">Saved PC Builds</div>
        </div>
        <div class="profile-stat-card">
          <div class="profile-stat-val">${favoritesCount}</div>
          <div class="profile-stat-label">Favorite Components</div>
        </div>
      </div>

      <div class="profile-actions">
        <a href="saved.html" class="btn btn--primary btn--sm">
          View Saved Builds
        </a>
        <a href="components.html" class="btn btn--secondary btn--sm">
          Browse Components
        </a>
        <a href="builder.html" class="btn btn--secondary btn--sm">
          Build Planner
        </a>
        <button id="btn-logout" class="btn btn--sm" style="margin-left: auto; color: var(--status-error); border-color: var(--border-color);">
          Log Out
        </button>
      </div>
    </div>
  `;

  $('#btn-logout')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to log out?')) {
      clearAuthToken();
      window.location.href = 'login.html';
    }
  });
}

function renderGuestState(root) {
  root.innerHTML = `
    <div class="profile-guest-card">
      <div class="profile-guest-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <h1 class="profile-guest-title">Account Access</h1>
      <p class="profile-guest-desc">
        Sign in or create a Build Forge account to access your personal profile, manage saved PC builds, and persist your favorite components across devices.
      </p>
      <div class="profile-guest-actions">
        <a href="login.html" class="btn btn--primary">Sign In</a>
        <a href="login.html?mode=signup" class="btn btn--secondary">Create Account</a>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', initProfile);
