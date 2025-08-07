# 🥁 DrumHelper - Drummer Assistant PWA

A professional metronome web application with intelligent voice announcements for song sections. Perfect for drummers learning complex arrangements and transitions.

## ✨ Features

### 🎵 Smart Metronome
- **Visual & Audio Beat Indicators**: Clear visual feedback with customizable sounds
- **Tempo Control**: 60-200 BPM range with real-time adjustment
- **Downbeat Emphasis**: Different sound for measure's first beat

### 🎙️ Voice Announcements
- **Section Transitions**: Automatic voice cues for song parts
- **Custom Voice Selection**: Choose from system voices
- **Multiple Languages**: Support for English, French, and more
- **Toggle Control**: Enable/disable voice announcements

### 📊 Song Structure Management
- **Flexible Sections**: Create Intro, Verse, Chorus, Bridge, etc.
- **Custom Measure Counts**: 1-32 measures per section
- **Visual Progress**: Real-time progress bars and counters
- **Section Highlighting**: Clear indication of current part

### 💾 Data Management
- **Local Storage**: Songs saved in browser (persistent)
- **Export/Import**: JSON files for backup and sharing
- **Song Library**: Manage multiple song configurations
- **Cross-Device Sync**: Via export/import functionality

### 📱 Progressive Web App
- **Installable**: Add to home screen on mobile/desktop
- **Offline Capable**: Works without internet connection
- **Responsive Design**: Perfect on phones, tablets, and computers
- **Native Feel**: App-like experience across platforms

## 🚀 Live Demo

**Try it now:** [https://rafikilab.github.io/Drum-helper](https://rafikilab.github.io/Drum-helper)

## 📱 Installation

### As a Web App (Recommended)
1. Visit the live demo URL
2. Look for "Install App" button or browser install prompt
3. Add to home screen for native app experience

### Local Development
```bash
# Clone the repository
git clone https://github.com/rafikilab/Drum-helper.git

# Navigate to directory
cd drumhelper-pwa

# Serve locally (any HTTP server works)
python -m http.server 8000
# or
npx http-server

# Open http://localhost:8000
```

## 🎯 How to Use

### Basic Usage
1. **Configure Song**: Set title, tempo, and sections
2. **Audio Settings**: Toggle metronome/voice, select voice
3. **Play**: Hit play and follow the audio/visual cues
4. **Save**: Store your configuration for future use

### Creating Song Structures
```
Example: "Wonderwall" by Oasis
- Intro: 4 measures
- Verse: 16 measures  
- Chorus: 8 measures
- Verse: 16 measures
- Chorus: 8 measures
- Bridge: 4 measures
- Chorus: 8 measures
```

### Voice Announcements
The app will announce each section:
- *"Intro for 4 measures"*
- *"Verse for 16 measures"*
- *"Chorus for 8 measures"*
- *"End of song"*

## 🛠️ Technical Details

### Built With
- **Vanilla JavaScript**: No frameworks, maximum compatibility
- **Web Audio API**: Professional-quality audio generation
- **Speech Synthesis API**: Cross-platform voice announcements
- **CSS Grid/Flexbox**: Modern responsive layouts
- **Service Worker**: Offline functionality and caching

### Browser Support
- ✅ Chrome/Chromium (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)  
- ✅ Safari (Desktop & Mobile)
- ✅ Edge (Desktop & Mobile)

### PWA Features
- 📱 Installable on all platforms
- 🔄 Offline functionality
- 🎨 Themed app appearance
- 📶 Network-independent operation

## 🎼 Perfect For

- **Drummers**: Learning new songs and complex arrangements
- **Music Students**: Practicing timing and section transitions
- **Bands**: Rehearsing song structures together
- **Music Teachers**: Teaching song arrangement concepts
- **Songwriters**: Mapping out compositions

## 🔊 Audio Features

### Metronome Sounds
- **Regular Beat**: 800Hz tone for standard beats
- **Downbeat**: 1200Hz tone for measure starts
- **Volume Control**: Adjustable via system settings

### Voice Synthesis
- **System Integration**: Uses device's built-in voices
- **Language Support**: Automatic language detection
- **Quality**: High-quality text-to-speech on all platforms
- **Offline**: Works without internet (after voice download)

## 💡 Tips & Tricks

### For Best Experience
1. **Use Headphones**: Better audio separation during practice
2. **Install as App**: Add to home screen for quick access
3. **Export Regularly**: Backup your song configurations
4. **Try Different Voices**: Experiment with voice selection

### Common Use Cases
- **Learning New Songs**: Map out structure before playing
- **Band Practice**: Share configurations with bandmates
- **Teaching**: Visual aid for explaining song structures
- **Composition**: Sketch out new song arrangements

## 🤝 Contributing

This is an open-source project! Contributions are welcome.

### Ideas for Future Features
- [ ] Multiple time signatures (3/4, 6/8, etc.)
- [ ] Custom sound samples upload
- [ ] Setlist mode for multiple songs
- [ ] MIDI sync capabilities
- [ ] Cloud storage integration
- [ ] Collaborative sharing features

### Found a Bug?
Please open an issue with:
- Device/browser information
- Steps to reproduce
- Expected vs actual behavior

## 📄 License

MIT License - feel free to use, modify, and distribute!

## 🙏 Acknowledgments

- Built with modern web standards
- Inspired by the needs of working musicians
- Designed for simplicity and reliability

---

**Made with ❤️ for the drumming community**

*Star ⭐ this repo if DrumHelper helps your practice!*
