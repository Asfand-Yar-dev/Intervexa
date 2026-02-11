# Vocal Tone Analysis Module - Quick Start Guide

## 🎯 Overview

This module analyzes vocal tone and detects emotions from audio files using the state-of-the-art Wav2Vec2 model from Hugging Face.

**Model Used:** `superb/wav2vec2-base-superb-er`

---

## 📦 Installation

### Step 1: Navigate to the ai_engine directory

```bash
cd "c:\Users\PMLS\OneDrive - BUITEMS\BUITEMS\University\FYP\AI Modules\Voice_Model\ai_engine"
```

### Step 2: Install dependencies

```bash
pip install -r requirements.txt
```

**Note:** The installation will download several packages (~1-2 GB). Ensure you have:
- Stable internet connection
- Sufficient disk space
- Python 3.8 or higher

---

## 🚀 Quick Test

### Run the test script

```bash
python vocal_analysis.py
```

**What happens:**
1. The model will be downloaded on first run (~380MB)
2. The analyzer will initialize
3. Test output will be displayed

**Expected Output:**

```
======================================================================
VOCAL TONE ANALYSIS MODULE - TEST
======================================================================

[1] Initializing Vocal Tone Analyzer...
✓ Analyzer initialized successfully!

[2] Testing with audio file...
    Audio path: ../uploads/test_audio.wav

⚠ WARNING: Test audio file not found!
   Please create/place an audio file at: ../uploads/test_audio.wav
   Or modify the 'test_audio_path' variable in the code.

======================================================================
EXAMPLE OUTPUT (with actual audio file):
======================================================================
{'emotion': 'Neutral', 'score': 92.5}
```

---

## 💻 Usage in Your Code

### Basic Usage

```python
from ai_engine.vocal_analysis import VocalToneAnalyzer

# Initialize once
analyzer = VocalToneAnalyzer()

# Analyze an audio file
result = analyzer.analyze_tone("path/to/your/audio.wav")

print(result)
# Output: {'emotion': 'Neutral', 'score': 92.5}
```

### Advanced Usage (Multiple Predictions)

```python
# Get top 3 emotions with confidence scores
detailed = analyzer.analyze_tone_detailed("audio.wav", top_n=3)

print(detailed)
# Output:
# {
#     'emotion': 'Neutral',
#     'score': 92.5,
#     'all_predictions': [
#         {'emotion': 'Neutral', 'score': 92.5},
#         {'emotion': 'Happy/Confident', 'score': 5.2},
#         {'emotion': 'Sad', 'score': 2.3}
#     ]
# }
```

---

## 🧪 Testing with Your Own Audio

### Step 1: Prepare an audio file
- Format: WAV or MP3
- Duration: At least 1-2 seconds
- Quality: Clear speech, minimal background noise

### Step 2: Update the test path

Edit `vocal_analysis.py` at line ~245:

```python
# Change this line
test_audio_path = "../uploads/test_audio.wav"

# To your actual file path
test_audio_path = "C:/path/to/your/audio.wav"
```

### Step 3: Run the test

```bash
python vocal_analysis.py
```

---

## 🔗 Integration Examples

### Flask API

```python
from flask import Flask, request, jsonify
from ai_engine.vocal_analysis import VocalToneAnalyzer

app = Flask(__name__)
analyzer = VocalToneAnalyzer()  # Initialize once at startup

@app.route('/api/analyze-tone', methods=['POST'])
def analyze_tone():
    try:
        audio_path = request.json['audio_path']
        result = analyzer.analyze_tone(audio_path)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
```

### FastAPI

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ai_engine.vocal_analysis import VocalToneAnalyzer

app = FastAPI()
analyzer = VocalToneAnalyzer()

class AudioRequest(BaseModel):
    audio_path: str

@app.post("/api/analyze-tone")
async def analyze_tone(request: AudioRequest):
    try:
        result = analyzer.analyze_tone(request.audio_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 🎨 Detected Emotions

The module can detect the following emotions:

| Abbreviation | Full Name          | Description                    |
|--------------|--------------------|--------------------------------|
| `neu`        | Neutral            | Calm, professional tone        |
| `hap`        | Happy/Confident    | Positive, energetic tone       |
| `ang`        | Angry              | Frustrated, aggressive tone    |
| `sad`        | Sad                | Depressed, low-energy tone     |
| `fea`        | Fearful/Nervous    | Anxious, uncertain tone        |
| `dis`        | Disgust            | Repulsed, negative tone        |
| `sur`        | Surprised          | Shocked, unexpected tone       |

---

## ⚡ Performance Tips

1. **Initialize Once:** Load the model only once when your application starts
2. **Batch Processing:** Process multiple files sequentially to avoid memory issues
3. **Audio Length:** Shorter audio files (5-10 seconds) process faster
4. **File Format:** WAV files are processed faster than MP3

---

## 🐛 Troubleshooting

### Issue: Model download fails

**Solution:**
- Check internet connection
- Verify firewall settings
- Use a VPN if Hugging Face is blocked

### Issue: "Audio file not found" error

**Solution:**
- Verify the file path is correct
- Use absolute paths instead of relative paths
- Check file permissions

### Issue: Low confidence scores

**Solution:**
- Ensure clear audio quality
- Remove background noise
- Use audio with clear speech
- Minimum 1-2 seconds of audio required

### Issue: Memory error

**Solution:**
- Close other applications
- Process files one at a time
- Use a machine with at least 4GB RAM

---

## 📊 Expected Performance

- **Model Loading Time:** 5-15 seconds (one-time)
- **Analysis Speed:** 1-3 seconds per audio file
- **Memory Usage:** ~500MB RAM
- **Model Download:** ~380MB (one-time)

---

## 📝 Notes

- The model is downloaded from Hugging Face on first use
- Predictions are stored in memory during analysis
- No data is sent to external servers after model download
- The module is thread-safe for concurrent requests

---

## 🆘 Support

For issues or questions:
1. Check the main README.md for detailed documentation
2. Review error logs in the console
3. Verify all dependencies are installed correctly

---

**Created:** 2026-02-06  
**Version:** 1.0.0  
**Author:** AI Backend Development Team
