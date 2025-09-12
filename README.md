# 🥁 DrumHelper

A professional metronome with intelligent voice announcements for drummers.

## 🌟 Why DrumHelper?

**The Problem**: Traditional metronomes only provide timing - but drummers need to navigate complex song structures with multiple sections, tempo changes, and precise transitions. Counting measures while focusing on playing is challenging.

**The Solution**: DrumHelper combines precise metronome timing with intelligent voice announcements that guide you through complete song structures, announce sections, and count measures automatically.

### ✨ Key Benefits

- **🎯 Stay Focused**: Voice announcements let you concentrate on playing, not counting
- **📱 Always Available**: Works offline as a PWA - practice anywhere, anytime
- **🎵 Song-Aware**: Understands complete song structures, not just tempo
- **⚡ Zero Setup**: No installation required - works instantly in any modern browser
- **🔧 Fully Customizable**: Control every aspect of voice, timing, and visual feedback

---

## 🚀 Quick Start

### Option 1: Web Browser (Instant)
1. **Open**: [https://rafikilab.github.io/Drum-helper/](https://rafikilab.github.io/Drum-helper/) in any modern browser
2. **Create**: Click "📝 New Song" to build your first song structure
3. **Practice**: Hit "▶ Play" and let DrumHelper guide your practice

### Option 2: Install as PWA (Recommended)
1. **Visit** the web app in Chrome, Safari, or Edge
2. **Install** when prompted (or click browser menu → "Install DrumHelper")
3. **Launch** from your device's app drawer like a native app
4. **Enjoy** offline functionality and faster loading

---

## 🎵 Features

### 🎤 Intelligent Voice System
- **Section Announcements**: "Intro", "Verse 1", "Chorus", "Bridge"
- **Measure Counting**: "Measure 1 of 8", "Measure 2 of 8"
- **Transition Alerts**: "Last measure" warnings
- **Multi-Language Support**: Works with system voice settings
- **Speed Control**: Adjust speech rate from 1.0x to 3.0x

### 🎼 Advanced Song Management
- **Complete Song Structures**: Build full arrangements with named sections
- **Flexible Measures**: Each section can have 1-32 measures
- **Multiple Subdivisions**: Quarter, eighth, triplet, sixteenth note patterns
- **Tempo Range**: 60-200 BPM with precise Web Audio API timing
- **Import/Export**: Share songs as JSON files

### 📱 Progressive Web App
- **Offline Ready**: Full functionality without internet
- **Install Anywhere**: Works on mobile, tablet, desktop
- **Background Sync**: Seamlessly handles network changes
- **Storage Management**: Smart cache with cleanup tools
- **Performance Optimized**: Sub-50ms audio latency

### 🎨 Professional Interface
- **Visual Beat Indicator**: Pulsing circle synced to tempo
- **Progress Tracking**: See your position in each section
- **Dark Theme**: Easy on the eyes during long practice sessions
- **Touch Optimized**: Responsive design for all devices
- **Accessibility**: Full keyboard navigation and screen reader support

---

## 📖 Complete Usage Guide

### Creating Your First Song

1. **Start New Song**
   ```
   Click "📝 New Song" → Song Composer opens
   ```

2. **Basic Settings**
   ```
   Song Title: "My Practice Song"
   Tempo: 120 BPM
   Subdivision: ♩ Quarter notes (1 per beat)
   ```

3. **Add Song Sections**
   ```
   Section Name    | Measures
   ----------------|----------
   Intro          | 4
   Verse 1        | 16  
   Chorus         | 8
   Verse 2        | 16
   Chorus         | 8
   Bridge         | 8
   Final Chorus   | 8
   Outro          | 4
   ```

4. **Save & Practice**
   ```
   Click "💾 Save" → Song appears in library
   Select song → Click "▶ Play"
   ```

### Audio Controls Explained

| Control | Function | When to Use |
|---------|----------|-------------|
| **🎵 Metronome** | Traditional click sounds | Always - provides timing reference |
| **🔊 Voice** | Section announcements | Learning new songs, complex arrangements |
| **📊 Measures** | Counts "Measure 1", "Measure 2" | Sections with specific measure requirements |
| **🎙️ Voice Selection** | Choose system voice | Pick clearest voice for your language |
| **🚀 Speech Speed** | 1.0x - 3.0x rate | Match your comfort level and tempo |

### Advanced Features

#### Subdivisions Explained
```
♩  Quarter Notes    - 1 click per beat (most common)
♫  Eighth Notes     - 2 clicks per beat (faster feel)
♪♪♪ Triplets       - 3 clicks per beat (swing feel)  
♬  Sixteenth Notes  - 4 clicks per beat (very precise)
```

#### Smart Voice Announcements
```
What You Hear:
"Intro"           → Section starts
"Measure 1 of 4"  → (if measure counting enabled)
"Measure 2 of 4"
"Last measure"    → Warning before section change
"Verse 1"         → Next section begins
```

#### Export/Import Workflow
```
Export Single Song:
Select song → Click "📤 Export" → Downloads [songname].json

Export All Songs:  
Click "📤 Export All" → Downloads all-songs.json

Import Songs:
Click "📥 Import" → Select .json file → Songs added to library
```

---

## 🔧 Troubleshooting

### Common Issues

#### 🔇 No Audio Playing
**Symptoms**: Metronome silent, no voice announcements
**Solutions**:
```
1. Check browser audio permissions
2. Ensure volume is up (system + browser)
3. Try clicking page first (browsers require user interaction)
4. Check if other tabs are blocking audio
5. Disable browser extensions that might block audio
```

#### 🎤 Voice Announcements Not Working
**Symptoms**: Metronome works, but no voice
**Solutions**:
```
1. Enable "Voice announcements" toggle
2. Check system text-to-speech settings
3. Try different voice from dropdown
4. Some browsers need permission for speech synthesis
5. Clear browser cache and reload
```

#### 📱 PWA Won't Install
**Symptoms**: No install prompt appears
**Solutions**:
```
1. Use Chrome, Safari, or Edge (Firefox has limited PWA support)
2. Site must be served over HTTPS (localhost is exempt)
3. Clear browser cache
4. Check if already installed (look in app menu)
5. Try manual install: Browser menu → "Install DrumHelper"
```

#### 💾 Songs Not Saving
**Symptoms**: Created songs disappear after refresh
**Solutions**:
```
1. Check if browser has storage permissions
2. Disable private/incognito mode
3. Clear browser data might be needed (will lose existing songs)
4. Some browsers limit storage in certain modes
5. Export songs as backup before troubleshooting
```

#### ⏱️ Timing Issues
**Symptoms**: Metronome drift, inconsistent tempo
**Solutions**:
```
1. Close other resource-heavy tabs
2. Ensure browser is not in power-saving mode
3. Use Chrome for best Web Audio API support
4. Avoid running on very old devices
5. Check if system audio sample rate matches (44.1kHz recommended)
```

---

## License

MIT License - see [LICENSE](LICENSE) file for details.
