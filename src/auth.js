/**
 * =============================================================================
 * auth.js — Google Identity Services (GIS) OAuth 2.0 Flow
 * =============================================================================
 * Uses the modern Google Identity Services library (accounts.google.com/gsi/client)
 * which replaces the deprecated gapi.auth2.
 *
 * Token is stored in sessionStorage only (cleared when tab closes) — never
 * in localStorage — to reduce XSS exposure surface.
 * =============================================================================
 */

import { GOOGLE_CLIENT_ID, CALENDAR_SCOPES } from './config.js';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
const TOKEN_KEY = 'dwq_gis_token';
const TOKEN_EXPIRY_KEY = 'dwq_gis_token_expiry';

/** @type {google.accounts.oauth2.TokenClient | null} */
let _tokenClient = null;

/** Callbacks waiting for a token resolution */
let _pendingResolve = null;
let _pendingReject = null;

// ---------------------------------------------------------------------------
// GIS Library Loader
// ---------------------------------------------------------------------------

/**
 * Dynamically loads the Google Identity Services script if not already present.
 * @returns {Promise<void>}
 */
function loadGISScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('ไม่สามารถโหลด Google Identity Services ได้'));
    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initializes the GIS Token Client. Must be called once on app startup.
 * @returns {Promise<void>}
 */
export async function initGoogleAuth() {
  await loadGISScript();

  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: CALENDAR_SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse.error) {
        const error = new Error(`OAuth Error: ${tokenResponse.error} — ${tokenResponse.error_description || ''}`);
        if (_pendingReject) {
          _pendingReject(error);
          _pendingReject = null;
          _pendingResolve = null;
        }
        return;
      }

      // Store token with its expiry timestamp
      const expiresAt = Date.now() + (tokenResponse.expires_in - 60) * 1000; // 60s buffer
      sessionStorage.setItem(TOKEN_KEY, tokenResponse.access_token);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(expiresAt));

      if (_pendingResolve) {
        _pendingResolve(tokenResponse.access_token);
        _pendingResolve = null;
        _pendingReject = null;
      }
    },
    error_callback: (err) => {
      // Handles popup closed by user, etc.
      const error = new Error(
        err.type === 'popup_closed'
          ? 'ปิดหน้าต่างล็อกอิน กรุณาลองอีกครั้ง'
          : `เกิดข้อผิดพลาด: ${err.type}`
      );
      if (_pendingReject) {
        _pendingReject(error);
        _pendingReject = null;
        _pendingResolve = null;
      }
    },
  });
}

/**
 * Triggers the OAuth 2.0 sign-in popup and returns the access token.
 * If already signed in with a valid token, returns immediately.
 * @returns {Promise<string>} The access token
 */
export function signIn() {
  return new Promise((resolve, reject) => {
    // Return cached token if still valid
    const cachedToken = getAccessToken();
    if (cachedToken) {
      resolve(cachedToken);
      return;
    }

    if (!_tokenClient) {
      reject(new Error('Google Auth ยังไม่ถูก initialize กรุณาเรียก initGoogleAuth() ก่อน'));
      return;
    }

    _pendingResolve = resolve;
    _pendingReject = reject;

    // Request a new token — this opens the Google popup
    _tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Returns the current valid access token from sessionStorage, or null.
 * @returns {string | null}
 */
export function getAccessToken() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiry = parseInt(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);

  if (!token || Date.now() >= expiry) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

/**
 * Whether the user is currently signed in with a valid token.
 * @returns {boolean}
 */
export function isSignedIn() {
  return getAccessToken() !== null;
}

/**
 * Signs the user out by revoking the token and clearing storage.
 * @returns {Promise<void>}
 */
export async function signOut() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);

  if (token && window.google?.accounts?.oauth2) {
    // Revoke the token on Google's servers
    await new Promise((resolve) => {
      google.accounts.oauth2.revoke(token, resolve);
    });
  }
}
