// DrumHelper Configuration Management Module

/**
 * ConfigManager handles application settings and user preferences
 */
class ConfigManager {
    constructor() {
        this.configKey = 'drumhelper-config';
        this.defaultConfig = {
            // Audio Settings
            audio: {
                metronomeEnabled: true,
                voiceEnabled: true,
                selectedVoiceName: null,
                volume: 0.7,
                beatFrequency: 800,
                downbeatFrequency: 1200,
                soundEnabled: true
            },
            
            // Visual Settings
            visual: {
                beatFlashEnabled: true,
                darkMode: true,
                theme: 'default',
                fontSize: 'medium',
                reduceMotion: false
            },
            
            // Playback Settings
            playback: {
                defaultTempo: 120,
                autoAdvance: false,
                loopMode: false,
                countInBeats: 0,
                autoSave: true
            },
            
            // UI Settings
            ui: {
                compactMode: false,
                showAdvancedOptions: false,
                confirmDeletions: true,
                showTips: true,
                language: 'en'
            },
            
            // Data Settings
            data: {
                autoExport: false,
                exportInterval: 7, // days
                maxStoredSongs: 100,
                compressionEnabled: true
            },
            
            // Privacy Settings
            privacy: {
                analyticsEnabled: false,
                crashReportingEnabled: true,
                usageStatistics: false,
                shareAnonymousData: false
            },
            
            // Advanced Settings
            advanced: {
                debugMode: false,
                performanceMode: false,
                experimentalFeatures: false,
                customCSSEnabled: false
            },
            
            // Version tracking
            version: '2.0.0',
            lastUpdated: new Date().toISOString(),
            firstInstall: new Date().toISOString()
        };
        
        this.config = { ...this.defaultConfig };
        this.observers = new Set();
        this.loadConfig();
        this.setupEventListeners();
    }

    /**
     * Load configuration from storage
     */
    loadConfig() {
        try {
            const support = Utils.checkBrowserSupport();
            if (!support.localStorage) {
                console.warn('localStorage not available, using default config');
                return;
            }

            const stored = localStorage.getItem(this.configKey);
            if (stored) {
                const parsedConfig = JSON.parse(stored);
                
                // Merge with defaults to handle new settings
                this.config = this.mergeConfigs(this.defaultConfig, parsedConfig);
                
                // Handle version upgrades
                this.handleVersionUpgrade(parsedConfig.version);
                
                console.log('Configuration loaded successfully');
            } else {
                // First time setup
                this.config.firstInstall = new Date().toISOString();
                this.saveConfig();
                console.log('Default configuration created');
            }
        } catch (error) {
            console.error('Failed to load configuration:', error);
            Utils.createErrorNotification('Failed to load settings, using defaults');
            this.config = { ...this.defaultConfig };
        }
    }

    /**
     * Save configuration to storage
     */
    saveConfig() {
        try {
            const support = Utils.checkBrowserSupport();
            if (!support.localStorage) {
                console.warn('localStorage not available, cannot save config');
                return false;
            }

            this.config.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.configKey, JSON.stringify(this.config));
            
            // Notify observers
            this.notifyObservers('config-saved', this.config);
            
            return true;
        } catch (error) {
            console.error('Failed to save configuration:', error);
            Utils.createErrorNotification('Failed to save settings');
            return false;
        }
    }

    /**
     * Merge configurations, preserving structure
     */
    mergeConfigs(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };
        
        for (const [section, values] of Object.entries(userConfig)) {
            if (merged[section] && typeof values === 'object' && !Array.isArray(values)) {
                merged[section] = { ...merged[section], ...values };
            } else {
                merged[section] = values;
            }
        }
        
        return merged;
    }

    /**
     * Handle configuration upgrades between versions
     */
    handleVersionUpgrade(oldVersion) {
        if (!oldVersion || oldVersion === this.config.version) {
            return;
        }
        
        console.log(`Upgrading config from ${oldVersion} to ${this.config.version}`);
        
        // Version-specific upgrade logic
        const upgrades = {
            '1.0.0': () => {
                // Example: Add new settings for v2.0.0
                if (!this.config.privacy) {
                    this.config.privacy = this.defaultConfig.privacy;
                }
                if (!this.config.advanced) {
                    this.config.advanced = this.defaultConfig.advanced;
                }
            }
        };
        
        // Apply upgrades in sequence
        Object.keys(upgrades)
            .sort()
            .filter(version => this.compareVersions(oldVersion, version) < 0)
            .forEach(version => upgrades[version]());
        
        this.config.version = this.defaultConfig.version;
        this.saveConfig();
        
        Utils.createSuccessNotification('Settings updated for new version');
    }

    /**
     * Compare version strings (simple semantic versioning)
     */
    compareVersions(a, b) {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            
            if (aPart < bPart) return -1;
            if (aPart > bPart) return 1;
        }
        
        return 0;
    }

    /**
     * Get a configuration value
     */
    get(path, defaultValue = null) {
        try {
            const parts = path.split('.');
            let current = this.config;
            
            for (const part of parts) {
                if (current[part] === undefined) {
                    return defaultValue;
                }
                current = current[part];
            }
            
            return current;
        } catch (error) {
            console.error('Failed to get config value:', error);
            return defaultValue;
        }
    }

    /**
     * Set a configuration value
     */
    set(path, value, saveImmediately = true) {
        try {
            const parts = path.split('.');
            const lastPart = parts.pop();
            let current = this.config;
            
            // Navigate to the parent object
            for (const part of parts) {
                if (!current[part] || typeof current[part] !== 'object') {
                    current[part] = {};
                }
                current = current[part];
            }
            
            // Set the value
            const oldValue = current[lastPart];
            current[lastPart] = value;
            
            // Save if requested
            if (saveImmediately) {
                this.saveConfig();
            }
            
            // Notify observers
            this.notifyObservers('config-changed', {
                path,
                oldValue,
                newValue: value
            });
            
            return true;
        } catch (error) {
            console.error('Failed to set config value:', error);
            return false;
        }
    }

    /**
     * Reset configuration to defaults
     */
    reset(section = null) {
        try {
            if (section) {
                if (this.defaultConfig[section]) {
                    this.config[section] = { ...this.defaultConfig[section] };
                }
            } else {
                this.config = { ...this.defaultConfig };
                this.config.firstInstall = new Date().toISOString();
            }
            
            this.saveConfig();
            this.notifyObservers('config-reset', { section });
            
            const message = section ? 
                `${section} settings reset to defaults` : 
                'All settings reset to defaults';
            Utils.createSuccessNotification(message);
            
            return true;
        } catch (error) {
            console.error('Failed to reset configuration:', error);
            return false;
        }
    }

    /**
     * Export configuration
     */
    export() {
        try {
            const exportData = {
                version: this.config.version,
                exportDate: new Date().toISOString(),
                config: this.config
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `drumhelper-config-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            Utils.createSuccessNotification('Configuration exported successfully');
            
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            Utils.createErrorNotification('Failed to export configuration');
            return false;
        }
    }

    /**
     * Import configuration
     */
    import(file) {
        if (!file) {
            Utils.createErrorNotification('No file selected');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (!importData.config) {
                    console.error('Import error: Invalid configuration file format');
                    Utils.createErrorNotification('Failed to import configuration');
                    return;
                }
                
                const shouldMerge = confirm(
                    'Do you want to merge with current settings?\n\n' +
                    'OK = Merge (keep current preferences)\n' +
                    'Cancel = Replace all settings'
                );
                
                if (shouldMerge) {
                    this.config = this.mergeConfigs(this.config, importData.config);
                } else {
                    this.config = this.mergeConfigs(this.defaultConfig, importData.config);
                }
                
                this.config.version = this.defaultConfig.version;
                this.saveConfig();
                this.notifyObservers('config-imported', importData);
                
                Utils.createSuccessNotification('Configuration imported successfully');
                
            } catch (error) {
                console.error('Import error:', error);
                Utils.createErrorNotification('Failed to import configuration');
            }
        };
        
        reader.onerror = () => {
            Utils.createErrorNotification('Failed to read configuration file');
        };
        
        reader.readAsText(file);
    }

    /**
     * Get all configuration as a read-only object
     */
    getAll() {
        return Object.freeze(JSON.parse(JSON.stringify(this.config)));
    }

    /**
     * Validate configuration values
     */
    validate(path, value) {
        const validators = {
            'audio.volume': (v) => typeof v === 'number' && v >= 0 && v <= 1,
            'audio.beatFrequency': (v) => typeof v === 'number' && v >= 200 && v <= 2000,
            'audio.downbeatFrequency': (v) => typeof v === 'number' && v >= 200 && v <= 2000,
            'playback.defaultTempo': (v) => typeof v === 'number' && v >= 60 && v <= 200,
            'playback.countInBeats': (v) => typeof v === 'number' && v >= 0 && v <= 8,
            'data.maxStoredSongs': (v) => typeof v === 'number' && v >= 10 && v <= 1000,
            'data.exportInterval': (v) => typeof v === 'number' && v >= 1 && v <= 365
        };
        
        const validator = validators[path];
        return validator ? validator(value) : true;
    }

    /**
     * Add observer for configuration changes
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
     * Notify all observers of changes
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
     * Setup event listeners for system preferences
     */
    setupEventListeners() {
        // Dark mode preference
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', (e) => {
                if (this.get('visual.theme') === 'auto') {
                    this.notifyObservers('system-theme-changed', { 
                        isDark: e.matches 
                    });
                }
            });
            
            // Reduced motion preference
            const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            motionQuery.addEventListener('change', (e) => {
                this.set('visual.reduceMotion', e.matches, false);
                this.notifyObservers('system-motion-changed', { 
                    reduceMotion: e.matches 
                });
            });
        }
        
        // Online/offline status
        window.addEventListener('online', () => {
            this.notifyObservers('connection-changed', { online: true });
        });
        
        window.addEventListener('offline', () => {
            this.notifyObservers('connection-changed', { online: false });
        });
    }

    /**
     * Apply configuration to the application
     */
    applyConfig() {
        // Apply visual settings
        document.documentElement.style.setProperty(
            '--user-font-size', 
            this.getFontSizeValue(this.get('visual.fontSize'))
        );
        
        // Apply reduced motion
        if (this.get('visual.reduceMotion')) {
            document.documentElement.style.setProperty('--animation-duration', '0.01ms');
            document.documentElement.style.setProperty('--transition-duration', '0.01ms');
        }
        
        // Apply theme
        this.applyTheme(this.get('visual.theme'));
        
        // Notify that config has been applied
        this.notifyObservers('config-applied', this.config);
    }

    /**
     * Apply theme configuration
     */
    applyTheme(theme) {
        const themes = {
            'light': () => document.documentElement.classList.add('light-theme'),
            'dark': () => document.documentElement.classList.add('dark-theme'),
            'auto': () => {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
            }
        };
        
        // Remove existing theme classes
        document.documentElement.classList.remove('light-theme', 'dark-theme');
        
        // Apply selected theme
        if (themes[theme]) {
            themes[theme]();
        }
    }

    /**
     * Get font size value for CSS
     */
    getFontSizeValue(size) {
        const sizes = {
            'small': '0.875rem',
            'medium': '1rem',
            'large': '1.125rem',
            'extra-large': '1.25rem'
        };
        
        return sizes[size] || sizes.medium;
    }
}

// Export for use in other modules
window.ConfigManager = ConfigManager;