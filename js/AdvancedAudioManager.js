// DrumHelper Advanced Audio Features Module

/**
 * AdvancedAudioManager extends the basic AudioManager with additional features
 * Including custom sounds, effects, and advanced audio processing
 */
class AdvancedAudioManager extends AudioManager {
    constructor(configManager) {
        super();
        this.configManager = configManager;
        
        // Advanced audio features
        this.soundBank = new Map();
        this.effects = new Map();
        this.audioWorklet = null;
        this.analyser = null;
        this.compressor = null;
        this.reverb = null;
        
        // Audio customization
        this.customSounds = {
            beat: null,
            downbeat: null,
            subdivision: null,
            accent: null
        };
        
        // Rhythm patterns
        this.rhythmPatterns = new Map([
            ['straight', [1, 0, 0, 0]], // Quarter notes
            ['swing', [1, 0, 0.5, 0]], // Swing eighths
            ['triplets', [1, 0, 0, 1, 0, 0]], // Triplets
            ['shuffled', [1, 0, 0.3, 1, 0, 0.3]], // Shuffle
            ['latin', [1, 0, 0.7, 0, 1, 0, 0.3, 0]] // Latin pattern
        ]);
        
        this.initializeAdvancedFeatures().catch(error => {
            console.error('Failed to initialize advanced audio features:', error);
        });
    }

    /**
     * Initialize advanced audio features
     */
    async initializeAdvancedFeatures() {
        try {
            await this.setupAudioWorklet();
            await this.setupAudioEffects();
            await this.loadDefaultSoundBank();
            this.setupAdvancedAnalysis();
            
            console.log('Advanced audio features initialized');
        } catch (error) {
            console.warn('Some advanced audio features not available:', error);
        }
    }

    /**
     * Setup Audio Worklet for advanced processing
     */
    async setupAudioWorklet() {
        if (!this.audioContext || !this.audioContext.audioWorklet) {
            console.warn('AudioWorklet not supported');
            return;
        }

        try {
            // Create inline worklet processor
            const workletCode = `
                class MetronomeProcessor extends AudioWorkletProcessor {
                    constructor(options) {
                        super();
                        this.samples = 0;
                        this.nextClickSample = 0;
                        this.tempo = 120;
                        this.isPlaying = false;
                        
                        this.port.onmessage = (event) => {
                            if (event.data.type === 'tempo') {
                                this.tempo = event.data.value;
                            } else if (event.data.type === 'play') {
                                this.isPlaying = true;
                                this.nextClickSample = this.samples + 
                                    (sampleRate * 60) / this.tempo / 4;
                            } else if (event.data.type === 'stop') {
                                this.isPlaying = false;
                            }
                        };
                    }
                    
                    process(inputs, outputs, parameters) {
                        const output = outputs[0];
                        
                        if (this.isPlaying && output.length > 0) {
                            const outputChannel = output[0];
                            
                            for (let i = 0; i < outputChannel.length; i++) {
                                if (this.samples === Math.floor(this.nextClickSample)) {
                                    // Generate click
                                    outputChannel[i] = Math.sin(2 * Math.PI * 1000 * 
                                        this.samples / sampleRate) * 0.1;
                                    
                                    // Schedule next click
                                    this.nextClickSample += (sampleRate * 60) / this.tempo / 4;
                                } else {
                                    outputChannel[i] = 0;
                                }
                                
                                this.samples++;
                            }
                        }
                        
                        return true;
                    }
                }
                
                registerProcessor('metronome-processor', MetronomeProcessor);
            `;

            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const workletURL = URL.createObjectURL(blob);
            
            await this.audioContext.audioWorklet.addModule(workletURL);
            this.audioWorklet = new AudioWorkletNode(this.audioContext, 'metronome-processor');
            
            URL.revokeObjectURL(workletURL);
            
            console.log('AudioWorklet setup complete');
        } catch (error) {
            console.warn('AudioWorklet setup failed:', error);
        }
    }

    /**
     * Setup advanced audio effects
     */
    async setupAudioEffects() {
        if (!this.audioContext) return;

        try {
            // Compressor for audio leveling
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
            this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
            this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
            this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

            // Simple reverb using convolution
            await this.createReverb();

            // Connect effects chain
            this.compressor.connect(this.audioContext.destination);
            
            this.effects.set('compressor', this.compressor);
            this.effects.set('reverb', this.reverb);

            console.log('Audio effects setup complete');
        } catch (error) {
            console.error('Audio effects setup failed:', error);
        }
    }

    /**
     * Create simple reverb effect
     */
    async createReverb() {
        if (!this.audioContext) return;

        try {
            this.reverb = this.audioContext.createConvolver();
            
            // Create impulse response for reverb
            const sampleRate = this.audioContext.sampleRate;
            const length = sampleRate * 2; // 2 second reverb
            const impulse = this.audioContext.createBuffer(2, length, sampleRate);
            
            for (let channel = 0; channel < 2; channel++) {
                const channelData = impulse.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                    const decay = Math.pow(1 - i / length, 2);
                    channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
                }
            }
            
            this.reverb.buffer = impulse;
        } catch (error) {
            console.warn('Reverb creation failed:', error);
        }
    }

    /**
     * Setup advanced audio analysis
     */
    setupAdvancedAnalysis() {
        if (!this.audioContext) return;

        try {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.connect(this.audioContext.destination);
            
            // Setup real-time analysis
            this.startAudioAnalysis();
            
            console.log('Audio analysis setup complete');
        } catch (error) {
            console.warn('Audio analysis setup failed:', error);
        }
    }

    /**
     * Start real-time audio analysis
     */
    startAudioAnalysis() {
        if (!this.analyser) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        const analyze = () => {
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate audio metrics
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const peak = Math.max(...dataArray);
            
            // Update audio visualization if needed
            this.updateAudioVisualization(dataArray, average, peak);
            
            requestAnimationFrame(analyze);
        };
        
        analyze();
    }

    /**
     * Update audio visualization
     */
    updateAudioVisualization(dataArray, average, peak) {
        // Emit events for visualization components
        if (this.configManager) {
            this.configManager.notifyObservers('audio-analysis', {
                frequencies: dataArray,
                average,
                peak
            });
        }
    }

    /**
     * Load default sound bank
     */
    async loadDefaultSoundBank() {
        const sounds = {
            // Classic metronome sounds
            'wood-block': await this.createWoodBlockSound(),
            'click': await this.createClickSound(),
            'beep': await this.createBeepSound(),
            'tick': await this.createTickSound(),
            
            // Drum sounds
            'kick': await this.createKickSound(),
            'snare': await this.createSnareSound(),
            'hihat': await this.createHiHatSound(),
            'cowbell': await this.createCowbellSound(),
            
            // Electronic sounds
            'sine': await this.createSineSound(),
            'square': await this.createSquareSound(),
            'sawtooth': await this.createSawtoothSound(),
            'noise': await this.createNoiseSound()
        };

        for (const [name, buffer] of Object.entries(sounds)) {
            if (buffer) {
                this.soundBank.set(name, buffer);
            }
        }

        console.log(`Loaded ${this.soundBank.size} sounds into sound bank`);
    }

    /**
     * Create wood block sound
     */
    async createWoodBlockSound() {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.1;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 50);
                const frequency = 800 + (400 * Math.exp(-t * 20));
                data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
            }

            return buffer;
        } catch (error) {
            console.error('Failed to create wood block sound:', error);
            return null;
        }
    }

    /**
     * Create click sound
     */
    async createClickSound() {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.05;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 100);
                data[i] = Math.sin(2 * Math.PI * 2000 * t) * envelope * 0.2;
            }

            return buffer;
        } catch (error) {
            console.error('Failed to create click sound:', error);
            return null;
        }
    }

    /**
     * Create beep sound
     */
    async createBeepSound() {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.1;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.sin(Math.PI * t / duration);
                data[i] = Math.sin(2 * Math.PI * 1000 * t) * envelope * 0.2;
            }

            return buffer;
        } catch (error) {
            console.error('Failed to create beep sound:', error);
            return null;
        }
    }

    /**
     * Create tick sound
     */
    async createTickSound() {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.02;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 200);
                const noise = (Math.random() - 0.5) * 2;
                data[i] = noise * envelope * 0.1;
            }

            return buffer;
        } catch (error) {
            console.error('Failed to create tick sound:', error);
            return null;
        }
    }

    /**
     * Create kick drum sound
     */
    async createKickSound() {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.3;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 5);
                const frequency = 60 * Math.exp(-t * 10);
                const sine = Math.sin(2 * Math.PI * frequency * t);
                const noise = (Math.random() - 0.5) * 0.1;
                data[i] = (sine + noise) * envelope * 0.4;
            }

            return buffer;
        } catch (error) {
            console.error('Failed to create kick sound:', error);
            return null;
        }
    }

    /**
     * Create snare drum sound
     */
    async createSnareSound() {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.15;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 30);
                const tone = Math.sin(2 * Math.PI * 200 * t) * 0.3;
                const noise = (Math.random() - 0.5) * 0.7;
                data[i] = (tone + noise) * envelope * 0.3;
            }

            return buffer;
        } catch (error) {
            console.error('Failed to create snare sound:', error);
            return null;
        }
    }

    /**
     * Create hi-hat sound
     */
    async createHiHatSound() {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.05;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 50);
                const highFreq = Math.sin(2 * Math.PI * 8000 * t) * 0.3;
                const noise = (Math.random() - 0.5) * 0.7;
                data[i] = (highFreq + noise) * envelope * 0.2;
            }

            return buffer;
        } catch (error) {
            console.error('Failed to create hi-hat sound:', error);
            return null;
        }
    }

    /**
     * Create cowbell sound
     */
    async createCowbellSound() {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.2;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 10);
                const freq1 = Math.sin(2 * Math.PI * 800 * t);
                const freq2 = Math.sin(2 * Math.PI * 540 * t);
                data[i] = (freq1 + freq2) * envelope * 0.15;
            }

            return buffer;
        } catch (error) {
            console.error('Failed to create cowbell sound:', error);
            return null;
        }
    }

    /**
     * Create basic waveform sounds
     */
    async createSineSound() {
        return this.createWaveformSound('sine', 880, 0.1);
    }

    async createSquareSound() {
        return this.createWaveformSound('square', 880, 0.05);
    }

    async createSawtoothSound() {
        return this.createWaveformSound('sawtooth', 880, 0.05);
    }

    async createNoiseSound() {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.05;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 50);
                data[i] = (Math.random() - 0.5) * 2 * envelope * 0.1;
            }

            return buffer;
        } catch (error) {
            console.error('Failed to create noise sound:', error);
            return null;
        }
    }

    /**
     * Create waveform-based sound
     */
    async createWaveformSound(waveform, frequency, volume) {
        if (!this.audioContext) return null;

        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.1;
            const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                const envelope = Math.exp(-t * 20);
                let sample = 0;

                switch (waveform) {
                    case 'sine':
                        sample = Math.sin(2 * Math.PI * frequency * t);
                        break;
                    case 'square':
                        sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
                        break;
                    case 'sawtooth':
                        sample = 2 * (t * frequency - Math.floor(0.5 + t * frequency));
                        break;
                    case 'triangle':
                        sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
                        break;
                }

                data[i] = sample * envelope * volume;
            }

            return buffer;
        } catch (error) {
            console.error(`Failed to create ${waveform} sound:`, error);
            return null;
        }
    }

    /**
     * Play sound from sound bank
     */
    playSoundFromBank(soundName, volume = 1.0, pitch = 1.0) {
        if (!this.audioContext || !this.soundBank.has(soundName)) {
            console.warn(`Sound "${soundName}" not found in sound bank`);
            return;
        }

        try {
            const buffer = this.soundBank.get(soundName);
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            source.playbackRate.value = pitch;
            gainNode.gain.value = volume;

            source.connect(gainNode);
            
            // Connect through effects if available
            if (this.compressor) {
                gainNode.connect(this.compressor);
            } else {
                gainNode.connect(this.audioContext.destination);
            }

            source.start();

            // Clean up
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
            };

        } catch (error) {
            console.error('Failed to play sound from bank:', error);
        }
    }

    /**
     * Override parent beat methods to use sound bank
     */
    playBeat() {
        const soundName = this.configManager?.get('audio.beatSound', 'click');
        const volume = this.configManager?.get('audio.volume', 0.7);
        
        if (this.metronomeEnabled) {
            this.playSoundFromBank(soundName, volume * 0.7);
        }
    }

    playDownbeat() {
        const soundName = this.configManager?.get('audio.downbeatSound', 'wood-block');
        const volume = this.configManager?.get('audio.volume', 0.7);
        
        if (this.metronomeEnabled) {
            this.playSoundFromBank(soundName, volume);
        }
    }

    /**
     * Play rhythm pattern
     */
    playRhythmPattern(patternName, beat) {
        if (!this.rhythmPatterns.has(patternName)) return;

        const pattern = this.rhythmPatterns.get(patternName);
        const patternIndex = beat % pattern.length;
        const velocity = pattern[patternIndex];

        if (velocity > 0) {
            const soundName = velocity === 1 ? 
                this.configManager?.get('audio.downbeatSound', 'wood-block') :
                this.configManager?.get('audio.beatSound', 'click');
            
            this.playSoundFromBank(soundName, velocity * this.configManager?.get('audio.volume', 0.7));
        }
    }

    /**
     * Get available sounds
     */
    getAvailableSounds() {
        return Array.from(this.soundBank.keys());
    }

    /**
     * Get available rhythm patterns
     */
    getAvailableRhythmPatterns() {
        return Array.from(this.rhythmPatterns.keys());
    }

    /**
     * Add custom sound to bank
     */
    async addCustomSound(name, audioBuffer) {
        if (audioBuffer instanceof AudioBuffer) {
            this.soundBank.set(name, audioBuffer);
            return true;
        }
        return false;
    }

    /**
     * Load sound from file
     */
    async loadSoundFromFile(file) {
        if (!this.audioContext || !file) return null;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error('Failed to load sound from file:', error);
            return null;
        }
    }

    /**
     * Clean up advanced audio resources
     */
    cleanup() {
        super.cleanup();
        
        if (this.audioWorklet) {
            this.audioWorklet.disconnect();
        }
        
        this.effects.forEach(effect => {
            try {
                effect.disconnect();
            } catch (e) {
                // Effect may already be disconnected
            }
        });
        
        this.soundBank.clear();
        this.effects.clear();
    }
}

// Export for use in other modules
window.AdvancedAudioManager = AdvancedAudioManager;