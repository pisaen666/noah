/**
 * =============================================================================
 * sw.js — Service Worker for Daily Word Quest PWA
 * =============================================================================
 * - Uses Network-First caching strategy so code updates take effect immediately
 * - Falls back to cache seamlessly when offline
 * - Auto-cleans obsolete caches on activation
 * =============================================================================
 */

const CACHE_NAME = 'dwq-cache-v4';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './src/config.js',
  './src/auth.js',
  './src/calendarApi.js',
  './src/calendarHooks.js',
  './src/rewards.js',
  './src/ui.js',
  './src/app.js',
];

// ---------------------------------------------------------------------------
// Install Event: Pre-cache static assets & skip waiting immediately
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline assets...');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets could not be pre-cached:', err);
      });
    })
  );
});

// ---------------------------------------------------------------------------
// Activate Event: Clean old caches & claim clients immediately
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Fetch Event: Network-First with Cache Fallback for instant fresh updates
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass caching for non-GET requests and chrome-extension://
  if (event.request.method !== 'GET' || !requestUrl.protocol.startsWith('http')) {
    return;
  }

  // Network-first for Google Calendar API and GIS auth
  if (
    requestUrl.hostname.includes('googleapis.com') ||
    requestUrl.hostname.includes('accounts.google.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            error: { message: 'อุปกรณ์อยู่ในโหมดออฟไลน์ ไม่สามารถเชื่อมต่อกับ Google ได้ในขณะนี้' }
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Network-First for app assets to ensure latest updates are immediately served
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
          return new Response('Offline resource unavailable', { status: 503 });
        });
      })
  );
});
