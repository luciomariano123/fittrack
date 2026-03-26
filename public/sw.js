const CACHE_NAME = 'fittrack-v1';
const OFFLINE_URLS = ['/', '/dashboard', '/rutinas', '/peso', '/comidas'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/dashboard'))
    );
  }
});
