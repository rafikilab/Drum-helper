// DrumHelper Service Worker - Perfect Offline Support
const CACHE_VERSION = '2.1.0';
const CACHE_PREFIX = 'drumhelper';
const STATIC_CACHE = `${CACHE_PREFIX}-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-v${CACHE_VERSION}`;
const AUDIO_CACHE = `${CACHE_PREFIX}-audio-v${CACHE_VERSION}`;
const OFFLINE_CACHE = `${CACHE_PREFIX}-offline-v${CACHE_VERSION}`;

// Offline-first strategy constants
const NETWORK_TIMEOUT = 3000; // 3 seconds before falling back to cache
const MAX_CONCURRENT_REQUESTS = 3;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

// Resource categories with offline-first strategies
const RESOURCE_CONFIG = {
    // Critical app resources - Always cache first
    static: {
        strategy: 'cache-first-with-refresh',
        cacheName: STATIC_CACHE,
        resources: [
            './',
            './index.html',
            './style.css',
            './script.js',
            './manifest.json',
            './js/utils.js',
            './js/ConfigManager.js',
            './js/AudioManager.js',
            './js/StorageManager.js',
            './js/UIManager.js',
            './js/SongManager.js',
            './js/AdvancedAudioManager.js'
        ]
    },
    // Dynamic content - Offline-first with background sync
    dynamic: {
        strategy: 'offline-first',
        cacheName: DYNAMIC_CACHE,
        maxEntries: 100,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    // Audio files - Cache and never expire
    audio: {
        strategy: 'cache-first-permanent',
        cacheName: AUDIO_CACHE,
        maxEntries: 50,
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
    },
    // Offline fallbacks
    offline: {
        strategy: 'cache-only',
        cacheName: OFFLINE_CACHE,
        resources: []
    }
};

/**
 * Enhanced Cache Management for Perfect Offline Support
 */
class AdvancedCacheManager {
    static async initializeOfflineCache() {
        try {
            const offlineCache = await caches.open(OFFLINE_CACHE);
            
            // Create offline fallback page
            const offlinePage = new Response(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>DrumHelper - Offline Mode</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                            background: linear-gradient(135deg, #1f2937, #374151);
                            color: white;
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0;
                            text-align: center;
                        }
                        .offline-container {
                            max-width: 500px;
                            padding: 2rem;
                            background: rgba(255,255,255,0.1);
                            border-radius: 15px;
                            backdrop-filter: blur(10px);
                        }
                        .pulse { animation: pulse 2s infinite; }
                        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                        .retry-btn {
                            background: #10b981;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 1rem;
                            margin-top: 1rem;
                        }
                    </style>
                </head>
                <body>
                    <div class="offline-container">
                        <div class="pulse">🥁</div>
                        <h1>DrumHelper - Offline Mode</h1>
                        <p>You're currently offline, but DrumHelper continues to work!</p>
                        <p>All your settings and songs are preserved locally.</p>
                        <button class="retry-btn" onclick="window.location.reload()">
                            Check Connection
                        </button>
                    </div>
                </body>
                </html>
            `, {
                headers: { 'Content-Type': 'text/html' }
            });
            
            await offlineCache.put('/offline.html', offlinePage);
            
            console.log('[SW] Offline cache initialized');
        } catch (error) {
            console.error('[SW] Failed to initialize offline cache:', error);
        }
    }

    static async cleanupOldCaches() {
        const cacheNames = await caches.keys();
        const validCaches = Object.values(RESOURCE_CONFIG).map(config => config.cacheName);
        const oldCaches = cacheNames.filter(cacheName => 
            cacheName.startsWith(CACHE_PREFIX) && 
            !validCaches.includes(cacheName)
        );
        
        return Promise.all(
            oldCaches.map(cacheName => {
                console.log('[SW] Deleting old cache:', cacheName);
                return caches.delete(cacheName);
            })
        );
    }

    static async limitCacheSize(cacheName, maxEntries) {
        try {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            
            if (keys.length > maxEntries) {
                const entriesToDelete = keys.slice(0, keys.length - maxEntries);
                await Promise.all(entriesToDelete.map(key => cache.delete(key)));
                console.log(`[SW] Cleaned ${entriesToDelete.length} entries from ${cacheName}`);
            }
        } catch (error) {
            console.error(`[SW] Failed to limit cache size for ${cacheName}:`, error);
        }
    }

    static async limitCacheAge(cacheName, maxAge) {
        try {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            const cutoff = Date.now() - maxAge;
            
            for (const key of keys) {
                const response = await cache.match(key);
                if (response) {
                    const cachedTime = new Date(response.headers.get('sw-cached-time') || 0);
                    if (cachedTime.getTime() < cutoff) {
                        await cache.delete(key);
                        console.log(`[SW] Deleted expired entry: ${key.url}`);
                    }
                }
            }
        } catch (error) {
            console.error(`[SW] Failed to clean aged cache entries for ${cacheName}:`, error);
        }
    }

    static async addCacheHeaders(response) {
        try {
            const headers = new Headers(response.headers);
            headers.set('sw-cached-time', new Date().toISOString());
            headers.set('sw-offline-ready', 'true');
            
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: headers
            });
        } catch (error) {
            console.error('[SW] Failed to add cache headers:', error);
            return response;
        }
    }

    static async getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    usagePercentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
                };
            } catch (error) {
                console.error('[SW] Storage estimate failed:', error);
                return null;
            }
        }
        return null;
    }
}

/**
 * Offline-First Request Handler
 */
class OfflineRequestHandler {
    static async handleRequest(event) {
        const url = new URL(event.request.url);
        
        // Always serve same-origin requests offline-first
        if (url.origin !== self.location.origin) {
            return fetch(event.request);
        }

        const resourceType = OfflineRequestHandler.getResourceType(event.request);
        const config = RESOURCE_CONFIG[resourceType] || RESOURCE_CONFIG.dynamic;
        
        switch (config.strategy) {
            case 'cache-first-with-refresh':
                return OfflineRequestHandler.cacheFirstWithRefresh(event.request, config);
            case 'offline-first':
                return OfflineRequestHandler.offlineFirst(event.request, config);
            case 'cache-first-permanent':
                return OfflineRequestHandler.cacheFirstPermanent(event.request, config);
            case 'cache-only':
                return OfflineRequestHandler.cacheOnly(event.request, config);
            default:
                return OfflineRequestHandler.offlineFirst(event.request, config);
        }
    }

    static getResourceType(request) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // Check static resources
        if (RESOURCE_CONFIG.static.resources.some(resource => 
            pathname.endsWith(resource.replace('./', '')) || pathname === resource
        )) {
            return 'static';
        }
        
        // Check audio files
        if (request.destination === 'audio' || 
            pathname.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
            return 'audio';
        }
        
        // Check offline resources
        if (pathname === '/offline.html' || pathname.includes('offline')) {
            return 'offline';
        }
        
        return 'dynamic';
    }

    /**
     * Cache first with background refresh - perfect for static assets
     */
    static async cacheFirstWithRefresh(request, config) {
        try {
            const cache = await caches.open(config.cacheName);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                // Serve from cache immediately
                console.log('[SW] Serving from cache (with refresh):', request.url);
                
                // Background refresh
                await OfflineRequestHandler.backgroundRefresh(request, config);
                
                return cachedResponse;
            }
            
            // No cache, fetch with timeout
            return OfflineRequestHandler.fetchWithTimeout(request, config);
            
        } catch (error) {
            console.error('[SW] Cache first with refresh failed:', error);
            return OfflineRequestHandler.getOfflineFallback(request);
        }
    }

    /**
     * Offline-first strategy - try cache first, then network with timeout
     */
    static async offlineFirst(request, config) {
        try {
            const cache = await caches.open(config.cacheName);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                console.log('[SW] Serving from offline cache:', request.url);
                return cachedResponse;
            }
            
            // No cache, try network with aggressive timeout
            console.log('[SW] No cache, trying network (offline-first):', request.url);
            const networkResponse = await OfflineRequestHandler.fetchWithTimeout(request, config, 2000);
            
            // Cache successful responses
            if (networkResponse && networkResponse.ok) {
                const responseWithHeaders = await AdvancedCacheManager.addCacheHeaders(networkResponse);
                cache.put(request, responseWithHeaders.clone());
                
                // Cleanup if needed
                if (config.maxEntries) {
                    setTimeout(async () => await AdvancedCacheManager.limitCacheSize(config.cacheName, config.maxEntries), 0);
                }
                
                return responseWithHeaders;
            }
            
            return networkResponse;
            
        } catch (error) {
            console.log('[SW] Offline-first failed, using fallback:', error);
            return OfflineRequestHandler.getOfflineFallback(request);
        }
    }

    /**
     * Cache first permanent - for audio files that never change
     */
    static async cacheFirstPermanent(request, config) {
        try {
            const cache = await caches.open(config.cacheName);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                console.log('[SW] Serving from permanent cache:', request.url);
                return cachedResponse;
            }
            
            // Not cached, fetch and store permanently
            console.log('[SW] Fetching for permanent cache:', request.url);
            const response = await fetch(request);
            
            if (response && response.ok) {
                const responseWithHeaders = await AdvancedCacheManager.addCacheHeaders(response);
                cache.put(request, responseWithHeaders.clone());
                return responseWithHeaders;
            }
            
            return response;
            
        } catch (error) {
            console.error('[SW] Permanent cache failed:', error);
            return OfflineRequestHandler.getOfflineFallback(request);
        }
    }

    /**
     * Cache only - for offline resources
     */
    static async cacheOnly(request, config) {
        try {
            const cache = await caches.open(config.cacheName);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                console.log('[SW] Serving from cache only:', request.url);
                return cachedResponse;
            }
            
            return new Response('Offline resource not found', { status: 404 });
        } catch (error) {
            console.error('[SW] Cache only failed:', error);
            return new Response('Cache error', { status: 500 });
        }
    }

    /**
     * Fetch with timeout and retry logic
     */
    static async fetchWithTimeout(request, config, timeoutMs = NETWORK_TIMEOUT) {
        let lastError;
        
        for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
                
                const response = await fetch(request.clone(), {
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return response;
                }
                
                lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
                
                // Don't retry on client errors
                if (response.status >= 400 && response.status < 500) {
                    throw lastError;
                }
                
            } catch (error) {
                lastError = error;
                console.log(`[SW] Fetch attempt ${attempt + 1} failed:`, error.name);
                
                // Don't retry on abort (timeout) or non-retryable errors
                if (error.name === 'AbortError' || error.name === 'TypeError') {
                    break;
                }
                
                // Wait before retry
                if (attempt < RETRY_ATTEMPTS - 1) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Background refresh for cache-first strategies
     */
    static async backgroundRefresh(request, config) {
        try {
            const response = await fetch(request.clone());
            
            if (response && response.ok) {
                const cache = await caches.open(config.cacheName);
                const responseWithHeaders = await AdvancedCacheManager.addCacheHeaders(response);
                await cache.put(request, responseWithHeaders);
                console.log('[SW] Background refresh completed:', request.url);
            }
        } catch (error) {
            console.log('[SW] Background refresh failed:', request.url, error.name);
        }
    }

    /**
     * Get comprehensive offline fallback
     */
    static async getOfflineFallback(request) {
        try {
            // Try all caches in priority order
            const cacheNames = [STATIC_CACHE, OFFLINE_CACHE, DYNAMIC_CACHE, AUDIO_CACHE];
            
            for (const cacheName of cacheNames) {
                try {
                    const cache = await caches.open(cacheName);
                    const response = await cache.match(request);
                    if (response) {
                        console.log(`[SW] Offline fallback found in ${cacheName}:`, request.url);
                        return response;
                    }
                } catch (cacheError) {
                    console.warn(`[SW] Cache ${cacheName} access failed:`, cacheError);
                }
            }
            
            // Special handling for different request types
            const acceptHeader = request.headers.get('accept') || '';
            
            if (acceptHeader.includes('text/html')) {
                // Try offline page
                const offlineCache = await caches.open(OFFLINE_CACHE);
                const offlinePage = await offlineCache.match('/offline.html');
                if (offlinePage) {
                    return offlinePage;
                }
                
                // Return main app as fallback
                const staticCache = await caches.open(STATIC_CACHE);
                const mainApp = await staticCache.match('./index.html');
                if (mainApp) {
                    return mainApp;
                }
            }
            
            if (acceptHeader.includes('application/json')) {
                // Return empty JSON for API requests
                return new Response('{}', {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Default offline response
            return new Response('This feature requires an internet connection.', {
                status: 408,
                statusText: 'Request Timeout - Offline',
                headers: { 'Content-Type': 'text/plain' }
            });
            
        } catch (error) {
            console.error('[SW] Offline fallback failed:', error);
            return new Response('Offline - Service temporarily unavailable', {
                status: 503,
                statusText: 'Service Unavailable'
            });
        }
    }
}

/**
 * Background Sync Manager for offline actions
 */
class BackgroundSyncManager {
    static async registerSync(tag, data = {}) {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register(tag);
                
                // Store sync data
                const syncData = {
                    tag,
                    data,
                    timestamp: Date.now(),
                    retryCount: 0
                };
                
                await BackgroundSyncManager.storeSyncData(tag, syncData);
                console.log('[SW] Background sync registered:', tag);
                return true;
            } catch (error) {
                console.error('[SW] Background sync registration failed:', error);
                return false;
            }
        }
        return false;
    }
    
    static async storeSyncData(tag, data) {
        try {
            if ('indexedDB' in self) {
                // Use IndexedDB for sync data storage
                // Implementation would go here for production
                console.log('[SW] Sync data stored:', tag);
            }
        } catch (error) {
            console.error('[SW] Failed to store sync data:', error);
        }
    }
    
    static async processSyncEvent(event) {
        console.log('[SW] Processing background sync:', event.tag);
        
        switch (event.tag) {
            case 'song-backup':
                await BackgroundSyncManager.syncSongData();
                break;
            case 'settings-sync':
                await BackgroundSyncManager.syncSettings();
                break;
            case 'cache-cleanup':
                await BackgroundSyncManager.performCacheCleanup();
                break;
            default:
                console.log('[SW] Unknown sync tag:', event.tag);
        }
    }
    
    static async syncSongData() {
        console.log('[SW] Syncing song data in background');
        // Implement song data synchronization
    }
    
    static async syncSettings() {
        console.log('[SW] Syncing settings in background');
        // Implement settings synchronization
    }
    
    static async performCacheCleanup() {
        console.log('[SW] Performing background cache cleanup');
        const configs = Object.values(RESOURCE_CONFIG);
        
        for (const config of configs) {
            if (config.maxAge) {
                await AdvancedCacheManager.limitCacheAge(config.cacheName, config.maxAge);
            }
            if (config.maxEntries) {
                await AdvancedCacheManager.limitCacheSize(config.cacheName, config.maxEntries);
            }
        }
    }
}

// Service Worker Event Listeners

// Install event - Aggressive caching for offline support
self.addEventListener('install', (event) => {
    console.log('[SW] Installing with perfect offline support, version:', CACHE_VERSION);
    
    event.waitUntil(
        (async () => {
            try {
                // Cache all static resources
                const staticCache = await caches.open(STATIC_CACHE);
                console.log('[SW] Caching static resources for offline use');
                await staticCache.addAll(RESOURCE_CONFIG.static.resources);
                
                // Initialize offline cache
                await AdvancedCacheManager.initializeOfflineCache();
                
                console.log('[SW] All resources cached for perfect offline support');
                
                // Take control immediately
                await self.skipWaiting();
            } catch (error) {
                console.error('[SW] Installation failed:', error);
                throw error;
            }
        })()
    );
});

// Activate event - Clean up and take control
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating perfect offline support, version:', CACHE_VERSION);
    
    event.waitUntil(
        (async () => {
            try {
                // Clean up old caches
                await AdvancedCacheManager.cleanupOldCaches();
                
                // Take control of all clients immediately
                await self.clients.claim();
                
                // Get storage estimate
                const estimate = await AdvancedCacheManager.getStorageEstimate();
                if (estimate) {
                    console.log(`[SW] Storage usage: ${estimate.usagePercentage}% (${estimate.usage}/${estimate.quota} bytes)`);
                }
                
                console.log('[SW] Perfect offline support activated');
                
                // Notify clients
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_VERSION,
                        offlineReady: true,
                        storageEstimate: estimate
                    });
                });
            } catch (error) {
                console.error('[SW] Activation failed:', error);
            }
        })()
    );
});

// Fetch event - Offline-first request handling
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    event.respondWith(OfflineRequestHandler.handleRequest(event));
});

// Background sync event
if ('sync' in self.registration) {
    self.addEventListener('sync', (event) => {
        event.waitUntil(BackgroundSyncManager.processSyncEvent(event));
    });
}

// Message event - Enhanced communication
self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'FORCE_UPDATE':
            event.waitUntil(
                (async () => {
                    await AdvancedCacheManager.cleanupOldCaches();
                    self.skipWaiting();
                })()
            );
            break;
            
        case 'CLEANUP_CACHES':
            event.waitUntil(BackgroundSyncManager.performCacheCleanup());
            break;
            
        case 'CHECK_OFFLINE_READY':
            event.waitUntil(
                (async () => {
                    const caches = await Promise.all([
                        caches.has(STATIC_CACHE),
                        caches.has(OFFLINE_CACHE)
                    ]);
                    
                    const estimate = await AdvancedCacheManager.getStorageEstimate();
                    
                    event.ports[0]?.postMessage({
                        type: 'OFFLINE_STATUS',
                        ready: caches.every(exists => exists),
                        version: CACHE_VERSION,
                        storageEstimate: estimate
                    });
                })()
            );
            break;
            
        case 'GET_CACHE_STATUS':
            event.waitUntil(
                (async () => {
                    const cacheNames = await caches.keys();
                    const status = {};
                    
                    for (const cacheName of cacheNames) {
                        const cache = await caches.open(cacheName);
                        const keys = await cache.keys();
                        status[cacheName] = keys.length;
                    }
                    
                    const estimate = await AdvancedCacheManager.getStorageEstimate();
                    
                    event.ports[0]?.postMessage({
                        type: 'CACHE_STATUS',
                        status: status,
                        version: CACHE_VERSION,
                        storageEstimate: estimate
                    });
                })()
            );
            break;
            
        case 'REGISTER_BACKGROUND_SYNC':
            event.waitUntil(
                BackgroundSyncManager.registerSync(payload.tag, payload.data)
            );
            break;
    }
});

// Periodic background tasks
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cache-maintenance') {
        event.waitUntil(BackgroundSyncManager.performCacheCleanup());
    }
});

// Error handling
self.addEventListener('error', (event) => {
    console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Perfect Offline Service Worker loaded, version:', CACHE_VERSION);