# 🚀 Quick Start Guide - Vocal Tone Analyzer GUI

## Getting Started in 3 Easy Steps

### Step 1: Launch the Application

**Option A: Double-click the batch file**
```
run_gui.bat
```

**Option B: Run via command line**
```bash
python vocal_tone_gui.py
```

### Step 2: Wait for Model Initialization

- On first launch, the AI model (~380MB) will download automatically
- You'll see: "⏳ Initializing AI Model..."
- Wait until you see: "✅ AI Model Ready - Select or Record Audio"
- This takes 10-30 seconds on first run (model is cached for future runs)

### Step 3: Analyze Audio

Choose one of two methods:

#### Method A: Upload Audio File 📁
1. Click **"Browse Files"**
2. Select your audio file (WAV, MP3, M4A, FLAC)
3. Click **"Analyze Audio"**
4. View results on the right panel

#### Method B: Record Live Audio 🎙️
1. Click **"⏺ Start Recording"**
2. Speak clearly for 3-5 seconds
3. Click **"⏹ Stop Recording"**
4. Recording auto-saves
5. Click **"Analyze Audio"**
6. View results on the right panel

---

## What You'll See

### Status Indicators
- ⏳ **Yellow**: Processing/Loading
- ✅ **Green**: Success/Ready
- ❌ **Red**: Error
- 🔴 **Red Dot**: Recording in progress

### Results Panel
- **Primary Emotion**: Largest detected emotion with confidence %
- **All Predictions**: Top 3 emotions with color-coded bars
- **Color Key**:
  - 🔵 Blue = Sad
  - 🟢 Green = Happy/Confident
  - 🔴 Red = Angry
  - 🟠 Orange = Fearful/Nervous
  - 🟣 Purple = Disgust
  - 🩷 Pink = Surprised
  - ⚪ Gray = Neutral

---

## Tips for Best Results

### For File Analysis
- Use clear audio with minimal background noise
- WAV format recommended for best quality
- Audio should be at least 2-3 seconds long

### For Recording
- Speak clearly into your microphone
- Keep background noise to minimum
- Record for at least 3-5 seconds
- Check microphone permissions if recording doesn't work

---

## Troubleshooting

### "Model download fails"
- Check internet connection
- Disable VPN/proxy temporarily
- Retry after a few minutes

### "No microphone detected"
- Check Windows microphone permissions:
  - Settings → Privacy → Microphone → Allow apps
- Ensure microphone is plugged in
- Try running as administrator

### "Analysis takes too long"
- First analysis is slower (model loading)
- Subsequent analyses are much faster
- Close other heavy applications

### "Low confidence scores"
- Improve audio quality
- Reduce background noise
- Speak more clearly
- Use a better microphone

---

## Keyboard Shortcuts

- `Browse Files`: Select audio file
- `Space`: Start/Stop recording (when focused on record button)
- `Enter`: Analyze audio (when focused on analyze button)

---

## File Locations

- **Recordings**: Saved in `recordings/` folder
- **Format**: `recording_YYYYMMDD_HHMMSS.wav`
- **Settings**: 16kHz, 16-bit, Mono

---

## System Requirements

- **OS**: Windows 10/11
- **Python**: 3.8 or higher
- **RAM**: 1GB+ available
- **Disk**: 1GB free space
- **Internet**: Required for first run only

---

## Need Help?

- Check `GUI_README.md` for detailed documentation
- Check `ai_engine/README.md` for AI module details
- Review terminal output for error messages

---

**Ready? Launch the GUI and start analyzing! 🎤✨**
