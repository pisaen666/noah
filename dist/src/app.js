/**
 * =============================================================================
 * app.js — Main Application Bootstrapper
 * =============================================================================
 * This is the entry point loaded as <script type="module"> from index.html.
 * It orchestrates the startup sequence:
 *
 *  1. Wait for the DOM to be ready
 *  2. Validate config (warn if Client ID is still the placeholder)
 *  3. Load and initialize Google Identity Services
 *  4. Wire up UI elements
 *  5. Show login overlay if not authenticated
 *  6. Wire up the Settings "Sign Out" button if present
 * =============================================================================
 */

import { initGoogleAuth, isSignedIn } from './auth.js';
import { initUI, checkAndShowLoginOverlay, showErrorOverlay, handleSignOut } from './ui.js';
import { GOOGLE_CLIENT_ID, CHILD_NAME } from './config.js';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function bootstrap() {
  // --- 1. Validate config ---
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    showConfigWarningBanner();
    return; // Don't proceed — auth will definitely fail
  }

  // --- 2. Find required DOM elements ---
  const overlayRoot = document.getElementById('app-overlays');
  const missionBtn = document.getElementById('mission-start-btn');

  if (!overlayRoot || !missionBtn) {
    console.error(
      '[DWQ] Critical DOM elements not found.\n' +
      'Make sure index.html has:\n' +
      '  - <div id="app-overlays"></div>\n' +
      '  - A button with id="mission-start-btn"'
    );
    return;
  }

  // --- 3. Initialize UI event listeners ---
  initUI({ overlayRoot, missionBtn });

  // --- 4. Initialize Google Auth ---
  try {
    await initGoogleAuth();
  } catch (err) {
    console.error('[DWQ] Failed to initialize Google Auth:', err);
    showErrorOverlay(
      `ไม่สามารถโหลด Google Identity Services ได้\n${err.message}\n\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต`
    );
    return;
  }

  // --- 5. Show login overlay if not signed in ---
  checkAndShowLoginOverlay();

  // --- 6. Wire up Settings "Sign Out" button (optional, if present in nav) ---
  const signOutBtn = document.getElementById('dwq-signout-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }

  // --- 7. Register Service Worker for PWA ---
  registerServiceWorker();

  // --- 8. Log ready state ---
  console.info(
    `%c🎮 Daily Word Quest — Ready\n` +
    `%cPlayer: ${CHILD_NAME} | Auth: ${isSignedIn() ? '✅ Signed In' : '⏳ Not signed in'}`,
    'color: #00a2ff; font-weight: bold; font-size: 14px;',
    'color: #89919d; font-size: 12px;'
  );
}

// ---------------------------------------------------------------------------
// Service Worker Registration
// ---------------------------------------------------------------------------

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[DWQ] Service Worker registered successfully with scope:', reg.scope);
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('[DWQ] Service Worker registration failed:', err);
        });
    });
  }
}

// ---------------------------------------------------------------------------
// Config Warning Banner (shown before OAuth init if Client ID is missing)
// ---------------------------------------------------------------------------

function showConfigWarningBanner() {
  // Ensure overlay styles are available even before initUI runs
  if (!document.getElementById('dwq-overlay-styles')) {
    const style = document.createElement('style');
    style.id = 'dwq-overlay-styles-early';
    style.textContent = `
      @keyframes fadeInOverlay { from{opacity:0} to{opacity:1} }
      @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      .dwq-card { background:#1c1b1b; border:1px solid #3f4852; border-radius:8px;
        box-shadow:4px 4px 0px #000; padding:28px 24px; display:flex; flex-direction:column;
        gap:20px; color:#e5e2e1; width:min(92vw,440px); font-family:'Noto Sans Thai','Inter',sans-serif; }
    `;
    document.head.appendChild(style);
  }

  const banner = document.createElement('div');
  banner.style.cssText = `
    position:fixed; inset:0; z-index:9999; display:flex; align-items:center;
    justify-content:center; background:rgba(0,0,0,0.9); font-family:'Noto Sans Thai','Inter',sans-serif;
    animation:fadeInOverlay 0.3s ease;
  `;
  banner.innerHTML = `
    <div class="dwq-card" style="border-color:#ff6d60; text-align:center; align-items:center; gap:16px;">
      <span style="font-size:48px;">⚙️</span>
      <h2 style="font-size:20px; font-weight:800; font-family:'Montserrat',sans-serif; color:#ffb4ab; margin:0;">
        ตั้งค่า Google Client ID ก่อน
      </h2>
      <p style="font-size:14px; color:#bec7d4; line-height:1.7; margin:0;">
        โปรดเปิดไฟล์ <code style="color:#99cbff; background:#0e0e0e; padding:2px 6px; border-radius:3px;">src/config.js</code><br>
        และแทน <code style="color:#ffb4ab; background:#0e0e0e; padding:2px 6px; border-radius:3px;">YOUR_GOOGLE_CLIENT_ID_HERE</code><br>
        ด้วย Client ID จาก Google Cloud Console<br><br>
        ดูคำแนะนำทั้งหมดได้ใน <code style="color:#99cbff; background:#0e0e0e; padding:2px 6px; border-radius:3px;">README.md</code>
      </p>
    </div>
  `;
  document.body.appendChild(banner);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
