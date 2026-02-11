"""
Optimized Speech-to-Text Engine using OpenAI Whisper
Features:
- Efficient GPU memory management
- Progress callback support
- Model caching
- Proper resource cleanup
- Comprehensive error handling
"""

import whisper
import os
import torch
import gc
import logging
from typing import Optional, Dict, Callable, Any
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class STTEngine:
    """Speech-to-Text Engine with optimized performance and resource management."""
    
    # Class-level cache for loaded models (shared across instances)
    _model_cache: Dict[str, Any] = {}
    
    def __init__(self, model_size: str = "medium", use_cache: bool = True):
        """
        Initialize the STT Engine.
        
        Args:
            model_size: Whisper model size ('tiny', 'base', 'small', 'medium', 'large')
            use_cache: Whether to use model caching (recommended for multiple instances)
        """
        self.model_size = model_size
        self.use_cache = use_cache
        self.model = None
        self.device = None
        self._load_model()
    
    def _load_model(self) -> None:
        """Load the Whisper model with optimizations."""
        logger.info(f"Loading Whisper '{self.model_size}' model...")
        
        try:
            # Determine optimal device
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {self.device}")
            
            # Check cache first
            cache_key = f"{self.model_size}_{self.device}"
            if self.use_cache and cache_key in STTEngine._model_cache:
                logger.info("Loading model from cache...")
                self.model = STTEngine._model_cache[cache_key]
                logger.info("Model loaded from cache successfully")
                return
            
            # Load model
            self.model = whisper.load_model(self.model_size, device=self.device)
            
            # Optimize for inference
            self.model.eval()  # Set to evaluation mode
            if self.device == "cuda":
                # Enable optimizations for GPU
                torch.backends.cudnn.benchmark = True
                torch.cuda.empty_cache()  # Clear GPU cache
            
            # Cache the model if enabled
            if self.use_cache:
                STTEngine._model_cache[cache_key] = self.model
            
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            self.model = None
            raise
    
    def transcribe_audio(
        self, 
        audio_path: str, 
        language: Optional[str] = None,
        task: str = "transcribe",
        verbose: bool = False,
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio file to text.
        
        Args:
            audio_path: Path to audio file
            language: Optional language code (e.g., 'en', 'es')
            task: 'transcribe' or 'translate' (translate to English)
            verbose: Enable detailed logging
            progress_callback: Optional callback function for progress updates (0-100)
            
        Returns:
            Dictionary with status, text, language, and other metadata
        """
        # Validate model
        if self.model is None:
            return {"status": "error", "message": "Model not loaded"}
        
        # Validate file
        audio_file = Path(audio_path)
        if not audio_file.exists():
            return {"status": "error", "message": f"File not found: {audio_path}"}
        
        if not audio_file.is_file():
            return {"status": "error", "message": f"Path is not a file: {audio_path}"}
        
        try:
            if progress_callback:
                progress_callback(10)
            
            logger.info(f"Transcribing: {audio_file.name}")
            
            # Prepare transcription options
            options = {
                "fp16": self.device == "cuda",  # Use FP16 only on GPU
                "verbose": verbose,
                "task": task
            }
            
            if language:
                options["language"] = language
            
            if progress_callback:
                progress_callback(30)
            
            # Run transcription with context manager for GPU memory
            with torch.no_grad():  # Disable gradient computation for inference
                result = self.model.transcribe(str(audio_path), **options)
            
            if progress_callback:
                progress_callback(90)
            
            # Clean up GPU memory if needed
            if self.device == "cuda":
                torch.cuda.empty_cache()
            
            if progress_callback:
                progress_callback(100)
            
            logger.info("Transcription completed successfully")
            
            return {
                "status": "success",
                "text": result['text'].strip(),
                "language": result.get('language', 'unknown'),
                "device_used": self.device,
                "segments": result.get('segments', []),
                "duration": audio_file.stat().st_size / (1024 * 1024)  # File size in MB
            }
            
        except torch.cuda.OutOfMemoryError:
            self._cleanup_gpu_memory()
            error_msg = "GPU out of memory. Try using a smaller model or CPU."
            logger.error(error_msg)
            return {"status": "error", "message": error_msg}
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
    
    def _cleanup_gpu_memory(self) -> None:
        """Force GPU memory cleanup."""
        if self.device == "cuda":
            torch.cuda.empty_cache()
            gc.collect()
            logger.info("GPU memory cleaned up")
    
    def unload_model(self) -> None:
        """Unload model and free memory."""
        if self.model is not None:
            self.model = None
            self._cleanup_gpu_memory()
            gc.collect()
            logger.info("Model unloaded, memory freed")
    
    def __del__(self):
        """Cleanup on deletion."""
        self.unload_model()
    
    @staticmethod
    def clear_cache() -> None:
        """Clear all cached models."""
        STTEngine._model_cache.clear()
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        gc.collect()
        logger.info("Model cache cleared")