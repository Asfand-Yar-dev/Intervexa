"""
Example Usage of the Interviewer Agent Module
==============================================

This script demonstrates how to use the InterviewConductor class
in a real-world scenario.

Before running this script:
1. Set your GEMINI_API_KEY environment variable
2. Ensure google-generativeai is installed: pip install google-generativeai
"""

import os
from ai_engine.interviewer import InterviewConductor


def main():
    """
    Demonstrate the InterviewConductor module with different scenarios.
    """
    print("=" * 80)
    print(" SMART MOCK INTERVIEW SYSTEM - INTERVIEWER AGENT DEMO")
    print("=" * 80)
    print()
    
    # Check if API key is available
    if not os.getenv("GEMINI_API_KEY"):
        print("⚠️  ERROR: GEMINI_API_KEY environment variable not set!")
        print("\nPlease set it using:")
        print("  Windows CMD: set GEMINI_API_KEY=your_key_here")
        print("  PowerShell: $env:GEMINI_API_KEY=\"your_key_here\"")
        print("\nGet your key from: https://makersuite.google.com/app/apikey")
        return
    
    try:
        # Initialize the interviewer
        print("🔧 Initializing Interviewer Agent...")
        conductor = InterviewConductor()
        print()
        
        # ================================================================
        # SCENARIO 1: Junior Python Developer Interview
        # ================================================================
        print("-" * 80)
        print("📋 SCENARIO 1: Junior Python Developer Interview")
        print("-" * 80)
        
        job_role_1 = "Python Developer"
        tech_stack_1 = "Python, Flask, SQLite, HTML/CSS"
        difficulty_1 = "Easy"
        
        print(f"\nCandidate Profile:")
        print(f"  • Position: {job_role_1}")
        print(f"  • Technologies: {tech_stack_1}")
        print(f"  • Level: {difficulty_1}")
        print(f"\n🤖 Generating interview questions...\n")
        
        questions_1 = conductor.generate_questions(
            job_role=job_role_1,
            tech_stack=tech_stack_1,
            difficulty=difficulty_1
        )
        
        print("✅ Interview Questions Generated:\n")
        for i, question in enumerate(questions_1, 1):
            print(f"Q{i}: {question}\n")
        
        # ================================================================
        # SCENARIO 2: Senior Full Stack Developer Interview
        # ================================================================
        print("-" * 80)
        print("📋 SCENARIO 2: Senior Full Stack Developer Interview")
        print("-" * 80)
        
        job_role_2 = "Senior Full Stack Developer"
        tech_stack_2 = "React, TypeScript, Node.js, Express, PostgreSQL, AWS"
        difficulty_2 = "Hard"
        
        print(f"\nCandidate Profile:")
        print(f"  • Position: {job_role_2}")
        print(f"  • Technologies: {tech_stack_2}")
        print(f"  • Level: {difficulty_2}")
        print(f"\n🤖 Generating interview questions...\n")
        
        questions_2 = conductor.generate_questions(
            job_role=job_role_2,
            tech_stack=tech_stack_2,
            difficulty=difficulty_2
        )
        
        print("✅ Interview Questions Generated:\n")
        for i, question in enumerate(questions_2, 1):
            print(f"Q{i}: {question}\n")
        
        # ================================================================
        # SCENARIO 3: Evaluating a Candidate Answer
        # ================================================================
        print("-" * 80)
        print("📝 SCENARIO 3: Evaluating Candidate Answer")
        print("-" * 80)
        
        sample_question = questions_1[0]  # Take first question from junior interview
        
        # Simulate a candidate's answer (mix of correct and incomplete information)
        candidate_answer = """
        Flask is a micro web framework for Python. It's lightweight and doesn't 
        have as many built-in features as Django. You use decorators like @app.route 
        to define URL paths. Flask is good for small applications and APIs.
        """
        
        print(f"\n❓ Question Asked:")
        print(f"   {sample_question}")
        print(f"\n💬 Candidate's Answer:")
        print(f"   {candidate_answer.strip()}")
        print(f"\n🤖 Analyzing answer and generating feedback...\n")
        
        feedback = conductor.generate_feedback(
            question=sample_question,
            user_answer=candidate_answer
        )
        
        print("✅ Interviewer Feedback:\n")
        print(f"   {feedback}")
        print()
        
        # ================================================================
        # SCENARIO 4: Data Science Role
        # ================================================================
        print("-" * 80)
        print("📋 SCENARIO 4: Data Scientist Interview")
        print("-" * 80)
        
        job_role_3 = "Data Scientist"
        tech_stack_3 = "Python, Pandas, NumPy, Scikit-learn, TensorFlow, SQL"
        difficulty_3 = "Medium"
        
        print(f"\nCandidate Profile:")
        print(f"  • Position: {job_role_3}")
        print(f"  • Technologies: {tech_stack_3}")
        print(f"  • Level: {difficulty_3}")
        print(f"\n🤖 Generating interview questions...\n")
        
        questions_3 = conductor.generate_questions(
            job_role=job_role_3,
            tech_stack=tech_stack_3,
            difficulty=difficulty_3
        )
        
        print("✅ Interview Questions Generated:\n")
        for i, question in enumerate(questions_3, 1):
            print(f"Q{i}: {question}\n")
        
        print("=" * 80)
        print("✅ DEMO COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\nThe InterviewConductor module is ready to use in your application!")
        print()
        
    except Exception as e:
        print(f"\n❌ Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
