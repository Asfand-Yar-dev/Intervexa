"""
Vocal Characteristics Analysis GUI
A modern, beautiful GUI for analyzing vocal clarity, confidence, tone,
hesitation, and stress using Wav2Vec2 + signal-level acoustics.

Author: AI Backend Developer
Date: 2026-02-18
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
        self.text_id = self.create_text(width / 2, height / 2, text=text,
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
    """Main GUI application for Vocal Characteristics Analysis"""

    def __init__(self, root):
        self.root = root
        self.root.title("Vocal Characteristics Analyzer – AI Interview System")
        self.root.geometry("1050x780")
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

    # ================================================================ UI
    def _setup_ui(self):
        """Setup the user interface"""

        # Title Section
        title_frame = tk.Frame(self.root, bg="#1e293b", height=80)
        title_frame.pack(fill=tk.X, padx=20, pady=(15, 0))
        title_frame.pack_propagate(False)

        tk.Label(
            title_frame,
            text="🎤 Vocal Characteristics Analyzer",
            font=("Segoe UI", 24, "bold"),
            bg="#1e293b", fg="#f1f5f9",
        ).pack(pady=(12, 0))

        tk.Label(
            title_frame,
            text="Clarity · Confidence · Tone · Hesitation · Stress",
            font=("Segoe UI", 11),
            bg="#1e293b", fg="#94a3b8",
        ).pack()

        # Status Section
        status_frame = tk.Frame(self.root, bg="#0f172a")
        status_frame.pack(fill=tk.X, padx=20, pady=10)

        self.status_label = tk.Label(
            status_frame,
            text="⏳ Loading Wav2Vec2 model (first run downloads ~360 MB) …",
            font=("Segoe UI", 11),
            bg="#0f172a", fg="#fbbf24",
        )
        self.status_label.pack()

        # Main Content Area
        content_frame = tk.Frame(self.root, bg="#1e293b")
        content_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 15))

        # Left Panel – File Selection & Recording
        left_panel = tk.Frame(content_frame, bg="#1e293b", width=340)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=(10, 5), pady=10)

        # File Selection Section
        file_section = tk.LabelFrame(
            left_panel, text="  📁 Audio File  ",
            font=("Segoe UI", 12, "bold"),
            bg="#1e293b", fg="#e2e8f0", bd=2, relief=tk.GROOVE,
        )
        file_section.pack(fill=tk.X, pady=(0, 15))

        self.file_label = tk.Label(
            file_section, text="No file selected",
            font=("Segoe UI", 10),
            bg="#1e293b", fg="#94a3b8", wraplength=300, justify=tk.LEFT,
        )
        self.file_label.pack(pady=12, padx=10)

        self.browse_btn = ModernButton(
            file_section, text="Browse Files",
            command=self._browse_file,
            bg_color="#6366f1", hover_color="#4f46e5",
        )
        self.browse_btn.pack(pady=(0, 12))

        # Recording Section
        record_section = tk.LabelFrame(
            left_panel, text="  🎙️ Record Audio  ",
            font=("Segoe UI", 12, "bold"),
            bg="#1e293b", fg="#e2e8f0", bd=2, relief=tk.GROOVE,
        )
        record_section.pack(fill=tk.X, pady=(0, 15))

        self.record_status = tk.Label(
            record_section, text="Ready to record",
            font=("Segoe UI", 10),
            bg="#1e293b", fg="#94a3b8",
        )
        self.record_status.pack(pady=12)

        self.record_btn = ModernButton(
            record_section, text="⏺ Start Recording",
            command=self._toggle_recording,
            bg_color="#ef4444", hover_color="#dc2626",
        )
        self.record_btn.pack(pady=(0, 12))

        # Analysis Button
        analysis_section = tk.LabelFrame(
            left_panel, text="  🔬 Analysis  ",
            font=("Segoe UI", 12, "bold"),
            bg="#1e293b", fg="#e2e8f0", bd=2, relief=tk.GROOVE,
        )
        analysis_section.pack(fill=tk.X)

        self.analyze_btn = ModernButton(
            analysis_section, text="Analyze Audio",
            command=self._analyze_audio,
            bg_color="#10b981", hover_color="#059669",
        )
        self.analyze_btn.pack(pady=12)
        self.analyze_btn.set_enabled(False)

        # Right Panel – Results (scrollable)
        right_panel = tk.Frame(content_frame, bg="#1e293b")
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(5, 10), pady=10)

        results_section = tk.LabelFrame(
            right_panel, text="  📊 Analysis Results  ",
            font=("Segoe UI", 12, "bold"),
            bg="#1e293b", fg="#e2e8f0", bd=2, relief=tk.GROOVE,
        )
        results_section.pack(fill=tk.BOTH, expand=True)

        # Create a canvas with scrollbar for the results
        canvas = tk.Canvas(results_section, bg="#1e293b", highlightthickness=0)
        scrollbar = ttk.Scrollbar(results_section, orient="vertical", command=canvas.yview)
        self.results_frame = tk.Frame(canvas, bg="#1e293b")

        self.results_frame.bind(
            "<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas.create_window((0, 0), window=self.results_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Bind mouse-wheel scrolling
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        canvas.bind_all("<MouseWheel>", _on_mousewheel)

        self.no_results_label = tk.Label(
            self.results_frame,
            text="No analysis yet\n\nSelect an audio file or\nrecord your voice to begin",
            font=("Segoe UI", 12),
            bg="#1e293b", fg="#64748b", justify=tk.CENTER,
        )
        self.no_results_label.pack(expand=True, pady=60)

        # Footer
        footer = tk.Frame(self.root, bg="#1e293b", height=35)
        footer.pack(fill=tk.X, side=tk.BOTTOM)
        tk.Label(
            footer, text="Smart Mock Interview System © 2026",
            font=("Segoe UI", 9), bg="#1e293b", fg="#64748b",
        ).pack(pady=8)

    # ======================================================== Initializer
    def _initialize_analyzer(self):
        """Initialize the vocal tone analyzer in a background thread"""

        def init_thread():
            try:
                self.analyzer = VocalToneAnalyzer()
                self.root.after(0, self._on_analyzer_ready)
            except Exception as e:
                self.root.after(0, lambda: self._on_analyzer_error(str(e)))

        threading.Thread(target=init_thread, daemon=True).start()

    def _on_analyzer_ready(self):
        self.status_label.config(
            text="✅ Wav2Vec2 Model Ready – Select or Record Audio",
            fg="#10b981",
        )
        self.browse_btn.set_enabled(True)
        self.record_btn.set_enabled(True)

    def _on_analyzer_error(self, error_msg):
        self.status_label.config(text=f"❌ Error: {error_msg}", fg="#ef4444")
        messagebox.showerror(
            "Initialization Error",
            f"Failed to load Wav2Vec2 model:\n\n{error_msg}\n\n"
            "Please check your internet connection (first run only) and try again.",
        )

    # ============================================================ File
    def _browse_file(self):
        filetypes = [
            ("Audio Files", "*.wav *.mp3 *.m4a *.flac"),
            ("WAV Files", "*.wav"),
            ("MP3 Files", "*.mp3"),
            ("All Files", "*.*"),
        ]
        filename = filedialog.askopenfilename(title="Select Audio File", filetypes=filetypes)
        if filename:
            self.selected_file = filename
            self.file_label.config(
                text=f"📄 {os.path.basename(filename)}\n{filename}",
                fg="#f1f5f9",
            )
            self.analyze_btn.set_enabled(True)

    # ======================================================== Recording
    def _toggle_recording(self):
        if not self.is_recording:
            self._start_recording()
        else:
            self._stop_recording()

    def _start_recording(self):
        try:
            self.is_recording = True
            self.audio_frames = []

            self.pyaudio_instance = pyaudio.PyAudio()
            self.audio_stream = self.pyaudio_instance.open(
                format=pyaudio.paInt16,
                channels=1,
                rate=16000,
                input=True,
                frames_per_buffer=1024,
                stream_callback=self._audio_callback,
            )
            self.audio_stream.start_stream()

            self.record_btn.itemconfig(self.record_btn.text_id, text="⏹ Stop Recording")
            self.record_status.config(text="🔴 Recording…", fg="#ef4444")
            self.browse_btn.set_enabled(False)
            self.analyze_btn.set_enabled(False)
        except Exception as e:
            messagebox.showerror("Recording Error", f"Failed to start recording:\n\n{e}")
            self.is_recording = False

    def _audio_callback(self, in_data, frame_count, time_info, status):
        if self.is_recording:
            self.audio_frames.append(in_data)
        return (in_data, pyaudio.paContinue)

    def _stop_recording(self):
        try:
            self.is_recording = False
            if self.audio_stream:
                self.audio_stream.stop_stream()
                self.audio_stream.close()
            if self.pyaudio_instance:
                self.pyaudio_instance.terminate()

            if self.audio_frames:
                output_dir = Path(__file__).parent / "recordings"
                output_dir.mkdir(exist_ok=True)
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = output_dir / f"recording_{timestamp}.wav"

                with wave.open(str(output_path), "wb") as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)  # 16-bit
                    wf.setframerate(16000)
                    wf.writeframes(b"".join(self.audio_frames))

                self.selected_file = str(output_path)
                self.file_label.config(
                    text=f"📄 {output_path.name}\n{output_path}", fg="#f1f5f9",
                )
                messagebox.showinfo("Recording Saved", f"Saved to:\n{output_path}")

            self.record_btn.itemconfig(self.record_btn.text_id, text="⏺ Start Recording")
            self.record_status.config(text="Ready to record", fg="#94a3b8")
            self.browse_btn.set_enabled(True)
            self.analyze_btn.set_enabled(True)
        except Exception as e:
            messagebox.showerror("Save Error", f"Failed to save recording:\n\n{e}")

    # ========================================================= Analysis
    def _analyze_audio(self):
        if not self.selected_file:
            messagebox.showwarning("No File", "Please select an audio file first.")
            return
        if not self.analyzer:
            messagebox.showwarning("Not Ready", "AI model is not ready yet. Please wait.")
            return

        self.status_label.config(text="🔄 Analyzing audio …", fg="#fbbf24")
        self.analyze_btn.set_enabled(False)

        def analyze_thread():
            try:
                result = self.analyzer.analyze_tone(self.selected_file)
                self.root.after(0, lambda r=result: self._display_results(r))
            except Exception as e:
                error_msg = str(e)
                self.root.after(0, lambda msg=error_msg: self._on_analysis_error(msg))

        threading.Thread(target=analyze_thread, daemon=True).start()

    # ============================================= Display Results
    def _display_results(self, result):
        """Render the new vocal-characteristics analysis results."""
        # Clear previous content
        for widget in self.results_frame.winfo_children():
            widget.destroy()

        # --- Overall Score Header ---
        overall = result.get("overall_score", 0)
        overall_color = self._score_color(overall)

        header = tk.Frame(self.results_frame, bg="#334155")
        header.pack(fill=tk.X, padx=14, pady=(10, 8))

        tk.Label(header, text="Overall Score", font=("Segoe UI", 11),
                 bg="#334155", fg="#94a3b8").pack(pady=(10, 2))
        tk.Label(header, text=f"{overall}", font=("Segoe UI", 36, "bold"),
                 bg="#334155", fg=overall_color).pack()
        tk.Label(header, text=f"/ 100", font=("Segoe UI", 12),
                 bg="#334155", fg="#94a3b8").pack(pady=(0, 4))

        dur = result.get("duration_s", 0)
        elapsed = result.get("processing_time_s", 0)
        tk.Label(header, text=f"Duration: {dur}s  |  Processed in {elapsed}s",
                 font=("Segoe UI", 9), bg="#334155", fg="#64748b").pack(pady=(0, 10))

        # --- Clarity & Confidence ---
        cc = result.get("clarity_confidence", {})
        self._section_header("Clarity & Confidence")
        self._score_bar("Clarity", cc.get("clarity_score", 0))
        self._score_bar("Confidence", cc.get("confidence_score", 0))
        details = cc.get("details", {})
        self._detail_row("Voiced ratio", f'{details.get("voiced_ratio", 0)}%')
        self._detail_row("Volume stability", f'{details.get("volume_stability", 0)}')
        self._detail_row("Articulation", f'{details.get("articulation", 0)}')
        self._detail_row("Speech rate", f'{details.get("speech_rate_syl_per_sec", 0)} syl/s')

        # --- Tone ---
        tone = result.get("tone", {})
        self._section_header("Tone Quality")
        self._score_bar("Tone", tone.get("tone_score", 0))
        td = tone.get("details", {})
        self._detail_row("Pitch expressiveness", f'{td.get("pitch_expressiveness", 0)}')
        self._detail_row("Energy level", f'{td.get("energy_level", 0)}')
        self._detail_row("Warmth", f'{td.get("warmth", 0)}')
        self._detail_row("Monotone level", f'{td.get("monotone_level", 0)}')
        self._detail_row("Pitch mean", f'{td.get("pitch_mean_hz", 0)} Hz')
        self._detail_row("Pitch range", f'{td.get("pitch_range_hz", 0)} Hz')

        # --- Hesitation & Stress ---
        hs = result.get("hesitation_stress", {})
        self._section_header("Hesitation & Stress")
        self._score_bar("Hesitation", hs.get("hesitation_score", 0), invert=True)
        self._score_bar("Stress", hs.get("stress_score", 0), invert=True)
        hd = hs.get("details", {})
        self._detail_row("Pause count", str(hd.get("pause_count", 0)))
        self._detail_row("Total pause", f'{hd.get("total_pause_duration_s", 0)} s')
        self._detail_row("Pauses/min", f'{hd.get("pauses_per_minute", 0)}')
        self._detail_row("Jitter", f'{hd.get("jitter", 0)}')
        self._detail_row("Shimmer", f'{hd.get("shimmer", 0)}')
        self._detail_row("Tempo", f'{hd.get("tempo_bpm", 0)} BPM')

        # --- Feedback ---
        feedback = result.get("feedback", [])
        if feedback:
            self._section_header("Feedback")
            for line in feedback:
                fb_frame = tk.Frame(self.results_frame, bg="#1e293b")
                fb_frame.pack(fill=tk.X, padx=14, pady=2)
                tk.Label(fb_frame, text=f"• {line}",
                         font=("Segoe UI", 10), bg="#1e293b", fg="#cbd5e1",
                         wraplength=500, justify=tk.LEFT, anchor="w").pack(anchor="w")

        # Spacer
        tk.Frame(self.results_frame, bg="#1e293b", height=20).pack()

        # Status
        self.status_label.config(
            text=f"✅ Analysis Complete – Overall: {overall}/100", fg="#10b981",
        )
        self.analyze_btn.set_enabled(True)

    # --------------------------------------------------------------- helpers
    def _section_header(self, title: str):
        tk.Label(
            self.results_frame, text=title,
            font=("Segoe UI", 13, "bold"),
            bg="#1e293b", fg="#e2e8f0",
        ).pack(anchor="w", padx=14, pady=(14, 4))

    def _score_bar(self, label: str, score: float, invert: bool = False):
        """Render a labelled horizontal bar.  If `invert`, lower is better."""
        frame = tk.Frame(self.results_frame, bg="#1e293b")
        frame.pack(fill=tk.X, padx=14, pady=3)

        tk.Label(frame, text=label, font=("Segoe UI", 10), bg="#1e293b",
                 fg="#94a3b8", width=14, anchor="w").pack(side=tk.LEFT)

        bar_bg = tk.Canvas(frame, bg="#334155", height=18, highlightthickness=0, width=260)
        bar_bg.pack(side=tk.LEFT, padx=(4, 6))
        color = self._score_color(100 - score if invert else score)
        bar_w = int((score / 100) * 260)
        bar_bg.create_rectangle(0, 0, bar_w, 18, fill=color, outline="")

        tk.Label(frame, text=f"{score}", font=("Segoe UI", 10, "bold"),
                 bg="#1e293b", fg=color, width=5, anchor="e").pack(side=tk.LEFT)

    def _detail_row(self, label: str, value: str):
        frame = tk.Frame(self.results_frame, bg="#1e293b")
        frame.pack(fill=tk.X, padx=24, pady=1)
        tk.Label(frame, text=label, font=("Segoe UI", 9), bg="#1e293b",
                 fg="#64748b", anchor="w", width=22).pack(side=tk.LEFT)
        tk.Label(frame, text=value, font=("Segoe UI", 9, "bold"), bg="#1e293b",
                 fg="#cbd5e1", anchor="e").pack(side=tk.RIGHT)

    @staticmethod
    def _score_color(score: float) -> str:
        if score >= 75:
            return "#10b981"   # green
        elif score >= 50:
            return "#f59e0b"   # amber
        else:
            return "#ef4444"   # red

    # ============================================= Error handler
    def _on_analysis_error(self, error_msg):
        self.status_label.config(text="❌ Analysis Failed", fg="#ef4444")
        self.analyze_btn.set_enabled(True)
        messagebox.showerror("Analysis Error", f"Failed to analyze audio:\n\n{error_msg}")


# ========================================================================
def main():
    """Main entry point"""
    root = tk.Tk()
    app = VocalToneGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
