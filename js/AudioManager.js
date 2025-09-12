// DrumHelper Audio Management Module

/**
 * AudioManager handles all audio-related functionality including metronome sounds and voice synthesis
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.metronomeEnabled = true;
        this.voiceEnabled = true;
        this.measureAnnouncementEnabled = true; // Whether to announce measure count
        this.selectedVoice = null;
        this.availableVoices = [];
        this.speechRate = 1.2; // Default speech rate
        this.oscillatorNodes = new Set(); // Track active oscillator nodes to prevent memory leaks
        
        // Subdivision rythmique (rhythmic subdivision)
        this.subdivision = 'quarter'; // 'quarter', 'eighth', 'sixteenth', 'triplet'
        this.subdivisionSettings = {
            quarter: { multiplier: 1, name: 'Noires', clicksPerBeat: 1, accent: [0] },
            eighth: { multiplier: 2, name: 'Croches', clicksPerBeat: 2, accent: [0] },
            sixteenth: { multiplier: 4, name: 'Doubles-croches', clicksPerBeat: 4, accent: [0] },
            triplet: { multiplier: 3, name: 'Triolets', clicksPerBeat: 3, accent: [0] }
        };
        
        this.initializeAudio().catch(error => {
            console.error('Failed to initialize audio:', error);
            this.audioContext = null;
        });
        this.initializeVoices();
        this.initializeSpeechRateDisplay();
    }

    /**
     * Initialize Web Audio API context
     */
    async initializeAudio() {
        try {
            const support = Utils.checkBrowserSupport();
            if (!support.webAudio) {
                console.error('Web Audio API not supported in this browser');
                Utils.createErrorNotification('Audio not supported in this browser');
                return;
            }

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext initialized successfully');
        } catch (error) {
            console.error('Web Audio API initialization failed:', error);
            Utils.createErrorNotification('Audio not supported in this browser');
        }
    }

    /**
     * Initialize speech rate display
     */
    initializeSpeechRateDisplay() {
        // Wait for DOM to be ready
        const initDisplay = () => {
            const sliderEl = document.getElementById('speechRateSlider');
            const displayEl = document.getElementById('speechRateDisplay');
            
            if (sliderEl) {
                sliderEl.value = this.speechRate;
            }
            
            if (displayEl) {
                displayEl.textContent = `${this.speechRate.toFixed(1)}x`;
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initDisplay);
        } else {
            initDisplay();
        }
    }

    /**
     * Initialize speech synthesis voices
     */
    initializeVoices() {
        if (!Utils.checkBrowserSupport().speechSynthesis) {
            console.warn('Speech synthesis not available');
            return;
        }

        const loadVoices = () => {
            this.availableVoices = speechSynthesis.getVoices();
            this.populateVoiceSelector();
        };

        // Load voices immediately if available
        loadVoices();
        
        // Handle voice loading events
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        // Fallback for some browsers
        if (this.availableVoices.length === 0) {
            setTimeout(loadVoices, 1000);
        }
    }

    /**
     * Populate the voice selector dropdown
     */
    populateVoiceSelector() {
        const voiceSelect = document.getElementById('voiceSelect');
        if (!voiceSelect) return;

        // Clear existing options except default
        while (voiceSelect.children.length > 1) {
            voiceSelect.removeChild(voiceSelect.lastChild);
        }

        // Prioritize English and French voices
        const englishVoices = this.availableVoices.filter(voice => 
            voice.lang.startsWith('en') || voice.lang.startsWith('fr')
        );
        const otherVoices = this.availableVoices.filter(voice => 
            !voice.lang.startsWith('en') && !voice.lang.startsWith('fr')
        );

        // Add English/French voices first
        englishVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.default) option.textContent += ' ⭐';
            voiceSelect.appendChild(option);
        });

        // Add separator if needed
        if (otherVoices.length > 0 && englishVoices.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────';
            voiceSelect.appendChild(separator);
        }

        // Add other voices
        otherVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });

        console.log(`${this.availableVoices.length} voices loaded`);
    }

    /**
     * Resume audio context if suspended (required for user interaction)
     */
    async resumeAudioContext() {
        if (!this.audioContext) {
            await this.initializeAudio();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('AudioContext resumed');
            } catch (error) {
                console.error('Failed to resume AudioContext:', error);
                throw error;
            }
        }
    }

    /**
     * Play regular beat sound (800Hz)
     */
    playBeat() {
        if (!this.metronomeEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Track oscillator node for cleanup
            this.oscillatorNodes.add(oscillator);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
            
            // Clean up oscillator reference when it ends
            oscillator.onended = () => {
                this.oscillatorNodes.delete(oscillator);
            };
        } catch (error) {
            console.error('Failed to play beat:', error);
        }
    }

    /**
     * Play downbeat sound (1200Hz)
     */
    playDownbeat() {
        if (!this.metronomeEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Track oscillator node for cleanup
            this.oscillatorNodes.add(oscillator);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
            
            // Clean up oscillator reference when it ends
            oscillator.onended = () => {
                this.oscillatorNodes.delete(oscillator);
            };
        } catch (error) {
            console.error('Failed to play downbeat:', error);
        }
    }

    /**
     * Announce section using speech synthesis
     * @param {string} sectionName - Name of the section to announce
     * @param {Function} onTextAnnouncement - Callback for text announcement
     */
    announceSection(sectionName, onTextAnnouncement) {
        if (!this.voiceEnabled || !Utils.checkBrowserSupport().speechSynthesis) {
            if (onTextAnnouncement) onTextAnnouncement(sectionName);
            return;
        }

        // Check if we're in an iframe (may block speech)
        if (window.self !== window.top) {
            console.warn('speechSynthesis may be blocked in iframe');
        }

        try {
            // Clear any pending speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(sectionName);
            
            // Configure voice settings
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
                utterance.lang = this.selectedVoice.lang;
            } else {
                utterance.lang = 'en-US';
            }
            
            utterance.rate = this.speechRate;
            utterance.volume = 0.9;
            utterance.pitch = 1.0;
            
            // Event handlers
            utterance.onstart = () => console.log('TTS started:', sectionName);
            utterance.onerror = (event) => {
                console.error('TTS error:', event.error);
                if (onTextAnnouncement) onTextAnnouncement(sectionName);
            };
            utterance.onend = () => console.log('TTS finished');

            // Small delay to ensure proper speech synthesis
            setTimeout(() => {
                speechSynthesis.speak(utterance);
                if (onTextAnnouncement) onTextAnnouncement(sectionName);
            }, 100);
        } catch (error) {
            console.error('Speech synthesis error:', error);
            if (onTextAnnouncement) onTextAnnouncement(sectionName);
        }
    }

    /**
     * Toggle metronome on/off
     */
    toggleMetronome() {
        this.metronomeEnabled = !this.metronomeEnabled;
        const toggle = document.getElementById('metronomeToggle');
        const switchEl = toggle?.querySelector('.toggle-switch');
        
        if (toggle && switchEl) {
            if (this.metronomeEnabled) {
                toggle.classList.add('active');
                switchEl.classList.add('active');
            } else {
                toggle.classList.remove('active');
                switchEl.classList.remove('active');
            }
        }
    }

    /**
     * Toggle voice announcements on/off
     */
    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        const toggle = document.getElementById('voiceToggle');
        const switchEl = toggle?.querySelector('.toggle-switch');
        
        if (toggle && switchEl) {
            if (this.voiceEnabled) {
                toggle.classList.add('active');
                switchEl.classList.add('active');
            } else {
                toggle.classList.remove('active');
                switchEl.classList.remove('active');
            }
        }
    }

    /**
     * Toggle measure announcements on/off
     */
    toggleMeasureAnnouncement() {
        console.log('toggleMeasureAnnouncement called');
        this.measureAnnouncementEnabled = !this.measureAnnouncementEnabled;
        const toggle = document.getElementById('measureAnnouncementToggle');
        const switchEl = toggle?.querySelector('.toggle-switch');
        
        console.log('Toggle element found:', !!toggle);
        console.log('Switch element found:', !!switchEl);
        
        if (toggle && switchEl) {
            if (this.measureAnnouncementEnabled) {
                toggle.classList.add('active');
                switchEl.classList.add('active');
            } else {
                toggle.classList.remove('active');
                switchEl.classList.remove('active');
            }
        } else {
            console.warn('Could not find toggle or switch element');
        }
        
        console.log('Measure announcements:', this.measureAnnouncementEnabled ? 'enabled' : 'disabled');
    }

    /**
     * Set rhythmic subdivision
     * @param {string} subdivision - Type of subdivision ('quarter', 'eighth', 'sixteenth', 'triplet')
     */
    setSubdivision(subdivision) {
        if (this.subdivisionSettings[subdivision]) {
            this.subdivision = subdivision;
            console.log(`Subdivision changed to: ${this.subdivisionSettings[subdivision].name}`);
            
            // Update UI
            const subdivisionSelect = document.getElementById('subdivisionSelect');
            if (subdivisionSelect) {
                subdivisionSelect.value = subdivision;
            }
            
            console.log(`Subdivision updated to: ${this.subdivisionSettings[subdivision].name}`);
        }
    }

    /**
     * Get current subdivision settings
     */
    getSubdivisionSettings() {
        return this.subdivisionSettings[this.subdivision];
    }

    /**
     * Calculate subdivision interval based on tempo
     * @param {number} tempo - Tempo in BPM
     * @returns {number} Interval between subdivision clicks in milliseconds
     */
    getSubdivisionInterval(tempo) {
        const beatInterval = 60000 / tempo; // Milliseconds per beat
        const settings = this.subdivisionSettings[this.subdivision];
        return beatInterval / settings.multiplier;
    }

    /**
     * Play subdivision click with appropriate accent
     * @param {number} subdivisionIndex - Index within the current beat (0-based)
     * @param {boolean} isDownbeat - Whether this is the first beat of a measure
     */
    playSubdivisionClick(subdivisionIndex, isDownbeat = false) {
        if (!this.metronomeEnabled) return;
        
        const settings = this.subdivisionSettings[this.subdivision];
        const isAccented = settings.accent.includes(subdivisionIndex);
        
        if (isDownbeat) {
            this.playDownbeat();
        } else if (this.subdivision === 'quarter' || isAccented) {
            // For quarter notes, always play the main beat sound
            // For other subdivisions, play main beat sound only on accented beats
            this.playBeat();
        } else {
            this.playSubdivisionBeat();
        }
    }

    /**
     * Play a softer subdivision beat (for non-accented subdivisions)
     */
    playSubdivisionBeat() {
        if (!this.audioContext || !this.metronomeEnabled) return;

        try {
            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // Softer, higher frequency for subdivisions
            oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            oscillator.type = 'sine';

            // Shorter, quieter envelope for subdivisions
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.08);

            // Track for cleanup
            this.oscillatorNodes.add(oscillator);
            oscillator.onended = () => {
                this.oscillatorNodes.delete(oscillator);
                oscillator.disconnect();
                gainNode.disconnect();
            };

        } catch (error) {
            console.error('Failed to play subdivision beat:', error);
        }
    }

    /**
     * Set selected voice for speech synthesis
     * @param {string} voiceName - Name of the voice to select
     */
    setSelectedVoice(voiceName) {
        this.selectedVoice = this.availableVoices.find(voice => voice.name === voiceName) || null;
        console.log('Selected voice:', this.selectedVoice?.name || 'default');
    }

    /**
     * Set speech rate for voice announcements
     * @param {number} rate - Speech rate (1.0 to 3.0, where 1.0 is normal speed)
     */
    setSpeechRate(rate) {
        // Clamp rate between 1.0 and 3.0
        this.speechRate = Math.max(1.0, Math.min(3.0, rate));
        console.log('Speech rate set to:', this.speechRate);
        
        // Update UI display if element exists
        const displayEl = document.getElementById('speechRateDisplay');
        if (displayEl) {
            displayEl.textContent = `${this.speechRate.toFixed(1)}x`;
        }
    }

    /**
     * Clean up audio resources
     */
    cleanup() {
        // Stop all active oscillators
        this.oscillatorNodes.forEach(oscillator => {
            try {
                oscillator.stop();
            } catch (e) {
                // Oscillator may have already stopped
            }
        });
        this.oscillatorNodes.clear();

        // Cancel any pending speech
        if (Utils.checkBrowserSupport().speechSynthesis) {
            speechSynthesis.cancel();
        }

        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Export for use in other modules
window.AudioManager = AudioManager;