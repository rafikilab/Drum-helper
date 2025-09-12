// DrumHelper Song Management Module

/**
 * SongManager handles song playback, timing, and section management
 */
class SongManager {
    constructor(audioManager, uiManager) {
        this.audioManager = audioManager;
        this.uiManager = uiManager;
        
        // Playback state
        this.isPlaying = false;
        this.currentSection = 0;
        this.currentMeasure = 0;
        this.currentBeat = 0;
        this.currentSubdivision = 0; // Current subdivision within a beat
        this.intervalId = null;
        
        // Song configuration
        this.tempo = 120;
        this.sections = [];
        this.songTitle = '';
        this.subdivision = 'quarter';
    }

    /**
     * Load song data from form or configuration
     * @param {Object} songData - Optional song data to load
     */
    loadSongData(songData = null) {
        if (songData) {
            this.tempo = songData.tempo;
            this.sections = songData.sections;
            this.songTitle = songData.title;
            this.subdivision = songData.subdivision || 'quarter';
        } else {
            const formData = this.uiManager.getFormData();
            this.tempo = formData.tempo;
            this.sections = formData.sections;
            this.songTitle = formData.title;
            this.subdivision = formData.subdivision || 'quarter';
        }
        
        this.updateDisplay();
    }

    /**
     * Start or resume playback
     */
    async play() {
        try {
            // Resume audio context if needed
            await this.audioManager.resumeAudioContext();
            
            // Only load form data if no song is currently loaded
            if (this.sections.length === 0 || !this.songTitle) {
                this.loadSongData();
            }
            
            if (this.sections.length === 0) {
                Utils.createErrorNotification('Add at least one section to play');
                return;
            }
            
            this.isPlaying = true;
            this.uiManager.updatePlayButton(true);
            
            // Calculate subdivision interval based on current subdivision setting
            const subdivisionInterval = this.audioManager.getSubdivisionInterval(this.tempo);
            
            // Announce first section if voice enabled (at start of playback)
            if (this.audioManager.voiceEnabled && this.currentSection < this.sections.length) {
                const section = this.sections[this.currentSection];
                const measureText = this.audioManager.measureAnnouncementEnabled 
                    ? `, ${section.measures} measures` 
                    : '';
                this.audioManager.announceSection(
                    `Starting with: ${section.name}${measureText}`,
                    (text) => this.uiManager.showTextAnnouncement(text)
                );
            }
            
            // Start metronome interval with subdivision timing
            this.intervalId = setInterval(() => {
                this.processSubdivision();
            }, subdivisionInterval);
            
            this.updateDisplay();
            this.uiManager.announceToScreenReader('Metronome started');
        } catch (error) {
            console.error('Failed to start playback:', error);
            Utils.createErrorNotification('Failed to start playback: ' + error.message);
            this.pause();
        }
    }

    /**
     * Pause playback
     */
    pause() {
        this.isPlaying = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.uiManager.updatePlayButton(false);
        this.uiManager.announceToScreenReader('Metronome paused');
    }

    /**
     * Stop playback and reset position
     */
    stop() {
        this.pause();
        
        // Reset position
        this.currentSection = 0;
        this.currentMeasure = 0;
        this.currentBeat = 0;
        this.currentSubdivision = 0;
        
        this.updateDisplay();
        this.uiManager.announceToScreenReader('Metronome stopped and reset');
    }

    /**
     * Toggle between play and pause
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Process a single subdivision click
     */
    processSubdivision() {
        if (!this.isPlaying) return;
        
        const subdivisionSettings = this.audioManager.getSubdivisionSettings();
        const isFirstSubdivisionInBeat = this.currentSubdivision === 0;
        const isDownbeat = this.currentBeat === 0 && isFirstSubdivisionInBeat;
        
        // Flash beat only on first subdivision of each beat
        if (isFirstSubdivisionInBeat) {
            this.uiManager.flashBeat();
        }
        
        // Play appropriate subdivision click
        this.audioManager.playSubdivisionClick(this.currentSubdivision, isDownbeat);
        
        // Announce upcoming section on downbeat of the last measure of current section
        const currentSectionData = this.sections[this.currentSection];
        const nextSectionIndex = this.currentSection + 1;
        if (isDownbeat && 
            this.audioManager.voiceEnabled && 
            currentSectionData && 
            nextSectionIndex < this.sections.length &&
            this.currentMeasure === currentSectionData.measures - 1) {
            const nextSection = this.sections[nextSectionIndex];
            const measureText = this.audioManager.measureAnnouncementEnabled 
                ? `, ${nextSection.measures} measures` 
                : '';
            this.audioManager.announceSection(
                `Next: ${nextSection.name}${measureText}`,
                (text) => this.uiManager.showTextAnnouncement(text)
            );
        }

        // Advance subdivision
        this.currentSubdivision++;
        
        // Check if beat is complete
        if (this.currentSubdivision >= subdivisionSettings.clicksPerBeat) {
            this.currentSubdivision = 0;
            this.currentBeat++;
            
            // Check if measure is complete (4 beats)
            if (this.currentBeat >= 4) {
                this.currentBeat = 0;
                this.currentMeasure++;
                
                // Check if section is complete
                const currentSectionData = this.sections[this.currentSection];
                if (currentSectionData && this.currentMeasure >= currentSectionData.measures) {
                    this.currentMeasure = 0;
                    this.currentSection++;
                    
                    // Check if song is complete
                    if (this.currentSection >= this.sections.length) {
                        this.completeSong();
                        return;
                    }
                }
            }
        }
        
        this.updateDisplay();
    }

    /**
     * Process a single beat (legacy method for compatibility)
     */
    processBeat() {
        // This method is kept for compatibility but now uses subdivision processing
        this.processSubdivision();
    }

    /**
     * Handle song completion
     */
    completeSong() {
        this.stop();
        
        if (this.audioManager.voiceEnabled) {
            this.audioManager.announceSection(
                "End of song",
                (text) => this.uiManager.showTextAnnouncement(text)
            );
        }
        
        Utils.createSuccessNotification('Song completed!');
        this.uiManager.announceToScreenReader('Song completed');
    }

    /**
     * Set subdivision and update display
     * @param {string} newSubdivision - New subdivision value
     */
    setSubdivision(newSubdivision) {
        this.subdivision = newSubdivision;
        this.updateDisplay();
    }

    /**
     * Set tempo with validation
     * @param {number} newTempo - New tempo value
     */
    setTempo(newTempo) {
        const validatedTempo = Utils.validateTempo(newTempo);
        
        if (this.tempo !== validatedTempo) {
            this.tempo = validatedTempo;
            this.updateDisplay();
            
            // If playing, restart with new tempo
            if (this.isPlaying) {
                const wasPlaying = true;
                this.pause();
                if (wasPlaying) {
                    // Small delay to ensure clean restart
                    setTimeout(() => this.play(), 100);
                }
            }
        }
    }

    /**
     * Update UI display with current state
     */
    updateDisplay() {
        const state = {
            tempo: this.tempo,
            songTitle: this.songTitle,
            subdivision: this.subdivision,
            sections: this.sections,
            currentSection: this.currentSection,
            currentMeasure: this.currentMeasure,
            currentBeat: this.currentBeat
        };
        
        this.uiManager.updateDisplay(state);
    }

    /**
     * Get current playback position info
     * @returns {Object} Current position information
     */
    getPosition() {
        return {
            section: this.currentSection,
            measure: this.currentMeasure,
            beat: this.currentBeat,
            sectionName: this.sections[this.currentSection]?.name || 'Unknown',
            isPlaying: this.isPlaying
        };
    }

    /**
     * Jump to specific section
     * @param {number} sectionIndex - Section index to jump to
     */
    jumpToSection(sectionIndex) {
        if (sectionIndex >= 0 && sectionIndex < this.sections.length) {
            const wasPlaying = this.isPlaying;
            
            if (wasPlaying) this.pause();
            
            this.currentSection = sectionIndex;
            this.currentMeasure = 0;
            this.currentBeat = 0;
            
            this.updateDisplay();
            
            if (wasPlaying) {
                setTimeout(() => this.play(), 100);
            }
            
            const sectionName = this.sections[sectionIndex]?.name || 'Unknown';
            this.uiManager.announceToScreenReader(`Jumped to ${sectionName}`);
        }
    }

    /**
     * Get song statistics
     * @returns {Object} Song statistics
     */
    getSongStats() {
        const totalMeasures = this.sections.reduce((sum, section) => sum + section.measures, 0);
        const totalBeats = totalMeasures * 4;
        const durationSeconds = (totalBeats * 60) / this.tempo;
        
        return {
            totalSections: this.sections.length,
            totalMeasures,
            totalBeats,
            durationSeconds,
            durationFormatted: this.formatDuration(durationSeconds)
        };
    }

    /**
     * Format duration in seconds to MM:SS
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.stop();
        // Additional cleanup if needed
    }
}

// Export for use in other modules
window.SongManager = SongManager;