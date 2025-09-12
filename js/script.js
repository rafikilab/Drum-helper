// DrumHelper - Drummer Assistant Web Application

class DrumHelper {
    constructor() {
        // Initialize core managers
        this.storageManager = new StorageManager();
        this.uiManager = new UIManager();
        this.configManager = new ConfigManager();
        
        // Initialize audio manager (using basic AudioManager for better sound quality)
        this.audioManager = new AudioManager();
            
        this.songManager = new SongManager(this.audioManager, this.uiManager);
        
        // State
        this.currentSongId = null;
        
        // Initialize application
        this.initialize();
        this.bindEvents();
        this.loadSongData();
        this.displaySavedSongs();
        
        // Initialize PWA functionality
        this.initializePWA();
    }

    /**
     * Initialize application
     */
    async initialize() {
        try {
            // Initialize configuration management
            await this.configManager.applyConfig();
            
            // Log which audio manager is being used
            console.log('Using basic AudioManager for clean metronome sounds');
            
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.warn('Failed to initialize application:', error);
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

        // Save using regular storage
        const success = this.storageManager.saveSong(songData);
        if (success) {
            this.currentSongId = songData.id;
            this.displaySavedSongs();
            // Load and activate the newly saved song
            this.loadSong(songData.id);
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
     * Initialize PWA functionality
     */
    async initializePWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service worker registered:', registration.scope);
            } catch (error) {
                console.error('Service worker registration failed:', error);
            }
        }

        // Handle install prompt
        let deferredPrompt;
        const installSection = document.getElementById('pwaInstallSection');
        const installBtn = document.getElementById('pwaInstallBtn');

        // Check if app is already installed or in PWA mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true;
        
        if (isStandalone) {
            // Hide install section if already running as PWA
            console.log('Running as installed PWA');
            return;
        }

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome's default install prompt
            e.preventDefault();
            deferredPrompt = e;
            
            // Show our custom install section
            if (installSection) {
                installSection.classList.remove('hidden');
            }
        });

        // Handle install button click
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    
                    if (outcome === 'accepted') {
                        console.log('PWA installed');
                    }
                    
                    deferredPrompt = null;
                    if (installSection) {
                        installSection.classList.add('hidden');
                    }
                }
            });
        }

        // Listen for app installation
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            if (installSection) {
                installSection.classList.add('hidden');
            }
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
        window.drumHelper = new DrumHelper();
        
        
        console.log('DrumHelper initialized successfully');
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            if (window.drumHelper) {
                window.drumHelper.cleanup();
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