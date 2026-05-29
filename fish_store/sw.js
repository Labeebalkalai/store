const CACHE_NAME = 'amwaj-v6';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './logo.jpeg',
    './dev_labib_real.jpg'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting(); // Force the waiting service worker to become active immediately
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        }).then(() => {
            return self.clients.claim(); // Force active service worker to take control of all clients immediately
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Network-first strategy for dynamic caching stability
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                return response;
            })
            .catch(() => {
                // Ignore search query parameters (e.g. ?v=5) during offline cache retrieval
                return caches.match(e.request, { ignoreSearch: true });
            })
    );
});
