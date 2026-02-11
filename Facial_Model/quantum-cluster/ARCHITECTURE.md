# 📁 Smart Mock Interview System - Project Structure

```
quantum-cluster/
│
├── 📂 models/                          # Core AI Models
│   ├── __init__.py                     # Package initialization
│   └── Facial_AI_Module.py            # Main facial expression analysis class
│       ├── FacialExpressionModel      # Main class
│       │   ├── __init__()             # Initialize with model warmup
│       │   ├── analyze_frame()        # Analyze single frame
│       │   ├── reset_history()        # Reset emotion buffer
│       │   └── get_statistics()       # Get session stats
│       └── Features:
│           ├── ✓ DeepFace integration
│           ├── ✓ Emotion stabilization (deque-based)
│           ├── ✓ Model preloading (dummy analysis)
│           └── ✓ Robust error handling
│
├── 📂 tests/                           # Testing & Validation
│   └── test_gui.py                    # Webcam testing interface
│       ├── EmotionDetectionGUI        # Main GUI class
│       │   ├── __init__()             # Setup camera & model
│       │   ├── run()                  # Main loop
│       │   ├── _init_camera()         # Windows-compatible camera init
│       │   ├── _draw_ui()             # Render bounding boxes & text
│       │   └── _show_statistics()     # Display session stats
│       └── Features:
│           ├── ✓ Real-time visualization
│           ├── ✓ Frame skipping optimization
│           ├── ✓ CAP_DSHOW for Windows
│           ├── ✓ FPS monitoring
│           └── ✓ Interactive controls (Q/R/S)
│
├── 📄 examples.py                      # Usage examples & tutorials
│   ├── example_basic_usage()          # Single frame analysis
│   ├── example_continuous_monitoring() # 10-sec monitoring
│   ├── example_emotion_tracker()      # Stress detection
│   └── example_save_results()         # Save to JSON
│
├── 📄 requirements.txt                 # Python dependencies
│   ├── deepface==0.0.79
│   ├── opencv-python==4.8.1.78
│   ├── tensorflow==2.16.1
│   └── ... (other dependencies)
│
├── 📄 setup.ps1                        # Automated setup script (PowerShell)
│
└── 📄 README.md                        # Complete documentation

```

## 🔑 Key Components

### 1. **Facial_AI_Module.py** (Core AI Engine)
   - **Purpose:** Emotion detection and analysis
   - **Input:** OpenCV frame (numpy array)
   - **Output:** Dict with emotion, confidence, face coords
   - **Key Innovation:** Deque-based stabilization prevents jitter

### 2. **test_gui.py** (Real-time Testing Interface)
   - **Purpose:** Webcam-based testing with visual feedback
   - **Performance:** 25-30 FPS with frame skipping
   - **Platform:** Windows-optimized (CAP_DSHOW)
   - **UI:** Bounding boxes, confidence scores, FPS counter

### 3. **examples.py** (Developer Integration Guide)
   - **Purpose:** Show how to use the model in different scenarios
   - **Includes:** 4 complete example workflows
   - **Use Cases:** Single-shot, continuous, stress detection, data logging

## 🎯 Emotion Detection Pipeline

```
┌─────────────┐
│ Webcam Feed │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Frame Capture   │ (OpenCV)
│ 640x480 @ 30fps │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Frame Skipping  │ (Every 5th frame)
│ Optimize Perf   │
└──────┬──────────┘
       │
       ▼
┌─────────────────────┐
│ DeepFace Analysis   │
│ - Face Detection    │
│ - Emotion CNN       │
│ - 7 Emotion Classes │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Stabilization       │
│ - Store in deque    │
│ - Get mode (5 last) │
│ - Return stable     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────┐
│ Visualization   │
│ - Bounding box  │
│ - Emotion label │
│ - Confidence %  │
└─────────────────┘
```

## 🧩 Class Relationships

```
┌─────────────────────────────┐
│  EmotionDetectionGUI        │
│  (test_gui.py)              │
│                             │
│  - camera: VideoCapture     │
│  - model: FacialExpression  │◄────┐
│  - fps: float               │     │
│  - current_emotion: str     │     │ Uses
│                             │     │
│  + run()                    │     │
│  + _init_camera()           │     │
│  + _draw_ui()               │     │
└─────────────────────────────┘     │
                                    │
                                    │
┌─────────────────────────────────┐ │
│  FacialExpressionModel          │ │
│  (Facial_AI_Module.py)          │ │
│                                 │ │
│  - emotion_history: deque       │─┘
│  - history_size: int            │
│  - frame_count: int             │
│                                 │
│  + analyze_frame(frame)         │
│  + reset_history()              │
│  + get_statistics()             │
│  - _warmup_model()              │
│  - _get_most_common_emotion()   │
└─────────────────────────────────┘
```

## 📊 Data Flow

```
User's Face
    ↓
Webcam (640x480)
    ↓
OpenCV Frame (BGR numpy array)
    ↓
FacialExpressionModel.analyze_frame()
    ↓
DeepFace.analyze(actions=['emotion'])
    ↓
{
  'emotion': 'happy',
  'confidence': 87.5,
  'face_coordinates': {x, y, w, h},
  'all_emotions': {...}
}
    ↓
Deque Stabilization Buffer [happy, happy, neutral, happy, happy]
    ↓
Mode Calculation → 'happy'
    ↓
GUI Visualization (green box + label)
    ↓
Display to User
```

## 🚀 Execution Flow

### Initial Setup
1. User runs `python tests/test_gui.py`
2. EmotionDetectionGUI.__init__() is called
3. FacialExpressionModel.__init__() loads DeepFace
4. Dummy analysis preloads model weights
5. Camera opens with CAP_DSHOW

### Main Loop
1. Capture frame from webcam
2. Increment frame counter
3. Check if frame_count % skip_frames == 0
4. If yes → analyze_frame()
5. Update emotion history
6. Calculate stabilized emotion
7. Draw bounding box and label
8. Display frame
9. Check for user input (Q/R/S)
10. Repeat

### Cleanup
1. User presses 'Q'
2. Show statistics
3. Release camera
4. Destroy windows
5. Exit gracefully

## 📦 Dependencies Tree

```
Your Application
    │
    ├─── deepface (0.0.79)
    │       ├─── tensorflow (2.16.1)
    │       ├─── keras
    │       ├─── opencv-python
    │       └─── numpy
    │
    ├─── opencv-python (4.8.1.78)
    │       └─── numpy
    │
    └─── tf-keras (2.16.0)
            └─── tensorflow
```

## 🎨 UI Layout (test_gui.py)

```
┌─────────────────────────────────────────────────────┐
│  Smart Mock Interview System - Emotion Detection    │ ← Top Panel (semi-transparent)
│  FPS: 28.5 | Emotion: Happy                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│            ┌───────────────────┐                   │
│            │                   │                   │
│            │ Happy (87.5%) ←───┼─── Green label    │
│            ├───────────────────┤                   │
│            │                   │                   │
│            │   [Face Region]   │ ←─── Green box    │
│            │                   │                   │
│            │                   │                   │
│            └───────────────────┘                   │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Press 'Q' to quit | 'R' to reset | 'S' for stats  │ ← Bottom Panel
└─────────────────────────────────────────────────────┘
```

## 🔐 Error Handling Strategy

```
Frame Analysis
    │
    ├─ Try: DeepFace.analyze()
    │   ├─ Success → Extract emotions
    │   │   ├─ Face found → Update history
    │   │   └─ No face → enforce_detection=False (no crash)
    │   │
    │   └─ Exception → Catch & log
    │       ├─ Set success = False
    │       ├─ Store error message
    │       └─ Return gracefully (no crash)
    │
    └─ Return result dict (always)
```

---

**Last Updated:** January 21, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✓
