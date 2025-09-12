// DrumHelper - Drummer Assistant PWA JavaScript (Modular Version)

class DrumHelper {
    constructor() {
        // Initialize core managers
        this.audioManager = new AudioManager();
        this.storageManager = new StorageManager();
        this.uiManager = new UIManager();
        this.songManager = new SongManager(this.audioManager, this.uiManager);
        
        // Initialize PWA support
        this.pwaManager = null;
        this.configManager = null;
        
        // State
        this.currentSongId = null;
        
        // Initialize application
        this.initializeOfflineSupport();
        this.bindEvents();
        this.loadSongData();
        this.displaySavedSongs();
    }

    /**
     * Initialize PWA and offline functionality
     */
    async initializeOfflineSupport() {
        try {
            // Initialize PWA manager for offline operation
            this.pwaManager = new PWAManager();
            await this.pwaManager.initialize();
            
            // Initialize configuration management
            this.configManager = new ConfigManager();
            await this.configManager.applyConfig();
            
            // Initialize advanced audio features for offline use
            if (window.AdvancedAudioManager) {
                const advancedAudio = new AdvancedAudioManager();
                await advancedAudio.initialize();
                this.audioManager.setAdvancedFeatures(advancedAudio);
            }
            
            console.log('PWA offline support initialized');
            
        } catch (error) {
            console.warn('Failed to initialize PWA support:', error);
            // Continue with basic functionality
        }
    }

    bindEvents() {
        // Bind UI manager event handlers with callbacks
        this.uiManager.bindEventHandlers({
            onPlayToggle: () => this.songManager.togglePlay(),
            onStop: () => this.songManager.stop(),
            onTempoChange: (e) => {
                const newTempo = parseInt(e.target.value);
                this.songManager.setTempo(newTempo);
            },
            onMetronomeToggle: () => this.audioManager.toggleMetronome(),
            onVoiceToggle: () => this.audioManager.toggleVoice(),
            onMeasureAnnouncementToggle: () => {
                console.log('onMeasureAnnouncementToggle callback called');
                this.audioManager.toggleMeasureAnnouncement();
            },
            onVoiceChange: (e) => {
                this.audioManager.setSelectedVoice(e.target.value);
            },
            onSpeechRateChange: (e) => {
                this.audioManager.setSpeechRate(parseFloat(e.target.value));
            },
            onSubdivisionChange: (e) => {
                this.audioManager.setSubdivision(e.target.value);
                this.songManager.setSubdivision(e.target.value);
                // If playing, restart with new subdivision timing
                if (this.songManager.isPlaying) {
                    this.songManager.pause();
                    setTimeout(() => this.songManager.play(), 100);
                }
            },
            onNewSong: () => {
                this.uiManager.resetFormToDefaults();
                this.uiManager.showComposerView();
                this.currentSongId = null; // Clear current song ID for new song
            },
            onComposeSave: () => this.saveCurrentSong(),
            onComposeReset: () => {
                this.uiManager.resetFormToDefaults();
                Utils.createSuccessNotification('Form reset to defaults');
            },
            onComposeCancel: () => {
                this.uiManager.showSavedSongsView();
                this.currentSongId = null; // Clear editing state
            },
            onEditSong: (songId) => {
                console.log('Edit button clicked for song:', songId);
                this.editSong(songId);
            },
            onExportSongs: () => this.storageManager.exportAllSongs()
        });
    }

    loadSongData() {
        this.songManager.loadSongData();
    }

    async saveCurrentSong() {
        const formData = this.uiManager.getFormData();
        
        if (!formData.title) {
            Utils.createErrorNotification('Please enter a song title');
            return;
        }

        const songData = {
            id: formData.title, // Use song title as ID
            title: formData.title,
            tempo: formData.tempo,
            subdivision: formData.subdivision,
            sections: formData.sections
        };

        // Save using regular storage (always works offline)
        const success = this.storageManager.saveSong(songData);
        if (success) {
            this.currentSongId = songData.id;
            this.displaySavedSongs();
            // Reset form to defaults after saving and switch back to saved songs view
            this.uiManager.resetFormToDefaults();
            this.uiManager.showSavedSongsView();
            Utils.createSuccessNotification(`"${formData.title}" saved successfully!`);
        }
    }

    editSong(songId) {
        console.log('editSong called with ID:', songId);
        const song = this.storageManager.loadSong(songId);
        console.log('Loaded song data:', song);
        
        if (!song) {
            Utils.createErrorNotification('Song not found');
            return;
        }
        
        // Set current song ID for editing
        this.currentSongId = songId;
        
        // Populate form with song data
        console.log('Populating form with song data...');
        this.uiManager.populateForm(song);
        
        // Switch to composer view
        console.log('Switching to composer view...');
        this.uiManager.showComposerView();
    }

    selectSong(songId) {
        console.log('selectSong called with ID:', songId);
        const song = this.storageManager.loadSong(songId);
        if (!song) {
            Utils.createErrorNotification('Song not found');
            return;
        }

        // Stop playback if running
        this.songManager.stop();

        // Load song data into the song manager
        this.songManager.loadSongData(song);
        
        // Apply subdivision setting if available
        if (song.subdivision) {
            this.audioManager.setSubdivision(song.subdivision);
        }

        // Update current song ID and refresh display
        this.currentSongId = songId;
        this.displaySavedSongs();

        Utils.createSuccessNotification(`"${song.title}" selected!`);
    }

    loadSong(songId) {
        const song = this.storageManager.loadSong(songId);
        if (!song) return;
        
        // Stop playback if running
        this.songManager.stop();

        // Populate form with song data
        this.uiManager.populateForm(song);

        // Update current song ID and load data
        this.currentSongId = songId;
        this.songManager.loadSongData(song);
        
        // Apply subdivision setting if available
        if (song.subdivision) {
            this.audioManager.setSubdivision(song.subdivision);
        }
        
        this.displaySavedSongs();
        
        Utils.createSuccessNotification(`Song "${song.title}" loaded!`);
    }

    async deleteSong(songId) {
        const success = this.storageManager.deleteSong(songId);
        if (success) {
            if (this.currentSongId === songId) {
                this.currentSongId = null;
            }
            this.displaySavedSongs();
        }
    }

    displaySavedSongs() {
        const songs = this.storageManager.getAllSongs();
        this.uiManager.displaySavedSongs(songs, this.currentSongId, {
            onSelectSong: (songId) => this.selectSong(songId),
            onEditSong: (songId) => this.editSong(songId),
            onDeleteSong: (songId) => this.deleteSong(songId)
        });
    }

    importSongs(file) {
        this.storageManager.importSongs(file, () => {
            this.displaySavedSongs();
        });
    }

    /**
     * Clean up resources when app is closed
     */
    cleanup() {
        this.songManager.cleanup();
        this.audioManager.cleanup();
    }
}

// Global variable for backward compatibility
let drumHelper;

// PWA Installation Handler
class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.bindInstallPrompt();
    }

    bindInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });
    }

    showInstallButton() {
        const installBtn = document.createElement('button');
        installBtn.textContent = '📱 Install App';
        installBtn.className = 'btn btn-primary';
        installBtn.style.margin = '10px auto';
        installBtn.style.display = 'block';
        installBtn.setAttribute('aria-label', 'Install DrumHelper as an app');
        
        installBtn.addEventListener('click', async () => {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const choiceResult = await this.deferredPrompt.userChoice;
                
                if (choiceResult.outcome === 'accepted') {
                    installBtn.remove();
                    Utils.createSuccessNotification('App installed successfully!');
                }
                
                this.deferredPrompt = null;
            }
        });
        
        const container = document.querySelector('.container');
        if (container) {
            container.appendChild(installBtn);
        }
    }
}

// Service Worker Registration and Management
class ServiceWorkerManager {
    constructor() {
        this.registerServiceWorker();
    }

    registerServiceWorker() {
        if (!Utils.checkBrowserSupport().serviceWorker) {
            console.warn('Service Worker not supported');
            return;
        }

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('SW registered successfully:', registration.scope);
                    this.handleServiceWorkerUpdates(registration);
                })
                .catch((error) => {
                    console.warn('SW registration failed:', error);
                });

            // Handle service worker controller changes
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service worker controller changed, reloading...');
                window.location.reload();
            });
        });
    }

    handleServiceWorkerUpdates(registration) {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New content available');
                    
                    // Show update notification
                    Utils.createSuccessNotification(
                        'App updated! Refresh to get the latest version.',
                        8000
                    );
                    
                    // Auto-refresh after notification
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                }
            });
        });
    }
}

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    try {
        // Check browser support
        const support = Utils.checkBrowserSupport();
        
        if (!support.webAudio) {
            Utils.createErrorNotification('This browser does not support Web Audio API');
        }
        
        if (!support.speechSynthesis) {
            console.warn('Speech synthesis not available');
        }
        
        // Initialize main application
        drumHelper = new DrumHelper();
        
        // Initialize PWA installer
        new PWAInstaller();
        
        // Initialize Service Worker Manager
        new ServiceWorkerManager();
        
        console.log('DrumHelper initialized successfully');
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            if (drumHelper) {
                drumHelper.cleanup();
            }
        });
        
    } catch (error) {
        console.error('Initialization error:', error);
        Utils.createErrorNotification('App initialization failed: ' + error.message);
        
        // Provide fallback error handling for play button
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                Utils.createErrorNotification('App not initialized properly');
            });
        }
    }
});