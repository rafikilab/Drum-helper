// DrumHelper PWA Manager - Self-contained PWA functionality

/**
 * PWAManager handles all PWA-specific functionality for offline operation
 * Ensures the app works perfectly offline once installed on phone
 */
class PWAManager {
    constructor() {
        this.isInstalled = false;
        this.installPrompt = null;
        this.storageManager = null;
        this.audioManager = null;
        this.configManager = null;
        
        this.pwaState = {
            isInstalled: this.checkInstallationStatus(),
            storageAvailable: 0,
            storageUsed: 0,
            audioReady: false,
            cacheReady: false,
            lastUpdate: null
        };
        
        this.initialize().catch(error => {
            console.error('Failed to initialize PWA manager:', error);
        });
    }

    /**
     * Initialize PWA functionality
     */
    async initialize() {
        try {
            console.log('Initializing PWA Manager for offline operation...');
            
            // Check if running as installed PWA
            this.checkInstallationStatus();
            
            // Initialize storage for offline data
            await this.initializeOfflineStorage();
            
            // Initialize offline audio capabilities  
            await this.initializeOfflineAudio();
            
            // Setup PWA event listeners
            this.setupPWAEventListeners();
            
            // Check storage quota
            await this.checkStorageQuota();
            
            // Validate cache status
            await this.validateCacheStatus();
            
            // Track session start
            this.trackSession();
            
            console.log('PWA Manager initialized for offline use');
            console.log('PWA State:', this.pwaState);
            
        } catch (error) {
            console.error('PWA initialization failed:', error);
            // Continue with degraded functionality
        }
    }

    /**
     * Check if app is installed as PWA
     */
    checkInstallationStatus() {
        // Check if running in standalone mode (installed PWA)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone || 
                            document.referrer.includes('android-app://');
        
        this.isInstalled = isStandalone;
        this.pwaState.isInstalled = isStandalone;
        
        if (isStandalone) {
            console.log('Running as installed PWA');
            document.body.classList.add('pwa-installed');
        }
        
        return isStandalone;
    }

    /**
     * Initialize offline storage systems
     */
    async initializeOfflineStorage() {
        try {
            // Test localStorage availability
            localStorage.setItem('pwa-test', 'test');
            localStorage.removeItem('pwa-test');
            console.log('localStorage available for offline storage');
            
            // Test IndexedDB if available
            if ('indexedDB' in window) {
                console.log('IndexedDB available for advanced offline storage');
            }
            
            return true;
        } catch (error) {
            console.warn('Storage initialization failed:', error);
            return false;
        }
    }

    /**
     * Initialize offline audio capabilities
     */
    async initializeOfflineAudio() {
        try {
            // Test Web Audio API
            if ('AudioContext' in window || 'webkitAudioContext' in window) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                const testContext = new AudioContextClass();
                
                this.pwaState.audioReady = true;
                console.log('Web Audio API available for offline audio generation');
                
                // Clean up test context
                if (testContext.state !== 'closed') {
                    await testContext.close();
                }
            } else {
                console.warn('Web Audio API not available - falling back to HTML5 audio');
            }
            
            return this.pwaState.audioReady;
        } catch (error) {
            console.warn('Audio initialization failed:', error);
            return false;
        }
    }

    /**
     * Setup PWA-specific event listeners
     */
    setupPWAEventListeners() {
        // Install prompt handling
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.installPrompt = event;
            this.showInstallButton();
        });

        // App installed event
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            this.isInstalled = true;
            this.pwaState.isInstalled = true;
            this.hideInstallButton();
            this.trackInstallation();
        });

        // Visibility change (app focus/blur)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.handleAppResume();
            } else {
                this.handleAppPause();
            }
        });

        // Orientation change for mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 100);
        });

        // Handle back button on mobile
        window.addEventListener('popstate', (event) => {
            if (this.isInstalled) {
                this.handleBackButton(event);
            }
        });
    }

    /**
     * Check available storage quota
     */
    async checkStorageQuota() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                this.pwaState.storageAvailable = estimate.quota || 0;
                this.pwaState.storageUsed = estimate.usage || 0;
                
                const availableMB = Math.round(estimate.quota / 1024 / 1024);
                const usedMB = Math.round(estimate.usage / 1024 / 1024);
                
                console.log(`Storage: ${usedMB}MB used / ${availableMB}MB available`);
                
                // Warn if storage is getting full
                if (estimate.usage / estimate.quota > 0.8) {
                    this.showStorageWarning();
                }
            }
        } catch (error) {
            console.warn('Storage quota check failed:', error);
        }
    }

    /**
     * Validate service worker cache status
     */
    async validateCacheStatus() {
        try {
            if ('serviceWorker' in navigator && 'caches' in window) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    const cacheNames = await caches.keys();
                    this.pwaState.cacheReady = cacheNames.length > 0;
                    console.log(`Cache status: ${cacheNames.length} caches available`);
                } else {
                    console.warn('Service Worker not registered');
                }
            }
        } catch (error) {
            console.warn('Cache validation failed:', error);
        }
    }

    /**
     * Show install button for non-installed users
     */
    showInstallButton() {
        if (this.isInstalled) return;
        
        const installButton = document.createElement('button');
        installButton.id = 'pwa-install-btn';
        installButton.className = 'btn btn-primary install-prompt';
        installButton.innerHTML = '📱 Install App';
        installButton.setAttribute('aria-label', 'Install DrumHelper as a PWA');
        
        installButton.addEventListener('click', () => {
            this.promptInstall();
        });
        
        // Add to header or controls area
        const header = document.querySelector('.header') || document.querySelector('.controls');
        if (header) {
            header.appendChild(installButton);
        }
    }

    /**
     * Hide install button after installation
     */
    hideInstallButton() {
        const installButton = document.getElementById('pwa-install-btn');
        if (installButton) {
            installButton.remove();
        }
    }

    /**
     * Prompt user to install PWA
     */
    async promptInstall() {
        if (!this.installPrompt) return;
        
        try {
            this.installPrompt.prompt();
            const choice = await this.installPrompt.userChoice;
            
            if (choice.outcome === 'accepted') {
                console.log('User accepted PWA install');
            } else {
                console.log('User dismissed PWA install');
            }
            
            this.installPrompt = null;
        } catch (error) {
            console.error('Install prompt failed:', error);
        }
    }

    /**
     * Handle app resume (when app comes into focus)
     */
    handleAppResume() {
        console.log('PWA resumed');
        this.pwaState.lastUpdate = Date.now();
        
        // Check if audio context needs resuming
        if (window.drumHelper?.audioManager?.audioContext) {
            const ctx = window.drumHelper.audioManager.audioContext;
            if (ctx.state === 'suspended') {
                ctx.resume().catch(console.warn);
            }
        }
    }

    /**
     * Handle app pause (when app goes to background)
     */
    handleAppPause() {
        console.log('PWA paused');
        
        // Save any pending data
        if (window.drumHelper?.storageManager) {
            window.drumHelper.storageManager.saveSongs();
        }
    }

    /**
     * Handle device orientation changes
     */
    handleOrientationChange() {
        console.log('Orientation changed');
        
        // Trigger layout recalculation
        window.dispatchEvent(new Event('resize'));
        
        // Update any UI elements that depend on orientation
        const controls = document.querySelector('.controls');
        if (controls && window.innerHeight < window.innerWidth) {
            controls.classList.add('landscape');
        } else if (controls) {
            controls.classList.remove('landscape');
        }
    }

    /**
     * Handle back button on mobile PWA
     */
    handleBackButton(event) {
        // Prevent default back navigation that would close PWA
        if (window.history.length <= 1) {
            event.preventDefault();
            
            // Show exit confirmation
            if (confirm('Exit DrumHelper?')) {
                window.close();
            } else {
                window.history.pushState(null, '', window.location.href);
            }
        }
    }

    /**
     * Show storage warning when quota is low
     */
    showStorageWarning() {
        const warning = document.createElement('div');
        warning.id = 'storage-warning';
        warning.className = 'notification warning';
        warning.innerHTML = `
            <div class="notification-content">
                ⚠️ Storage space is running low. Consider deleting old songs.
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-small">OK</button>
            </div>
        `;
        
        document.body.appendChild(warning);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (warning.parentElement) {
                warning.remove();
            }
        }, 10000);
    }

    /**
     * Track PWA session
     */
    trackSession() {
        const sessionData = {
            timestamp: Date.now(),
            isInstalled: this.isInstalled,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`
        };
        
        // Store session data locally
        try {
            const sessions = JSON.parse(localStorage.getItem('drumhelper-sessions') || '[]');
            sessions.push(sessionData);
            
            // Keep only last 50 sessions
            if (sessions.length > 50) {
                sessions.splice(0, sessions.length - 50);
            }
            
            localStorage.setItem('drumhelper-sessions', JSON.stringify(sessions));
        } catch (error) {
            console.warn('Session tracking failed:', error);
        }
    }

    /**
     * Track PWA installation
     */
    trackInstallation() {
        try {
            const installData = {
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                platform: navigator.platform
            };
            
            localStorage.setItem('drumhelper-install-date', JSON.stringify(installData));
            console.log('PWA installation tracked');
        } catch (error) {
            console.warn('Install tracking failed:', error);
        }
    }

    /**
     * Get PWA status for debugging
     */
    getPWAStatus() {
        return {
            isInstalled: this.isInstalled,
            state: this.pwaState,
            canInstall: !!this.installPrompt,
            hasServiceWorker: 'serviceWorker' in navigator,
            hasCaches: 'caches' in window,
            hasNotifications: 'Notification' in window,
            hasStorage: 'localStorage' in window,
            hasIndexedDB: 'indexedDB' in window,
            hasWebAudio: 'AudioContext' in window || 'webkitAudioContext' in window
        };
    }

    /**
     * Force update PWA cache (if needed)
     */
    async updatePWACache() {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.update();
                    console.log('PWA cache updated');
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Cache update failed:', error);
            return false;
        }
    }

    /**
     * Clear PWA data (for troubleshooting)
     */
    async clearPWAData() {
        try {
            // Clear localStorage
            localStorage.clear();
            
            // Clear caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            
            console.log('PWA data cleared');
            return true;
        } catch (error) {
            console.error('Data clearing failed:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.PWAManager = PWAManager;