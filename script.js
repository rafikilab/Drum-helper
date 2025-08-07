// DrumHelper - Drummer Assistant PWA JavaScript

class DrumHelper {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.currentSection = 0;
        this.currentMeasure = 0;
        this.currentBeat = 0;
        this.tempo = 120;
        this.sections = [];
        this.intervalId = null;
        this.currentSongId = null;
        this.savedSongs = {};
        this.metronomeEnabled = true;
        this.voiceEnabled = true;
        this.storageAvailable = false;
        this.selectedVoice = null;
        this.availableVoices = [];
        
        this.initializeAudio();
        this.bindEvents();
        this.initializeStorage();
        this.initializeVoices();
        this.loadSongData();
    }

    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API not supported:', e);
        }
    }

    initializeStorage() {
        try {
            if (typeof Storage !== "undefined" && window.localStorage) {
                const testKey = 'drumhelper-test';
                localStorage.setItem(testKey, 'test');
                localStorage.getItem(testKey);
                localStorage.removeItem(testKey);
                
                this.storageAvailable = true;
                console.log('localStorage available');
                
                const saved = JSON.parse(localStorage.getItem('drumhelper-songs') || '{}');
                this.savedSongs = saved;
            } else {
                throw new Error('localStorage not supported');
            }
        } catch (e) {
            console.warn('localStorage not available:', e.message);
            this.storageAvailable = false;
            this.savedSongs = {};
            
            const storageInfo = document.getElementById('storageInfo');
            storageInfo.innerHTML = `<div class="storage-info">⚠️ Temporary storage only - use Export/Import to save your songs permanently</div>`;
        }
        this.displaySavedSongs();
    }

    initializeVoices() {
        if (typeof speechSynthesis === 'undefined') {
            console.warn('speechSynthesis not available');
            return;
        }

        const loadVoices = () => {
            this.availableVoices = speechSynthesis.getVoices();
            this.populateVoiceSelector();
        };

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
        if (this.availableVoices.length === 0) {
            setTimeout(loadVoices, 1000);
        }
    }

    populateVoiceSelector() {
        const voiceSelect = document.getElementById('voiceSelect');
        while (voiceSelect.children.length > 1) {
            voiceSelect.removeChild(voiceSelect.lastChild);
        }

        const englishVoices = this.availableVoices.filter(voice => 
            voice.lang.startsWith('en') || voice.lang.startsWith('fr')
        );
        const otherVoices = this.availableVoices.filter(voice => 
            !voice.lang.startsWith('en') && !voice.lang.startsWith('fr')
        );

        englishVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.default) option.textContent += ' ⭐';
            voiceSelect.appendChild(option);
        });

        if (otherVoices.length > 0 && englishVoices.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────';
            voiceSelect.appendChild(separator);
        }

        otherVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(option);
        });

        console.log(`${this.availableVoices.length} voices loaded`);
    }

    bindEvents() {
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlay());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('tempo').addEventListener('input', (e) => {
            this.tempo = parseInt(e.target.value);
            this.updateDisplay();
        });

        document.getElementById('metronomeToggle').addEventListener('click', () => this.toggleMetronome());
        document.getElementById('voiceToggle').addEventListener('click', () => this.toggleVoice());
        document.getElementById('voiceSelect').addEventListener('change', (e) => {
            this.selectedVoice = this.availableVoices.find(voice => voice.name === e.target.value) || null;
            console.log('Selected voice:', this.selectedVoice?.name || 'default');
        });

        document.addEventListener('touchstart', this.preventSleep);
        document.addEventListener('touchmove', this.preventSleep);
    }

    toggleMetronome() {
        this.metronomeEnabled = !this.metronomeEnabled;
        const toggle = document.getElementById('metronomeToggle');
        const switchEl = toggle.querySelector('.toggle-switch');
        
        if (this.metronomeEnabled) {
            toggle.classList.add('active');
            switchEl.classList.add('active');
        } else {
            toggle.classList.remove('active');
            switchEl.classList.remove('active');
        }
    }

    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        const toggle = document.getElementById('voiceToggle');
        const switchEl = toggle.querySelector('.toggle-switch');
        
        if (this.voiceEnabled) {
            toggle.classList.add('active');
            switchEl.classList.add('active');
        } else {
            toggle.classList.remove('active');
            switchEl.classList.remove('active');
        }
    }

    preventSleep(e) {
        // Prevent sleep on mobile
    }

    saveSavedSongs() {
        if (this.storageAvailable) {
            try {
                localStorage.setItem('drumhelper-songs', JSON.stringify(this.savedSongs));
            } catch (e) {
                console.error('Save error:', e);
                alert('Save error: ' + e.message);
            }
        } else {
            console.warn('Temporary save only - localStorage not available');
        }
    }

    loadSongData() {
        this.tempo = parseInt(document.getElementById('tempo').value);
        this.updateSections();
        this.updateDisplay();
    }

    updateSections() {
        this.sections = [];
        const sectionElements = document.querySelectorAll('#sections .section-item');
        sectionElements.forEach(element => {
            const name = element.querySelector('input[type="text"]').value;
            const measures = parseInt(element.querySelector('input[type="number"]').value) || 1;
            if (name) {
                this.sections.push({ name, measures });
            }
        });
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    async play() {
        if (!this.audioContext) {
            await this.initializeAudio();
        }
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.loadSongData();
        this.isPlaying = true;
        document.getElementById('playBtn').innerHTML = '⏸ Pause';
        
        const beatInterval = 60000 / this.tempo;
        if (this.voiceEnabled && this.currentSection < this.sections.length) {
            const section = this.sections[this.currentSection];
            this.announceSection(`${section.name}, ${section.measures} measures`);
        }
        
        this.intervalId = setInterval(() => {
            this.processBeat();
        }, beatInterval);
        this.updateDisplay();
    }

    pause() {
        this.isPlaying = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        document.getElementById('playBtn').innerHTML = '▶ Play';
    }

    stop() {
        this.pause();
        this.currentSection = 0;
        this.currentMeasure = 0;
        this.currentBeat = 0;
        this.updateDisplay();
    }

    processBeat() {
        this.currentBeat++;
        this.flashBeat();
        
        if (this.currentBeat === 1) {
            if (this.metronomeEnabled) {
                this.playDownbeat();
            }
            if (this.voiceEnabled && this.currentMeasure === 0 && this.currentSection > 0 && this.currentSection < this.sections.length) {
                const section = this.sections[this.currentSection];
                this.announceSection(`${section.name} for ${section.measures} measures`);
            }
        } else {
            if (this.metronomeEnabled) {
                this.playBeat();
            }
        }

        if (this.currentBeat >= 4) {
            this.currentBeat = 0;
            this.currentMeasure++;
            
            if (this.currentMeasure >= this.sections[this.currentSection]?.measures) {
                this.currentMeasure = 0;
                this.currentSection++;
                
                if (this.currentSection >= this.sections.length) {
                    this.stop();
                    if (this.voiceEnabled) {
                        this.announceSection("End of song");
                    }
                    return;
                }
            }
        }
        this.updateDisplay();
    }

    playBeat() {
        if (!this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    playDownbeat() {
        if (!this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    announceSection(sectionName) {
        if (!this.voiceEnabled || typeof speechSynthesis === 'undefined') return;
        if (window.self !== window.top) {
            console.warn('speechSynthesis may be blocked in iframe');
        }

        try {
            setTimeout(() => {
                speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(sectionName);
                
                if (this.selectedVoice) {
                    utterance.voice = this.selectedVoice;
                    utterance.lang = this.selectedVoice.lang;
                } else {
                    utterance.lang = 'en-US';
                }
                
                utterance.rate = 1.0;
                utterance.volume = 0.9;
                utterance.pitch = 1.0;
                utterance.onstart = () => console.log('TTS started:', sectionName);
                utterance.onerror = (event) => console.error('TTS error:', event.error);
                utterance.onend = () => console.log('TTS finished');

                speechSynthesis.speak(utterance);
                this.showTextAnnouncement(sectionName);
            }, 100);
        } catch (error) {
            console.error('Speech synthesis error:', error);
            this.showTextAnnouncement(sectionName);
        }
    }

    showTextAnnouncement(text) {
        const announcement = document.createElement('div');
        announcement.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(16, 185, 129, 0.9); color: white; padding: 20px 40px; border-radius: 15px; font-size: 1.5rem; font-weight: bold; z-index: 1000; box-shadow: 0 10px 30px rgba(0,0,0,0.3); pointer-events: none;`;
        announcement.textContent = text;
        document.body.appendChild(announcement);
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 2000);
    }

    flashBeat() {
        const visualBeat = document.getElementById('visualBeat');
        const beatFlash = document.getElementById('beatFlash');
        visualBeat.classList.add('active');
        beatFlash.classList.add('active');
        setTimeout(() => {
            visualBeat.classList.remove('active');
            beatFlash.classList.remove('active');
        }, 100);
    }

    updateDisplay() {
        document.getElementById('tempoDisplay').textContent = `${this.tempo} BPM`;
        if (this.sections.length > 0 && this.currentSection < this.sections.length) {
            const section = this.sections[this.currentSection];
            document.getElementById('currentSection').textContent = section.name;
            document.getElementById('measureCount').textContent = `Measure: ${this.currentMeasure + 1} / ${section.measures}`;
            const progress = ((this.currentMeasure + (this.currentBeat / 4)) / section.measures) * 100;
            document.getElementById('progressFill').style.width = `${Math.min(progress, 100)}%`;
        } else {
            document.getElementById('currentSection').textContent = 'Ready to play';
            document.getElementById('measureCount').textContent = 'Measure: 0 / 0';
            document.getElementById('progressFill').style.width = '0%';
        }
    }

    saveCurrentSong() {
        const title = document.getElementById('songTitle').value.trim();
        if (!title) {
            alert('Please enter a song title');
            return;
        }

        const songData = {
            id: this.currentSongId || Date.now().toString(),
            title: title,
            tempo: parseInt(document.getElementById('tempo').value),
            sections: [],
            savedAt: new Date().toISOString()
        };

        const sectionElements = document.querySelectorAll('#sections .section-item');
        sectionElements.forEach(element => {
            const name = element.querySelector('input[type="text"]').value.trim();
            const measures = parseInt(element.querySelector('input[type="number"]').value) || 1;
            if (name) {
                songData.sections.push({ name, measures });
            }
        });

        if (songData.sections.length === 0) {
            alert('Add at least one section to your song');
            return;
        }

        this.savedSongs[songData.id] = songData;
        this.currentSongId = songData.id;
        this.saveSavedSongs();
        this.displaySavedSongs();
        
        const saveMessage = this.storageAvailable ? 
            `Song "${title}" saved!` : 
            `Song "${title}" saved temporarily! Use Export to save it permanently.`;
        alert(saveMessage);
    }

    loadSong(songId) {
        const song = this.savedSongs[songId];
        if (!song) return;
        if (this.isPlaying) {
            this.stop();
        }

        document.getElementById('songTitle').value = song.title;
        document.getElementById('tempo').value = song.tempo;
        const sectionsDiv = document.getElementById('sections');
        sectionsDiv.innerHTML = '';

        song.sections.forEach(section => {
            const sectionElement = document.createElement('div');
            sectionElement.className = 'section-item';
            sectionElement.innerHTML = `<input type="text" placeholder="Name" value="${section.name}"><input type="number" placeholder="Measures" min="1" max="32" value="${section.measures}"><button onclick="removeSection(this)">✕</button>`;
            sectionsDiv.appendChild(sectionElement);
        });

        this.currentSongId = songId;
        this.loadSongData();
        this.displaySavedSongs();
        alert(`Song "${song.title}" loaded!`);
    }

    deleteSong(songId) {
        const song = this.savedSongs[songId];
        if (!song) return;
        if (confirm(`Delete song "${song.title}"?`)) {
            delete this.savedSongs[songId];
            this.saveSavedSongs();
            this.displaySavedSongs();
            if (this.currentSongId === songId) {
                this.currentSongId = null;
            }
        }
    }

    displaySavedSongs() {
        const container = document.getElementById('savedSongs');
        container.innerHTML = '';
        const songs = Object.values(this.savedSongs).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        if (songs.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #9ca3af;">No saved songs</p>';
            return;
        }

        songs.forEach(song => {
            const songCard = document.createElement('div');
            songCard.className = `song-card ${this.currentSongId === song.id ? 'active' : ''}`;
            const sectionsText = song.sections.map(s => `${s.name}(${s.measures})`).join(', ');
            const savedDate = new Date(song.savedAt).toLocaleDateString('en-US');
            songCard.innerHTML = `<h4>${song.title}</h4><div class="song-info">${song.tempo} BPM<br>${sectionsText}<br><small>Saved on ${savedDate}</small></div><div class="song-actions"><button class="btn-small btn-load" onclick="drumHelper.loadSong('${song.id}')">Load</button><button class="btn-small btn-delete" onclick="drumHelper.deleteSong('${song.id}')">Delete</button></div>`;
            container.appendChild(songCard);
        });
    }

    exportAllSongs() {
        const exportData = { version: '1.0', exportDate: new Date().toISOString(), songs: this.savedSongs };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drumhelper-songs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`${Object.keys(this.savedSongs).length} song(s) exported!`);
    }

    importSongs(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                let importedCount = 0;
                if (importData.songs) {
                    const shouldMerge = confirm('Do you want to merge with your existing songs?\n\nOK = Merge (keep existing)\nCancel = Replace all');
                    if (!shouldMerge) {
                        this.savedSongs = {};
                    }
                    Object.values(importData.songs).forEach(song => {
                        let newId = song.id;
                        if (this.savedSongs[newId]) {
                            newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                        }
                        this.savedSongs[newId] = { ...song, id: newId, importedAt: new Date().toISOString() };
                        importedCount++;
                    });
                    this.saveSavedSongs();
                    this.displaySavedSongs();
                    alert(`${importedCount} song(s) imported successfully!`);
                } else {
                    alert('Invalid file format');
                }
            } catch (error) {
                console.error('Import error:', error);
                alert('Import error. Invalid file?');
            }
        };
        reader.readAsText(file);
    }
}

// Global functions
function addSection() {
    const sectionsDiv = document.getElementById('sections');
    const newSection = document.createElement('div');
    newSection.className = 'section-item';
    newSection.innerHTML = `<input type="text" placeholder="Name (e.g. Bridge)"><input type="number" placeholder="Measures" min="1" max="32" value="4"><button onclick="removeSection(this)">✕</button>`;
    sectionsDiv.appendChild(newSection);
}

function removeSection(button) {
    const sectionsDiv = document.getElementById('sections');
    if (sectionsDiv.children.length > 1) {
        button.parentElement.remove();
    }
}

function saveSong() { drumHelper.saveCurrentSong(); }
function exportSongs() { drumHelper.exportAllSongs(); }
function importSongs(input) {
    if (input.files && input.files[0]) {
        drumHelper.importSongs(input.files[0]);
        input.value = '';
    }
}

let drumHelper;

// PWA installation
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.createElement('button');
    installBtn.textContent = '📱 Install App';
    installBtn.className = 'btn btn-primary';
    installBtn.style.margin = '10px auto';
    installBtn.style.display = 'block';
    installBtn.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                installBtn.remove();
            }
            deferredPrompt = null;
        });
    });
    document.querySelector('.container').appendChild(installBtn);
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    try {
        drumHelper = new DrumHelper();
        console.log('DrumHelper initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('playBtn').addEventListener('click', () => {
            alert('Error: ' + error.message);
        });
    }
});

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swCode = `const CACHE_NAME = 'drumhelper-v1'; const urlsToCache = ['/']; self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))); }); self.addEventListener('fetch', (event) => { event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request))); });`;
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl).then((registration) => console.log('SW registered')).catch((error) => console.log('SW registration failed'));
    });
}
