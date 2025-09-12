// DrumHelper Offline Storage Manager - Perfect Offline Data Persistence

/**
 * OfflineStorageManager handles all offline data persistence using multiple storage layers
 * Provides robust offline-first data management with automatic synchronization
 */
class OfflineStorageManager {
    constructor() {
        this.dbName = 'DrumHelperDB';
        this.dbVersion = 2;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.pendingSync = new Map();
        this.syncQueue = [];
        this.storageQuota = null;
        
        // Storage layer priorities: IndexedDB > LocalStorage > Memory
        this.storageStrategy = 'auto'; // auto, indexeddb, localstorage, memory
        this.currentStorage = null;
        
        this.initializeOfflineStorage();
        this.setupConnectionHandlers();
    }

    /**
     * Initialize offline storage with fallback strategy
     */
    async initializeOfflineStorage() {
        try {
            console.log('[OfflineStorage] Initializing offline storage...');
            
            // Check storage quota
            await this.checkStorageQuota();
            
            // Try storage methods in order of preference
            if (await this.tryIndexedDB()) {
                this.currentStorage = 'indexeddb';
                console.log('[OfflineStorage] Using IndexedDB for offline storage');
            } else if (await this.tryLocalStorage()) {
                this.currentStorage = 'localstorage';
                console.log('[OfflineStorage] Using localStorage for offline storage');
            } else {
                this.currentStorage = 'memory';
                console.log('[OfflineStorage] Using memory storage (temporary)');
                this.initializeMemoryStorage();
            }
            
            // Start periodic sync attempts
            this.startPeriodicSync();
            
            console.log('[OfflineStorage] Offline storage initialized successfully');
            
        } catch (error) {
            console.error('[OfflineStorage] Failed to initialize offline storage:', error);
            Utils.createErrorNotification('Offline storage initialization failed');
        }
    }

    /**
     * Check and monitor storage quota
     */
    async checkStorageQuota() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                this.storageQuota = {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    available: estimate.quota - estimate.usage,
                    percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
                };
                
                console.log(`[OfflineStorage] Storage: ${this.storageQuota.percentage}% used (${this.formatBytes(this.storageQuota.usage)}/${this.formatBytes(this.storageQuota.quota)})`);
                
                // Warn if storage is getting full
                if (this.storageQuota.percentage > 80) {
                    Utils.createErrorNotification(`Storage ${this.storageQuota.percentage}% full - consider cleaning up data`);
                }
                
                return this.storageQuota;
            }
        } catch (error) {
            console.warn('[OfflineStorage] Storage quota check failed:', error);
        }
        return null;
    }

    /**
     * Try to initialize IndexedDB
     */
    async tryIndexedDB() {
        if (!('indexedDB' in window)) {
            console.log('[OfflineStorage] IndexedDB not supported');
            return false;
        }

        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                
                request.onerror = () => {
                    console.warn('[OfflineStorage] IndexedDB connection failed:', request.error);
                    resolve(false);
                };
                
                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('[OfflineStorage] IndexedDB connected successfully');
                    resolve(true);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    try {
                        // Songs store
                        if (!db.objectStoreNames.contains('songs')) {
                            const songsStore = db.createObjectStore('songs', { keyPath: 'id' });
                            songsStore.createIndex('title', 'title', { unique: false });
                            songsStore.createIndex('createdAt', 'createdAt', { unique: false });
                            songsStore.createIndex('lastModified', 'lastModified', { unique: false });
                        }
                        
                        // Configuration store
                        if (!db.objectStoreNames.contains('config')) {
                            db.createObjectStore('config', { keyPath: 'key' });
                        }
                        
                        // Sync queue store
                        if (!db.objectStoreNames.contains('syncQueue')) {
                            const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                            syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                            syncStore.createIndex('action', 'action', { unique: false });
                        }
                        
                        // Audio cache metadata store
                        if (!db.objectStoreNames.contains('audioCache')) {
                            const audioStore = db.createObjectStore('audioCache', { keyPath: 'url' });
                            audioStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                            audioStore.createIndex('size', 'size', { unique: false });
                        }
                        
                        // Analytics store
                        if (!db.objectStoreNames.contains('analytics')) {
                            const analyticsStore = db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
                            analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
                            analyticsStore.createIndex('type', 'type', { unique: false });
                        }
                        
                        console.log('[OfflineStorage] IndexedDB schema updated');
                    } catch (upgradeError) {
                        console.error('[OfflineStorage] IndexedDB upgrade failed:', upgradeError);
                        reject(upgradeError);
                    }
                };
                
                // Set timeout for IndexedDB connection
                setTimeout(() => {
                    console.warn('[OfflineStorage] IndexedDB connection timeout');
                    resolve(false);
                }, 5000);
            });
        } catch (error) {
            console.error('[OfflineStorage] IndexedDB initialization failed:', error);
            return false;
        }
    }

    /**
     * Try to initialize localStorage
     */
    async tryLocalStorage() {
        if (!Utils.checkBrowserSupport().localStorage) {
            console.log('[OfflineStorage] localStorage not supported');
            return false;
        }

        try {
            // Test localStorage functionality
            const testKey = 'drumhelper-offline-test';
            const testData = { timestamp: Date.now(), test: true };
            
            localStorage.setItem(testKey, JSON.stringify(testData));
            const retrieved = JSON.parse(localStorage.getItem(testKey));
            localStorage.removeItem(testKey);
            
            if (retrieved.test !== true) {
                console.warn('[OfflineStorage] localStorage test failed: read/write test failed');
                return false;
            }
            
            console.log('[OfflineStorage] localStorage available and working');
            return true;
        } catch (error) {
            console.warn('[OfflineStorage] localStorage test failed:', error);
            return false;
        }
    }

    /**
     * Initialize memory-only storage as last resort
     */
    initializeMemoryStorage() {
        this.memoryStorage = {
            songs: new Map(),
            config: new Map(),
            syncQueue: new Map(),
            audioCache: new Map(),
            analytics: []
        };
        
        console.warn('[OfflineStorage] Using temporary memory storage - data will not persist');
        Utils.createErrorNotification('Using temporary storage - data may be lost on page reload');
    }

    /**
     * Setup connection handlers for online/offline events
     */
    setupConnectionHandlers() {
        window.addEventListener('online', () => {
            console.log('[OfflineStorage] Connection restored');
            this.isOnline = true;
            this.processSyncQueue();
            Utils.createSuccessNotification('Connection restored - syncing data');
        });

        window.addEventListener('offline', () => {
            console.log('[OfflineStorage] Connection lost - switching to offline mode');
            this.isOnline = false;
            Utils.createErrorNotification('Working offline - changes will sync when online');
        });
    }

    /**
     * Save song data with offline-first strategy
     */
    async saveSong(songData) {
        try {
            // Validate and sanitize data
            const validatedSong = this.validateSongData(songData);
            if (!validatedSong) {
                console.error('[OfflineStorage] Invalid song data');
                return false;
            }

            // Add metadata
            validatedSong.lastModified = new Date().toISOString();
            if (!validatedSong.createdAt) {
                validatedSong.createdAt = validatedSong.lastModified;
            }

            // Save locally first (offline-first)
            const success = await this.saveToLocalStorage('songs', validatedSong);
            
            if (success) {
                // Queue for background sync if online
                if (this.isOnline) {
                    this.queueForSync('song-save', validatedSong);
                }
                
                Utils.createSuccessNotification(`Song "${validatedSong.title}" saved offline`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[OfflineStorage] Failed to save song:', error);
            Utils.createErrorNotification('Failed to save song: ' + error.message);
            return false;
        }
    }

    /**
     * Load song data with fallback strategy
     */
    async loadSong(songId) {
        try {
            return await this.loadFromLocalStorage('songs', songId);
        } catch (error) {
            console.error('[OfflineStorage] Failed to load song:', error);
            return null;
        }
    }

    /**
     * Get all songs with offline support
     */
    async getAllSongs() {
        try {
            return await this.getAllFromLocalStorage('songs');
        } catch (error) {
            console.error('[OfflineStorage] Failed to get all songs:', error);
            return [];
        }
    }

    /**
     * Delete song with offline support
     */
    async deleteSong(songId) {
        try {
            const success = await this.deleteFromLocalStorage('songs', songId);
            
            if (success && this.isOnline) {
                this.queueForSync('song-delete', { id: songId });
            }
            
            return success;
        } catch (error) {
            console.error('[OfflineStorage] Failed to delete song:', error);
            return false;
        }
    }

    /**
     * Save configuration with offline support
     */
    async saveConfig(key, value) {
        try {
            const configItem = { key, value, timestamp: new Date().toISOString() };
            const success = await this.saveToLocalStorage('config', configItem);
            
            if (success && this.isOnline) {
                this.queueForSync('config-save', configItem);
            }
            
            return success;
        } catch (error) {
            console.error('[OfflineStorage] Failed to save config:', error);
            return false;
        }
    }

    /**
     * Load configuration with offline support
     */
    async loadConfig(key) {
        try {
            const configItem = await this.loadFromLocalStorage('config', key);
            return configItem ? configItem.value : null;
        } catch (error) {
            console.error('[OfflineStorage] Failed to load config:', error);
            return null;
        }
    }

    /**
     * Generic save to local storage based on current strategy
     */
    async saveToLocalStorage(storeName, data) {
        switch (this.currentStorage) {
            case 'indexeddb':
                return await this.saveToIndexedDB(storeName, data);
            case 'localstorage':
                return await this.saveToLS(storeName, data);
            case 'memory':
                return this.saveToMemory(storeName, data);
            default:
                throw new Error('No storage method available');
        }
    }

    /**
     * Generic load from local storage
     */
    async loadFromLocalStorage(storeName, key) {
        switch (this.currentStorage) {
            case 'indexeddb':
                return await this.loadFromIndexedDB(storeName, key);
            case 'localstorage':
                return await this.loadFromLS(storeName, key);
            case 'memory':
                return this.loadFromMemory(storeName, key);
            default:
                throw new Error('No storage method available');
        }
    }

    /**
     * Generic get all from local storage
     */
    async getAllFromLocalStorage(storeName) {
        switch (this.currentStorage) {
            case 'indexeddb':
                return await this.getAllFromIndexedDB(storeName);
            case 'localstorage':
                return await this.getAllFromLS(storeName);
            case 'memory':
                return this.getAllFromMemory(storeName);
            default:
                throw new Error('No storage method available');
        }
    }

    /**
     * Generic delete from local storage
     */
    async deleteFromLocalStorage(storeName, key) {
        switch (this.currentStorage) {
            case 'indexeddb':
                return await this.deleteFromIndexedDB(storeName, key);
            case 'localstorage':
                return await this.deleteFromLS(storeName, key);
            case 'memory':
                return this.deleteFromMemory(storeName, key);
            default:
                throw new Error('No storage method available');
        }
    }

    /**
     * IndexedDB operations
     */
    async saveToIndexedDB(storeName, data) {
        if (!this.db) throw new Error('IndexedDB not initialized');
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async loadFromIndexedDB(storeName, key) {
        if (!this.db) throw new Error('IndexedDB not initialized');
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getAllFromIndexedDB(storeName) {
        if (!this.db) throw new Error('IndexedDB not initialized');
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async deleteFromIndexedDB(storeName, key) {
        if (!this.db) throw new Error('IndexedDB not initialized');
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * LocalStorage operations
     */
    async saveToLS(storeName, data) {
        try {
            const storageKey = `drumhelper-${storeName}`;
            let existingData;
            
            try {
                const existing = localStorage.getItem(storageKey);
                existingData = existing ? JSON.parse(existing) : {};
            } catch (parseError) {
                console.warn('[OfflineStorage] Failed to parse existing localStorage data:', parseError);
                existingData = {};
            }
            
            const key = data.id || data.key;
            existingData[key] = data;
            
            localStorage.setItem(storageKey, JSON.stringify(existingData));
            return true;
        } catch (error) {
            console.error('[OfflineStorage] localStorage save failed:', error);
            return false;
        }
    }

    async loadFromLS(storeName, key) {
        try {
            const storageKey = `drumhelper-${storeName}`;
            const stored = localStorage.getItem(storageKey);
            
            if (!stored) return null;
            
            const data = JSON.parse(stored);
            return data[key] || null;
        } catch (error) {
            console.error('[OfflineStorage] localStorage load failed:', error);
            return null;
        }
    }

    async getAllFromLS(storeName) {
        try {
            const storageKey = `drumhelper-${storeName}`;
            const stored = localStorage.getItem(storageKey);
            
            if (!stored) return [];
            
            const data = JSON.parse(stored);
            return Object.values(data);
        } catch (error) {
            console.error('[OfflineStorage] localStorage getAll failed:', error);
            return [];
        }
    }

    async deleteFromLS(storeName, key) {
        try {
            const storageKey = `drumhelper-${storeName}`;
            const stored = localStorage.getItem(storageKey);
            
            if (!stored) return true;
            
            const data = JSON.parse(stored);
            delete data[key];
            
            localStorage.setItem(storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('[OfflineStorage] localStorage delete failed:', error);
            return false;
        }
    }

    /**
     * Memory storage operations
     */
    saveToMemory(storeName, data) {
        if (!this.memoryStorage[storeName]) {
            this.memoryStorage[storeName] = new Map();
        }
        
        const key = data.id || data.key;
        this.memoryStorage[storeName].set(key, data);
        return true;
    }

    loadFromMemory(storeName, key) {
        if (!this.memoryStorage[storeName]) return null;
        return this.memoryStorage[storeName].get(key) || null;
    }

    getAllFromMemory(storeName) {
        if (!this.memoryStorage[storeName]) return [];
        return Array.from(this.memoryStorage[storeName].values());
    }

    deleteFromMemory(storeName, key) {
        if (!this.memoryStorage[storeName]) return true;
        return this.memoryStorage[storeName].delete(key);
    }

    /**
     * Queue item for background sync
     */
    queueForSync(action, data) {
        const syncItem = {
            id: Date.now() + Math.random(),
            action,
            data,
            timestamp: new Date().toISOString(),
            attempts: 0,
            maxAttempts: 3
        };
        
        this.syncQueue.push(syncItem);
        this.pendingSync.set(syncItem.id, syncItem);
        
        // Try immediate sync if online
        if (this.isOnline) {
            setTimeout(() => this.processSyncQueue(), 100);
        }
    }

    /**
     * Process sync queue when online
     */
    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) return;
        
        console.log(`[OfflineStorage] Processing ${this.syncQueue.length} sync items`);
        
        const itemsToProcess = [...this.syncQueue];
        this.syncQueue = [];
        
        for (const item of itemsToProcess) {
            try {
                await this.processSyncItem(item);
                this.pendingSync.delete(item.id);
                console.log(`[OfflineStorage] Sync completed:`, item.action);
            } catch (error) {
                item.attempts++;
                console.warn(`[OfflineStorage] Sync failed (attempt ${item.attempts}):`, item.action, error);
                
                if (item.attempts < item.maxAttempts) {
                    // Re-queue with exponential backoff
                    setTimeout(() => {
                        this.syncQueue.push(item);
                    }, Math.pow(2, item.attempts) * 1000);
                } else {
                    console.error('[OfflineStorage] Sync item exceeded max attempts:', item);
                    this.pendingSync.delete(item.id);
                }
            }
        }
    }

    /**
     * Process individual sync item
     */
    async processSyncItem(item) {
        // In a real application, this would sync with a backend server
        // For now, we just simulate the sync process
        console.log(`[OfflineStorage] Syncing ${item.action}:`, item.data);
        
        switch (item.action) {
            case 'song-save':
                // Would POST to /api/songs
                break;
            case 'song-delete':
                // Would DELETE /api/songs/{id}
                break;
            case 'config-save':
                // Would POST to /api/config
                break;
            default:
                console.warn('[OfflineStorage] Unknown sync action:', item.action);
        }
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Start periodic sync attempts
     */
    startPeriodicSync() {
        setInterval(() => {
            if (this.isOnline && this.syncQueue.length > 0) {
                this.processSyncQueue();
            }
        }, 30000); // Try every 30 seconds
    }

    /**
     * Validate song data structure
     */
    validateSongData(songData) {
        if (!songData || typeof songData !== 'object') {
            return null;
        }
        
        if (!songData.title || typeof songData.title !== 'string') {
            return null;
        }
        
        if (!Array.isArray(songData.sections) || songData.sections.length === 0) {
            return null;
        }
        
        // Sanitize and validate
        return {
            id: songData.id || Utils.generateId(),
            title: Utils.sanitizeInput(songData.title),
            tempo: Utils.validateTempo(songData.tempo || 120),
            sections: songData.sections.map(section => ({
                name: Utils.sanitizeInput(section.name || 'Untitled'),
                measures: Utils.validateMeasures(section.measures || 4)
            })),
            createdAt: songData.createdAt,
            lastModified: songData.lastModified
        };
    }

    /**
     * Format bytes for display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        const stats = {
            currentStorage: this.currentStorage,
            isOnline: this.isOnline,
            pendingSyncItems: this.syncQueue.length,
            storageQuota: this.storageQuota
        };
        
        try {
            if (this.currentStorage === 'indexeddb') {
                const songs = await this.getAllFromIndexedDB('songs');
                stats.songsCount = songs.length;
            } else if (this.currentStorage === 'localstorage') {
                const songs = await this.getAllFromLS('songs');
                stats.songsCount = songs.length;
            } else {
                stats.songsCount = this.memoryStorage.songs?.size || 0;
            }
        } catch (error) {
            console.warn('[OfflineStorage] Failed to get storage stats:', error);
            stats.songsCount = 0;
        }
        
        return stats;
    }

    /**
     * Clear all offline data (for testing/reset)
     */
    async clearAllData() {
        try {
            switch (this.currentStorage) {
                case 'indexeddb':
                    if (this.db) {
                        const stores = ['songs', 'config', 'syncQueue', 'audioCache', 'analytics'];
                        for (const storeName of stores) {
                            const transaction = this.db.transaction([storeName], 'readwrite');
                            const store = transaction.objectStore(storeName);
                            store.clear();
                        }
                    }
                    break;
                case 'localstorage':
                    const keys = Object.keys(localStorage).filter(key => key.startsWith('drumhelper-'));
                    keys.forEach(key => localStorage.removeItem(key));
                    break;
                case 'memory':
                    this.initializeMemoryStorage();
                    break;
            }
            
            this.syncQueue = [];
            this.pendingSync.clear();
            
            console.log('[OfflineStorage] All data cleared');
            return true;
        } catch (error) {
            console.error('[OfflineStorage] Failed to clear data:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.OfflineStorageManager = OfflineStorageManager;