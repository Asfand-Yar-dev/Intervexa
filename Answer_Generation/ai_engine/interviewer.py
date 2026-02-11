"""
Interviewer Agent Module for Smart Mock Interview System
==========================================================

This module uses Google's Gemini API to generate technical interview questions
and provide feedback on candidate answers.

Dependencies:
    pip install google-generativeai

How to Get a Gemini API Key:
    1. Visit: https://makersuite.google.com/app/apikey
    2. Sign in with your Google account
    3. Click "Create API Key"
    4. Copy the generated key
    5. Set it as an environment variable:
       - Windows (CMD): set GEMINI_API_KEY=your_api_key_here
       - Windows (PowerShell): $env:GEMINI_API_KEY="your_api_key_here"
       - Linux/Mac: export GEMINI_API_KEY=your_api_key_here
    6. Or add it to a .env file and load it with python-dotenv

Author: Smart Mock Interview System Team
Version: 1.0
"""

import os
import re
import google.generativeai as genai
from typing import List, Optional


class InterviewConductor:
    """
    A class to conduct technical interviews using Google's Gemini AI.
    
    This class generates relevant technical questions based on the candidate's
    profile and provides constructive feedback on their answers.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the InterviewConductor with Gemini API configuration.
        
        Args:
            api_key (str, optional): Google Gemini API key. If not provided,
                                    it will be read from GEMINI_API_KEY environment variable.
        
        Raises:
            ValueError: If API key is not provided and not found in environment variables.
        """
        # Get API key from parameter or environment variable
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        if not self.api_key:
            raise ValueError(
                "Gemini API key not found. Please provide it as a parameter "
                "or set the GEMINI_API_KEY environment variable.\n"
                "Visit https://makersuite.google.com/app/apikey to get your key."
            )
        
        # Configure the Gemini API
        genai.configure(api_key=self.api_key)
        
        # Initialize the model (using gemini-2.5-flash which is the latest stable model)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        
        print("[OK] InterviewConductor initialized successfully with Gemini API")
    
    def generate_questions(
        self, 
        job_role: str, 
        tech_stack: str, 
        difficulty: str = "Medium"
    ) -> List[str]:
        """
        Generate technical interview questions based on the candidate's profile.
        
        Args:
            job_role (str): Target job role (e.g., "Full Stack Developer", "Data Scientist")
            tech_stack (str): Technologies the candidate knows (e.g., "React, Node.js, MongoDB")
            difficulty (str): Question difficulty level - "Easy", "Medium", or "Hard"
        
        Returns:
            List[str]: A list of 5 technical interview questions as clean strings
        
        Example:
            >>> conductor = InterviewConductor()
            >>> questions = conductor.generate_questions(
            ...     job_role="Backend Developer",
            ...     tech_stack="Python, Django, PostgreSQL",
            ...     difficulty="Medium"
            ... )
            >>> print(questions[0])
            "Explain how Django's ORM handles database transactions and when you would use atomic blocks."
        """
        # Construct a strict system prompt
        system_prompt = f"""You are a Professional Technical Recruiter conducting a technical interview.

Your task is to generate EXACTLY 5 distinct, high-quality technical interview questions for the following profile:

- Job Role: {job_role}
- Tech Stack: {tech_stack}
- Difficulty Level: {difficulty}

STRICT REQUIREMENTS:
1. Generate exactly 5 questions
2. Questions should be:
   - Conceptual (testing understanding, not just syntax)
   - Scenario-based where appropriate
   - Relevant to the specific tech stack mentioned
   - Progressive in difficulty
   - Distinct from each other (no overlapping topics)

3. Question types to include:
   - Core concepts and fundamentals
   - Real-world problem-solving scenarios
   - Best practices and design patterns
   - Performance and optimization
   - Architecture and system design (for senior roles)

4. OUTPUT FORMAT:
   - Return ONLY the questions, one per line
   - NO numbering (no "1.", "2.", etc.)
   - NO markdown formatting (no *, **, -, etc.)
   - NO additional commentary or explanations
   - Each question should be a complete, grammatically correct sentence

Example output format:
Explain the difference between var, let, and const in JavaScript and when to use each.
How would you optimize a React application that is experiencing performance issues?
Describe a situation where you would use Redux over React Context API.
What are the security considerations when implementing JWT authentication?
How would you design a scalable microservices architecture for an e-commerce platform?

Now generate the questions:"""

        try:
            # Generate content using Gemini
            response = self.model.generate_content(system_prompt)
            
            # Extract the text from response
            generated_text = response.text.strip()
            
            # Split by newlines and clean up
            raw_questions = generated_text.split('\n')
            
            # Clean and filter questions
            cleaned_questions = []
            for question in raw_questions:
                # Remove leading/trailing whitespace
                question = question.strip()
                
                # Skip empty lines
                if not question:
                    continue
                
                # Remove numbering patterns (1., 1), a., -, *, etc.)
                question = re.sub(r'^[\d\w][\.\)]\s*', '', question)
                question = re.sub(r'^[-*•]\s*', '', question)
                
                # Remove markdown bold/italic
                question = re.sub(r'\*\*([^*]+)\*\*', r'\1', question)
                question = re.sub(r'\*([^*]+)\*', r'\1', question)
                
                # Final trim
                question = question.strip()
                
                # Only add non-empty questions
                if question:
                    cleaned_questions.append(question)
            
            # Ensure we have exactly 5 questions (take first 5 if more, pad if less)
            if len(cleaned_questions) > 5:
                cleaned_questions = cleaned_questions[:5]
            elif len(cleaned_questions) < 5:
                print(f"[WARNING] Only {len(cleaned_questions)} questions generated. Expected 5.")
            
            return cleaned_questions
        
        except Exception as e:
            print(f"[ERROR] Error generating questions: {str(e)}")
            # Return fallback questions in case of error
            return [
                f"Describe your experience with {tech_stack.split(',')[0].strip()}.",
                f"What are the main responsibilities of a {job_role}?",
                "Explain a challenging technical problem you solved recently.",
                "How do you stay updated with the latest technologies?",
                "Describe your approach to debugging complex issues."
            ]
    
    def generate_soft_skills_questions(self, job_role: str, num_questions: int = 3) -> List[str]:
        """
        Generate soft skills and behavioral interview questions.
        
        Args:
            job_role (str): Target job role (e.g., "Full Stack Developer")
            num_questions (int): Number of soft skills questions to generate (default: 3)
        
        Returns:
            List[str]: List of soft skills/behavioral interview questions
        
        Example:
            >>> conductor = InterviewConductor()
            >>> questions = conductor.generate_soft_skills_questions(
            ...     job_role="Project Manager",
            ...     num_questions=3
            ... )
        """
        soft_skills_prompt = f"""You are a Professional HR Interviewer conducting behavioral and soft skills assessment.

Your task is to generate EXACTLY {num_questions} soft skills and behavioral interview questions for a {job_role} position.

QUESTION CATEGORIES (choose diverse topics):
1. Leadership and Teamwork
   - Leading teams, collaboration, conflict resolution
   - Examples: "Describe a time when you led a team through a challenging project"

2. Communication Skills
   - Presentation, stakeholder management, cross-functional communication
   - Examples: "How do you explain technical concepts to non-technical stakeholders?"

3. Problem-Solving and Adaptability
   - Handling challenges, adapting to change, creative solutions
   - Examples: "Tell me about a time when you had to adapt to a major project change"

4. Time Management and Prioritization
   - Managing deadlines, prioritizing tasks, handling pressure
   - Examples: "How do you prioritize when you have multiple urgent tasks?"

5. Professional Development
   - Learning, growth mindset, handling feedback
   - Examples: "Describe a situation where you received critical feedback and how you responded"

6. Ethics and Integrity
   - Ethical decisions, honesty, professionalism
   - Examples: "Tell me about a time when you had to make a difficult ethical decision"

STRICT REQUIREMENTS:
1. Generate exactly {num_questions} questions
2. Questions should be:
   - Behavioral (using STAR method prompts when appropriate)
   - Relevant to {job_role} responsibilities
   - Open-ended and thought-provoking
   - Diverse across different soft skill categories
   - Professional and clear

3. OUTPUT FORMAT:
   - Return ONLY the questions, one per line
   - NO numbering (no "1.", "2.", etc.)
   - NO markdown formatting (no *, **, -, etc.)
   - NO additional commentary
   - Each question should be a complete sentence

Example output format:
Describe a time when you had to work with a difficult team member and how you handled the situation.
How do you handle pressure and tight deadlines in your work?
Tell me about a situation where you had to learn a new skill quickly to complete a project.

Now generate the soft skills questions:"""

        try:
            # Generate content using Gemini
            response = self.model.generate_content(soft_skills_prompt)
            
            # Extract the text from response
            generated_text = response.text.strip()
            
            # Split by newlines and clean up
            raw_questions = generated_text.split('\n')
            
            # Clean and filter questions
            cleaned_questions = []
            for question in raw_questions:
                # Remove leading/trailing whitespace
                question = question.strip()
                
                # Skip empty lines
                if not question:
                    continue
                
                # Remove numbering patterns
                question = re.sub(r'^[\d\w][\.\)]\s*', '', question)
                question = re.sub(r'^[-*•]\s*', '', question)
                
                # Remove markdown bold/italic
                question = re.sub(r'\*\*([^*]+)\*\*', r'\1', question)
                question = re.sub(r'\*([^*]+)\*', r'\1', question)
                
                # Final trim
                question = question.strip()
                
                # Only add non-empty questions
                if question:
                    cleaned_questions.append(question)
            
            # Ensure we have the requested number of questions
            if len(cleaned_questions) > num_questions:
                cleaned_questions = cleaned_questions[:num_questions]
            elif len(cleaned_questions) < num_questions:
                print(f"[WARNING] Only {len(cleaned_questions)} soft skills questions generated. Expected {num_questions}.")
            
            return cleaned_questions
        
        except Exception as e:
            print(f"[ERROR] Error generating soft skills questions: {str(e)}")
            # Return fallback soft skills questions
            return [
                f"Describe your experience working in a team environment as a {job_role}.",
                "How do you handle constructive criticism and feedback?",
                "Tell me about a time when you had to meet a tight deadline."
            ][:num_questions]
    
    def generate_feedback(self, question: str, user_answer: str) -> str:
        """
        Evaluate a candidate's answer and provide constructive feedback.
        
        Args:
            question (str): The interview question that was asked
            user_answer (str): The candidate's answer/transcript
        
        Returns:
            str: A constructive feedback paragraph analyzing the answer
        
        Example:
            >>> conductor = InterviewConductor()
            >>> feedback = conductor.generate_feedback(
            ...     question="Explain how closures work in JavaScript.",
            ...     user_answer="A closure is when a function remembers variables from its parent scope."
            ... )
            >>> print(feedback)
            "Your answer captures the basic concept of closures correctly. However, consider expanding 
            on practical use cases and mentioning lexical scoping..."
        """
        feedback_prompt = f"""You are a Senior Technical Interviewer providing constructive feedback on a candidate's answer.

QUESTION ASKED:
{question}

CANDIDATE'S ANSWER:
{user_answer}

Your task is to evaluate this answer and provide constructive feedback. Analyze the following aspects:

1. **Correctness**: Is the answer technically accurate?
2. **Depth**: Does it demonstrate deep understanding or just surface-level knowledge?
3. **Completeness**: What important concepts or details are missing?
4. **Clarity**: Is the explanation clear and well-structured?

REQUIREMENTS FOR YOUR FEEDBACK:
- Write a single, concise paragraph (3-5 sentences)
- Be constructive and encouraging, not harsh
- Start with what they did well
- Point out specific gaps or inaccuracies
- Suggest what could be improved or added
- Use professional, friendly tone

OUTPUT FORMAT:
- Plain text paragraph only
- NO bullet points or numbered lists
- NO markdown formatting
- NO section headers

Generate the feedback now:"""

        try:
            # Generate feedback using Gemini
            response = self.model.generate_content(feedback_prompt)
            
            # Extract and clean the feedback
            feedback = response.text.strip()
            
            # Remove any markdown formatting that might have slipped through
            feedback = re.sub(r'\*\*([^*]+)\*\*', r'\1', feedback)
            feedback = re.sub(r'\*([^*]+)\*', r'\1', feedback)
            feedback = re.sub(r'^[-*•]\s*', '', feedback, flags=re.MULTILINE)
            
            return feedback
        
        except Exception as e:
            print(f"[ERROR] Error generating feedback: {str(e)}")
            return (
                f"Thank you for your answer. While I encountered a technical issue "
                f"analyzing your response in detail, I encourage you to review the key "
                f"concepts related to: {question[:50]}... "
                f"Consider exploring this topic further to strengthen your understanding."
            )


# =============================================================================
# TESTING MODULE
# =============================================================================

if __name__ == "__main__":
    """
    Test the InterviewConductor module with sample data.
    """
    print("=" * 70)
    print("INTERVIEWER AGENT MODULE - TEST MODE")
    print("=" * 70)
    print()
    
    # Check if API key is available
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("[WARNING] GEMINI_API_KEY environment variable not found.")
        print("\nHow to set it up:")
        print("  1. Get your key from: https://makersuite.google.com/app/apikey")
        print("  2. Set environment variable:")
        print("     - Windows CMD: set GEMINI_API_KEY=your_key_here")
        print("     - PowerShell: $env:GEMINI_API_KEY=\"your_key_here\"")
        print("     - Linux/Mac: export GEMINI_API_KEY=your_key_here")
        print("\n" + "=" * 70)
        
        # For testing purposes, allow manual input
        user_input = input("\nEnter your Gemini API key to continue testing (or press Enter to skip): ").strip()
        if user_input:
            api_key = user_input
        else:
            print("\n[ERROR] Cannot proceed without API key. Exiting...")
            exit(1)
    
    print()
    
    # Initialize the conductor
    try:
        conductor = InterviewConductor(api_key=api_key)
        print()
        
        # Test 1: Generate questions for Python Developer
        print("-" * 70)
        print("TEST 1: Generating Questions for Python Developer")
        print("-" * 70)
        
        job_role = "Python Developer"
        tech_stack = "Python, Django, PostgreSQL, Docker"
        difficulty = "Medium"
        
        print(f"\n[Profile]")
        print(f"   Role: {job_role}")
        print(f"   Stack: {tech_stack}")
        print(f"   Difficulty: {difficulty}")
        print(f"\n[Generating questions...]\n")
        
        questions = conductor.generate_questions(
            job_role=job_role,
            tech_stack=tech_stack,
            difficulty=difficulty
        )
        
        print("[Generated Questions]\n")
        for i, question in enumerate(questions, 1):
            print(f"{i}. {question}")
        
        print()
        
        # Test 2: Generate feedback for a sample answer
        print("-" * 70)
        print("TEST 2: Generating Feedback for Sample Answer")
        print("-" * 70)
        
        sample_question = questions[0] if questions else "Explain Python decorators."
        sample_answer = (
            "Decorators in Python are functions that modify the behavior of other functions. "
            "You use the @ symbol before a function definition to apply a decorator. "
            "They are useful for logging and authentication."
        )
        
        print(f"\n[Question]:")
        print(f"   {sample_question}")
        print(f"\n[Sample Answer]:")
        print(f"   {sample_answer}")
        print(f"\n[Generating feedback...]\n")
        
        feedback = conductor.generate_feedback(
            question=sample_question,
            user_answer=sample_answer
        )
        
        print("[Feedback]\n")
        print(f"   {feedback}")
        print()
        
        # Test 3: Different role
        print("-" * 70)
        print("TEST 3: Generating Questions for Full Stack Developer")
        print("-" * 70)
        
        job_role_2 = "Full Stack Developer"
        tech_stack_2 = "React, Node.js, Express, MongoDB"
        difficulty_2 = "Hard"
        
        print(f"\n[Profile]:")
        print(f"   Role: {job_role_2}")
        print(f"   Stack: {tech_stack_2}")
        print(f"   Difficulty: {difficulty_2}")
        print(f"\n[Generating questions...]\n")
        
        questions_2 = conductor.generate_questions(
            job_role=job_role_2,
            tech_stack=tech_stack_2,
            difficulty=difficulty_2
        )
        
        print("[Generated Questions]\n")
        for i, question in enumerate(questions_2, 1):
            print(f"{i}. {question}")
        
        print()
        print("=" * 70)
        print("[SUCCESS] ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        
    except ValueError as e:
        print(f"\n[ERROR] Configuration Error: {e}")
        exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected Error: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
