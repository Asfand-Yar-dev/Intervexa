"""
Webcam Testing GUI for Facial Expression Analysis

This script provides a real-time testing interface for the Facial Expression
Analysis Module using a webcam feed. It includes performance optimizations
like frame skipping and proper Windows camera compatibility.

Author: AI Developer Team
Date: 2026-01-21
"""

import cv2
import sys
import os
import numpy as np
from datetime import datetime
import logging

# Add the parent directory to the path to import our model
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.Facial_AI_Module import FacialExpressionModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EmotionDetectionGUI:
    """
    Real-time emotion detection GUI using webcam feed.
    
    This class handles video capture, frame processing, and visualization
    with optimizations for smooth performance.
    """
    
    def __init__(self, camera_id: int = 0, skip_frames: int = 5):
        """
        Initialize the GUI.
        
        Args:
            camera_id (int): Camera device ID (0 for default webcam)
            skip_frames (int): Process every Nth frame (higher = faster but less responsive)
        """
        self.camera_id = camera_id
        self.skip_frames = skip_frames
        self.frame_counter = 0
        
        # Current emotion state
        self.current_emotion = "Initializing..."
        self.current_confidence = 0.0
        self.face_coords = None
        
        # Initialize the facial expression model
        logger.info("Loading Facial Expression Model...")
        self.model = FacialExpressionModel(history_size=5)
        
        # Window name
        self.window_name = "Smart Mock Interview - Emotion Detection"
        
        # Performance metrics
        self.fps = 0
        self.last_time = datetime.now()
        
    def _init_camera(self) -> cv2.VideoCapture:
        """
        Initialize the camera with Windows-compatible settings.
        
        Returns:
            cv2.VideoCapture: Configured video capture object
        """
        logger.info(f"Opening camera {self.camera_id}...")
        
        # Use CAP_DSHOW for Windows to avoid MSMF errors
        # This is critical for Windows compatibility
        cap = cv2.VideoCapture(self.camera_id, cv2.CAP_DSHOW)
        
        if not cap.isOpened():
            logger.error("Failed to open camera!")
            raise RuntimeError(
                "Could not access the webcam. Please check:\n"
                "1. Camera is connected\n"
                "2. No other application is using the camera\n"
                "3. Camera permissions are granted"
            )
        
        # Set camera properties for better performance
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        
        logger.info("✓ Camera opened successfully!")
        return cap
    
    def _calculate_fps(self):
        """Calculate and update FPS counter."""
        current_time = datetime.now()
        time_diff = (current_time - self.last_time).total_seconds()
        
        if time_diff > 0:
            self.fps = 1.0 / time_diff
        
        self.last_time = current_time
    
    def _draw_ui(self, frame: np.ndarray) -> np.ndarray:
        """
        Draw the user interface elements on the frame.
        
        Args:
            frame (np.ndarray): Input frame
            
        Returns:
            np.ndarray: Frame with UI elements drawn
        """
        height, width = frame.shape[:2]
        
        # Create a copy to draw on
        display_frame = frame.copy()
        
        # Draw face bounding box if detected
        if self.face_coords and self.face_coords['w'] > 0:
            x = self.face_coords['x']
            y = self.face_coords['y']
            w = self.face_coords['w']
            h = self.face_coords['h']
            
            # Draw green bounding box
            cv2.rectangle(display_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            # Prepare emotion text
            emotion_text = f"{self.current_emotion} ({self.current_confidence:.1f}%)"
            
            # Calculate text size for background
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.8
            thickness = 2
            (text_width, text_height), baseline = cv2.getTextSize(
                emotion_text, font, font_scale, thickness
            )
            
            # Draw background rectangle for text
            text_x = x
            text_y = y - 10
            
            # Ensure text doesn't go off screen
            if text_y - text_height - 10 < 0:
                text_y = y + h + text_height + 10
            
            cv2.rectangle(
                display_frame,
                (text_x, text_y - text_height - 5),
                (text_x + text_width + 10, text_y + 5),
                (0, 255, 0),
                -1  # Filled rectangle
            )
            
            # Draw emotion text
            cv2.putText(
                display_frame,
                emotion_text,
                (text_x + 5, text_y),
                font,
                font_scale,
                (0, 0, 0),  # Black text
                thickness
            )
        
        # Draw info panel at the top
        info_bg_height = 80
        overlay = display_frame.copy()
        cv2.rectangle(overlay, (0, 0), (width, info_bg_height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, display_frame, 0.4, 0, display_frame)
        
        # Draw title
        cv2.putText(
            display_frame,
            "Smart Mock Interview System - Emotion Detection",
            (10, 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )
        
        # Draw FPS and status
        status_text = f"FPS: {self.fps:.1f} | Emotion: {self.current_emotion}"
        cv2.putText(
            display_frame,
            status_text,
            (10, 55),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1
        )
        
        # Draw instructions at the bottom
        instructions = "Press 'Q' to quit | 'R' to reset history | 'S' for statistics"
        cv2.putText(
            display_frame,
            instructions,
            (10, height - 15),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1
        )
        
        return display_frame
    
    def _show_statistics(self):
        """Display emotion statistics in console."""
        stats = self.model.get_statistics()
        
        print("\n" + "="*50)
        print("SESSION STATISTICS")
        print("="*50)
        print(f"Total Frames Captured: {stats['total_frames']}")
        print(f"Frames Analyzed: {stats['analyzed_frames']}")
        print("\nEmotion Distribution:")
        
        if stats['emotion_distribution']:
            for emotion, count in sorted(
                stats['emotion_distribution'].items(),
                key=lambda x: x[1],
                reverse=True
            ):
                percentage = (count / stats['analyzed_frames']) * 100
                print(f"  {emotion:12s}: {count:3d} ({percentage:.1f}%)")
        else:
            print("  No data collected yet")
        
        print("="*50 + "\n")
    
    def run(self):
        """
        Main loop for the GUI application.
        
        This handles video capture, frame processing, and user interaction.
        """
        # Initialize camera
        cap = self._init_camera()
        
        # Create window
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, 960, 720)
        
        logger.info("Starting emotion detection... Press 'Q' to quit")
        logger.info(f"Frame skip: Analyzing every {self.skip_frames} frames for optimal performance")
        
        try:
            while True:
                # Capture frame
                ret, frame = cap.read()
                
                if not ret:
                    logger.error("Failed to grab frame from camera")
                    break
                
                # Calculate FPS
                self._calculate_fps()
                
                # Increment frame counter
                self.frame_counter += 1
                
                # Process frame (with frame skipping for performance)
                if self.frame_counter % self.skip_frames == 0:
                    # Analyze the frame
                    result = self.model.analyze_frame(frame)
                    
                    if result['success']:
                        self.current_emotion = result['emotion']
                        self.current_confidence = result['confidence']
                        self.face_coords = result['face_coordinates']
                    else:
                        # No face detected or error
                        if self.frame_counter > 100:  # Give some startup time
                            self.current_emotion = "No Face Detected"
                            self.current_confidence = 0.0
                            self.face_coords = None
                
                # Draw UI elements
                display_frame = self._draw_ui(frame)
                
                # Show the frame
                cv2.imshow(self.window_name, display_frame)
                
                # Handle keyboard input
                key = cv2.waitKey(1) & 0xFF
                
                if key == ord('q') or key == ord('Q'):
                    logger.info("Quit requested by user")
                    break
                elif key == ord('r') or key == ord('R'):
                    logger.info("Resetting emotion history")
                    self.model.reset_history()
                    self.current_emotion = "History Reset"
                elif key == ord('s') or key == ord('S'):
                    self._show_statistics()
        
        except KeyboardInterrupt:
            logger.info("Interrupted by user")
        
        except Exception as e:
            logger.error(f"An error occurred: {e}", exc_info=True)
        
        finally:
            # Cleanup
            logger.info("Cleaning up...")
            self._show_statistics()
            cap.release()
            cv2.destroyAllWindows()
            logger.info("Application closed successfully")


def main():
    """Main entry point for the application."""
    print("\n" + "="*60)
    print(" SMART MOCK INTERVIEW SYSTEM - FACIAL EXPRESSION ANALYZER")
    print("="*60)
    print("\nInitializing system...\n")
    
    try:
        # Create and run the GUI
        gui = EmotionDetectionGUI(camera_id=0, skip_frames=5)
        gui.run()
    
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        print("\n❌ Application failed to start. Please check the error message above.")
        input("Press Enter to exit...")
        sys.exit(1)


if __name__ == "__main__":
    main()
