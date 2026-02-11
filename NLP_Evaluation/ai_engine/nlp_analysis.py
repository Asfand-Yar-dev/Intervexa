"""
NLP Answer Evaluation Module for Smart Mock Interview System

Dependencies:
    pip install sentence-transformers torch

Author: Smart Mock Interview System Team
Date: 2026-02-08
"""

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore')


class NLPAnalyzer:
    """
    NLP Analyzer class for evaluating user answers against reference answers.
    Uses Sentence-BERT (all-MiniLM-L6-v2) for semantic similarity analysis.
    """
    
    def __init__(self):
        """
        Initialize the NLP Analyzer by loading the pre-trained Sentence-BERT model.
        The model is loaded once during initialization for efficiency.
        """
        print("Loading Sentence-BERT model (all-MiniLM-L6-v2)...")
        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            print("Model loaded successfully!")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def evaluate_answer(self, user_answer, reference_answer):
        """
        Evaluate the user's answer against a reference answer.
        
        Args:
            user_answer (str): The answer provided by the user
            reference_answer (str): The correct/reference answer
            
        Returns:
            tuple: (score, feedback)
                - score (float): Similarity score as percentage (0-100)
                - feedback (str): Qualitative feedback based on the score
        """
        # Input validation
        if not user_answer or not user_answer.strip():
            return 0.0, "No answer provided. Please enter your response."
        
        if not reference_answer or not reference_answer.strip():
            return 0.0, "No reference answer available for comparison."
        
        try:
            # Generate embeddings for both answers
            user_embedding = self.model.encode([user_answer])
            reference_embedding = self.model.encode([reference_answer])
            
            # Calculate cosine similarity
            similarity = cosine_similarity(user_embedding, reference_embedding)[0][0]
            
            # Convert to percentage (0-100)
            score = float(similarity * 100)
            
            # Generate qualitative feedback based on score thresholds
            feedback = self._generate_feedback(score)
            
            return round(score, 2), feedback
            
        except Exception as e:
            print(f"Error during evaluation: {e}")
            return 0.0, f"Error during analysis: {str(e)}"
    
    def _generate_feedback(self, score):
        """
        Generate qualitative feedback based on the similarity score.
        
        Args:
            score (float): Similarity score (0-100)
            
        Returns:
            str: Qualitative feedback message
        """
        if score >= 90:
            return "Excellent answer! Highly relevant and comprehensive."
        elif score >= 80:
            return "Very good answer! Strong relevance with minor room for improvement."
        elif score >= 70:
            return "Good answer! Relevant but could include more details."
        elif score >= 60:
            return "Satisfactory answer. Relevant but lacks depth and detail."
        elif score >= 50:
            return "Partially relevant. Misses key concepts or details."
        elif score >= 30:
            return "Weak answer. Limited relevance to the reference answer."
        else:
            return "Off-topic or irrelevant. Please review the question carefully."


# ===========================
# GUI Testing Interface
# ===========================

if __name__ == "__main__":
    import tkinter as tk
    from tkinter import scrolledtext, messagebox
    from tkinter import ttk
    
    class NLPTesterGUI:
        """
        Simple Tkinter GUI for testing the NLP Analyzer.
        Provides input fields for reference and user answers, and displays evaluation results.
        """
        
        def __init__(self, root):
            """
            Initialize the GUI components.
            
            Args:
                root: Tkinter root window
            """
            self.root = root
            self.root.title("NLP Model Tester")
            self.root.geometry("800x700")
            self.root.resizable(True, True)
            
            # Initialize the NLP Analyzer
            self.analyzer = None
            self.initialize_analyzer()
            
            # Setup GUI components
            self.setup_ui()
            
            # Pre-fill with example data
            self.load_example()
        
        def initialize_analyzer(self):
            """
            Initialize the NLP Analyzer in a separate process to show loading status.
            """
            try:
                self.analyzer = NLPAnalyzer()
            except Exception as e:
                messagebox.showerror("Initialization Error", 
                                   f"Failed to initialize NLP Analyzer:\n{str(e)}\n\n"
                                   f"Please ensure you have installed:\npip install sentence-transformers torch")
                self.root.destroy()
        
        def setup_ui(self):
            """
            Setup all UI components.
            """
            # Title Label
            title_label = tk.Label(
                self.root, 
                text="NLP Answer Evaluation System", 
                font=("Arial", 18, "bold"),
                bg="#4A90E2",
                fg="white",
                pady=15
            )
            title_label.pack(fill=tk.X)
            
            # Main container
            main_frame = tk.Frame(self.root, padx=20, pady=20)
            main_frame.pack(fill=tk.BOTH, expand=True)
            
            # Reference Answer Section
            ref_label = tk.Label(
                main_frame, 
                text="Reference Answer:", 
                font=("Arial", 12, "bold")
            )
            ref_label.pack(anchor=tk.W, pady=(0, 5))
            
            self.reference_text = scrolledtext.ScrolledText(
                main_frame,
                height=8,
                width=80,
                font=("Arial", 10),
                wrap=tk.WORD,
                relief=tk.SOLID,
                borderwidth=1
            )
            self.reference_text.pack(fill=tk.BOTH, expand=True, pady=(0, 15))
            
            # User Answer Section
            user_label = tk.Label(
                main_frame, 
                text="User Answer:", 
                font=("Arial", 12, "bold")
            )
            user_label.pack(anchor=tk.W, pady=(0, 5))
            
            self.user_text = scrolledtext.ScrolledText(
                main_frame,
                height=8,
                width=80,
                font=("Arial", 10),
                wrap=tk.WORD,
                relief=tk.SOLID,
                borderwidth=1
            )
            self.user_text.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
            
            # Button Frame
            button_frame = tk.Frame(main_frame)
            button_frame.pack(pady=(0, 20))
            
            # Analyze Button
            analyze_button = tk.Button(
                button_frame,
                text="🔍 Analyze Relevance",
                font=("Arial", 12, "bold"),
                bg="#4CAF50",
                fg="white",
                padx=30,
                pady=10,
                command=self.analyze_answers,
                cursor="hand2"
            )
            analyze_button.pack(side=tk.LEFT, padx=5)
            
            # Clear Button
            clear_button = tk.Button(
                button_frame,
                text="🗑️ Clear All",
                font=("Arial", 12, "bold"),
                bg="#FF5722",
                fg="white",
                padx=30,
                pady=10,
                command=self.clear_all,
                cursor="hand2"
            )
            clear_button.pack(side=tk.LEFT, padx=5)
            
            # Example Button
            example_button = tk.Button(
                button_frame,
                text="📝 Load Example",
                font=("Arial", 12, "bold"),
                bg="#2196F3",
                fg="white",
                padx=30,
                pady=10,
                command=self.load_example,
                cursor="hand2"
            )
            example_button.pack(side=tk.LEFT, padx=5)
            
            # Results Section
            results_label = tk.Label(
                main_frame, 
                text="Evaluation Results:", 
                font=("Arial", 12, "bold")
            )
            results_label.pack(anchor=tk.W, pady=(0, 5))
            
            # Results Frame with border
            results_frame = tk.Frame(
                main_frame, 
                relief=tk.SOLID, 
                borderwidth=2,
                bg="#f0f0f0"
            )
            results_frame.pack(fill=tk.BOTH, pady=(0, 10))
            
            # Score Label
            self.score_label = tk.Label(
                results_frame,
                text="Score: --",
                font=("Arial", 16, "bold"),
                bg="#f0f0f0",
                fg="#333333",
                pady=10
            )
            self.score_label.pack()
            
            # Feedback Label
            self.feedback_label = tk.Label(
                results_frame,
                text="Feedback: Click 'Analyze Relevance' to evaluate",
                font=("Arial", 11),
                bg="#f0f0f0",
                fg="#666666",
                wraplength=700,
                justify=tk.CENTER,
                pady=10
            )
            self.feedback_label.pack()
            
            # Status bar
            self.status_label = tk.Label(
                self.root,
                text="Ready | Model: all-MiniLM-L6-v2",
                font=("Arial", 9),
                bg="#333333",
                fg="white",
                anchor=tk.W,
                padx=10,
                pady=5
            )
            self.status_label.pack(side=tk.BOTTOM, fill=tk.X)
        
        def analyze_answers(self):
            """
            Perform the NLP analysis when the Analyze button is clicked.
            """
            # Get text from input fields
            reference = self.reference_text.get("1.0", tk.END).strip()
            user = self.user_text.get("1.0", tk.END).strip()
            
            # Validate inputs
            if not reference:
                messagebox.showwarning("Input Required", "Please enter a reference answer.")
                return
            
            if not user:
                messagebox.showwarning("Input Required", "Please enter a user answer.")
                return
            
            # Update status
            self.status_label.config(text="Analyzing...", bg="#FF9800")
            self.root.update()
            
            try:
                # Perform evaluation
                score, feedback = self.analyzer.evaluate_answer(user, reference)
                
                # Update results
                self.score_label.config(text=f"Score: {score}%")
                self.feedback_label.config(text=f"Feedback: {feedback}")
                
                # Color code the score
                if score >= 80:
                    color = "#4CAF50"  # Green
                elif score >= 60:
                    color = "#FF9800"  # Orange
                else:
                    color = "#F44336"  # Red
                
                self.score_label.config(fg=color)
                
                # Update status
                self.status_label.config(text="Analysis complete!", bg="#4CAF50")
                
            except Exception as e:
                messagebox.showerror("Analysis Error", f"An error occurred:\n{str(e)}")
                self.status_label.config(text="Error occurred", bg="#F44336")
        
        def clear_all(self):
            """
            Clear all input and output fields.
            """
            self.reference_text.delete("1.0", tk.END)
            self.user_text.delete("1.0", tk.END)
            self.score_label.config(text="Score: --", fg="#333333")
            self.feedback_label.config(text="Feedback: Click 'Analyze Relevance' to evaluate")
            self.status_label.config(text="Cleared | Ready for new input", bg="#333333")
        
        def load_example(self):
            """
            Load example data for testing.
            """
            example_reference = """Object-Oriented Programming (OOP) is a paradigm based on the concept of objects, which can contain data and code. The data is in the form of fields (attributes or properties), and the code is in the form of procedures (methods). OOP focuses on organizing software design around data and objects, rather than functions and logic."""
            
            example_user = """OOP is about using objects to organize code. It helps group related data and functions together."""
            
            self.reference_text.delete("1.0", tk.END)
            self.reference_text.insert("1.0", example_reference)
            
            self.user_text.delete("1.0", tk.END)
            self.user_text.insert("1.0", example_user)
            
            self.status_label.config(text="Example loaded | Ready to analyze", bg="#2196F3")
    
    # Create and run the GUI
    root = tk.Tk()
    app = NLPTesterGUI(root)
    root.mainloop()
