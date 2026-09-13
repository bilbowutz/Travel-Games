/* Offline-Cache für Travel Games.
   CACHE hochzählen, wenn sich Dateien geändert haben. */
const CACHE = 'travel-games-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/base.css',
  './assets/js/app.js',
  './assets/js/games.js',
  './assets/img/favicon.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/img/apple-touch-icon.png',
  './games/auto-bingo/',
  './games/auto-bingo/index.html',
  './games/auto-bingo/bingo.css',
  './games/auto-bingo/bingo.js',
  './games/auto-bingo/items.js',
  './games/auto-bingo/confetti.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // einzeln, damit eine fehlende Datei nicht die ganze Installation kippt
      .then((cache) => Promise.all(
        PRECACHE.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* Cache zuerst (schneller Start im Funkloch), Aktualisierung im Hintergrund. */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || caches.match('./index.html'));

      return cached || network;
    })
  );
});
