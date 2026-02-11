"""
Smart Mock Interview System - GUI Application
==============================================

A professional interview application with technical and soft skills questions.

Author: Smart Mock Interview System
Version: 1.0
"""

import os
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import threading

# Set API key
os.environ["GEMINI_API_KEY"] = "AIzaSyAD45O_-YdhcnMG2ubLyk4lHnSr_ond5uo"

from ai_engine.interviewer import InterviewConductor


class InterviewGUI:
    """Main GUI application for conducting mock interviews."""
    
    def __init__(self, root):
        self.root = root
        self.root.title("Smart Mock Interview System")
        self.root.geometry("900x700")
        self.root.configure(bg="#f0f0f0")
        
        # Initialize interviewer
        self.conductor = None
        self.all_questions = []
        self.current_question_index = 0
        self.user_answers = []
        
        # Create UI
        self.create_widgets()
        
    def create_widgets(self):
        """Create all GUI widgets."""
        
        # ===== HEADER =====
        header_frame = tk.Frame(self.root, bg="#2c3e50", height=80)
        header_frame.pack(fill=tk.X, side=tk.TOP)
        header_frame.pack_propagate(False)
        
        title_label = tk.Label(
            header_frame,
            text="Smart Mock Interview System",
            font=("Arial", 24, "bold"),
            bg="#2c3e50",
            fg="white"
        )
        title_label.pack(pady=20)
        
        # ===== MAIN CONTAINER =====
        self.main_container = tk.Frame(self.root, bg="#f0f0f0")
        self.main_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Show profile input screen first
        self.show_profile_screen()
    
    def show_profile_screen(self):
        """Display the candidate profile input screen."""
        self.clear_main_container()
        
        # Profile Frame
        profile_frame = tk.Frame(self.main_container, bg="white", relief=tk.RAISED, borderwidth=2)
        profile_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Title
        title = tk.Label(
            profile_frame,
            text="Candidate Profile",
            font=("Arial", 18, "bold"),
            bg="white",
            fg="#2c3e50"
        )
        title.pack(pady=(20, 10))
        
        subtitle = tk.Label(
            profile_frame,
            text="Please fill in your information to start the interview",
            font=("Arial", 11),
            bg="white",
            fg="#7f8c8d"
        )
        subtitle.pack(pady=(0, 20))
        
        # Form Frame
        form_frame = tk.Frame(profile_frame, bg="white")
        form_frame.pack(pady=20, padx=40, fill=tk.BOTH, expand=True)
        
        # Job Role
        tk.Label(
            form_frame,
            text="Target Job Role:",
            font=("Arial", 12, "bold"),
            bg="white",
            anchor="w"
        ).grid(row=0, column=0, sticky="w", pady=(10, 5))
        
        self.job_role_entry = ttk.Entry(form_frame, font=("Arial", 11), width=40)
        self.job_role_entry.grid(row=1, column=0, sticky="ew", pady=(0, 15))
        self.job_role_entry.insert(0, "e.g., Full Stack Developer, Data Scientist, Product Manager")
        self.job_role_entry.bind("<FocusIn>", lambda e: self.clear_placeholder(self.job_role_entry, "e.g., Full Stack Developer, Data Scientist, Product Manager"))
        
        # Tech Stack
        tk.Label(
            form_frame,
            text="Technical Skills / Tech Stack:",
            font=("Arial", 12, "bold"),
            bg="white",
            anchor="w"
        ).grid(row=2, column=0, sticky="w", pady=(10, 5))
        
        self.tech_stack_entry = ttk.Entry(form_frame, font=("Arial", 11), width=40)
        self.tech_stack_entry.grid(row=3, column=0, sticky="ew", pady=(0, 15))
        self.tech_stack_entry.insert(0, "e.g., Python, Django, React, PostgreSQL")
        self.tech_stack_entry.bind("<FocusIn>", lambda e: self.clear_placeholder(self.tech_stack_entry, "e.g., Python, Django, React, PostgreSQL"))
        
        # Difficulty Level
        tk.Label(
            form_frame,
            text="Interview Difficulty:",
            font=("Arial", 12, "bold"),
            bg="white",
            anchor="w"
        ).grid(row=4, column=0, sticky="w", pady=(10, 5))
        
        self.difficulty_var = tk.StringVar(value="Medium")
        difficulty_frame = tk.Frame(form_frame, bg="white")
        difficulty_frame.grid(row=5, column=0, sticky="w", pady=(0, 15))
        
        for difficulty in ["Easy", "Medium", "Hard"]:
            tk.Radiobutton(
                difficulty_frame,
                text=difficulty,
                variable=self.difficulty_var,
                value=difficulty,
                font=("Arial", 11),
                bg="white",
                activebackground="white"
            ).pack(side=tk.LEFT, padx=10)
        
        # Number of Technical Questions
        tk.Label(
            form_frame,
            text="Number of Technical Questions:",
            font=("Arial", 12, "bold"),
            bg="white",
            anchor="w"
        ).grid(row=6, column=0, sticky="w", pady=(10, 5))
        
        self.tech_questions_var = tk.IntVar(value=5)
        tech_spinner = ttk.Spinbox(
            form_frame,
            from_=1,
            to=10,
            textvariable=self.tech_questions_var,
            font=("Arial", 11),
            width=10
        )
        tech_spinner.grid(row=7, column=0, sticky="w", pady=(0, 15))
        
        # Number of Soft Skills Questions
        tk.Label(
            form_frame,
            text="Number of Soft Skills Questions:",
            font=("Arial", 12, "bold"),
            bg="white",
            anchor="w"
        ).grid(row=8, column=0, sticky="w", pady=(10, 5))
        
        self.soft_questions_var = tk.IntVar(value=3)
        soft_spinner = ttk.Spinbox(
            form_frame,
            from_=1,
            to=10,
            textvariable=self.soft_questions_var,
            font=("Arial", 11),
            width=10
        )
        soft_spinner.grid(row=9, column=0, sticky="w", pady=(0, 20))
        
        # Configure grid column
        form_frame.columnconfigure(0, weight=1)
        
        # Start Button
        start_btn = tk.Button(
            profile_frame,
            text="Generate Interview Questions",
            font=("Arial", 13, "bold"),
            bg="#27ae60",
            fg="white",
            activebackground="#229954",
            activeforeground="white",
            cursor="hand2",
            relief=tk.FLAT,
            padx=30,
            pady=12,
            command=self.generate_questions
        )
        start_btn.pack(pady=(10, 30))
    
    def clear_placeholder(self, entry, placeholder):
        """Clear placeholder text on focus."""
        if entry.get() == placeholder:
            entry.delete(0, tk.END)
            entry.config(foreground="black")
    
    def clear_main_container(self):
        """Clear all widgets from main container."""
        for widget in self.main_container.winfo_children():
            widget.destroy()
    
    def generate_questions(self):
        """Generate interview questions based on user input."""
        # Validate inputs
        job_role = self.job_role_entry.get().strip()
        tech_stack = self.tech_stack_entry.get().strip()
        
        # Check for placeholders
        if not job_role or job_role.startswith("e.g.,"):
            messagebox.showerror("Error", "Please enter your target job role")
            return
        
        if not tech_stack or tech_stack.startswith("e.g.,"):
            messagebox.showerror("Error", "Please enter your technical skills")
            return
        
        # Show loading screen
        self.show_loading_screen()
        
        # Generate questions in background thread
        def generate():
            try:
                # Initialize conductor
                self.conductor = InterviewConductor()
                
                # Generate technical questions
                tech_questions = self.conductor.generate_questions(
                    job_role=job_role,
                    tech_stack=tech_stack,
                    difficulty=self.difficulty_var.get()
                )[:self.tech_questions_var.get()]
                
                # Generate soft skills questions
                soft_questions = self.conductor.generate_soft_skills_questions(
                    job_role=job_role,
                    num_questions=self.soft_questions_var.get()
                )
                
                # Combine and label questions
                self.all_questions = []
                for q in tech_questions:
                    self.all_questions.append(("Technical", q))
                for q in soft_questions:
                    self.all_questions.append(("Soft Skills", q))
                
                # Reset answers
                self.user_answers = [""] * len(self.all_questions)
                self.current_question_index = 0
                
                # Show interview screen
                self.root.after(0, self.show_interview_screen)
                
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Error", f"Failed to generate questions: {str(e)}"))
                self.root.after(0, self.show_profile_screen)
        
        thread = threading.Thread(target=generate, daemon=True)
        thread.start()
    
    def show_loading_screen(self):
        """Display a loading screen while generating questions."""
        self.clear_main_container()
        
        loading_frame = tk.Frame(self.main_container, bg="white")
        loading_frame.pack(fill=tk.BOTH, expand=True)
        
        tk.Label(
            loading_frame,
            text="Generating Your Interview Questions...",
            font=("Arial", 16, "bold"),
            bg="white",
            fg="#2c3e50"
        ).pack(pady=(100, 20))
        
        tk.Label(
            loading_frame,
            text="Please wait while AI creates personalized questions for you",
            font=("Arial", 11),
            bg="white",
            fg="#7f8c8d"
        ).pack(pady=(0, 30))
        
        # Progress bar
        progress = ttk.Progressbar(
            loading_frame,
            mode='indeterminate',
            length=300
        )
        progress.pack(pady=20)
        progress.start(10)
    
    def show_interview_screen(self):
        """Display the interview question screen."""
        self.clear_main_container()
        
        # Interview Frame
        interview_frame = tk.Frame(self.main_container, bg="white", relief=tk.RAISED, borderwidth=2)
        interview_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Header with progress
        header_frame = tk.Frame(interview_frame, bg="#ecf0f1", height=60)
        header_frame.pack(fill=tk.X, pady=(0, 10))
        header_frame.pack_propagate(False)
        
        question_type, question_text = self.all_questions[self.current_question_index]
        
        tk.Label(
            header_frame,
            text=f"Question {self.current_question_index + 1} of {len(self.all_questions)} - {question_type}",
            font=("Arial", 13, "bold"),
            bg="#ecf0f1",
            fg="#2c3e50"
        ).pack(pady=15)
        
        # Question Display
        question_frame = tk.Frame(interview_frame, bg="white")
        question_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=(10, 5))
        
        tk.Label(
            question_frame,
            text="Interview Question:",
            font=("Arial", 11, "bold"),
            bg="white",
            fg="#7f8c8d",
            anchor="w"
        ).pack(fill=tk.X, pady=(0, 5))
        
        question_label = tk.Label(
            question_frame,
            text=question_text,
            font=("Arial", 13),
            bg="white",
            fg="#2c3e50",
            wraplength=800,
            justify=tk.LEFT,
            anchor="w"
        )
        question_label.pack(fill=tk.X, pady=(0, 20))
        
        # Answer Input
        tk.Label(
            question_frame,
            text="Your Answer:",
            font=("Arial", 11, "bold"),
            bg="white",
            fg="#7f8c8d",
            anchor="w"
        ).pack(fill=tk.X, pady=(10, 5))
        
        self.answer_text = scrolledtext.ScrolledText(
            question_frame,
            font=("Arial", 11),
            wrap=tk.WORD,
            height=10,
            relief=tk.SOLID,
            borderwidth=1
        )
        self.answer_text.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
        
        # Load existing answer if any
        if self.user_answers[self.current_question_index]:
            self.answer_text.insert(1.0, self.user_answers[self.current_question_index])
        
        # Buttons Frame
        buttons_frame = tk.Frame(interview_frame, bg="white")
        buttons_frame.pack(fill=tk.X, padx=30, pady=(10, 20))
        
        # Previous Button
        if self.current_question_index > 0:
            prev_btn = tk.Button(
                buttons_frame,
                text="← Previous",
                font=("Arial", 11, "bold"),
                bg="#95a5a6",
                fg="white",
                activebackground="#7f8c8d",
                cursor="hand2",
                relief=tk.FLAT,
                padx=20,
                pady=10,
                command=self.previous_question
            )
            prev_btn.pack(side=tk.LEFT, padx=5)
        
        # Save Button
        save_btn = tk.Button(
            buttons_frame,
            text="💾 Save Answer",
            font=("Arial", 11, "bold"),
            bg="#3498db",
            fg="white",
            activebackground="#2980b9",
            cursor="hand2",
            relief=tk.FLAT,
            padx=20,
            pady=10,
            command=self.save_answer
        )
        save_btn.pack(side=tk.LEFT, padx=5)
        
        # Next/Finish Button
        if self.current_question_index < len(self.all_questions) - 1:
            next_btn = tk.Button(
                buttons_frame,
                text="Next →",
                font=("Arial", 11, "bold"),
                bg="#27ae60",
                fg="white",
                activebackground="#229954",
                cursor="hand2",
                relief=tk.FLAT,
                padx=20,
                pady=10,
                command=self.next_question
            )
            next_btn.pack(side=tk.RIGHT, padx=5)
        else:
            finish_btn = tk.Button(
                buttons_frame,
                text="🏁 Finish Interview",
                font=("Arial", 11, "bold"),
                bg="#e74c3c",
                fg="white",
                activebackground="#c0392b",
                cursor="hand2",
                relief=tk.FLAT,
                padx=20,
                pady=10,
                command=self.finish_interview
            )
            finish_btn.pack(side=tk.RIGHT, padx=5)
    
    def save_answer(self):
        """Save the current answer."""
        answer = self.answer_text.get(1.0, tk.END).strip()
        self.user_answers[self.current_question_index] = answer
        messagebox.showinfo("Saved", "Your answer has been saved!")
    
    def previous_question(self):
        """Go to the previous question."""
        # Save current answer
        self.user_answers[self.current_question_index] = self.answer_text.get(1.0, tk.END).strip()
        
        # Go to previous
        self.current_question_index -= 1
        self.show_interview_screen()
    
    def next_question(self):
        """Go to the next question."""
        # Save current answer
        self.user_answers[self.current_question_index] = self.answer_text.get(1.0, tk.END).strip()
        
        # Go to next
        self.current_question_index += 1
        self.show_interview_screen()
    
    def finish_interview(self):
        """Finish the interview and show results."""
        # Save final answer
        self.user_answers[self.current_question_index] = self.answer_text.get(1.0, tk.END).strip()
        
        # Show results screen
        self.show_results_screen()
    
    def show_results_screen(self):
        """Display interview results and feedback."""
        self.clear_main_container()
        
        # Results Frame
        results_frame = tk.Frame(self.main_container, bg="white", relief=tk.RAISED, borderwidth=2)
        results_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Header
        tk.Label(
            results_frame,
            text="Interview Complete!",
            font=("Arial", 20, "bold"),
            bg="white",
            fg="#27ae60"
        ).pack(pady=(20, 10))
        
        tk.Label(
            results_frame,
            text="Thank you for completing the mock interview",
            font=("Arial", 12),
            bg="white",
            fg="#7f8c8d"
        ).pack(pady=(0, 20))
        
        # Summary
        summary_frame = tk.Frame(results_frame, bg="#ecf0f1")
        summary_frame.pack(fill=tk.X, padx=30, pady=10)
        
        answered = sum(1 for a in self.user_answers if a.strip())
        
        tk.Label(
            summary_frame,
            text=f"Questions Answered: {answered}/{len(self.all_questions)}",
            font=("Arial", 13, "bold"),
            bg="#ecf0f1",
            fg="#2c3e50"
        ).pack(pady=15)
        
        # Review answers
        tk.Label(
            results_frame,
            text="Your Interview Summary:",
            font=("Arial", 14, "bold"),
            bg="white",
            fg="#2c3e50",
            anchor="w"
        ).pack(fill=tk.X, padx=30, pady=(20, 10))
        
        # Scrollable review
        review_text = scrolledtext.ScrolledText(
            results_frame,
            font=("Arial", 10),
            wrap=tk.WORD,
            height=15,
            relief=tk.SOLID,
            borderwidth=1
        )
        review_text.pack(fill=tk.BOTH, expand=True, padx=30, pady=(0, 20))
        
        for i, ((q_type, question), answer) in enumerate(zip(self.all_questions, self.user_answers), 1):
            review_text.insert(tk.END, f"Q{i} ({q_type}): {question}\n", "question")
            review_text.insert(tk.END, f"Your Answer: {answer if answer.strip() else '(No answer provided)'}\n\n", "answer")
        
        review_text.config(state=tk.DISABLED)
        
        # Buttons
        buttons_frame = tk.Frame(results_frame, bg="white")
        buttons_frame.pack(fill=tk.X, padx=30, pady=(10, 20))
        
        restart_btn = tk.Button(
            buttons_frame,
            text="🔄 Start New Interview",
            font=("Arial", 12, "bold"),
            bg="#3498db",
            fg="white",
            activebackground="#2980b9",
            cursor="hand2",
            relief=tk.FLAT,
            padx=25,
            pady=12,
            command=self.show_profile_screen
        )
        restart_btn.pack(side=tk.LEFT, padx=5)
        
        exit_btn = tk.Button(
            buttons_frame,
            text="❌ Exit",
            font=("Arial", 12, "bold"),
            bg="#e74c3c",
            fg="white",
            activebackground="#c0392b",
            cursor="hand2",
            relief=tk.FLAT,
            padx=25,
            pady=12,
            command=self.root.quit
        )
        exit_btn.pack(side=tk.RIGHT, padx=5)


def main():
    """Main entry point for the application."""
    root = tk.Tk()
    app = InterviewGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
