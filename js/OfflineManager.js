// DrumHelper Offline Manager - Self-contained PWA offline functionality

/**
 * OfflineManager ensures the PWA works perfectly offline after installation
 * Manages local storage, audio generation, and offline-first functionality
 */
class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineStorageManager = null;
        this.configManager = null;
        this.offlineAudioManager = null;
        this.errorRecovery = null;
        this.observers = new Set();
        this.syncQueue = [];
        this.analytics = {
            sessionsCount: 0,
            songsCreated: 0,
            practiceTime: 0,
            featuresUsed: new Set()
        };
        this.pwaState = {
            isInstalled: false,
            storageQuotaUsed: 0,
            storageQuotaAvailable: 0,
            cacheStatus: 'unknown',
            audioCapabilities: null,
            lastSessionTime: null
        };
        
        this.initializeOfflineManager().catch(error => {
            console.error('Failed to initialize offline manager:', error);
            this.handleOfflineError('initialization', error);
        });
    }

    /**
     * Initialize the offline management system
     */
    async initializeOfflineManager() {
        try {
            console.log('Initializing comprehensive offline support...');
            
            // Initialize error recovery first
            this.errorRecovery = new OfflineErrorRecovery();
            this.errorRecovery.addObserver((event, data) => this.handleErrorRecoveryEvent(event, data));
            this.offlineState.errorRecoveryActive = true;
            
            // Initialize offline storage
            this.offlineStorageManager = new OfflineStorageManager();
            await this.offlineStorageManager.initialize();
            
            // Initialize offline audio manager
            this.offlineAudioManager = new OfflineAudioManager();
            await this.offlineAudioManager.initialize();
            this.offlineState.audioCapabilities = this.offlineAudioManager.getCapabilities();
            
            // Setup connection monitoring
            this.setupConnectionMonitoring();
            
            // Initialize storage quota monitoring
            await this.initializeStorageQuota();
            
            // Setup periodic sync checks
            this.setupPeriodicSync();
            
            // Initialize UI indicators
            this.initializeOfflineUI();
            
            // Check service worker status
            await this.checkServiceWorkerStatus();
            
            // Setup analytics collection
            this.setupAnalytics();
            
            // Load offline session data
            await this.loadOfflineSessionData();
            
            console.log('OfflineManager initialized successfully');
            console.log('Offline capabilities:', this.getOfflineCapabilities());
            this.notifyObservers('offline-manager-ready', this.offlineState);
            
        } catch (error) {
            console.error('Failed to initialize OfflineManager:', error);
            this.handleOfflineError('initialization', error);
        }
    }

    /**
     * Setup connection monitoring and state management
     */
    setupConnectionMonitoring() {
        // Online event
        window.addEventListener('online', async () => {
            this.isOnline = true;
            this.offlineState.isOfflineMode = false;
            this.offlineState.lastOnline = Date.now();
            
            console.log('Connection restored');
            this.updateOfflineIndicators();
            this.notifyObservers('connection-restored', this.offlineState);
            
            // Start background sync
            await this.startBackgroundSync();
        });

        // Offline event
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.offlineState.isOfflineMode = true;
            
            console.log('Connection lost - switching to offline mode');
            this.updateOfflineIndicators();
            this.notifyObservers('connection-lost', this.offlineState);
        });

        // Periodic connection test
        setInterval(() => {
            this.testConnection();
        }, 30000); // Every 30 seconds
    }

    /**
     * Test actual network connectivity (not just navigator.onLine)
     */
    async testConnection() {
        try {
            const response = await fetch('/manifest.json', {
                method: 'HEAD',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000)
            });
            
            const actuallyOnline = response.ok;
            
            if (actuallyOnline !== this.isOnline) {
                this.isOnline = actuallyOnline;
                this.offlineState.isOfflineMode = !actuallyOnline;
                
                if (actuallyOnline) {
                    this.offlineState.lastOnline = Date.now();
                    await this.startBackgroundSync();
                }
                
                this.updateOfflineIndicators();
                this.notifyObservers('connection-status-changed', this.offlineState);
            }
        } catch (error) {
            // Connection test failed - we're offline
            if (this.isOnline) {
                this.isOnline = false;
                this.offlineState.isOfflineMode = true;
                this.updateOfflineIndicators();
                this.notifyObservers('connection-lost', this.offlineState);
            }
        }
    }

    /**
     * Initialize storage quota monitoring
     */
    async initializeStorageQuota() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                this.offlineState.storageQuotaUsed = estimate.usage || 0;
                this.offlineState.storageQuotaAvailable = estimate.quota || 0;
                
                console.log(`Storage: ${this.formatBytes(estimate.usage)} / ${this.formatBytes(estimate.quota)}`);
                
                // Monitor storage usage
                this.monitorStorageUsage();
            }
        } catch (error) {
            console.warn('Storage quota API not available:', error);
        }
    }

    /**
     * Monitor storage usage and warn if getting full
     */
    async monitorStorageUsage() {
        setInterval(async () => {
            try {
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    const estimate = await navigator.storage.estimate();
                    this.offlineState.storageQuotaUsed = estimate.usage || 0;
                    this.offlineState.storageQuotaAvailable = estimate.quota || 0;
                    
                    const usagePercent = (estimate.usage / estimate.quota) * 100;
                    
                    // Warn if storage is getting full
                    if (usagePercent > 80) {
                        this.notifyObservers('storage-quota-warning', {
                            usagePercent,
                            used: estimate.usage,
                            available: estimate.quota
                        });
                        
                        if (usagePercent > 90) {
                            await this.cleanupOldData();
                        }
                    }
                }
            } catch (error) {
                console.warn('Storage monitoring error:', error);
            }
        }, 60000); // Check every minute
    }

    /**
     * Setup periodic sync when online
     */
    setupPeriodicSync() {
        setInterval(async () => {
            if (this.isOnline && this.syncQueue.length > 0) {
                await this.processSyncQueue();
            }
        }, 10000); // Every 10 seconds when online
    }

    /**
     * Initialize offline UI indicators
     */
    initializeOfflineUI() {
        // Create offline indicator element
        const offlineIndicator = document.createElement('div');
        offlineIndicator.id = 'offline-indicator';
        offlineIndicator.className = 'offline-indicator hidden';
        offlineIndicator.innerHTML = `
            <div class="offline-status">
                <span class="offline-icon">📱</span>
                <span class="offline-text">Offline Mode</span>
                <span class="sync-status"></span>
            </div>
        `;
        
        document.body.appendChild(offlineIndicator);
        
        // Create storage quota indicator
        const quotaIndicator = document.createElement('div');
        quotaIndicator.id = 'storage-quota-indicator';
        quotaIndicator.className = 'storage-quota-indicator hidden';
        
        document.body.appendChild(quotaIndicator);
        
        // Update initial state
        this.updateOfflineIndicators();
    }

    /**
     * Update offline UI indicators
     */
    updateOfflineIndicators() {
        const offlineIndicator = document.getElementById('offline-indicator');
        const syncStatus = offlineIndicator?.querySelector('.sync-status');
        
        if (offlineIndicator) {
            if (this.offlineState.isOfflineMode) {
                offlineIndicator.classList.remove('hidden');
                offlineIndicator.classList.add('visible');
                
                if (syncStatus) {
                    const pendingCount = this.syncQueue.length;
                    if (pendingCount > 0) {
                        syncStatus.textContent = `${pendingCount} pending`;
                        syncStatus.className = 'sync-status pending';
                    } else {
                        syncStatus.textContent = 'Up to date';
                        syncStatus.className = 'sync-status synced';
                    }
                }
            } else {
                offlineIndicator.classList.add('hidden');
                offlineIndicator.classList.remove('visible');
            }
        }
        
        // Update storage quota indicator
        this.updateStorageQuotaIndicator();
    }

    /**
     * Update storage quota indicator
     */
    updateStorageQuotaIndicator() {
        const quotaIndicator = document.getElementById('storage-quota-indicator');
        if (quotaIndicator && this.offlineState.storageQuotaAvailable > 0) {
            const usagePercent = (this.offlineState.storageQuotaUsed / this.offlineState.storageQuotaAvailable) * 100;
            
            if (usagePercent > 70) {
                quotaIndicator.innerHTML = `
                    <div class="quota-warning">
                        Storage: ${usagePercent.toFixed(1)}% used
                        <button onclick="offlineManager.cleanupOldData()" class="cleanup-btn">Clean Up</button>
                    </div>
                `;
                quotaIndicator.classList.remove('hidden');
            } else {
                quotaIndicator.classList.add('hidden');
            }
        }
    }

    /**
     * Check service worker status and cache health
     */
    async checkServiceWorkerStatus() {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    this.offlineState.cacheStatus = 'available';
                    
                    // Check cache health
                    const cacheNames = await caches.keys();
                    console.log('Available caches:', cacheNames);
                    
                } else {
                    this.offlineState.cacheStatus = 'unavailable';
                    console.warn('Service worker not registered');
                }
            } else {
                this.offlineState.cacheStatus = 'unsupported';
                console.warn('Service workers not supported');
            }
        } catch (error) {
            this.offlineState.cacheStatus = 'error';
            console.error('Service worker check failed:', error);
        }
    }

    /**
     * Start background sync process
     */
    async startBackgroundSync() {
        if (!this.isOnline || this.syncQueue.length === 0) {
            return;
        }
        
        console.log(`Starting background sync for ${this.syncQueue.length} items`);
        this.notifyObservers('sync-started', { queueLength: this.syncQueue.length });
        
        await this.processSyncQueue();
    }

    /**
     * Process the sync queue
     */
    async processSyncQueue() {
        const maxConcurrent = 3;
        const processing = [];
        
        while (this.syncQueue.length > 0 && processing.length < maxConcurrent) {
            const item = this.syncQueue.shift();
            processing.push(this.processSyncItem(item));
        }
        
        if (processing.length > 0) {
            try {
                await Promise.allSettled(processing);
                this.offlineState.pendingSync = this.syncQueue.length;
                this.updateOfflineIndicators();
                
                if (this.syncQueue.length === 0) {
                    this.notifyObservers('sync-completed', this.offlineState);
                }
            } catch (error) {
                console.error('Sync processing error:', error);
            }
        }
    }

    /**
     * Process individual sync item
     */
    async processSyncItem(item) {
        try {
            console.log('Processing sync item:', item.type, item.id);
            
            switch (item.type) {
                case 'song-save':
                    await this.syncSongSave(item);
                    break;
                case 'song-delete':
                    await this.syncSongDelete(item);
                    break;
                case 'config-update':
                    await this.syncConfigUpdate(item);
                    break;
                default:
                    console.warn('Unknown sync item type:', item.type);
            }
            
            console.log('Sync item completed:', item.id);
            
        } catch (error) {
            console.error('Failed to process sync item:', item.id, error);
            
            // Re-queue if it's a temporary error
            if (this.isTemporaryError(error)) {
                item.retryCount = (item.retryCount || 0) + 1;
                if (item.retryCount < 3) {
                    this.syncQueue.push(item);
                }
            }
        }
    }

    /**
     * Add item to sync queue
     */
    addToSyncQueue(type, data, options = {}) {
        const item = {
            id: Utils.generateId(),
            type,
            data,
            timestamp: Date.now(),
            retryCount: 0,
            ...options
        };
        
        this.syncQueue.push(item);
        this.offlineState.pendingSync = this.syncQueue.length;
        
        console.log(`Added to sync queue: ${type}`, item.id);
        this.updateOfflineIndicators();
        
        // Try immediate sync if online
        if (this.isOnline) {
            setTimeout(async () => await this.processSyncQueue(), 1000);
        }
        
        return item.id;
    }

    /**
     * Enhanced save with offline support
     */
    async saveOffline(key, data, options = {}) {
        try {
            // Save to offline storage first
            await this.offlineStorageManager.setItem(key, data);
            
            // Add to sync queue if online sync is needed
            if (options.syncOnline) {
                this.addToSyncQueue('data-save', { key, data }, options);
            }
            
            return true;
        } catch (error) {
            console.error('Offline save failed:', error);
            throw error;
        }
    }

    /**
     * Enhanced load with offline support
     */
    async loadOffline(key, defaultValue = null) {
        try {
            return await this.offlineStorageManager.getItem(key, defaultValue);
        } catch (error) {
            console.error('Offline load failed:', error);
            return defaultValue;
        }
    }

    /**
     * Cleanup old data to free space
     */
    async cleanupOldData() {
        try {
            console.log('Starting data cleanup...');
            
            // Clear old dynamic caches
            const cacheNames = await caches.keys();
            const oldCaches = cacheNames.filter(name => 
                name.includes('dynamic') && !name.includes(new Date().getFullYear())
            );
            
            for (const cacheName of oldCaches) {
                await caches.delete(cacheName);
                console.log('Deleted old cache:', cacheName);
            }
            
            // Cleanup old offline data
            if (this.offlineStorageManager) {
                await this.offlineStorageManager.cleanup();
            }
            
            // Update storage usage
            await this.initializeStorageQuota();
            
            Utils.createSuccessNotification('Storage cleanup completed');
            this.notifyObservers('cleanup-completed', this.offlineState);
            
        } catch (error) {
            console.error('Cleanup failed:', error);
            Utils.createErrorNotification('Storage cleanup failed');
        }
    }

    /**
     * Handle offline-specific errors
     */
    handleOfflineError(context, error) {
        console.error(`Offline error (${context}):`, error);
        
        const errorData = {
            context,
            error: error.message,
            timestamp: Date.now(),
            offlineState: this.offlineState
        };
        
        // Store error for later sync
        this.addToSyncQueue('error-report', errorData);
        
        // Show user-friendly message
        const messages = {
            'initialization': 'Offline features may be limited',
            'storage': 'Data may not be saved permanently',
            'sync': 'Some changes may not sync until online',
            'quota': 'Storage space is running low'
        };
        
        const message = messages[context] || 'An offline error occurred';
        Utils.createWarningNotification(message);
        
        this.notifyObservers('offline-error', errorData);
    }

    /**
     * Check if error is temporary (should retry)
     */
    isTemporaryError(error) {
        const temporaryErrors = [
            'NetworkError',
            'TimeoutError',
            'AbortError',
            'fetch'
        ];
        
        return temporaryErrors.some(type => 
            error.name.includes(type) || error.message.includes(type)
        );
    }

    /**
     * Get comprehensive offline status
     */
    getOfflineStatus() {
        return {
            ...this.offlineState,
            syncQueueLength: this.syncQueue.length,
            storageType: this.offlineStorageManager?.currentStorage,
            cacheHealth: this.offlineState.cacheStatus,
            lastUpdated: Date.now()
        };
    }

    /**
     * Force sync attempt
     */
    async forcSync() {
        if (!this.isOnline) {
            Utils.createWarningNotification('Cannot sync while offline');
            return false;
        }
        
        try {
            await this.startBackgroundSync();
            Utils.createSuccessNotification('Sync completed');
            return true;
        } catch (error) {
            Utils.createErrorNotification('Sync failed');
            return false;
        }
    }

    /**
     * Add observer for offline events
     */
    addObserver(callback) {
        this.observers.add(callback);
    }

    /**
     * Remove observer
     */
    removeObserver(callback) {
        this.observers.delete(callback);
    }

    /**
     * Notify observers of offline events
     */
    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Observer error:', error);
            }
        });
    }

    /**
     * Format bytes for display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Sync methods for different data types
     */
    async syncSongSave(item) {
        // Implementation would sync with server
        console.log('Syncing song save:', item.data);
    }

    async syncSongDelete(item) {
        // Implementation would sync deletion with server
        console.log('Syncing song deletion:', item.data);
    }

    async syncConfigUpdate(item) {
        // Implementation would sync config with server
        console.log('Syncing config update:', item.data);
    }
}

// Export for use in other modules
window.OfflineManager = OfflineManager;