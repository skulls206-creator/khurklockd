// sw.js — minimal hand-rolled service worker with offline fallback
// Precaches the app shell + offline page. Navigations use
// stale-while-revalidate with the branded offline page as the final
// fallback. Other GETs are cache-first.
const CACHE_NAME = 'khurklockd-v3';
const OFFLINE_URL = '/offline/';

const PRECACHE = [
  '/',
  '/generator/',
  '/totp/',
  '/breach/',
  '/emergency/',
  '/settings/',
  '/import/',
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Use addAll with individual fallback so a single 404 doesn't break install
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] precache miss', url, err);
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Navigation requests: stale-while-revalidate, fall back to offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          // Kick off revalidation in background, return cached immediately.
          event.waitUntil(networkPromise);
          return cached;
        }

        const network = await networkPromise;
        if (network) return network;

        const offline = await cache.match(OFFLINE_URL);
        if (offline) return offline;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })(),
    );
    return;
  }

  // Static assets: cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || Response.error());
    }),
  );
});
