"""
Interviewer Agent Module for Smart Mock Interview System
==========================================================

This module uses Google's Gemini API to generate technical interview questions
and provide feedback on candidate answers.

Usage (Backend Integration):
    from ai_engine.interviewer import InterviewConductor

    conductor = InterviewConductor(api_key="your_key")
    questions = conductor.generate_questions(
        job_role="Python Developer",
        tech_stack="Python, Django",
        difficulty="Medium"
    )
    feedback = conductor.generate_feedback(question, user_answer)

Dependencies:
    pip install google-generativeai

Author: Smart Mock Interview System Team
Version: 1.0
"""

import logging
import os
import re
import time
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file (project root)
# This makes GEMINI_API_KEY available via os.getenv()
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)


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

        # Model fallback chain (gemini-1.5-flash has higher free tier limits than 2.5)
        models_env = os.getenv(
            "GEMINI_MODELS",
            "gemini-1.5-flash,gemini-2.5-flash"
        )
        configured_names = [m.strip() for m in models_env.split(",") if m.strip()]

        # Keep only models that are available for generateContent in this API/version.
        # We bypass dynamic genai.list_models() filtering because it incorrectly 
        # drops 'gemini-1.5-flash' from some SDK versions, forcing default to '2.5-flash'
        self.model_names = configured_names
        self.models = [genai.GenerativeModel(name) for name in self.model_names]
        self.max_retries = int(os.getenv("GEMINI_MAX_RETRIES", "2"))

        logger.info(
            "InterviewConductor initialized successfully with Gemini API "
            f"(models={self.model_names}, retries={self.max_retries})"
        )

    def _extract_retry_delay(self, error_text: str) -> float:
        """
        Extract retry delay from Gemini error message when available.
        Falls back to exponential backoff if missing.
        """
        # Matches strings like: "Please retry in 5.406911985s"
        match = re.search(r"Please retry in ([0-9]+(?:\.[0-9]+)?)s", error_text)
        if match:
            return float(match.group(1))
        # Matches blocks with retry_delay { seconds: 5 }
        match = re.search(r"retry_delay\s*\{[^}]*seconds:\s*([0-9]+)", error_text)
        if match:
            return float(match.group(1))
        return 0.0

    def _generate_with_retry(self, prompt: str) -> str:
        """
        Generate content using Gemini with retry + model fallback.
        Handles 429 quota/rate-limit errors robustly.
        """
        last_error = None

        for model_name, model in zip(self.model_names, self.models):
            for attempt in range(self.max_retries + 1):
                try:
                    response = model.generate_content(prompt)
                    return (response.text or "").strip()
                except Exception as e:
                    last_error = e
                    err_text = str(e)
                    is_quota = ("429" in err_text) or ("quota" in err_text.lower()) or ("rate limit" in err_text.lower())

                    if attempt < self.max_retries and is_quota:
                        retry_after = self._extract_retry_delay(err_text)
                        if retry_after <= 0:
                            retry_after = min(8.0, float(2 ** attempt))
                        # Small buffer avoids immediate re-hit on strict quota windows.
                        sleep_for = retry_after + 0.25
                        logger.warning(
                            f"Gemini quota/rate limit on {model_name}; "
                            f"retrying in {sleep_for:.2f}s (attempt {attempt + 1}/{self.max_retries})"
                        )
                        time.sleep(sleep_for)
                        continue

                    logger.warning(
                        f"Gemini generation failed on model={model_name}, "
                        f"attempt={attempt + 1}: {err_text}"
                    )
                    break

        raise RuntimeError(f"Gemini generation failed on all configured models: {last_error}")
    
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
            # Generate content using Gemini with retry + model fallback
            generated_text = self._generate_with_retry(system_prompt)
            
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
                logger.warning(f"Only {len(cleaned_questions)} questions generated. Expected 5.")
            
            return cleaned_questions
        
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            # STRICT REQUIREMENT: Do not fall back to custom/implemented questions.
            # If Gemini fails, propagate the error so the backend can fail hard.
            raise RuntimeError(f"Gemini question generation failed: {str(e)}")
    
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
            # Generate content using Gemini with retry + model fallback
            generated_text = self._generate_with_retry(soft_skills_prompt)
            
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
                logger.warning(f"Only {len(cleaned_questions)} soft skills questions generated. Expected {num_questions}.")
            
            return cleaned_questions
        
        except Exception as e:
            logger.error(f"Error generating soft skills questions: {str(e)}")
            # STRICT REQUIREMENT: Do not fall back to custom/implemented questions.
            # If Gemini fails, propagate the error so the backend can fail hard.
            raise RuntimeError(f"Gemini soft-skills question generation failed: {str(e)}")
    
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
            logger.error(f"Error generating feedback: {str(e)}")
            return (
                f"Thank you for your answer. While I encountered a technical issue "
                f"analyzing your response in detail, I encourage you to review the key "
                f"concepts related to: {question[:50]}... "
                f"Consider exploring this topic further to strengthen your understanding."
            )


