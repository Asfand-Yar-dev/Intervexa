"""
Optimized STT GUI Tester with Enhanced Features
Features:
- Progress tracking with progress bar
- Cancel functionality
- Drag-and-drop file support (optional, requires tkinterdnd2)
- Recent files list
- Better error handling and user feedback
- Improved threading and resource management
"""

import tkinter as tk
from tkinter import filedialog, scrolledtext, messagebox, ttk
import threading
import os
import sys
import json
from pathlib import Path
from typing import Optional
import time

# Try to import drag-and-drop support (optional)
try:
    from tkinterdnd2 import DND_FILES, TkinterDnD
    HAS_DND = True
except ImportError:
    HAS_DND = False

# Path configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Import STT Engine
try:
    from ai_models.stt_engine import STTEngine
except ImportError as e:
    messagebox.showerror(
        "Import Error", 
        f"Failed to load STT Engine.\nDetails: {e}\nCurrent Path: {sys.path[0]}"
    )
    sys.exit(1)


class STTTesterApp:
    """Enhanced STT Testing GUI with progress tracking and modern features."""
    
    CONFIG_FILE = Path(current_dir) / ".stt_config.json"
    MAX_RECENT_FILES = 5
    
    def __init__(self, root):
        self.root = root
        self.root.title("Speech-to-Text Tester (Whisper) - Optimized")
        self.root.geometry("800x650")
        self.root.resizable(True, True)
        
        # State management
        self.engine: Optional[STTEngine] = None
        self.is_processing = False
        self.cancel_requested = False
        self.recent_files = self._load_recent_files()
        
        # Build UI
        self._create_ui()
        
        # Start model loading in background
        self._start_model_loading()
        
        # Set up window close handler
        self.root.protocol("WM_DELETE_WINDOW", self._on_closing)
    
    def _create_ui(self):
        """Create the user interface."""
        # Header Section
        header_frame = tk.Frame(self.root, bg="#2C3E50", height=60)
        header_frame.pack(fill=tk.X)
        header_frame.pack_propagate(False)
        
        tk.Label(
            header_frame, 
            text="🎤 Speech-to-Text Transcription Tool",
            font=("Arial", 16, "bold"),
            bg="#2C3E50",
            fg="white"
        ).pack(pady=15)
        
        # Status Section
        status_frame = tk.Frame(self.root, bg="#ECF0F1", height=40)
        status_frame.pack(fill=tk.X)
        status_frame.pack_propagate(False)
        
        self.status_label = tk.Label(
            status_frame,
            text="⏳ Loading model... Please wait",
            font=("Arial", 10, "bold"),
            bg="#ECF0F1",
            fg="#E74C3C"
        )
        self.status_label.pack(pady=10)
        
        # Main Content Frame
        content_frame = tk.Frame(self.root, bg="#ECF0F1")
        content_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)
        
        # File Input Section
        self._create_file_input_section(content_frame)
        
        # Progress Section
        self._create_progress_section(content_frame)
        
        # Control Buttons
        self._create_control_buttons(content_frame)
        
        # Output Section
        self._create_output_section(content_frame)
        
        # Recent Files Section
        self._create_recent_files_section(content_frame)
    
    def _create_file_input_section(self, parent):
        """Create file input section with drag-and-drop support."""
        file_frame = tk.LabelFrame(parent, text="📁 Audio File Selection", font=("Arial", 10, "bold"), bg="#ECF0F1")
        file_frame.pack(fill=tk.X, pady=(0, 10))
        
        input_frame = tk.Frame(file_frame, bg="#ECF0F1")
        input_frame.pack(fill=tk.X, padx=10, pady=10)
        
        self.path_entry = tk.Entry(input_frame, width=60, font=("Arial", 10))
        self.path_entry.pack(side=tk.LEFT, padx=(0, 5), fill=tk.X, expand=True)
        
        self.browse_btn = tk.Button(
            input_frame,
            text="Browse",
            command=self.browse_file,
            state=tk.DISABLED,
            bg="#3498DB",
            fg="white",
            font=("Arial", 9, "bold"),
            relief=tk.RAISED,
            cursor="hand2"
        )
        self.browse_btn.pack(side=tk.LEFT)
        
        # Drag and drop hint
        if HAS_DND:
            drop_hint_text = "💡 Tip: You can also drag and drop audio files here"
        else:
            drop_hint_text = "💡 Tip: Install 'tkinterdnd2' for drag-and-drop support"
        
        drop_hint = tk.Label(
            file_frame,
            text=drop_hint_text,
            font=("Arial", 8, "italic"),
            bg="#ECF0F1",
            fg="#7F8C8D"
        )
        drop_hint.pack(pady=(0, 5))
        
        # Enable drag-and-drop if available
        if HAS_DND:
            try:
                self.path_entry.drop_target_register(DND_FILES)
                self.path_entry.dnd_bind('<<Drop>>', self._on_file_drop)
            except Exception as e:
                pass  # Silently fail if drag-and-drop setup fails
    
    def _create_progress_section(self, parent):
        """Create progress tracking section."""
        progress_frame = tk.Frame(parent, bg="#ECF0F1")
        progress_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.progress_label = tk.Label(
            progress_frame,
            text="Ready",
            font=("Arial", 9),
            bg="#ECF0F1",
            fg="#34495E"
        )
        self.progress_label.pack(anchor=tk.W)
        
        self.progress_bar = ttk.Progressbar(
            progress_frame,
            mode='determinate',
            length=400
        )
        self.progress_bar.pack(fill=tk.X, pady=(5, 0))
    
    def _create_control_buttons(self, parent):
        """Create control buttons."""
        button_frame = tk.Frame(parent, bg="#ECF0F1")
        button_frame.pack(pady=10)
        
        self.run_btn = tk.Button(
            button_frame,
            text="▶ Start Transcription",
            command=self.run_process,
            bg="#27AE60",
            fg="white",
            font=("Arial", 12, "bold"),
            width=20,
            height=2,
            state=tk.DISABLED,
            relief=tk.RAISED,
            cursor="hand2"
        )
        self.run_btn.pack(side=tk.LEFT, padx=5)
        
        self.cancel_btn = tk.Button(
            button_frame,
            text="⏹ Cancel",
            command=self.cancel_process,
            bg="#E74C3C",
            fg="white",
            font=("Arial", 12, "bold"),
            width=15,
            height=2,
            state=tk.DISABLED,
            relief=tk.RAISED,
            cursor="hand2"
        )
        self.cancel_btn.pack(side=tk.LEFT, padx=5)
    
    def _create_output_section(self, parent):
        """Create output display section."""
        output_frame = tk.LabelFrame(
            parent,
            text="📄 Transcription Result",
            font=("Arial", 10, "bold"),
            bg="#ECF0F1"
        )
        output_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Add copy button at top
        button_bar = tk.Frame(output_frame, bg="#ECF0F1")
        button_bar.pack(fill=tk.X, padx=10, pady=(5, 0))
        
        self.copy_btn = tk.Button(
            button_bar,
            text="📋 Copy Transcript",
            command=self._copy_transcript,
            bg="#3498DB",
            fg="white",
            font=("Arial", 9, "bold"),
            state=tk.DISABLED,
            relief=tk.RAISED,
            cursor="hand2"
        )
        self.copy_btn.pack(side=tk.RIGHT)
        
        # Create text widget with better formatting
        self.result_area = scrolledtext.ScrolledText(
            output_frame,
            width=80,
            height=12,
            font=("Arial", 11),  # Larger, more readable font
            wrap=tk.WORD,
            bg="#FFFFFF",
            relief=tk.SUNKEN,
            borderwidth=2,
            spacing1=3,  # Space above each line
            spacing2=2,  # Space between wrapped lines
            spacing3=3   # Space below each line
        )
        self.result_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Configure text tags for different styles
        self.result_area.tag_configure("header", font=("Arial", 11, "bold"), foreground="#2C3E50")
        self.result_area.tag_configure("transcript_ltr", font=("Arial", 12), foreground="#000000", spacing1=5, spacing3=5)
        self.result_area.tag_configure("transcript_rtl", font=("Arial", 14), foreground="#000000", spacing1=5, spacing3=5, justify=tk.RIGHT)
        self.result_area.tag_configure("metadata", font=("Arial", 9), foreground="#7F8C8D")
        self.result_area.tag_configure("error", font=("Arial", 10), foreground="#E74C3C")
        
        # Store the last transcript for copying
        self.last_transcript = ""
    
    def _create_recent_files_section(self, parent):
        """Create recent files section."""
        recent_frame = tk.LabelFrame(
            parent,
            text="🕐 Recent Files",
            font=("Arial", 9, "bold"),
            bg="#ECF0F1"
        )
        recent_frame.pack(fill=tk.X)
        
        self.recent_listbox = tk.Listbox(
            recent_frame,
            height=3,
            font=("Arial", 8),
            bg="#FFFFFF"
        )
        self.recent_listbox.pack(fill=tk.X, padx=5, pady=5)
        self.recent_listbox.bind('<Double-Button-1>', self._on_recent_file_click)
        
        self._update_recent_files_display()
    
    # ============= Model Loading =============
    
    def _start_model_loading(self):
        """Start loading the AI model in background."""
        threading.Thread(target=self._load_model_thread, daemon=True).start()
    
    def _load_model_thread(self):
        """Load the AI model (runs in background thread)."""
        try:
            self.engine = STTEngine(model_size="medium", use_cache=True)
            self.root.after(0, self._on_model_loaded)
        except Exception as e:
            self.root.after(0, lambda: self._on_model_error(str(e)))
    
    def _on_model_loaded(self):
        """Called when model loading succeeds."""
        self.status_label.config(
            text="✓ Model loaded and ready",
            fg="#27AE60"
        )
        self.browse_btn.config(state=tk.NORMAL)
        self.run_btn.config(state=tk.NORMAL)
    
    def _on_model_error(self, error_msg: str):
        """Called when model loading fails."""
        self.status_label.config(
            text=f"✗ Model loading failed",
            fg="#E74C3C"
        )
        messagebox.showerror("Model Error", f"Failed to load model:\n{error_msg}")
    
    # ============= File Handling =============
    
    def browse_file(self):
        """Open file browser dialog."""
        filename = filedialog.askopenfilename(
            title="Select Audio File",
            filetypes=[
                ("Audio Files", "*.wav *.mp3 *.m4a *.flac *.ogg"),
                ("All Files", "*.*")
            ]
        )
        if filename:
            self._set_file_path(filename)
    
    def _on_file_drop(self, event):
        """Handle drag-and-drop file."""
        file_path = event.data.strip('{}')  # Remove curly braces
        if os.path.isfile(file_path):
            self._set_file_path(file_path)
    
    def _set_file_path(self, path: str):
        """Set the file path in the entry."""
        self.path_entry.delete(0, tk.END)
        self.path_entry.insert(0, path)
    
    def _on_recent_file_click(self, event):
        """Handle clicking on recent file."""
        selection = self.recent_listbox.curselection()
        if selection:
            idx = selection[0]
            if idx < len(self.recent_files):
                self._set_file_path(self.recent_files[idx])
    
    # ============= Processing =============
    
    def run_process(self):
        """Start the transcription process."""
        audio_path = self.path_entry.get().strip()
        
        # Validation
        if not audio_path:
            messagebox.showwarning("No File", "Please select an audio file first.")
            return
        
        if not os.path.exists(audio_path):
            messagebox.showerror("File Not Found", f"File does not exist:\n{audio_path}")
            return
        
        if not os.path.isfile(audio_path):
            messagebox.showerror("Invalid File", "Selected path is not a file.")
            return
        
        # Prepare UI for processing
        self.is_processing = True
        self.cancel_requested = False
        self.run_btn.config(state=tk.DISABLED)
        self.cancel_btn.config(state=tk.NORMAL)
        self.browse_btn.config(state=tk.DISABLED)
        self.result_area.delete(1.0, tk.END)
        self.result_area.insert(tk.END, "🔄 Processing... Please wait\n")
        self.progress_bar['value'] = 0
        self.progress_label.config(text="Starting transcription...")
        
        # Add to recent files
        self._add_recent_file(audio_path)
        
        # Start processing in background thread
        threading.Thread(
            target=self._process_thread,
            args=(audio_path,),
            daemon=True
        ).start()
    
    def _process_thread(self, audio_path: str):
        """Run transcription in background thread."""
        try:
            # Progress callback
            def update_progress(percent: int):
                if self.cancel_requested:
                    raise InterruptedError("Cancelled by user")
                self.root.after(0, lambda: self._update_progress(percent))
            
            # Run transcription
            result = self.engine.transcribe_audio(
                audio_path,
                progress_callback=update_progress
            )
            
            # Update UI with results
            self.root.after(0, lambda: self._show_results(result))
            
        except InterruptedError:
            self.root.after(0, lambda: self._show_cancelled())
        except Exception as e:
            self.root.after(0, lambda: self._show_error(str(e)))
    
    def cancel_process(self):
        """Cancel the ongoing transcription."""
        if self.is_processing:
            self.cancel_requested = True
            self.cancel_btn.config(state=tk.DISABLED)
            self.progress_label.config(text="Cancelling...")
    
    def _update_progress(self, percent: int):
        """Update progress bar."""
        self.progress_bar['value'] = percent
        if percent <= 30:
            self.progress_label.config(text="Loading audio...")
        elif percent <= 90:
            self.progress_label.config(text="Transcribing...")
        else:
            self.progress_label.config(text="Finalizing...")
    
    def _show_results(self, result: dict):
        """Display transcription results with proper formatting."""
        self.result_area.delete(1.0, tk.END)
        
        if result["status"] == "success":
            # Store transcript for copying
            self.last_transcript = result['text']
            self.copy_btn.config(state=tk.NORMAL)
            
            # Detect if language is RTL (right-to-left)
            language = result['language'].lower()
            is_rtl = self._is_rtl_language(language)
            
            # Insert header
            self.result_area.insert(tk.END, "✓ TRANSCRIPTION SUCCESSFUL\n", "header")
            self.result_area.insert(tk.END, "=" * 60 + "\n\n", "metadata")
            
            # Insert transcript label
            self.result_area.insert(tk.END, "📝 Transcript:\n", "header")
            self.result_area.insert(tk.END, "-" * 60 + "\n\n", "metadata")
            
            # Insert the actual transcript with proper formatting
            transcript_text = result['text'].strip() + "\n\n"
            if is_rtl:
                # For RTL languages (Urdu, Arabic, etc.)
                self.result_area.insert(tk.END, transcript_text, "transcript_rtl")
            else:
                # For LTR languages (English, etc.)
                self.result_area.insert(tk.END, transcript_text, "transcript_ltr")
            
            self.result_area.insert(tk.END, "-" * 60 + "\n\n", "metadata")
            
            # Insert metadata
            metadata = (
                f"🌍 Language: {result['language'].upper()}\n"
                f"💻 Device: {result['device_used'].upper()}\n"
                f"📊 File Size: {result.get('duration', 0):.2f} MB\n"
                f"⏱️ Segments: {len(result.get('segments', []))}\n"
            )
            self.result_area.insert(tk.END, metadata, "metadata")
            
            # Show RTL indicator if applicable
            if is_rtl:
                self.result_area.insert(tk.END, "\n✨ RTL text formatting applied\n", "metadata")
            
            self.progress_label.config(text="✓ Completed successfully")
        else:
            # Error case
            self.last_transcript = ""
            self.copy_btn.config(state=tk.DISABLED)
            
            self.result_area.insert(tk.END, "✗ TRANSCRIPTION FAILED\n", "header")
            self.result_area.insert(tk.END, "=" * 60 + "\n\n", "metadata")
            self.result_area.insert(tk.END, f"Error: {result['message']}\n", "error")
            
            self.progress_label.config(text="✗ Failed")
        
        self._reset_ui()
    
    def _show_cancelled(self):
        """Display cancellation message."""
        self.result_area.delete(1.0, tk.END)
        self.last_transcript = ""
        self.copy_btn.config(state=tk.DISABLED)
        self.result_area.insert(tk.END, "⏹ Transcription cancelled by user\n", "header")
        self.progress_label.config(text="Cancelled")
        self._reset_ui()
    
    def _show_error(self, error_msg: str):
        """Display error message."""
        self.result_area.delete(1.0, tk.END)
        self.last_transcript = ""
        self.copy_btn.config(state=tk.DISABLED)
        self.result_area.insert(tk.END, "✗ ERROR\n", "header")
        self.result_area.insert(tk.END, "=" * 60 + "\n\n", "metadata")
        self.result_area.insert(tk.END, error_msg + "\n", "error")
        self.progress_label.config(text="Error occurred")
        messagebox.showerror("Processing Error", error_msg)
        self._reset_ui()
    
    def _reset_ui(self):
        """Reset UI to ready state."""
        self.is_processing = False
        self.cancel_requested = False
        self.run_btn.config(state=tk.NORMAL)
        self.cancel_btn.config(state=tk.DISABLED)
        self.browse_btn.config(state=tk.NORMAL)
        self.progress_bar['value'] = 0
    
    # ============= Helper Methods =============
    
    def _is_rtl_language(self, language_code: str) -> bool:
        """Check if language is right-to-left."""
        rtl_languages = {
            'ur', 'urdu',           # Urdu
            'ar', 'arabic',         # Arabic
            'fa', 'persian', 'farsi',  # Persian/Farsi
            'he', 'hebrew',         # Hebrew
            'yi', 'yiddish',        # Yiddish
            'ps', 'pashto',         # Pashto
            'sd', 'sindhi',         # Sindhi
            'ug', 'uyghur'          # Uyghur
        }
        return language_code.lower() in rtl_languages
    
    def _copy_transcript(self):
        """Copy transcript to clipboard."""
        if self.last_transcript:
            self.root.clipboard_clear()
            self.root.clipboard_append(self.last_transcript)
            self.root.update()  # Required to finalize clipboard
            messagebox.showinfo("Copied", "Transcript copied to clipboard!")
        else:
            messagebox.showwarning("No Transcript", "No transcript available to copy.")
    
    # ============= Recent Files Management =============
    
    def _load_recent_files(self) -> list:
        """Load recent files from config."""
        if self.CONFIG_FILE.exists():
            try:
                with open(self.CONFIG_FILE, 'r') as f:
                    data = json.load(f)
                    return data.get('recent_files', [])
            except:
                pass
        return []
    
    def _save_recent_files(self):
        """Save recent files to config."""
        try:
            with open(self.CONFIG_FILE, 'w') as f:
                json.dump({'recent_files': self.recent_files}, f)
        except:
            pass
    
    def _add_recent_file(self, path: str):
        """Add file to recent files list."""
        # Remove if already exists
        if path in self.recent_files:
            self.recent_files.remove(path)
        
        # Add to front
        self.recent_files.insert(0, path)
        
        # Limit size
        self.recent_files = self.recent_files[:self.MAX_RECENT_FILES]
        
        # Save and update display
        self._save_recent_files()
        self._update_recent_files_display()
    
    def _update_recent_files_display(self):
        """Update recent files listbox."""
        self.recent_listbox.delete(0, tk.END)
        for file_path in self.recent_files:
            if os.path.exists(file_path):
                display_name = os.path.basename(file_path)
                self.recent_listbox.insert(tk.END, f"  {display_name}")
    
    # ============= Cleanup =============
    
    def _on_closing(self):
        """Handle window close event."""
        if self.is_processing:
            if messagebox.askokcancel("Quit", "Transcription in progress. Are you sure you want to quit?"):
                self.cancel_requested = True
                if self.engine:
                    self.engine.unload_model()
                self.root.destroy()
        else:
            if self.engine:
                self.engine.unload_model()
            self.root.destroy()


# ============= Main Execution =============

if __name__ == "__main__":
    # Use TkinterDnD if available for drag-and-drop support
    if HAS_DND:
        try:
            root = TkinterDnD.Tk()
        except Exception:
            root = tk.Tk()
    else:
        root = tk.Tk()
    
    app = STTTesterApp(root)
    root.mainloop()