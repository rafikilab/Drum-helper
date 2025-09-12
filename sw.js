// DrumHelper Service Worker - Offline-first PWA

const CACHE_NAME = 'drumhelper-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './css/mobile-styles.css',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './js/script.js',
  './js/AudioManager.js',
  './js/AdvancedAudioManager.js',
  './js/UIManager.js',
  './js/SongManager.js',
  './js/StorageManager.js',
  './js/ConfigManager.js',
  './js/utils.js',
  './manifest.json'
];

// Install event - cache all resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache (offline-first)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        // If not in cache, try to fetch from network
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache if it's not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Network failed, show offline fallback if available
            console.log('[SW] Network failed, offline mode');
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Background sync for data persistence
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync');
    event.waitUntil(
      // Add any background sync logic here
      Promise.resolve()
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded');