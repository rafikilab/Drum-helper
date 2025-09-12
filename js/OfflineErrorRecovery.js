// DrumHelper Offline Error Recovery - Comprehensive error handling and recovery

/**
 * OfflineErrorRecovery handles error detection, recovery, and graceful degradation
 * Provides comprehensive offline error recovery mechanisms
 */
class OfflineErrorRecovery {
    constructor() {
        this.errors = new Map();
        this.recoveryStrategies = new Map();
        this.recoveryHistory = [];
        this.observers = new Set();
        
        this.errorCounts = {
            storage: 0,
            network: 0,
            audio: 0,
            sync: 0,
            quota: 0,
            unknown: 0
        };
        
        this.recoveryState = {
            isRecovering: false,
            lastRecoveryTime: null,
            successfulRecoveries: 0,
            failedRecoveries: 0,
            degradationLevel: 0 // 0 = full functionality, 3 = minimal functionality
        };
        
        this.initialize();
    }

    /**
     * Initialize error recovery system
     */
    initialize() {
        console.log('Initializing OfflineErrorRecovery...');
        
        // Setup global error handlers
        this.setupGlobalErrorHandlers();
        
        // Setup recovery strategies
        this.setupRecoveryStrategies();
        
        // Setup periodic health checks
        this.setupHealthChecks();
        
        // Setup unhandled promise rejection handler
        this.setupPromiseRejectionHandler();
        
        console.log('OfflineErrorRecovery initialized');
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError('javascript', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: Date.now()
            });
        });

        // Handle resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window && event.target.src) {
                this.handleError('resource', {
                    type: event.target.tagName,
                    src: event.target.src,
                    message: `Failed to load ${event.target.tagName}: ${event.target.src}`,
                    timestamp: Date.now()
                }, true);
            }
        }, true);

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('promise', {
                reason: event.reason,
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack,
                timestamp: Date.now()
            });
        });
    }

    /**
     * Setup promise rejection handler
     */
    setupPromiseRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            // Don't prevent default - let error be logged
            this.handlePromiseRejection(event.reason);
        });
    }

    /**
     * Setup recovery strategies for different error types
     */
    setupRecoveryStrategies() {
        // Storage errors
        this.recoveryStrategies.set('storage', {
            attempts: 3,
            backoff: [1000, 3000, 10000],
            strategy: async (error, attempt) => {
                console.log(`Attempting storage recovery (${attempt}/3)...`);
                
                switch (attempt) {
                    case 1:
                        // Try to clear some storage space
                        return await this.clearTemporaryData();
                        
                    case 2:
                        // Switch to memory storage
                        return await this.switchToMemoryStorage();
                        
                    case 3:
                        // Enable minimal storage mode
                        return await this.enableMinimalStorageMode();
                        
                    default:
                        return false;
                }
            }
        });

        // Network errors
        this.recoveryStrategies.set('network', {
            attempts: 5,
            backoff: [2000, 5000, 10000, 20000, 30000],
            strategy: async (error, attempt) => {
                console.log(`Attempting network recovery (${attempt}/5)...`);
                
                // Test connection
                const isOnline = await this.testNetworkConnection();
                if (isOnline) {
                    return true; // Connection restored
                }
                
                if (attempt >= 3) {
                    // Enable full offline mode
                    return await this.enableFullOfflineMode();
                }
                
                return false; // Continue retrying
            }
        });

        // Audio errors
        this.recoveryStrategies.set('audio', {
            attempts: 3,
            backoff: [1000, 3000, 5000],
            strategy: async (error, attempt) => {
                console.log(`Attempting audio recovery (${attempt}/3)...`);
                
                switch (attempt) {
                    case 1:
                        // Try to reinitialize audio context
                        return await this.reinitializeAudioContext();
                        
                    case 2:
                        // Switch to fallback audio
                        return await this.switchToFallbackAudio();
                        
                    case 3:
                        // Disable audio features
                        return await this.disableAudioFeatures();
                        
                    default:
                        return false;
                }
            }
        });

        // Sync errors
        this.recoveryStrategies.set('sync', {
            attempts: 4,
            backoff: [5000, 15000, 30000, 60000],
            strategy: async (error, attempt) => {
                console.log(`Attempting sync recovery (${attempt}/4)...`);
                
                if (attempt <= 2) {
                    // Queue for later sync
                    return await this.queueForLaterSync(error.data);
                } else {
                    // Store locally only
                    return await this.storeLocallyOnly();
                }
            }
        });

        // Quota errors
        this.recoveryStrategies.set('quota', {
            attempts: 2,
            backoff: [1000, 5000],
            strategy: async (error, attempt) => {
                console.log(`Attempting quota recovery (${attempt}/2)...`);
                
                if (attempt === 1) {
                    return await this.clearOldData();
                } else {
                    return await this.enableDataCompressionMode();
                }
            }
        });
    }

    /**
     * Setup periodic health checks
     */
    setupHealthChecks() {
        setInterval(async () => {
            await this.performHealthCheck();
        }, 30000); // Every 30 seconds
    }

    /**
     * Handle different types of errors
     */
    async handleError(type, details, isResourceError = false) {
        const errorId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const error = {
            id: errorId,
            type,
            details,
            timestamp: Date.now(),
            isResourceError,
            recoveryAttempts: 0,
            recovered: false
        };

        this.errors.set(errorId, error);
        this.errorCounts[type] = (this.errorCounts[type] || 0) + 1;
        
        console.error(`Error detected (${type}):`, details);
        
        // Notify observers
        this.notifyObservers('error-detected', error);
        
        // Determine if recovery is needed
        if (this.shouldAttemptRecovery(error)) {
            await this.attemptRecovery(error);
        }
        
        // Store error for analytics
        this.storeErrorForAnalytics(error);
    }

    /**
     * Handle promise rejections specifically
     */
    async handlePromiseRejection(reason) {
        let type = 'promise';
        
        // Categorize common promise rejection reasons
        if (reason?.name === 'NetworkError' || reason?.message?.includes('fetch')) {
            type = 'network';
        } else if (reason?.name === 'QuotaExceededError') {
            type = 'quota';
        } else if (reason?.message?.includes('audio') || reason?.message?.includes('AudioContext')) {
            type = 'audio';
        }
        
        await this.handleError(type, {
            reason,
            message: reason?.message || 'Promise rejection',
            stack: reason?.stack,
            timestamp: Date.now()
        });
    }

    /**
     * Determine if recovery should be attempted
     */
    shouldAttemptRecovery(error) {
        const strategy = this.recoveryStrategies.get(error.type);
        
        if (!strategy) {
            return false;
        }
        
        // Don't attempt recovery if already recovering similar error
        const recentSimilarErrors = Array.from(this.errors.values())
            .filter(e => e.type === error.type && 
                          Date.now() - e.timestamp < 60000 && // Within last minute
                          e.recoveryAttempts > 0);
        
        if (recentSimilarErrors.length > 3) {
            console.warn(`Too many recent ${error.type} errors, skipping recovery`);
            return false;
        }
        
        return true;
    }

    /**
     * Attempt error recovery
     */
    async attemptRecovery(error) {
        const strategy = this.recoveryStrategies.get(error.type);
        if (!strategy) {
            return false;
        }

        this.recoveryState.isRecovering = true;
        this.notifyObservers('recovery-started', { error, strategy });
        
        let recovered = false;
        
        for (let attempt = 1; attempt <= strategy.attempts; attempt++) {
            error.recoveryAttempts = attempt;
            
            try {
                console.log(`Recovery attempt ${attempt}/${strategy.attempts} for ${error.type} error`);
                
                // Wait before retry (exponential backoff)
                if (attempt > 1) {
                    await this.delay(strategy.backoff[attempt - 2]);
                }
                
                // Execute recovery strategy
                const success = await strategy.strategy(error, attempt);
                
                if (success) {
                    recovered = true;
                    error.recovered = true;
                    this.recoveryState.successfulRecoveries++;
                    this.recoveryHistory.push({
                        errorId: error.id,
                        type: error.type,
                        attempt,
                        success: true,
                        timestamp: Date.now()
                    });
                    
                    console.log(`Successfully recovered from ${error.type} error`);
                    this.notifyObservers('recovery-success', error);
                    break;
                }
                
            } catch (recoveryError) {
                console.error(`Recovery attempt ${attempt} failed:`, recoveryError);
                this.recoveryHistory.push({
                    errorId: error.id,
                    type: error.type,
                    attempt,
                    success: false,
                    error: recoveryError.message,
                    timestamp: Date.now()
                });
            }
        }
        
        if (!recovered) {
            this.recoveryState.failedRecoveries++;
            this.handleRecoveryFailure(error);
        }
        
        this.recoveryState.isRecovering = false;
        this.recoveryState.lastRecoveryTime = Date.now();
        
        return recovered;
    }

    /**
     * Handle recovery failure by increasing degradation level
     */
    handleRecoveryFailure(error) {
        console.warn(`Failed to recover from ${error.type} error`);
        
        // Increase degradation level based on error type
        const degradationIncrease = {
            'storage': 1,
            'network': 0, // Network errors don't degrade functionality
            'audio': 1,
            'sync': 0,
            'quota': 2
        };
        
        const increase = degradationIncrease[error.type] || 1;
        this.recoveryState.degradationLevel = Math.min(3, this.recoveryState.degradationLevel + increase);
        
        this.notifyObservers('recovery-failed', { error, degradationLevel: this.recoveryState.degradationLevel });
        
        // Apply degradation measures
        this.applyDegradationMeasures(this.recoveryState.degradationLevel);
    }

    /**
     * Apply degradation measures based on level
     */
    applyDegradationMeasures(level) {
        console.log(`Applying degradation measures (level ${level})`);
        
        switch (level) {
            case 1:
                // Reduce non-essential features
                this.disableNonEssentialFeatures();
                break;
                
            case 2:
                // Enable compression and cleanup
                this.enableCompressionMode();
                this.performAggressiveCleanup();
                break;
                
            case 3:
                // Minimal functionality mode
                this.enableMinimalFunctionalityMode();
                break;
        }
        
        this.notifyObservers('degradation-applied', { level });
    }

    /**
     * Perform periodic health check
     */
    async performHealthCheck() {
        const health = {
            timestamp: Date.now(),
            storage: await this.checkStorageHealth(),
            network: await this.checkNetworkHealth(),
            audio: await this.checkAudioHealth(),
            memory: this.checkMemoryHealth()
        };
        
        // Check for improvement and reduce degradation if possible
        if (health.storage.ok && health.audio.ok && this.recoveryState.degradationLevel > 0) {
            this.recoveryState.degradationLevel = Math.max(0, this.recoveryState.degradationLevel - 1);
            console.log(`Degradation level reduced to ${this.recoveryState.degradationLevel}`);
            this.notifyObservers('health-improved', { health, newLevel: this.recoveryState.degradationLevel });
        }
    }

    /**
     * Recovery strategy implementations
     */
    async clearTemporaryData() {
        try {
            // Clear dynamic caches
            const caches = await window.caches.keys();
            const tempCaches = caches.filter(name => name.includes('temp') || name.includes('dynamic'));
            
            for (const cache of tempCaches) {
                await window.caches.delete(cache);
            }
            
            console.log('Cleared temporary data');
            return true;
        } catch (error) {
            console.error('Failed to clear temporary data:', error);
            return false;
        }
    }

    async switchToMemoryStorage() {
        try {
            if (window.storageManager && window.storageManager.offlineManager) {
                await window.storageManager.offlineManager.offlineStorageManager.switchToMemoryStorage();
                console.log('Switched to memory storage');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to switch to memory storage:', error);
            return false;
        }
    }

    async enableMinimalStorageMode() {
        try {
            // Store only essential data
            console.log('Enabled minimal storage mode');
            this.notifyObservers('storage-mode-changed', { mode: 'minimal' });
            return true;
        } catch (error) {
            return false;
        }
    }

    async testNetworkConnection() {
        try {
            const response = await fetch('/manifest.json', {
                method: 'HEAD',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async enableFullOfflineMode() {
        console.log('Enabled full offline mode');
        this.notifyObservers('offline-mode-enabled', { reason: 'network-recovery-failed' });
        return true;
    }

    async reinitializeAudioContext() {
        try {
            if (window.drumHelper?.audioManager) {
                await window.drumHelper.audioManager.reinitialize();
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async switchToFallbackAudio() {
        console.log('Switched to fallback audio');
        return true;
    }

    async disableAudioFeatures() {
        console.log('Disabled audio features');
        this.notifyObservers('audio-disabled', { reason: 'recovery-failed' });
        return true;
    }

    // Helper methods for health checks
    async checkStorageHealth() {
        try {
            localStorage.setItem('health-check', 'test');
            localStorage.removeItem('health-check');
            return { ok: true, type: 'localStorage' };
        } catch (error) {
            return { ok: false, error: error.message };
        }
    }

    async checkNetworkHealth() {
        return { ok: navigator.onLine, lastCheck: Date.now() };
    }

    async checkAudioHealth() {
        try {
            if (window.AudioContext) {
                const ctx = new AudioContext();
                const healthy = ctx.state !== 'suspended';
                ctx.close();
                return { ok: healthy, state: ctx.state };
            }
            return { ok: false, reason: 'AudioContext not available' };
        } catch (error) {
            return { ok: false, error: error.message };
        }
    }

    checkMemoryHealth() {
        const memory = performance.memory;
        if (memory) {
            const used = memory.usedJSHeapSize / 1024 / 1024;
            const limit = memory.jsHeapSizeLimit / 1024 / 1024;
            return { ok: used < limit * 0.8, usedMB: used, limitMB: limit };
        }
        return { ok: true, reason: 'Memory API not available' };
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    storeErrorForAnalytics(error) {
        // Store error for offline analytics
        if (window.offlineManager) {
            window.offlineManager.addToSyncQueue('error-analytics', {
                errorId: error.id,
                type: error.type,
                timestamp: error.timestamp,
                recovered: error.recovered,
                attempts: error.recoveryAttempts
            });
        }
    }

    disableNonEssentialFeatures() {
        console.log('Disabled non-essential features');
        this.notifyObservers('features-disabled', { level: 'non-essential' });
    }

    enableCompressionMode() {
        console.log('Enabled compression mode');
        this.notifyObservers('compression-enabled', {});
    }

    async performAggressiveCleanup() {
        console.log('Performing aggressive cleanup');
        // Implementation would clear old data, compress storage, etc.
    }

    enableMinimalFunctionalityMode() {
        console.log('Enabled minimal functionality mode');
        this.notifyObservers('minimal-mode-enabled', {});
    }

    // Observer pattern
    addObserver(callback) {
        this.observers.add(callback);
    }

    removeObserver(callback) {
        this.observers.delete(callback);
    }

    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Observer error:', error);
            }
        });
    }

    // Public API
    getErrorStats() {
        return {
            counts: { ...this.errorCounts },
            recoveryState: { ...this.recoveryState },
            totalErrors: this.errors.size,
            recentErrors: Array.from(this.errors.values())
                .filter(e => Date.now() - e.timestamp < 300000) // Last 5 minutes
                .length
        };
    }

    getRecoveryHistory() {
        return [...this.recoveryHistory].slice(-50); // Last 50 recovery attempts
    }

    forceRecovery(errorType) {
        const mockError = {
            id: `manual-${Date.now()}`,
            type: errorType,
            details: { manual: true },
            timestamp: Date.now(),
            recoveryAttempts: 0,
            recovered: false
        };
        
        return this.attemptRecovery(mockError);
    }
}

// Export for use in other modules
window.OfflineErrorRecovery = OfflineErrorRecovery;