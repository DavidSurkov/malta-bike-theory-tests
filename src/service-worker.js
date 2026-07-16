const CACHE_PREFIX = 'malta-motorcycle-theory-';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        const deletions = [];

        for (const cacheName of cacheNames) {
          if (
            cacheName.startsWith(CACHE_PREFIX) &&
            cacheName !== CACHE_NAME
          ) {
            deletions.push(caches.delete(cacheName));
          }
        }

        return Promise.all(deletions);
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (
    request.method !== 'GET' ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => response ?? fetch(request)),
  );
});
