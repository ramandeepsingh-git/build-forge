/**
 * login.js
 * Page controller for login.html. Manages credentials form submission,
 * API authentication with POST /auth/login and POST /auth/signup,
 * JWT storage, error handling, loading states, mode switching, and redirection.
 */

import { $ } from './utils.js';
import { saveAuthToken } from './storage.js';
import { apiRequest } from './api.js';

function initLogin() {
  const loginForm = $('#login-form');
  const signupForm = $('#signup-form');
  const errorEl = $('#auth-error');
  const successEl = $('#auth-success');

  const tabLogin = $('#tab-login');
  const tabSignup = $('#tab-signup');
  const headerLogin = $('#auth-header-login');
  const headerSignup = $('#auth-header-signup');

  const linkToSignup = $('#link-to-signup');
  const linkToLogin = $('#link-to-login');

  const btnLogin = $('#btn-login');
  const btnSignup = $('#btn-signup');

  const loginIdentifier = $('#login-identifier');
  const loginPassword = $('#login-password');

  const signupUsername = $('#signup-username');
  const signupEmail = $('#signup-email');
  const signupPassword = $('#signup-password');
  const signupConfirmPassword = $('#signup-confirm-password');

  if (!loginForm) return;

  function showError(message) {
    if (successEl) {
      successEl.textContent = '';
      successEl.style.display = 'none';
    }
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  function showSuccess(message) {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
    if (!successEl) return;
    successEl.textContent = message;
    successEl.style.display = 'block';
  }

  function clearAlerts() {
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
    if (successEl) {
      successEl.textContent = '';
      successEl.style.display = 'none';
    }
  }

  function setMode(mode) {
    clearAlerts();
    if (mode === 'signup') {
      tabLogin?.classList.remove('is-active');
      tabSignup?.classList.add('is-active');
      tabLogin?.setAttribute('aria-selected', 'false');
      tabSignup?.setAttribute('aria-selected', 'true');

      if (headerLogin) headerLogin.style.display = 'none';
      if (headerSignup) headerSignup.style.display = 'block';
      if (loginForm) loginForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'flex';

      signupUsername?.focus();
    } else {
      tabLogin?.classList.add('is-active');
      tabSignup?.classList.remove('is-active');
      tabLogin?.setAttribute('aria-selected', 'true');
      tabSignup?.setAttribute('aria-selected', 'false');

      if (headerLogin) headerLogin.style.display = 'block';
      if (headerSignup) headerSignup.style.display = 'none';
      if (loginForm) loginForm.style.display = 'flex';
      if (signupForm) signupForm.style.display = 'none';

      loginIdentifier?.focus();
    }
  }

  tabLogin?.addEventListener('click', () => setMode('login'));
  tabSignup?.addEventListener('click', () => setMode('signup'));
  linkToSignup?.addEventListener('click', () => setMode('signup'));
  linkToLogin?.addEventListener('click', () => setMode('login'));

  // Check URL query parameters (e.g. login.html?mode=signup)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'signup') {
    setMode('signup');
  }

  // Handle Login submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const identifier = loginIdentifier?.value.trim() || '';
    const password = loginPassword?.value || '';

    if (!identifier || !password) {
      showError('Please enter your username/email and password.');
      return;
    }

    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = 'Signing In...';
    }

    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: identifier,
          password: password
        })
      });

      if (response.ok) {
        const data = await response.json();
        const token = typeof data === 'string' ? data : (data.token || data.jwt || data.accessToken);

        if (token) {
          saveAuthToken(token);
          const redirectUrl = urlParams.get('redirect') || 'saved.html';
          window.location.href = redirectUrl;
        } else {
          showError('Authentication succeeded, but no authorization token was returned.');
        }
      } else {
        let errorMessage = 'Invalid username/email or password.';
        try {
          const errData = await response.json();
          if (errData && (errData.message || errData.error)) {
            errorMessage = errData.message || errData.error;
          }
        } catch {
          if (response.status === 401) {
            errorMessage = 'Invalid username/email or password.';
          } else if (response.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          }
        }
        showError(errorMessage);
      }
    } catch (err) {
      console.error('Login error:', err);
      showError('Unable to connect to the authentication server. Please check your connection.');
    } finally {
      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Sign In';
      }
    }
  });

  // Handle Signup submission
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    const username = signupUsername?.value.trim() || '';
    const email = signupEmail?.value.trim() || '';
    const password = signupPassword?.value || '';
    const confirmPassword = signupConfirmPassword?.value || '';

    if (!username) {
      showError('Username is required.');
      return;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      showError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      showError('Password is required.');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    if (btnSignup) {
      btnSignup.disabled = true;
      btnSignup.textContent = 'Creating Account...';
    }

    try {
      const response = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password
        })
      });

      if (response.ok) {
        // Auto-login or redirect to login mode with success notice
        showSuccess('Account created successfully! Signing you in...');
        
        // Attempt immediate login
        try {
          const loginRes = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            const token = typeof loginData === 'string' ? loginData : (loginData.token || loginData.jwt);
            if (token) {
              saveAuthToken(token);
              window.location.href = 'saved.html';
              return;
            }
          }
        } catch {
          // fallback to login form switch
        }

        setMode('login');
        if (loginIdentifier) loginIdentifier.value = username;
        showSuccess('Account created successfully! Please sign in with your credentials.');
      } else {
        let errorMessage = 'Failed to create account.';
        try {
          const errData = await response.json();
          if (errData && (errData.message || errData.error)) {
            errorMessage = errData.message || errData.error;
          }
        } catch {
          if (response.status === 400) {
            errorMessage = 'Invalid signup details. Username or email may already be registered.';
          }
        }
        showError(errorMessage);
      }
    } catch (err) {
      console.error('Signup error:', err);
      showError('Unable to connect to the authentication server. Please check your connection.');
    } finally {
      if (btnSignup) {
        btnSignup.disabled = false;
        btnSignup.textContent = 'Create Account';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', initLogin);
