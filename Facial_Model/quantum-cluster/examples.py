"""
Example: Using the Facial Expression Model in Your Own Application

This script demonstrates how to integrate the FacialExpressionModel
into your own Python applications.
"""

import cv2
import time
from models.Facial_AI_Module import FacialExpressionModel


def example_basic_usage():
    """
    Example 1: Basic usage with a single image frame
    """
    print("\n=== Example 1: Basic Usage ===\n")
    
    # Initialize the model
    model = FacialExpressionModel(history_size=5)
    
    # Open webcam
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    
    # Read a single frame
    ret, frame = cap.read()
    
    if ret:
        # Analyze the frame
        result = model.analyze_frame(frame)
        
        # Print results
        print(f"Success: {result['success']}")
        print(f"Detected Emotion: {result['emotion']}")
        print(f"Confidence: {result['confidence']}%")
        print(f"Face Coordinates: {result['face_coordinates']}")
        print(f"\nAll Emotions:")
        for emotion, score in result['all_emotions'].items():
            print(f"  {emotion:12s}: {score:.2f}%")
    
    cap.release()
    print("\n" + "="*50 + "\n")


def example_continuous_monitoring():
    """
    Example 2: Continuous emotion monitoring for 10 seconds
    """
    print("\n=== Example 2: Continuous Monitoring (10 seconds) ===\n")
    
    model = FacialExpressionModel(history_size=5)
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    
    start_time = time.time()
    frame_count = 0
    
    print("Monitoring emotions for 10 seconds...")
    print("Look at the camera and try different expressions!\n")
    
    while time.time() - start_time < 10:
        ret, frame = cap.read()
        
        if ret and frame_count % 10 == 0:  # Analyze every 10th frame
            result = model.analyze_frame(frame)
            
            if result['success']:
                elapsed = time.time() - start_time
                print(f"[{elapsed:.1f}s] {result['emotion']} ({result['confidence']:.1f}%)")
        
        frame_count += 1
    
    cap.release()
    
    # Show statistics
    stats = model.get_statistics()
    print(f"\nTotal frames captured: {stats['total_frames']}")
    print(f"Frames analyzed: {stats['analyzed_frames']}")
    print("\nEmotion Distribution:")
    for emotion, count in stats['emotion_distribution'].items():
        percentage = (count / stats['analyzed_frames']) * 100
        print(f"  {emotion:12s}: {percentage:.1f}%")
    
    print("\n" + "="*50 + "\n")


def example_emotion_tracker():
    """
    Example 3: Track specific emotions (e.g., detect stress/nervousness)
    """
    print("\n=== Example 3: Stress Detection ===\n")
    
    model = FacialExpressionModel(history_size=5)
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    
    # Define stress indicators
    stress_emotions = ['fear', 'sad', 'angry']
    positive_emotions = ['happy', 'surprise']
    
    stress_count = 0
    positive_count = 0
    neutral_count = 0
    
    print("Analyzing emotional state for 15 seconds...")
    print("Stress indicators: Fear, Sadness, Anger\n")
    
    start_time = time.time()
    frame_count = 0
    
    while time.time() - start_time < 15:
        ret, frame = cap.read()
        
        if ret and frame_count % 8 == 0:
            result = model.analyze_frame(frame)
            
            if result['success']:
                emotion = result['emotion'].lower()
                
                if emotion in stress_emotions:
                    stress_count += 1
                    print(f"⚠️  Stress indicator detected: {emotion}")
                elif emotion in positive_emotions:
                    positive_count += 1
                    print(f"😊 Positive emotion: {emotion}")
                else:
                    neutral_count += 1
        
        frame_count += 1
    
    cap.release()
    
    # Calculate stress level
    total = stress_count + positive_count + neutral_count
    
    if total > 0:
        stress_percentage = (stress_count / total) * 100
        positive_percentage = (positive_count / total) * 100
        neutral_percentage = (neutral_count / total) * 100
        
        print("\n" + "="*50)
        print("EMOTIONAL STATE REPORT")
        print("="*50)
        print(f"Stress Indicators: {stress_percentage:.1f}%")
        print(f"Positive Emotions: {positive_percentage:.1f}%")
        print(f"Neutral State:     {neutral_percentage:.1f}%")
        
        # Overall assessment
        print("\nAssessment: ", end="")
        if stress_percentage > 40:
            print("High stress detected ⚠️")
        elif stress_percentage > 20:
            print("Moderate stress detected")
        else:
            print("Low stress - candidate appears calm ✓")
        
        print("="*50 + "\n")


def example_save_results():
    """
    Example 4: Save emotion data to a file
    """
    print("\n=== Example 4: Save Results to File ===\n")
    
    import json
    from datetime import datetime
    
    model = FacialExpressionModel(history_size=5)
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    
    results_log = []
    
    print("Recording emotions for 8 seconds...\n")
    
    start_time = time.time()
    frame_count = 0
    
    while time.time() - start_time < 8:
        ret, frame = cap.read()
        
        if ret and frame_count % 10 == 0:
            result = model.analyze_frame(frame)
            
            if result['success']:
                # Create log entry
                entry = {
                    'timestamp': datetime.now().isoformat(),
                    'elapsed_seconds': round(time.time() - start_time, 2),
                    'emotion': result['emotion'],
                    'confidence': result['confidence'],
                    'all_emotions': result['all_emotions']
                }
                results_log.append(entry)
                print(f"Logged: {entry['emotion']} ({entry['confidence']}%)")
        
        frame_count += 1
    
    cap.release()
    
    # Save to JSON file
    output_file = 'emotion_analysis_results.json'
    
    with open(output_file, 'w') as f:
        json.dump({
            'session_start': datetime.now().isoformat(),
            'duration_seconds': 8,
            'results': results_log,
            'statistics': model.get_statistics()
        }, f, indent=2)
    
    print(f"\n✓ Results saved to {output_file}")
    print("="*50 + "\n")


def main():
    """Run all examples"""
    print("\n" + "="*60)
    print(" FACIAL EXPRESSION MODEL - USAGE EXAMPLES")
    print("="*60)
    
    print("\nThis script demonstrates different ways to use the model.")
    print("Make sure your webcam is connected!\n")
    
    # Run examples
    try:
        example_basic_usage()
        input("Press Enter to continue to Example 2...")
        
        example_continuous_monitoring()
        input("Press Enter to continue to Example 3...")
        
        example_emotion_tracker()
        input("Press Enter to continue to Example 4...")
        
        example_save_results()
        
        print("\n✓ All examples completed successfully!")
        print("\nYou can now use these patterns in your own applications.")
        
    except KeyboardInterrupt:
        print("\n\nExamples interrupted by user.")
    
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
