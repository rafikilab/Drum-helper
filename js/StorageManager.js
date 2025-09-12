// DrumHelper Storage Management Module

/**
 * StorageManager handles local storage operations and data persistence
 */
class StorageManager {
    constructor() {
        this.storageAvailable = false;
        this.savedSongs = {};
        this.storageKey = 'drumhelper-songs';
        
        this.initializeStorage();
    }


    /**
     * Initialize local storage and check availability
     */
    initializeStorage() {
        try {
            if (!Utils.checkBrowserSupport().localStorage) {
                console.warn('localStorage not available: not supported');
                this.handleStorageUnavailable();
                return;
            }
            
            // Test localStorage functionality
            const testKey = 'drumhelper-test';
            localStorage.setItem(testKey, 'test');
            localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            this.storageAvailable = true;
            console.log('localStorage available');
            
            // Load existing songs
            this.loadSavedSongs();
        } catch (error) {
            console.warn('localStorage not available:', error.message);
            this.handleStorageUnavailable();
        }
    }

    /**
     * Handle storage unavailable scenario
     */
    handleStorageUnavailable() {
        this.storageAvailable = false;
        this.savedSongs = {};
        
        const storageInfo = document.getElementById('storageInfo');
        if (storageInfo) {
            storageInfo.innerHTML = `
                <div class="storage-info">
                    ⚠️ Temporary storage only - use Export/Import to save your songs permanently
                </div>
            `;
        }
    }

    /**
     * Load saved songs from localStorage
     */
    loadSavedSongs() {
        if (!this.storageAvailable) return;
        
        try {
            const saved = localStorage.getItem(this.storageKey);
            this.savedSongs = saved ? JSON.parse(saved) : {};
            console.log(`Loaded ${Object.keys(this.savedSongs).length} saved songs`);
        } catch (error) {
            console.error('Failed to load saved songs:', error);
            this.savedSongs = {};
            Utils.createErrorNotification('Failed to load saved songs');
        }
    }

    /**
     * Save songs to localStorage (works offline)
     */
    saveSongs() {
        if (!this.storageAvailable) {
            console.warn('Temporary save only - localStorage not available');
            return false;
        }
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.savedSongs));
            return true;
        } catch (error) {
            console.error('Save error:', error);
            Utils.createErrorNotification('Failed to save: ' + error.message);
            return false;
        }
    }

    /**
     * Save a song configuration
     * @param {Object} songData - Song configuration object
     * @returns {boolean} Success status
     */
    saveSong(songData) {
        if (!songData || !songData.title) {
            Utils.createErrorNotification('Song title is required');
            return false;
        }

        if (!songData.sections || songData.sections.length === 0) {
            Utils.createErrorNotification('Add at least one section to your song');
            return false;
        }

        try {
            // Generate ID if not provided
            if (!songData.id) {
                songData.id = Utils.generateId();
            }

            // Add metadata
            songData.savedAt = new Date().toISOString();
            
            // Validate and sanitize data
            songData.title = Utils.sanitizeInput(songData.title);
            songData.tempo = Utils.validateTempo(songData.tempo);
            songData.subdivision = songData.subdivision || 'quarter';
            songData.sections = songData.sections.map(section => ({
                name: Utils.sanitizeInput(section.name),
                measures: Utils.validateMeasures(section.measures)
            }));

            this.savedSongs[songData.id] = songData;
            
            const success = this.saveSongs();
            if (success) {
                const message = this.storageAvailable ? 
                    `Song "${songData.title}" saved!` : 
                    `Song "${songData.title}" saved temporarily! Use Export to save permanently.`;
                Utils.createSuccessNotification(message);
            }
            
            return success;
        } catch (error) {
            console.error('Failed to save song:', error);
            Utils.createErrorNotification('Failed to save song');
            return false;
        }
    }

    /**
     * Load a song by ID
     * @param {string} songId - Song ID to load
     * @returns {Object|null} Song data or null if not found
     */
    loadSong(songId) {
        const song = this.savedSongs[songId];
        if (!song) {
            Utils.createErrorNotification('Song not found');
            return null;
        }
        return song;
    }

    /**
     * Delete a song by ID
     * @param {string} songId - Song ID to delete
     * @returns {boolean} Success status
     */
    deleteSong(songId) {
        const song = this.savedSongs[songId];
        if (!song) {
            Utils.createErrorNotification('Song not found');
            return false;
        }

        if (!confirm(`Delete song "${song.title}"?`)) {
            return false;
        }

        try {
            delete this.savedSongs[songId];
            this.saveSongs();
            Utils.createSuccessNotification(`Song "${song.title}" deleted`);
            return true;
        } catch (error) {
            console.error('Failed to delete song:', error);
            Utils.createErrorNotification('Failed to delete song');
            return false;
        }
    }

    /**
     * Get all saved songs sorted by date
     * @returns {Array} Array of song objects
     */
    getAllSongs() {
        return Object.values(this.savedSongs).sort((a, b) => 
            new Date(b.savedAt) - new Date(a.savedAt)
        );
    }

    /**
     * Export all songs to JSON file
     */
    exportAllSongs() {
        try {
            // Create optimized export format without redundant id fields
            const optimizedSongs = {};
            Object.entries(this.savedSongs).forEach(([key, song]) => {
                const { id, ...songWithoutId } = song; // Remove redundant id field
                optimizedSongs[key] = songWithoutId;
            });

            const exportData = {
                version: '1.1',
                exportDate: new Date().toISOString(),
                songs: optimizedSongs
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `drumhelper-songs-${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up blob URL
            URL.revokeObjectURL(url);
            
            Utils.createSuccessNotification(`${Object.keys(this.savedSongs).length} song(s) exported!`);
        } catch (error) {
            console.error('Export failed:', error);
            Utils.createErrorNotification('Export failed');
        }
    }

    /**
     * Import songs from JSON file
     * @param {File} file - File object to import
     * @param {Function} callback - Callback function called after import
     */
    importSongs(file, callback) {
        if (!file) {
            Utils.createErrorNotification('No file selected');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                this.processImportData(importData, callback);
            } catch (error) {
                console.error('Import error:', error);
                Utils.createErrorNotification('Invalid file format');
            }
        };

        reader.onerror = () => {
            Utils.createErrorNotification('Failed to read file');
        };

        reader.readAsText(file);
    }

    /**
     * Process imported song data
     * @param {Object} importData - Imported data object
     * @param {Function} callback - Callback function
     */
    processImportData(importData, callback) {
        if (!importData.songs) {
            Utils.createErrorNotification('Invalid file format - no songs found');
            return;
        }

        try {
            const shouldMerge = confirm(
                'Do you want to merge with your existing songs?\n\n' +
                'OK = Merge (keep existing)\nCancel = Replace all'
            );

            if (!shouldMerge) {
                this.savedSongs = {};
            }

            let importedCount = 0;
            Object.entries(importData.songs).forEach(([key, song]) => {
                if (this.isValidSongData(song)) {
                    // Use the key as ID
                    let newId = key;
                    
                    // Generate new ID if conflict exists
                    if (this.savedSongs[newId]) {
                        newId = Utils.generateId();
                    }

                    // Sanitize imported data
                    this.savedSongs[newId] = {
                        ...song,
                        id: newId,
                        title: Utils.sanitizeInput(song.title),
                        tempo: Utils.validateTempo(song.tempo),
                        subdivision: song.subdivision || 'quarter',
                        sections: song.sections.map(section => ({
                            name: Utils.sanitizeInput(section.name),
                            measures: Utils.validateMeasures(section.measures)
                        })),
                        importedAt: new Date().toISOString()
                    };
                    importedCount++;
                }
            });

            this.saveSongs();
            Utils.createSuccessNotification(`${importedCount} song(s) imported successfully!`);
            
            if (callback) callback();
        } catch (error) {
            console.error('Import processing error:', error);
            Utils.createErrorNotification('Import failed');
        }
    }

    /**
     * Validate imported song data structure
     * @param {Object} song - Song object to validate
     * @returns {boolean} True if valid
     */
    isValidSongData(song) {
        return song && 
               typeof song.title === 'string' && 
               song.title.trim() &&
               typeof song.tempo === 'number' &&
               Array.isArray(song.sections) &&
               song.sections.length > 0 &&
               song.sections.every(section => 
                   section.name && 
                   typeof section.measures === 'number'
               );
    }

    /**
     * Clear all saved songs
     */
    clearAllSongs() {
        if (!confirm('Delete all saved songs? This cannot be undone.')) {
            return false;
        }

        try {
            this.savedSongs = {};
            this.saveSongs();
            Utils.createSuccessNotification('All songs deleted');
            return true;
        } catch (error) {
            console.error('Failed to clear songs:', error);
            Utils.createErrorNotification('Failed to clear songs');
            return false;
        }
    }
}

// Export for use in other modules
window.StorageManager = StorageManager;