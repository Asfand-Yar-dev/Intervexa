"""
Facial Expression Analysis Module for Mock Interview System

This module provides real-time facial expression detection and emotion analysis
using the DeepFace library. It includes stabilization mechanisms to ensure
consistent and accurate emotion predictions.

Author: AI Developer Team
Date: 2026-01-21
"""

import numpy as np
from collections import deque
from deepface import DeepFace
import cv2
from typing import Tuple, Optional, Dict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FacialExpressionModel:
    """
    A robust facial expression analyzer with built-in stabilization.
    
    This class uses DeepFace to detect emotions from video frames and implements
    a smoothing mechanism using a history buffer to prevent jittery predictions.
    
    Attributes:
        history_size (int): Number of previous predictions to store for stabilization
        emotion_history (deque): Rolling buffer of recent emotion predictions
        frame_count (int): Counter for processed frames
    """
    
    def __init__(self, history_size: int = 5):
        """
        Initialize the Facial Expression Model.
        
        Args:
            history_size (int): Size of the emotion history buffer for stabilization.
                               Default is 5, meaning the last 5 predictions are used.
        """
        logger.info("Initializing Facial Expression Model...")
        
        self.history_size = history_size
        self.emotion_history = deque(maxlen=history_size)
        self.frame_count = 0
        
        # Warm up the model by running a dummy analysis
        # This ensures the model weights are loaded into memory
        self._warmup_model()
        
        logger.info("✓ Model initialized and warmed up successfully!")
    
    def _warmup_model(self):
        """
        Perform a dummy analysis to preload model weights.
        
        This prevents lag on the first real frame by forcing TensorFlow/Keras
        to load all necessary model weights into memory during initialization.
        """
        try:
            logger.info("Warming up model (loading weights into memory)...")
            
            # Create a blank 224x224 RGB image (typical input size for deep learning models)
            dummy_image = np.zeros((224, 224, 3), dtype=np.uint8)
            
            # Run a dummy analysis with emotion detection
            # enforce_detection=False ensures it doesn't fail on the blank image
            DeepFace.analyze(
                img_path=dummy_image,
                actions=['emotion'],
                enforce_detection=False,
                detector_backend='opencv',
                silent=True
            )
            
            logger.info("✓ Model warmup complete!")
            
        except Exception as e:
            logger.warning(f"Warmup encountered an issue (this is usually fine): {e}")
    
    def _get_most_common_emotion(self) -> Optional[str]:
        """
        Calculate the most common emotion from the history buffer.
        
        This stabilization technique reduces jitter by returning the mode
        (most frequent value) from recent predictions.
        
        Returns:
            str: The most common emotion, or None if history is empty
        """
        if not self.emotion_history:
            return None
        
        # Use numpy to find the most common element
        emotions_array = np.array(list(self.emotion_history))
        unique, counts = np.unique(emotions_array, return_counts=True)
        most_common_idx = np.argmax(counts)
        
        return unique[most_common_idx]
    
    def analyze_frame(self, frame: np.ndarray) -> Dict:
        """
        Analyze a single frame for facial expressions.
        
        This method performs emotion detection on the provided frame and returns
        stabilized results using the emotion history buffer.
        
        Args:
            frame (np.ndarray): OpenCV image frame (BGR format)
        
        Returns:
            dict: Analysis results containing:
                - 'success' (bool): Whether analysis was successful
                - 'emotion' (str): Stabilized detected emotion
                - 'raw_emotion' (str): Raw emotion from this frame
                - 'confidence' (float): Confidence score (0-100)
                - 'all_emotions' (dict): All emotion probabilities
                - 'face_coordinates' (dict): Face bounding box (x, y, w, h)
                - 'error' (str): Error message if analysis failed
        """
        self.frame_count += 1
        
        result = {
            'success': False,
            'emotion': 'Unknown',
            'raw_emotion': None,
            'confidence': 0.0,
            'all_emotions': {},
            'face_coordinates': None,
            'error': None
        }
        
        try:
            # Run DeepFace analysis
            # enforce_detection=False prevents crashes when no face is detected
            analysis = DeepFace.analyze(
                img_path=frame,
                actions=['emotion'],
                enforce_detection=False,
                detector_backend='opencv',
                silent=True
            )
            
            # DeepFace returns a list of results (one per detected face)
            if isinstance(analysis, list) and len(analysis) > 0:
                # Take the first detected face
                face_data = analysis[0]
            else:
                face_data = analysis
            
            # Extract emotion data
            emotions = face_data.get('emotion', {})
            dominant_emotion = face_data.get('dominant_emotion', 'Unknown')
            
            # Get confidence score for the dominant emotion
            confidence = emotions.get(dominant_emotion, 0.0)
            
            # Extract face region coordinates
            region = face_data.get('region', {})
            face_coords = {
                'x': region.get('x', 0),
                'y': region.get('y', 0),
                'w': region.get('w', 0),
                'h': region.get('h', 0)
            }
            
            # Add to history for stabilization
            self.emotion_history.append(dominant_emotion)
            
            # Get stabilized emotion (most common from history)
            stabilized_emotion = self._get_most_common_emotion()
            
            # Update result
            result.update({
                'success': True,
                'emotion': stabilized_emotion,
                'raw_emotion': dominant_emotion,
                'confidence': round(confidence, 2),
                'all_emotions': emotions,
                'face_coordinates': face_coords
            })
            
            logger.debug(f"Frame {self.frame_count}: {stabilized_emotion} ({confidence:.1f}%)")
            
        except Exception as e:
            # Handle errors gracefully (e.g., no face detected, processing error)
            result['error'] = str(e)
            logger.debug(f"Analysis failed for frame {self.frame_count}: {e}")
        
        return result
    
    def reset_history(self):
        """
        Reset the emotion history buffer.
        
        Useful when starting a new interview session or when the subject changes.
        """
        self.emotion_history.clear()
        logger.info("Emotion history reset")
    
    def get_statistics(self) -> Dict:
        """
        Get statistics about the current session.
        
        Returns:
            dict: Statistics including frame count and emotion distribution
        """
        if not self.emotion_history:
            return {
                'total_frames': self.frame_count,
                'analyzed_frames': 0,
                'emotion_distribution': {}
            }
        
        emotions_array = np.array(list(self.emotion_history))
        unique, counts = np.unique(emotions_array, return_counts=True)
        
        distribution = {
            emotion: int(count) for emotion, count in zip(unique, counts)
        }
        
        return {
            'total_frames': self.frame_count,
            'analyzed_frames': len(self.emotion_history),
            'emotion_distribution': distribution
        }
