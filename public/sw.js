// sw.js — minimal cache-first service worker for offline PWA
const CACHE_NAME = 'khurklockd-v1';
const PRECACHE = [
  '/khurklockd/',
  '/khurklockd/generator/',
  '/khurklockd/totp/',
  '/khurklockd/breach/',
  '/khurklockd/backup/',
  '/khurklockd/emergency/',
  '/khurklockd/settings/',
  '/khurklockd/manifest.json',
  '/khurklockd/icons/icon-192.png',
  '/khurklockd/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      })
    ).catch(() => caches.match('/khurklockd/'))
  );
});
