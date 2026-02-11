# Vocal Tone Analyzer GUI 🎤

A beautiful, modern GUI application for analyzing vocal tone and detecting emotions using AI-powered speech analysis.

![Vocal Tone Analyzer](https://img.shields.io/badge/AI-Powered-blue) ![Python](https://img.shields.io/badge/Python-3.8+-green)

## Features ✨

- 🎨 **Modern Dark UI** - Beautiful, professional interface with smooth animations
- 📁 **File Selection** - Support for WAV, MP3, M4A, and FLAC audio files
- 🎙️ **Live Recording** - Record your voice directly from the microphone
- 🤖 **AI Analysis** - Powered by Wav2Vec2 emotion recognition model
- 📊 **Visual Results** - Easy-to-read emotion detection with confidence scores
- 🎯 **Multiple Predictions** - See top 3 emotion predictions with percentages

## Supported Emotions 😊

- Neutral
- Happy/Confident
- Angry
- Sad
- Fearful/Nervous
- Disgust
- Surprised

## Installation 📦

### 1. Install Python Dependencies

```bash
cd "c:/Users/PMLS/OneDrive - BUITEMS/BUITEMS/University/FYP/AI Modules/Voice_Model"
pip install -r ai_engine/requirements.txt
```

### 2. Install PyAudio (for recording)

**Windows:**
```bash
pip install pipwin
pipwin install pyaudio
```

Or download the wheel file from [here](https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyaudio) and install:
```bash
pip install PyAudio-0.2.11-cp311-cp311-win_amd64.whl
```

**macOS:**
```bash
brew install portaudio
pip install pyaudio
```

**Linux:**
```bash
sudo apt-get install portaudio19-dev
pip install pyaudio
```

## Running the GUI 🚀

```bash
cd "c:/Users/PMLS/OneDrive - BUITEMS/BUITEMS/University/FYP/AI Modules/Voice_Model"
python vocal_tone_gui.py
```

## How to Use 📖

### Method 1: Analyze Existing Audio File

1. Click **"Browse Files"** button
2. Select your audio file (WAV, MP3, etc.)
3. Click **"Analyze Audio"** button
4. View the results on the right panel

### Method 2: Record and Analyze

1. Click **"⏺ Start Recording"** button
2. Speak into your microphone
3. Click **"⏹ Stop Recording"** when done
4. The recording will be saved automatically
5. Click **"Analyze Audio"** button
6. View the results on the right panel

## First Run ⏳

On the first run, the AI model (~380MB) will be downloaded automatically. This requires:
- Stable internet connection
- ~500MB free disk space
- 5-15 seconds for initialization

The model is cached locally, so subsequent runs will be much faster!

## Screenshots 📸

### Main Interface
The GUI features:
- **Top Section**: Title and status indicator
- **Left Panel**: File selection, recording, and analysis controls
- **Right Panel**: Detailed results with color-coded emotions

### Results Display
- Primary emotion with large display
- Confidence percentage
- Top 3 predictions with progress bars
- Color-coded emotions for easy identification

## Troubleshooting 🔧

### PyAudio Installation Issues

If you encounter errors installing PyAudio on Windows:

1. Try using `pipwin`:
   ```bash
   pip install pipwin
   pipwin install pyaudio
   ```

2. Or download the appropriate wheel file for your Python version from:
   https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyaudio

### Recording Not Working

- Check microphone permissions in Windows Settings
- Ensure your microphone is properly connected
- Try running the application as administrator

### Model Download Fails

- Check your internet connection
- Verify firewall/proxy settings
- Ensure you have enough disk space
- Try again - sometimes Hugging Face servers can be slow

### Low Confidence Scores

- Ensure audio quality is good (minimal background noise)
- Speak clearly into the microphone
- Record for at least 2-3 seconds
- Use a better quality microphone if available

### M4A/MP4 Audio Files Not Working

If you get "Malformed soundfile" error with M4A files:

1. **Install FFmpeg** (required for M4A/MP4 support):

   **Windows:**
   - Download from: https://www.gyan.dev/ffmpeg/builds/
   - Extract the zip file
   - Add the `bin` folder to your system PATH
   
   Or use Chocolatey:
   ```bash
   choco install ffmpeg
   ```

   **macOS:**
   ```bash
   brew install ffmpeg
   ```

   **Linux:**
   ```bash
   sudo apt-get install ffmpeg
   ```

2. **Convert M4A to WAV** (alternative):
   - Use an online converter or VLC media player
   - Convert to WAV format before analysis

## Technical Details 🔬

- **AI Model**: `superb/wav2vec2-base-superb-er` (Wav2Vec2)
- **Framework**: Hugging Face Transformers
- **UI**: Tkinter with custom widgets
- **Audio Processing**: LibROSA, SoundFile, PyAudio
- **Recording Format**: 16-bit PCM WAV, 16kHz, Mono

## Performance 📈

- **Model Loading**: 5-15 seconds (first time only)
- **Analysis Speed**: 1-3 seconds per audio file
- **Memory Usage**: ~500MB when model is loaded
- **Recording Quality**: 16kHz, 16-bit, Mono

## Project Structure 📂

```
Voice_Model/
├── ai_engine/
│   ├── vocal_analysis.py      # Core AI module
│   ├── requirements.txt        # Dependencies
│   └── README.md              # Module documentation
├── vocal_tone_gui.py          # GUI application
├── GUI_README.md              # This file
└── recordings/                # Saved recordings (auto-created)
```

## Integration with Your System 🔌

This GUI can be easily integrated into your Smart Mock Interview System:

```python
from ai_engine.vocal_analysis import VocalToneAnalyzer

# In your Flask/FastAPI backend
analyzer = VocalToneAnalyzer()
result = analyzer.analyze_tone("path/to/audio.wav")
```

## Credits 👏

- **AI Model**: Hugging Face Transformers Team
- **Development**: Smart Mock Interview System Team
- **Date**: February 2026

## License 📄

Part of the Smart Mock Interview System project.

---

**Need help?** Check the main `ai_engine/README.md` for more information about the underlying AI module.
