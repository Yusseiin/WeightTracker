// Weight Tracker service worker
// Strategy:
// - Precache app shell assets (icons, manifest, logo) on install
// - Network-first for everything else so data stays fresh
// - Fall back to cache only when offline
const CACHE_NAME = 'weight-tracker-v1';
const PRECACHE_URLS = [
  '/manifest.json',
  '/logo.svg',
  '/pwa-64x64.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png',
  '/apple-touch-icon-180x180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GETs; let everything else go straight to the network
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin and non-http(s) requests
  if (url.origin !== self.location.origin) return;

  // API calls are always network — data freshness > offline support here
  if (url.pathname.startsWith('/api/')) return;

  // Network-first with cache fallback for everything else
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful same-origin GETs of static assets
        if (
          response.ok &&
          (url.pathname.startsWith('/_next/static/') ||
            PRECACHE_URLS.includes(url.pathname))
        ) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});
