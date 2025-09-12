// DrumHelper Offline Audio Manager - Advanced offline audio caching and fallbacks

/**
 * OfflineAudioManager handles audio asset caching and offline playback
 * Provides comprehensive offline fallbacks for all audio features
 */
class OfflineAudioManager {
    constructor() {
        this.audioContext = null;
        this.cachedBuffers = new Map();
        this.generatedSounds = new Map();
        this.offlineCapabilities = {
            webAudio: false,
            audioCache: false,
            synthGeneration: false,
            oscillatorSupport: false
        };
        
        this.soundDefinitions = {
            metronome: {
                primary: { frequency: 800, type: 'sine', duration: 0.1 },
                accent: { frequency: 1200, type: 'sine', duration: 0.15 }
            },
            drums: {
                kick: { frequency: 60, type: 'triangle', duration: 0.3 },
                snare: { frequency: 200, type: 'sawtooth', duration: 0.15 },
                hihat: { frequency: 8000, type: 'square', duration: 0.05 },
                crash: { frequency: 4000, type: 'sawtooth', duration: 0.8 }
            },
            voice: {
                notification: { frequency: 440, type: 'sine', duration: 0.2 }
            }
        };
        
        this.initialize().catch(error => {
            console.error('Failed to initialize offline audio manager:', error);
            this.setupFallbackAudio();
        });
    }

    /**
     * Initialize offline audio capabilities
     */
    async initialize() {
        try {
            console.log('Initializing OfflineAudioManager...');
            
            // Test Web Audio API support
            await this.testWebAudioSupport();
            
            // Test audio caching capabilities
            await this.testAudioCaching();
            
            // Generate synthetic sounds
            await this.generateOfflineSounds();
            
            // Cache external audio files if available
            await this.cacheAudioAssets();
            
            console.log('OfflineAudioManager initialized successfully');
            console.log('Capabilities:', this.offlineCapabilities);
            
        } catch (error) {
            console.error('Failed to initialize OfflineAudioManager:', error);
            this.setupFallbackAudio();
        }
    }

    /**
     * Test Web Audio API support
     */
    async testWebAudioSupport() {
        try {
            // Try to create AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Test basic functionality
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Clean up test
            oscillator.disconnect();
            gainNode.disconnect();
            
            this.offlineCapabilities.webAudio = true;
            this.offlineCapabilities.oscillatorSupport = true;
            
            console.log('Web Audio API supported');
            
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.offlineCapabilities.webAudio = false;
        }
    }

    /**
     * Test audio caching capabilities
     */
    async testAudioCaching() {
        try {
            // Test if we can cache audio in service worker
            if ('caches' in window && 'serviceWorker' in navigator) {
                await caches.open('drumhelper-audio-cache');
                this.offlineCapabilities.audioCache = true;
                console.log('Audio caching supported');
            }
        } catch (error) {
            console.warn('Audio caching not supported:', error);
            this.offlineCapabilities.audioCache = false;
        }
    }

    /**
     * Generate synthetic sounds for offline use
     */
    async generateOfflineSounds() {
        if (!this.offlineCapabilities.webAudio) {
            console.warn('Cannot generate offline sounds - Web Audio API not supported');
            return;
        }

        try {
            console.log('Generating offline sounds...');
            
            // Generate metronome sounds
            for (const [name, config] of Object.entries(this.soundDefinitions.metronome)) {
                const buffer = await this.generateToneBuffer(
                    config.frequency, 
                    config.type, 
                    config.duration
                );
                this.generatedSounds.set(`metronome-${name}`, buffer);
            }
            
            // Generate drum sounds
            for (const [name, config] of Object.entries(this.soundDefinitions.drums)) {
                const buffer = await this.generateDrumBuffer(name, config);
                this.generatedSounds.set(`drum-${name}`, buffer);
            }
            
            // Generate notification sounds
            for (const [name, config] of Object.entries(this.soundDefinitions.voice)) {
                const buffer = await this.generateToneBuffer(
                    config.frequency, 
                    config.type, 
                    config.duration
                );
                this.generatedSounds.set(`voice-${name}`, buffer);
            }
            
            this.offlineCapabilities.synthGeneration = true;
            console.log(`Generated ${this.generatedSounds.size} offline sounds`);
            
        } catch (error) {
            console.error('Failed to generate offline sounds:', error);
            this.offlineCapabilities.synthGeneration = false;
        }
    }

    /**
     * Generate tone buffer for simple sounds
     */
    async generateToneBuffer(frequency, type, duration) {
        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, length, sampleRate);
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 8); // Exponential decay
            
            let sample = 0;
            switch (type) {
                case 'sine':
                    sample = Math.sin(2 * Math.PI * frequency * t);
                    break;
                case 'square':
                    sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
                    break;
                case 'sawtooth':
                    sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
                    break;
                case 'triangle':
                    sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
                    break;
            }
            
            channelData[i] = sample * envelope * 0.3;
        }
        
        return buffer;
    }

    /**
     * Generate complex drum buffer with realistic characteristics
     */
    async generateDrumBuffer(drumType, config) {
        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(sampleRate * config.duration);
        const buffer = this.audioContext.createBuffer(1, length, sampleRate);
        const channelData = buffer.getChannelData(0);
        
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let sample = 0;
            
            switch (drumType) {
                case 'kick':
                    // Low frequency with quick pitch drop
                    const kickFreq = config.frequency * (1 + 2 * Math.exp(-t * 20));
                    const kickEnv = Math.exp(-t * 10);
                    sample = Math.sin(2 * Math.PI * kickFreq * t) * kickEnv;
                    break;
                    
                case 'snare':
                    // Mix of tone and noise
                    const snareEnv = Math.exp(-t * 15);
                    const tone = Math.sin(2 * Math.PI * config.frequency * t);
                    const noise = (Math.random() * 2 - 1);
                    sample = (tone * 0.3 + noise * 0.7) * snareEnv;
                    break;
                    
                case 'hihat':
                    // High frequency noise with quick decay
                    const hihatEnv = Math.exp(-t * 50);
                    sample = (Math.random() * 2 - 1) * hihatEnv;
                    // High-pass filter effect
                    if (i > 0) {
                        sample = sample - channelData[i - 1] * 0.9;
                    }
                    break;
                    
                case 'crash':
                    // Complex harmonics with long decay
                    const crashEnv = Math.exp(-t * 3);
                    let crashSample = 0;
                    for (let h = 1; h <= 5; h++) {
                        crashSample += Math.sin(2 * Math.PI * config.frequency * h * t) / h;
                    }
                    sample = crashSample * crashEnv * 0.2;
                    break;
            }
            
            channelData[i] = Math.max(-1, Math.min(1, sample * 0.5));
        }
        
        return buffer;
    }

    /**
     * Cache external audio assets for offline use
     */
    async cacheAudioAssets() {
        if (!this.offlineCapabilities.audioCache) {
            console.log('Audio caching not available');
            return;
        }

        try {
            const audioFiles = [
                'audio/metronome-tick.mp3',
                'audio/metronome-tock.mp3',
                'audio/notification.mp3'
            ];

            const cache = await caches.open('drumhelper-audio-cache');
            
            for (const file of audioFiles) {
                try {
                    const response = await fetch(file);
                    if (response.ok) {
                        await cache.put(file, response.clone());
                        
                        // Also cache as audio buffer
                        const arrayBuffer = await response.arrayBuffer();
                        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                        this.cachedBuffers.set(file, audioBuffer);
                        
                        console.log(`Cached audio asset: ${file}`);
                    }
                } catch (error) {
                    console.warn(`Failed to cache audio asset ${file}:`, error);
                }
            }
            
        } catch (error) {
            console.error('Failed to cache audio assets:', error);
        }
    }

    /**
     * Play offline sound with multiple fallback options
     */
    async playOfflineSound(soundId, options = {}) {
        const { volume = 1.0, loop = false, rate = 1.0 } = options;
        
        try {
            // Try cached audio buffer first
            if (this.cachedBuffers.has(soundId)) {
                return await this.playAudioBuffer(this.cachedBuffers.get(soundId), { volume, loop, rate });
            }
            
            // Try generated sound
            if (this.generatedSounds.has(soundId)) {
                return await this.playAudioBuffer(this.generatedSounds.get(soundId), { volume, loop, rate });
            }
            
            // Try to play from cache
            if (this.offlineCapabilities.audioCache) {
                const cached = await this.playCachedAudio(soundId, options);
                if (cached) return cached;
            }
            
            // Fallback to generated equivalent
            const fallback = this.getFallbackSound(soundId);
            if (fallback && this.generatedSounds.has(fallback)) {
                return await this.playAudioBuffer(this.generatedSounds.get(fallback), { volume, loop, rate });
            }
            
            console.warn(`No offline fallback available for sound: ${soundId}`);
            return null;
            
        } catch (error) {
            console.error('Failed to play offline sound:', error);
            return null;
        }
    }

    /**
     * Play audio buffer with Web Audio API
     */
    async playAudioBuffer(buffer, options = {}) {
        if (!this.audioContext || !buffer) {
            return null;
        }

        try {
            const { volume = 1.0, loop = false, rate = 1.0 } = options;
            
            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = buffer;
            source.loop = loop;
            source.playbackRate.value = rate;
            
            gainNode.gain.value = volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
            
            return {
                source,
                gainNode,
                stop: () => {
                    try {
                        source.stop();
                        source.disconnect();
                        gainNode.disconnect();
                    } catch (error) {
                        console.warn('Error stopping audio:', error);
                    }
                }
            };
            
        } catch (error) {
            console.error('Failed to play audio buffer:', error);
            return null;
        }
    }

    /**
     * Play cached audio from service worker cache
     */
    async playCachedAudio(soundId, options = {}) {
        try {
            const cache = await caches.open('drumhelper-audio-cache');
            const response = await cache.match(soundId);
            
            if (response) {
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                
                // Cache for future use
                this.cachedBuffers.set(soundId, audioBuffer);
                
                return await this.playAudioBuffer(audioBuffer, options);
            }
            
            return null;
            
        } catch (error) {
            console.error('Failed to play cached audio:', error);
            return null;
        }
    }

    /**
     * Get fallback sound mapping
     */
    getFallbackSound(soundId) {
        const fallbackMap = {
            'metronome-tick': 'metronome-primary',
            'metronome-tock': 'metronome-accent',
            'kick-drum': 'drum-kick',
            'snare-drum': 'drum-snare',
            'hi-hat': 'drum-hihat',
            'notification': 'voice-notification'
        };
        
        return fallbackMap[soundId] || null;
    }

    /**
     * Setup fallback audio for unsupported environments
     */
    setupFallbackAudio() {
        console.warn('Setting up fallback audio - limited functionality');
        
        // Create simple HTML5 audio fallback
        this.fallbackAudio = {
            metronome: new Audio(),
            notification: new Audio()
        };
        
        // Set up data URLs for basic sounds (very basic)
        this.fallbackAudio.metronome.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJH3L88+1axkHUKri8dlwGwU+ltryxnkpBCl+zPLVeSoEKYLM9NFzHgU7k9n0w3krBSh+yfPSeSwEKn/L8dR8HAY5lNj0yHkpBSZ9yPPUfBwGN5TX9Md9IQUqfsz02HMVBUZ+yfHYdB0GOZTPAgo=';
        
        this.offlineCapabilities.webAudio = false;
        this.offlineCapabilities.synthGeneration = false;
    }

    /**
     * Play fallback audio for unsupported environments
     */
    playFallbackAudio(type) {
        try {
            if (this.fallbackAudio && this.fallbackAudio[type]) {
                this.fallbackAudio[type].currentTime = 0;
                this.fallbackAudio[type].play().catch(error => {
                    console.warn('Fallback audio play failed:', error);
                });
            }
        } catch (error) {
            console.warn('Fallback audio error:', error);
        }
    }

    /**
     * Get comprehensive offline audio capabilities report
     */
    getCapabilities() {
        return {
            ...this.offlineCapabilities,
            cachedBuffers: this.cachedBuffers.size,
            generatedSounds: this.generatedSounds.size,
            totalOfflineSounds: this.cachedBuffers.size + this.generatedSounds.size
        };
    }

    /**
     * Preload critical sounds for immediate availability
     */
    async preloadCriticalSounds() {
        const criticalSounds = [
            'metronome-primary',
            'metronome-accent',
            'voice-notification'
        ];
        
        for (const soundId of criticalSounds) {
            if (this.generatedSounds.has(soundId)) {
                // Preload by creating a silent playback
                const sound = await this.playOfflineSound(soundId, { volume: 0 });
                if (sound) {
                    sound.stop();
                }
            }
        }
        
        console.log('Critical sounds preloaded');
    }

    /**
     * Clean up resources
     */
    cleanup() {
        try {
            if (this.audioContext && this.audioContext.state !== 'closed') {
                this.audioContext.close();
            }
            
            this.cachedBuffers.clear();
            this.generatedSounds.clear();
            
            if (this.fallbackAudio) {
                Object.values(this.fallbackAudio).forEach(audio => {
                    audio.pause();
                    audio.src = '';
                });
            }
            
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

// Export for use in other modules
window.OfflineAudioManager = OfflineAudioManager;