"""
Vocal Tone Analysis GUI
A modern, beautiful GUI for analyzing vocal tone and detecting emotions.

Author: AI Backend Developer
Date: 2026-02-08
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import threading
import os
import sys
from pathlib import Path
import wave
import pyaudio

# Add the project root to the path
sys.path.insert(0, str(Path(__file__).parent))

from ai_engine.vocal_analysis import VocalToneAnalyzer


class ModernButton(tk.Canvas):
    """Custom modern button with hover effects"""
    
    def __init__(self, parent, text, command, bg_color="#6366f1", hover_color="#4f46e5", 
                 fg_color="white", width=200, height=50, **kwargs):
        super().__init__(parent, width=width, height=height, highlightthickness=0, **kwargs)
        
        self.bg_color = bg_color
        self.hover_color = hover_color
        self.fg_color = fg_color
        self.command = command
        self.text = text
        
        # Draw button
        self.rect = self.create_rectangle(0, 0, width, height, fill=bg_color, 
                                          outline="", width=0, tags="button")
        self.text_id = self.create_text(width/2, height/2, text=text, 
                                        fill=fg_color, font=("Segoe UI", 12, "bold"), 
                                        tags="button")
        
        # Bind events
        self.tag_bind("button", "<Button-1>", self._on_click)
        self.tag_bind("button", "<Enter>", self._on_enter)
        self.tag_bind("button", "<Leave>", self._on_leave)
    
    def _on_click(self, event):
        if self.command:
            self.command()
    
    def _on_enter(self, event):
        self.itemconfig(self.rect, fill=self.hover_color)
        self.config(cursor="hand2")
    
    def _on_leave(self, event):
        self.itemconfig(self.rect, fill=self.bg_color)
        self.config(cursor="")
    
    def set_enabled(self, enabled):
        if enabled:
            self.itemconfig(self.rect, fill=self.bg_color)
            self.tag_bind("button", "<Button-1>", self._on_click)
        else:
            self.itemconfig(self.rect, fill="#9ca3af")
            self.tag_unbind("button", "<Button-1>")


class VocalToneGUI:
    """Main GUI application for Vocal Tone Analysis"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("Vocal Tone Analyzer - AI Interview System")
        self.root.geometry("900x700")
        self.root.configure(bg="#0f172a")
        self.root.resizable(False, False)
        
        # Variables
        self.analyzer = None
        self.selected_file = None
        self.is_recording = False
        self.audio_frames = []
        self.audio_stream = None
        self.pyaudio_instance = None
        
        # UI Setup
        self._setup_ui()
        
        # Initialize analyzer in background
        self._initialize_analyzer()
    
    def _setup_ui(self):
        """Setup the user interface"""
        
        # Title Section
        title_frame = tk.Frame(self.root, bg="#1e293b", height=100)
        title_frame.pack(fill=tk.X, padx=20, pady=(20, 0))
        title_frame.pack_propagate(False)
        
        title_label = tk.Label(
            title_frame, 
            text="🎤 Vocal Tone Analyzer", 
            font=("Segoe UI", 28, "bold"),
            bg="#1e293b", 
            fg="#f1f5f9"
        )
        title_label.pack(pady=20)
        
        subtitle_label = tk.Label(
            title_frame, 
            text="AI-Powered Emotion Detection from Voice",
            font=("Segoe UI", 12),
            bg="#1e293b", 
            fg="#94a3b8"
        )
        subtitle_label.pack()
        
        # Status Section
        status_frame = tk.Frame(self.root, bg="#0f172a")
        status_frame.pack(fill=tk.X, padx=20, pady=20)
        
        self.status_label = tk.Label(
            status_frame,
            text="⏳ Initializing AI Model...",
            font=("Segoe UI", 11),
            bg="#0f172a",
            fg="#fbbf24"
        )
        self.status_label.pack()
        
        # Main Content Area
        content_frame = tk.Frame(self.root, bg="#1e293b")
        content_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 20))
        
        # Left Panel - File Selection & Recording
        left_panel = tk.Frame(content_frame, bg="#1e293b", width=400)
        left_panel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(10, 5), pady=10)
        
        # File Selection Section
        file_section = tk.LabelFrame(
            left_panel,
            text="  📁 Audio File Selection  ",
            font=("Segoe UI", 12, "bold"),
            bg="#1e293b",
            fg="#e2e8f0",
            bd=2,
            relief=tk.GROOVE
        )
        file_section.pack(fill=tk.X, pady=(0, 20))
        
        self.file_label = tk.Label(
            file_section,
            text="No file selected",
            font=("Segoe UI", 10),
            bg="#1e293b",
            fg="#94a3b8",
            wraplength=350,
            justify=tk.LEFT
        )
        self.file_label.pack(pady=15, padx=10)
        
        self.browse_btn = ModernButton(
            file_section,
            text="Browse Files",
            command=self._browse_file,
            bg_color="#6366f1",
            hover_color="#4f46e5"
        )
        self.browse_btn.pack(pady=(0, 15))
        
        # Recording Section
        record_section = tk.LabelFrame(
            left_panel,
            text="  🎙️ Record Audio  ",
            font=("Segoe UI", 12, "bold"),
            bg="#1e293b",
            fg="#e2e8f0",
            bd=2,
            relief=tk.GROOVE
        )
        record_section.pack(fill=tk.X, pady=(0, 20))
        
        self.record_status = tk.Label(
            record_section,
            text="Ready to record",
            font=("Segoe UI", 10),
            bg="#1e293b",
            fg="#94a3b8"
        )
        self.record_status.pack(pady=15)
        
        self.record_btn = ModernButton(
            record_section,
            text="⏺ Start Recording",
            command=self._toggle_recording,
            bg_color="#ef4444",
            hover_color="#dc2626"
        )
        self.record_btn.pack(pady=(0, 15))
        
        # Analysis Section
        analysis_section = tk.LabelFrame(
            left_panel,
            text="  🔬 Analysis  ",
            font=("Segoe UI", 12, "bold"),
            bg="#1e293b",
            fg="#e2e8f0",
            bd=2,
            relief=tk.GROOVE
        )
        analysis_section.pack(fill=tk.X)
        
        self.analyze_btn = ModernButton(
            analysis_section,
            text="Analyze Audio",
            command=self._analyze_audio,
            bg_color="#10b981",
            hover_color="#059669"
        )
        self.analyze_btn.pack(pady=15)
        self.analyze_btn.set_enabled(False)
        
        # Right Panel - Results
        right_panel = tk.Frame(content_frame, bg="#1e293b", width=400)
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(5, 10), pady=10)
        
        results_section = tk.LabelFrame(
            right_panel,
            text="  📊 Analysis Results  ",
            font=("Segoe UI", 12, "bold"),
            bg="#1e293b",
            fg="#e2e8f0",
            bd=2,
            relief=tk.GROOVE
        )
        results_section.pack(fill=tk.BOTH, expand=True)
        
        # Results display
        self.results_frame = tk.Frame(results_section, bg="#1e293b")
        self.results_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        self.no_results_label = tk.Label(
            self.results_frame,
            text="No analysis yet\n\nSelect an audio file or\nrecord your voice to begin",
            font=("Segoe UI", 12),
            bg="#1e293b",
            fg="#64748b",
            justify=tk.CENTER
        )
        self.no_results_label.pack(expand=True)
        
        # Footer
        footer = tk.Frame(self.root, bg="#1e293b", height=40)
        footer.pack(fill=tk.X, side=tk.BOTTOM)
        
        footer_label = tk.Label(
            footer,
            text="Smart Mock Interview System © 2026",
            font=("Segoe UI", 9),
            bg="#1e293b",
            fg="#64748b"
        )
        footer_label.pack(pady=10)
    
    def _initialize_analyzer(self):
        """Initialize the vocal tone analyzer in a background thread"""
        
        def init_thread():
            try:
                self.analyzer = VocalToneAnalyzer()
                self.root.after(0, self._on_analyzer_ready)
            except Exception as e:
                self.root.after(0, lambda: self._on_analyzer_error(str(e)))
        
        thread = threading.Thread(target=init_thread, daemon=True)
        thread.start()
    
    def _on_analyzer_ready(self):
        """Called when analyzer is successfully initialized"""
        self.status_label.config(
            text="✅ AI Model Ready - Select or Record Audio",
            fg="#10b981"
        )
        self.browse_btn.set_enabled(True)
        self.record_btn.set_enabled(True)
    
    def _on_analyzer_error(self, error_msg):
        """Called when analyzer initialization fails"""
        self.status_label.config(
            text=f"❌ Error: {error_msg}",
            fg="#ef4444"
        )
        messagebox.showerror(
            "Initialization Error",
            f"Failed to load AI model:\n\n{error_msg}\n\nPlease check your internet connection and try again."
        )
    
    def _browse_file(self):
        """Open file dialog to select audio file"""
        filetypes = [
            ("Audio Files", "*.wav *.mp3 *.m4a *.flac"),
            ("WAV Files", "*.wav"),
            ("MP3 Files", "*.mp3"),
            ("All Files", "*.*")
        ]
        
        filename = filedialog.askopenfilename(
            title="Select Audio File",
            filetypes=filetypes
        )
        
        if filename:
            self.selected_file = filename
            self.file_label.config(
                text=f"📄 {os.path.basename(filename)}\n{filename}",
                fg="#f1f5f9"
            )
            self.analyze_btn.set_enabled(True)
    
    def _toggle_recording(self):
        """Start or stop audio recording"""
        if not self.is_recording:
            self._start_recording()
        else:
            self._stop_recording()
    
    def _start_recording(self):
        """Start recording audio from microphone"""
        try:
            self.is_recording = True
            self.audio_frames = []
            
            # Initialize PyAudio
            self.pyaudio_instance = pyaudio.PyAudio()
            self.audio_stream = self.pyaudio_instance.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=16000,
                input=True,
                frames_per_buffer=1024,
                stream_callback=self._audio_callback
            )
            
            self.audio_stream.start_stream()
            
            # Update UI
            self.record_btn.itemconfig(self.record_btn.text_id, text="⏹ Stop Recording")
            self.record_status.config(text="🔴 Recording...", fg="#ef4444")
            self.browse_btn.set_enabled(False)
            self.analyze_btn.set_enabled(False)
            
        except Exception as e:
            messagebox.showerror("Recording Error", f"Failed to start recording:\n\n{str(e)}")
            self.is_recording = False
    
    def _audio_callback(self, in_data, frame_count, time_info, status):
        """Callback for audio recording"""
        if self.is_recording:
            self.audio_frames.append(in_data)
        return (in_data, pyaudio.paContinue)
    
    def _stop_recording(self):
        """Stop recording and save audio file"""
        try:
            self.is_recording = False
            
            # Stop stream
            if self.audio_stream:
                self.audio_stream.stop_stream()
                self.audio_stream.close()
            
            if self.pyaudio_instance:
                self.pyaudio_instance.terminate()
            
            # Save recording
            if self.audio_frames:
                output_dir = Path(__file__).parent / "recordings"
                output_dir.mkdir(exist_ok=True)
                
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = output_dir / f"recording_{timestamp}.wav"
                
                # Save WAV file
                with wave.open(str(output_path), 'wb') as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(self.pyaudio_instance.get_sample_size(pyaudio.paInt16))
                    wf.setframerate(16000)
                    wf.writeframes(b''.join(self.audio_frames))
                
                self.selected_file = str(output_path)
                self.file_label.config(
                    text=f"📄 {output_path.name}\n{output_path}",
                    fg="#f1f5f9"
                )
                
                messagebox.showinfo(
                    "Recording Saved",
                    f"Recording saved successfully!\n\n{output_path}"
                )
            
            # Update UI
            self.record_btn.itemconfig(self.record_btn.text_id, text="⏺ Start Recording")
            self.record_status.config(text="Ready to record", fg="#94a3b8")
            self.browse_btn.set_enabled(True)
            self.analyze_btn.set_enabled(True)
            
        except Exception as e:
            messagebox.showerror("Save Error", f"Failed to save recording:\n\n{str(e)}")
    
    def _analyze_audio(self):
        """Analyze the selected audio file"""
        if not self.selected_file:
            messagebox.showwarning("No File", "Please select an audio file first.")
            return
        
        if not self.analyzer:
            messagebox.showwarning("Not Ready", "AI model is not ready yet. Please wait.")
            return
        
        # Update status
        self.status_label.config(text="🔄 Analyzing audio...", fg="#fbbf24")
        self.analyze_btn.set_enabled(False)
        
        # Run analysis in background thread
        def analyze_thread():
            try:
                result = self.analyzer.analyze_tone_detailed(self.selected_file, top_n=3)
                self.root.after(0, lambda r=result: self._display_results(r))
            except Exception as e:
                error_msg = str(e)
                self.root.after(0, lambda msg=error_msg: self._on_analysis_error(msg))
        
        thread = threading.Thread(target=analyze_thread, daemon=True)
        thread.start()
    
    def _display_results(self, result):
        """Display analysis results"""
        # Clear previous results
        for widget in self.results_frame.winfo_children():
            widget.destroy()
        
        # Main emotion
        main_emotion = result['emotion']
        main_score = result['score']
        
        # Emotion color mapping
        emotion_colors = {
            "Neutral": "#64748b",
            "Happy/Confident": "#10b981",
            "Angry": "#ef4444",
            "Sad": "#3b82f6",
            "Fearful/Nervous": "#f59e0b",
            "Disgust": "#8b5cf6",
            "Surprised": "#ec4899"
        }
        
        main_color = emotion_colors.get(main_emotion, "#6366f1")
        
        # Main result display
        main_result_frame = tk.Frame(self.results_frame, bg="#334155", bd=2, relief=tk.RAISED)
        main_result_frame.pack(fill=tk.X, pady=(0, 20))
        
        tk.Label(
            main_result_frame,
            text="Primary Emotion",
            font=("Segoe UI", 11),
            bg="#334155",
            fg="#94a3b8"
        ).pack(pady=(15, 5))
        
        tk.Label(
            main_result_frame,
            text=main_emotion,
            font=("Segoe UI", 24, "bold"),
            bg="#334155",
            fg=main_color
        ).pack(pady=(0, 5))
        
        tk.Label(
            main_result_frame,
            text=f"{main_score}% Confidence",
            font=("Segoe UI", 14),
            bg="#334155",
            fg="#e2e8f0"
        ).pack(pady=(0, 15))
        
        # Detailed predictions
        tk.Label(
            self.results_frame,
            text="All Predictions:",
            font=("Segoe UI", 11, "bold"),
            bg="#1e293b",
            fg="#e2e8f0"
        ).pack(anchor=tk.W, pady=(0, 10))
        
        for i, pred in enumerate(result['all_predictions'], 1):
            pred_frame = tk.Frame(self.results_frame, bg="#334155")
            pred_frame.pack(fill=tk.X, pady=5)
            
            emotion = pred['emotion']
            score = pred['score']
            color = emotion_colors.get(emotion, "#6366f1")
            
            # Emotion name
            tk.Label(
                pred_frame,
                text=f"{i}. {emotion}",
                font=("Segoe UI", 10),
                bg="#334155",
                fg="#e2e8f0",
                anchor=tk.W,
                width=20
            ).pack(side=tk.LEFT, padx=(10, 5), pady=8)
            
            # Progress bar
            progress_bg = tk.Canvas(pred_frame, bg="#1e293b", height=20, highlightthickness=0)
            progress_bg.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
            
            bar_width = int((score / 100) * 200)
            progress_bg.create_rectangle(0, 0, bar_width, 20, fill=color, outline="")
            
            # Score
            tk.Label(
                pred_frame,
                text=f"{score}%",
                font=("Segoe UI", 10, "bold"),
                bg="#334155",
                fg=color,
                width=6
            ).pack(side=tk.RIGHT, padx=(5, 10), pady=8)
        
        # Update status
        self.status_label.config(
            text=f"✅ Analysis Complete - Detected: {main_emotion}",
            fg="#10b981"
        )
        self.analyze_btn.set_enabled(True)
    
    def _on_analysis_error(self, error_msg):
        """Handle analysis errors"""
        self.status_label.config(
            text="❌ Analysis Failed",
            fg="#ef4444"
        )
        self.analyze_btn.set_enabled(True)
        
        messagebox.showerror(
            "Analysis Error",
            f"Failed to analyze audio:\n\n{error_msg}"
        )


def main():
    """Main entry point"""
    root = tk.Tk()
    app = VocalToneGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
