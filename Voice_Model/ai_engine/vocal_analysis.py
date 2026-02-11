"""
Vocal Tone Analysis Module for Smart Mock Interview System
This module uses Wav2Vec2 for emotion recognition from audio files.

Dependencies:
pip install transformers torch librosa soundfile numpy

Author: AI Backend Developer
Date: 2026-02-06
"""

import logging
import os
from typing import Dict, Optional
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class VocalToneAnalyzer:
    """
    A class to analyze vocal tone and detect emotions from audio files
    using the Wav2Vec2 model from Hugging Face.
    """
    
    def __init__(self):
        """
        Initialize the Vocal Tone Analyzer by loading the pre-trained model.
        The model is loaded once during initialization for efficiency.
        """
        self.model_checkpoint = "superb/wav2vec2-base-superb-er"
        self.pipeline = None
        
        # Emotion label mapping from abbreviated to human-readable
        self.emotion_labels = {
            'neu': 'Neutral',
            'hap': 'Happy/Confident',
            'ang': 'Angry',
            'sad': 'Sad',
            'fea': 'Fearful/Nervous',
            'dis': 'Disgust',
            'sur': 'Surprised'
        }
        
        self._load_model()
    
    def _load_model(self) -> None:
        """
        Load the Wav2Vec2 emotion recognition model.
        Handles errors gracefully if model loading fails.
        """
        try:
            logger.info(f"Loading model: {self.model_checkpoint}")
            from transformers import pipeline
            
            self.pipeline = pipeline(
                "audio-classification",
                model=self.model_checkpoint
            )
            
            logger.info("Model loaded successfully!")
            
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise RuntimeError(f"Model initialization failed: {str(e)}")
    
    def _map_emotion_label(self, abbreviated_label: str) -> str:
        """
        Map abbreviated emotion labels to human-readable format.
        
        Args:
            abbreviated_label (str): The abbreviated emotion label (e.g., 'neu', 'hap')
        
        Returns:
            str: Human-readable emotion label
        """
        return self.emotion_labels.get(abbreviated_label, abbreviated_label.capitalize())
    
    def analyze_tone(self, audio_path: str) -> Dict[str, any]:
        """
        Analyze the vocal tone from an audio file and detect the dominant emotion.
        
        Args:
            audio_path (str): Path to the audio file (WAV/MP3)
        
        Returns:
            dict: A dictionary containing:
                - emotion (str): The dominant emotion detected
                - score (float): Confidence score as a percentage (0-100)
        
        Raises:
            FileNotFoundError: If the audio file doesn't exist
            RuntimeError: If processing fails
        """
        try:
            # Validate file existence
            if not os.path.exists(audio_path):
                logger.error(f"Audio file not found: {audio_path}")
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            logger.info(f"Processing audio file: {audio_path}")
            
            # Check if model is loaded
            if self.pipeline is None:
                logger.error("Model pipeline is not initialized")
                raise RuntimeError("Model is not properly initialized")
            
            # Process the audio file
            results = self.pipeline(audio_path)
            
            # Get the top prediction
            if not results or len(results) == 0:
                logger.warning("No emotions detected in the audio")
                return {
                    "emotion": "Unknown",
                    "score": 0.0
                }
            
            # Extract top emotion
            top_prediction = results[0]
            abbreviated_emotion = top_prediction['label']
            confidence = top_prediction['score']
            
            # Map to human-readable label
            emotion = self._map_emotion_label(abbreviated_emotion)
            score = round(confidence * 100, 2)  # Convert to percentage
            
            logger.info(f"Detected emotion: {emotion} with confidence: {score}%")
            
            return {
                "emotion": emotion,
                "score": score
            }
            
        except FileNotFoundError as e:
            logger.error(f"File error: {str(e)}")
            raise
        
        except Exception as e:
            logger.error(f"Error during audio processing: {str(e)}")
            raise RuntimeError(f"Audio processing failed: {str(e)}")
    
    def analyze_tone_detailed(self, audio_path: str, top_n: int = 3) -> Dict[str, any]:
        """
        Analyze vocal tone and return top N emotions with their confidence scores.
        
        Args:
            audio_path (str): Path to the audio file
            top_n (int): Number of top emotions to return (default: 3)
        
        Returns:
            dict: Contains dominant emotion, score, and list of top N predictions
        """
        try:
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            logger.info(f"Processing audio file (detailed mode): {audio_path}")
            
            results = self.pipeline(audio_path, top_k=top_n)
            
            if not results:
                return {
                    "emotion": "Unknown",
                    "score": 0.0,
                    "all_predictions": []
                }
            
            # Process all predictions
            all_predictions = []
            for pred in results[:top_n]:
                all_predictions.append({
                    "emotion": self._map_emotion_label(pred['label']),
                    "score": round(pred['score'] * 100, 2)
                })
            
            # Top emotion
            top_pred = results[0]
            
            return {
                "emotion": self._map_emotion_label(top_pred['label']),
                "score": round(top_pred['score'] * 100, 2),
                "all_predictions": all_predictions
            }
            
        except Exception as e:
            logger.error(f"Detailed analysis failed: {str(e)}")
            raise RuntimeError(f"Detailed analysis failed: {str(e)}")


# ============================================================================
# HOW TO RUN - Testing Section
# ============================================================================

if __name__ == "__main__":
    """
    Test the VocalToneAnalyzer with a dummy audio file.
    
    Steps to run:
    1. Install dependencies:
       pip install transformers torch librosa soundfile numpy
    
    2. Prepare a test audio file (WAV or MP3 format)
    
    3. Run this script:
       python vocal_analysis.py
    
    Note: On first run, the model will be downloaded (~380MB)
    """
    
    print("=" * 70)
    print("VOCAL TONE ANALYSIS MODULE - TEST")
    print("=" * 70)
    
    try:
        # Initialize the analyzer
        print("\n[1] Initializing Vocal Tone Analyzer...")
        analyzer = VocalToneAnalyzer()
        print("✓ Analyzer initialized successfully!\n")
        
        # Test with a sample audio file
        # Replace this path with your actual test audio file
        test_audio_path = "../uploads/test_audio.wav"
        
        print("[2] Testing with audio file...")
        print(f"    Audio path: {test_audio_path}")
        
        # Check if test file exists
        if not os.path.exists(test_audio_path):
            print("\n⚠ WARNING: Test audio file not found!")
            print(f"   Please create/place an audio file at: {test_audio_path}")
            print("   Or modify the 'test_audio_path' variable in the code.\n")
            
            # Create a dummy example output
            print("=" * 70)
            print("EXAMPLE OUTPUT (with actual audio file):")
            print("=" * 70)
            print({
                "emotion": "Neutral",
                "score": 92.5
            })
            print("\n")
        else:
            # Analyze the audio
            result = analyzer.analyze_tone(test_audio_path)
            
            print("\n" + "=" * 70)
            print("ANALYSIS RESULT:")
            print("=" * 70)
            print(f"Detected Emotion: {result['emotion']}")
            print(f"Confidence Score: {result['score']}%")
            print("=" * 70)
            
            # Test detailed analysis
            print("\n[3] Running detailed analysis...")
            detailed_result = analyzer.analyze_tone_detailed(test_audio_path, top_n=3)
            
            print("\n" + "=" * 70)
            print("DETAILED ANALYSIS RESULT:")
            print("=" * 70)
            print(f"Primary Emotion: {detailed_result['emotion']} ({detailed_result['score']}%)")
            print("\nTop 3 Predictions:")
            for i, pred in enumerate(detailed_result['all_predictions'], 1):
                print(f"  {i}. {pred['emotion']}: {pred['score']}%")
            print("=" * 70)
        
        print("\n✓ Test completed successfully!")
        
    except Exception as e:
        print(f"\n✗ Error during testing: {str(e)}")
        logger.exception("Test failed with exception:")
    
    print("\n" + "=" * 70)
    print("USAGE EXAMPLE IN YOUR APPLICATION:")
    print("=" * 70)
    print("""
from ai_engine.vocal_analysis import VocalToneAnalyzer

# Initialize once (in your Flask/FastAPI app startup)
analyzer = VocalToneAnalyzer()

# Use in your endpoint
@app.route('/analyze-audio', methods=['POST'])
def analyze_audio():
    audio_path = request.json['audio_path']
    result = analyzer.analyze_tone(audio_path)
    return jsonify(result)
    
# Example result:
# {"emotion": "Neutral", "score": 92.5}
""")
    print("=" * 70)
