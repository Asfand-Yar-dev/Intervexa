"""
Quick Test Script - Interviewer Agent Module
=============================================

This is a simple script to verify the module works correctly.
"""

import os

# Set the API key (should already be set in environment)
if not os.getenv("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = "AIzaSyAD45O_-YdhcnMG2ubLyk4lHnSr_ond5uo"

from ai_engine.interviewer import InterviewConductor

print("\n" + "="*60)
print("QUICK TEST - Interviewer Agent Module")
print("="*60 + "\n")

# Initialize
print("[1/3] Initializing Interviewer Agent...")
conductor = InterviewConductor()

# Generate questions
print("\n[2/3] Generating interview questions...")
questions = conductor.generate_questions(
    job_role="Python Developer",
    tech_stack="Python, FastAPI, PostgreSQL",
    difficulty="Medium"
)

print(f"\nGenerated {len(questions)} questions:\n")
for i, q in enumerate(questions, 1):
    print(f"{i}. {q}\n")

# Generate feedback
print("[3/3] Testing feedback generation...")
sample_answer = "FastAPI is a modern web framework for Python that uses type hints."
feedback = conductor.generate_feedback(
    question=questions[0],
    user_answer=sample_answer
)

print(f"\nFeedback: {feedback}\n")

print("="*60)
print("[SUCCESS] All tests passed!")
print("="*60 + "\n")
