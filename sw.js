// DrumHelper Service Worker - Offline Support
const CACHE_NAME = 'drumhelper-v1.1';
const urlsToCache = [
    './',
    './index.html',
    './style.css', 
    './script.js',
    './manifest.json'
];

// Install event - Cache all resources
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching resources');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] All resources cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Cache failed:', error);
            })
    );
});

// Activate event - Clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
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
            console.log('[SW] Activated and ready');
            return self.clients.claim();
        })
    );
});

// Fetch event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Only handle same-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    console.log('[SW] Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // Otherwise fetch from network
                console.log('[SW] Fetching from network:', event.request.url);
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
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
                    .catch((error) => {
                        console.error('[SW] Fetch failed:', error);
                        
                        // For HTML requests, try to return a cached page
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('./index.html');
                        }
                        
                        throw error;
                    });
            })
    );
});

// Message event - Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker script loaded');
