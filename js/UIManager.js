// DrumHelper UI Management Module

/**
 * UIManager handles all user interface operations and DOM manipulation
 */
class UIManager {
    constructor() {
        this.elements = this.cacheElements();
        this.currentSongId = null;
        
        this.bindStaticEventHandlers();
        this.setupAccessibility();
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        const elements = {
            // Controls
            playBtn: document.getElementById('playBtn'),
            stopBtn: document.getElementById('stopBtn'),
            
            // Display elements
            tempoDisplay: document.getElementById('tempoDisplay'),
            songTitleDisplay: document.getElementById('songTitleStatus'),
            subdivisionDisplay: document.getElementById('subdivisionDisplay'),
            currentSection: document.getElementById('currentSection'),
            measureCount: document.getElementById('measureCount'),
            progressFill: document.getElementById('progressFill'),
            visualBeat: document.getElementById('visualBeat'),
            beatFlash: document.getElementById('beatFlash'),
            
            // Form elements
            songTitle: document.getElementById('songTitle'),
            tempo: document.getElementById('tempo'),
            sections: document.getElementById('sections'),
            
            // Settings
            metronomeToggle: document.getElementById('metronomeToggle'),
            voiceToggle: document.getElementById('voiceToggle'),
            measureAnnouncementToggle: document.getElementById('measureAnnouncementToggle'),
            voiceSelect: document.getElementById('voiceSelect'),
            speechRateSlider: document.getElementById('speechRateSlider'),
            subdivisionSelect: document.getElementById('subdivisionSelect'),
            
            // Song management
            savedSongs: document.getElementById('savedSongs'),
            storageInfo: document.getElementById('storageInfo')
        };

        // Verify critical elements exist
        const critical = ['playBtn', 'stopBtn', 'tempoDisplay'];
        critical.forEach(id => {
            if (!elements[id]) {
                console.error(`Critical element missing: ${id}`);
                Utils.createErrorNotification(`App initialization error: ${id} not found`);
            }
        });

        return elements;
    }

    /**
     * Bind static event handlers that don't need dynamic data
     */
    bindStaticEventHandlers() {
        // Add section button (delegated event handling)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-section')) {
                this.addSection();
            }
            if (e.target.closest('.section-item button')) {
                this.removeSection(e.target);
            }
        });

        // File input for song import
        const fileInputs = document.querySelectorAll('.file-input');
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.importSongs(e.target.files[0]);
                    e.target.value = '';
                }
            });
        });

        // Keep screen awake by requesting wake lock if available
        if ('wakeLock' in navigator) {
            try {
                navigator.wakeLock.request('screen');
            } catch (err) {
                console.log('Wake Lock not available');
            }
        }
    }

    /**
     * Set up accessibility features
     */
    setupAccessibility() {
        // Add ARIA labels and roles
        if (this.elements.playBtn) {
            this.elements.playBtn.setAttribute('aria-label', 'Play or pause metronome');
            this.elements.playBtn.setAttribute('role', 'button');
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.setAttribute('aria-label', 'Stop metronome and reset');
            this.elements.stopBtn.setAttribute('role', 'button');
        }

        if (this.elements.visualBeat) {
            this.elements.visualBeat.setAttribute('aria-label', 'Beat indicator');
            this.elements.visualBeat.setAttribute('role', 'status');
        }

        // Add keyboard navigation
        this.setupKeyboardNavigation();
    }

    /**
     * Set up keyboard navigation support
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Space bar to play/pause
            if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
                e.preventDefault();
                if (this.elements.playBtn) {
                    this.elements.playBtn.click();
                }
            }
            
            // Escape to stop
            if (e.code === 'Escape') {
                if (this.elements.stopBtn) {
                    this.elements.stopBtn.click();
                }
            }
        });
    }

    /**
     * Bind dynamic event handlers that need access to other managers
     * @param {Object} callbacks - Object containing callback functions
     */
    bindEventHandlers(callbacks) {
        if (this.elements.playBtn) {
            this.elements.playBtn.addEventListener('click', callbacks.onPlayToggle);
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', callbacks.onStop);
        }
        
        if (this.elements.tempo) {
            const debouncedTempoChange = Utils.debounce(callbacks.onTempoChange, 300);
            this.elements.tempo.addEventListener('input', debouncedTempoChange);
        }
        
        if (this.elements.metronomeToggle) {
            this.elements.metronomeToggle.addEventListener('click', callbacks.onMetronomeToggle);
        }
        
        if (this.elements.voiceToggle) {
            this.elements.voiceToggle.addEventListener('click', callbacks.onVoiceToggle);
        }
        
        if (this.elements.measureAnnouncementToggle) {
            this.elements.measureAnnouncementToggle.addEventListener('click', callbacks.onMeasureAnnouncementToggle);
            console.log('Measure announcement toggle event bound successfully');
        } else {
            console.warn('measureAnnouncementToggle element not found');
        }
        
        if (this.elements.voiceSelect) {
            this.elements.voiceSelect.addEventListener('change', callbacks.onVoiceChange);
        }

        if (this.elements.speechRateSlider && callbacks.onSpeechRateChange) {
            this.elements.speechRateSlider.addEventListener('input', callbacks.onSpeechRateChange);
        }

        if (this.elements.subdivisionSelect) {
            this.elements.subdivisionSelect.addEventListener('change', callbacks.onSubdivisionChange);
        }

        // Song management buttons
        const newSongBtn = document.querySelector('.btn-new-song');
        const exportBtn = document.querySelector('.btn-export');
        const composeSaveBtn = document.querySelector('.btn-compose-save');
        const composeResetBtn = document.querySelector('.btn-compose-reset');
        const composeCancelBtn = document.querySelector('.btn-compose-cancel');
        
        if (newSongBtn) newSongBtn.addEventListener('click', callbacks.onNewSong);
        if (exportBtn) exportBtn.addEventListener('click', callbacks.onExportSongs);
        if (composeSaveBtn) composeSaveBtn.addEventListener('click', callbacks.onComposeSave);
        if (composeResetBtn) composeResetBtn.addEventListener('click', callbacks.onComposeReset);
        if (composeCancelBtn) composeCancelBtn.addEventListener('click', callbacks.onComposeCancel);
        
        // Initialize toggle states after binding events
        this.initializeToggleStates();
    }

    /**
     * Initialize toggle states to match their default values
     */
    initializeToggleStates() {
        // Metronome toggle should be active by default
        if (this.elements.metronomeToggle) {
            const switchEl = this.elements.metronomeToggle.querySelector('.toggle-switch');
            if (switchEl) {
                this.elements.metronomeToggle.classList.add('active');
                switchEl.classList.add('active');
            }
        }
        
        // Voice announcements toggle should be active by default
        if (this.elements.voiceToggle) {
            const switchEl = this.elements.voiceToggle.querySelector('.toggle-switch');
            if (switchEl) {
                this.elements.voiceToggle.classList.add('active');
                switchEl.classList.add('active');
            }
        }
        
        // The measure announcement toggle should be active by default
        if (this.elements.measureAnnouncementToggle) {
            const switchEl = this.elements.measureAnnouncementToggle.querySelector('.toggle-switch');
            if (switchEl) {
                this.elements.measureAnnouncementToggle.classList.add('active');
                switchEl.classList.add('active');
            }
        }
    }

    /**
     * Update the display with current state
     * @param {Object} state - Current application state
     */
    updateDisplay(state) {
        if (this.elements.tempoDisplay) {
            this.elements.tempoDisplay.textContent = `${state.tempo} BPM`;
        }

        // Update song title display
        if (this.elements.songTitleDisplay) {
            this.elements.songTitleDisplay.textContent = state.songTitle || 'No song selected';
        }

        // Update subdivision display
        if (this.elements.subdivisionDisplay) {
            this.elements.subdivisionDisplay.textContent = this.getSubdivisionDisplayText(state.subdivision || 'quarter');
        }

        if (state.sections.length > 0 && state.currentSection < state.sections.length) {
            const section = state.sections[state.currentSection];
            
            if (this.elements.currentSection) {
                this.elements.currentSection.textContent = section.name;
            }
            
            if (this.elements.measureCount) {
                this.elements.measureCount.textContent = 
                    `Measure: ${state.currentMeasure + 1} / ${section.measures}`;
            }
            
            if (this.elements.progressFill) {
                const progress = ((state.currentMeasure + (state.currentBeat / 4)) / section.measures) * 100;
                this.elements.progressFill.style.width = `${Math.min(progress, 100)}%`;
            }
        } else {
            if (this.elements.currentSection) {
                this.elements.currentSection.textContent = 'Ready to play';
            }
            
            if (this.elements.measureCount) {
                this.elements.measureCount.textContent = 'Measure: 0 / 0';
            }
            
            if (this.elements.progressFill) {
                this.elements.progressFill.style.width = '0%';
            }
        }
    }

    /**
     * Flash beat indicator
     */
    flashBeat() {
        if (this.elements.visualBeat) {
            this.elements.visualBeat.classList.add('active');
            setTimeout(() => {
                this.elements.visualBeat.classList.remove('active');
            }, 100);
        }
        
        if (this.elements.beatFlash) {
            this.elements.beatFlash.classList.add('active');
            setTimeout(() => {
                this.elements.beatFlash.classList.remove('active');
            }, 100);
        }
    }

    /**
     * Update play button state
     * @param {boolean} isPlaying - Whether metronome is playing
     */
    updatePlayButton(isPlaying) {
        if (this.elements.playBtn) {
            this.elements.playBtn.innerHTML = isPlaying ? '⏸ Pause' : '▶ Play';
            this.elements.playBtn.setAttribute('aria-label', 
                isPlaying ? 'Pause metronome' : 'Play metronome');
        }
    }

    /**
     * Show text announcement overlay
     * @param {string} text - Text to display
     */
    showTextAnnouncement(text) {
        const announcement = document.createElement('div');
        announcement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(16, 185, 129, 0.95);
            color: white;
            padding: 20px 40px;
            border-radius: 15px;
            font-size: 1.5rem;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            pointer-events: none;
            backdrop-filter: blur(10px);
            transition: opacity 0.3s ease;
        `;
        announcement.textContent = text;
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('role', 'status');
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.style.opacity = '0';
                setTimeout(() => {
                    if (announcement.parentNode) {
                        announcement.parentNode.removeChild(announcement);
                    }
                }, 300);
            }
        }, 2000);
    }

    /**
     * Add a new section to the form
     */
    addSection() {
        if (!this.elements.sections) return;
        
        const newSection = document.createElement('div');
        newSection.className = 'section-item';
        newSection.innerHTML = `
            <input type="text" placeholder="Name (e.g. Bridge)" maxlength="50" aria-label="Section name">
            <input type="number" placeholder="Measures" min="1" max="32" value="4" aria-label="Number of measures">
            <button type="button" aria-label="Remove section">✕</button>
        `;
        
        this.elements.sections.appendChild(newSection);
        
        // Focus on the new section name input
        const nameInput = newSection.querySelector('input[type="text"]');
        if (nameInput) {
            nameInput.focus();
        }
    }

    /**
     * Remove a section from the form
     * @param {HTMLElement} button - Remove button that was clicked
     */
    removeSection(button) {
        if (!this.elements.sections || this.elements.sections.children.length <= 1) {
            Utils.createErrorNotification('At least one section is required');
            return;
        }
        
        const sectionItem = button.closest('.section-item');
        if (sectionItem) {
            sectionItem.remove();
        }
    }

    /**
     * Reset form to default values
     */
    resetFormToDefaults() {
        if (this.elements.songTitle) {
            this.elements.songTitle.value = '';
        }
        
        if (this.elements.tempo) {
            this.elements.tempo.value = '120';
        }
        
        if (this.elements.subdivisionSelect) {
            this.elements.subdivisionSelect.value = 'quarter';
        }
        
        if (this.elements.sections) {
            this.elements.sections.innerHTML = `
                <div class="section-item">
                    <input type="text" placeholder="Name (e.g. Intro)" value="" maxlength="50" aria-label="Section name">
                    <input type="number" placeholder="Measures" min="1" max="32" value="4" aria-label="Number of measures">
                    <button type="button" aria-label="Remove section">✕</button>
                </div>
            `;
        }
        
        console.log('Form reset to defaults');
    }

    /**
     * Show song composer and hide saved songs view
     */
    showComposerView() {
        console.log('Switching to composer view...');
        const songManager = document.getElementById('songManager');
        const songForm = document.getElementById('songForm');
        
        if (songManager) {
            songManager.classList.add('hidden');
            console.log('Song manager hidden');
        }
        if (songForm) {
            songForm.classList.remove('hidden');
            console.log('Song form shown');
        }
    }

    /**
     * Get display text for subdivision
     * @param {string} subdivision - The subdivision type
     * @returns {string} Display text with symbol
     */
    getSubdivisionDisplayText(subdivision) {
        const subdivisionMap = {
            'quarter': '♩ Quarter notes',
            'eighth': '♫ Eighth notes', 
            'sixteenth': '♬ Sixteenth notes',
            'triplet': '♪♪♪ Triplets'
        };
        return subdivisionMap[subdivision] || '♩ Quarter notes';
    }

    /**
     * Show saved songs and hide composer view
     */
    showSavedSongsView() {
        const songManager = document.getElementById('songManager');
        const songForm = document.getElementById('songForm');
        
        if (songManager) songManager.classList.remove('hidden');
        if (songForm) songForm.classList.add('hidden');
    }

    /**
     * Get current form data
     * @returns {Object} Form data object
     */
    getFormData() {
        const sections = [];
        const sectionElements = this.elements.sections?.querySelectorAll('.section-item') || [];
        
        sectionElements.forEach(element => {
            const nameInput = element.querySelector('input[type="text"]');
            const measuresInput = element.querySelector('input[type="number"]');
            
            if (nameInput && measuresInput) {
                const name = Utils.sanitizeInput(nameInput.value);
                const measures = Utils.validateMeasures(measuresInput.value);
                
                if (name) {
                    sections.push({ name, measures });
                }
            }
        });

        return {
            title: Utils.sanitizeInput(this.elements.songTitle?.value || ''),
            tempo: Utils.validateTempo(this.elements.tempo?.value || 120),
            subdivision: this.elements.subdivisionSelect?.value || 'quarter',
            sections
        };
    }

    /**
     * Populate form with song data
     * @param {Object} song - Song data object
     */
    populateForm(song) {
        console.log('populateForm called with:', song);
        if (this.elements.songTitle) {
            this.elements.songTitle.value = song.title;
        }
        
        if (this.elements.tempo) {
            this.elements.tempo.value = song.tempo;
        }
        
        if (this.elements.subdivisionSelect && song.subdivision) {
            this.elements.subdivisionSelect.value = song.subdivision;
        }
        
        if (this.elements.sections) {
            this.elements.sections.innerHTML = '';
            
            song.sections.forEach(section => {
                const sectionElement = document.createElement('div');
                sectionElement.className = 'section-item';
                sectionElement.innerHTML = `
                    <input type="text" placeholder="Name" value="${section.name}" 
                           maxlength="50" aria-label="Section name">
                    <input type="number" placeholder="Measures" min="1" max="32" 
                           value="${section.measures}" aria-label="Number of measures">
                    <button type="button" aria-label="Remove section">✕</button>
                `;
                this.elements.sections.appendChild(sectionElement);
            });
        }
    }

    /**
     * Display saved songs list
     * @param {Array} songs - Array of song objects
     * @param {string} currentSongId - ID of currently loaded song
     * @param {Object} callbacks - Callback functions
     */
    displaySavedSongs(songs, currentSongId, callbacks) {
        if (!this.elements.savedSongs) return;
        
        this.currentSongId = currentSongId;
        this.elements.savedSongs.innerHTML = '';

        if (songs.length === 0) {
            this.elements.savedSongs.innerHTML = 
                '<p style="text-align: center; color: #9ca3af;">No saved songs</p>';
            return;
        }

        songs.forEach(song => {
            const songCard = document.createElement('div');
            songCard.className = `song-card ${currentSongId === song.id ? 'active' : ''}`;
            songCard.style.cursor = 'pointer';
            songCard.setAttribute('data-song-id', song.id);
            
            const sectionsText = song.sections
                .map(s => `${s.name}(${s.measures})`)
                .join(', ');
            const savedDate = Utils.formatDate(song.savedAt);
            
            songCard.innerHTML = `
                <h4>${song.title}</h4>
                <div class="song-info">
                    ${song.tempo} BPM<br>
                    ${sectionsText}<br>
                    <small>Saved on ${savedDate}</small>
                </div>
                <div class="song-actions">
                    <button class="btn btn-small btn-edit" data-song-id="${song.id}" 
                            aria-label="Edit song ${song.title}">Edit</button>
                    <button class="btn btn-small btn-delete" data-song-id="${song.id}"
                            aria-label="Delete song ${song.title}">Delete</button>
                </div>
            `;
            
            // Bind event handlers
            const editBtn = songCard.querySelector('.btn-edit');
            const deleteBtn = songCard.querySelector('.btn-delete');
            
            // Add click handler for song card selection
            songCard.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.classList.contains('btn-small')) return;
                
                console.log('Song card clicked for song:', song.id);
                if (callbacks.onSelectSong) {
                    callbacks.onSelectSong(song.id);
                }
            });
            
            if (editBtn && callbacks.onEditSong) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click
                    console.log('Edit button clicked in UIManager for song:', song.id);
                    callbacks.onEditSong(song.id);
                });
                console.log('Edit button event bound for song:', song.id);
            } else {
                console.warn('Edit button or callback not found for song:', song.id);
            }
            
            if (deleteBtn && callbacks.onDeleteSong) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click
                    callbacks.onDeleteSong(song.id);
                });
            }
            
            this.elements.savedSongs.appendChild(songCard);
        });
    }

    /**
     * Import songs from file input
     * @param {File} file - File to import
     */
    importSongs(file) {
        // This will be called by the main app with proper callback
        if (window.drumHelper && window.drumHelper.importSongs) {
            window.drumHelper.importSongs(file);
        }
    }

    /**
     * Update accessibility announcements for screen readers
     * @param {string} message - Message to announce
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 1000);
    }
}

// Export for use in other modules
window.UIManager = UIManager;