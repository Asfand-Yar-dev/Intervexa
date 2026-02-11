"""
Demo script showing programmatic usage of the NLPAnalyzer class
without the GUI interface.

Run this script to see example evaluations with different types of answers.
"""

from ai_engine.nlp_analysis import NLPAnalyzer


def print_separator():
    """Print a visual separator."""
    print("\n" + "="*80 + "\n")


def evaluate_and_display(analyzer, reference, user_answer, scenario_name):
    """
    Evaluate an answer and display the results.
    
    Args:
        analyzer: NLPAnalyzer instance
        reference: Reference answer
        user_answer: User's answer
        scenario_name: Name of the scenario for display
    """
    print(f"📝 SCENARIO: {scenario_name}")
    print("-" * 80)
    print(f"Reference Answer:\n{reference}\n")
    print(f"User Answer:\n{user_answer}\n")
    
    # Perform evaluation
    score, feedback = analyzer.evaluate_answer(user_answer, reference)
    
    print(f"🎯 SCORE: {score}%")
    print(f"💬 FEEDBACK: {feedback}")
    print_separator()


def main():
    """Main function to run demo scenarios."""
    print_separator()
    print("🚀 NLP ANSWER EVALUATION MODULE - DEMO")
    print("Smart Mock Interview System")
    print_separator()
    
    # Initialize the analyzer
    print("⏳ Loading Sentence-BERT model (all-MiniLM-L6-v2)...")
    analyzer = NLPAnalyzer()
    print("✅ Model loaded successfully!")
    print_separator()
    
    # ========================================
    # SCENARIO 1: Excellent Match
    # ========================================
    reference_1 = """Object-Oriented Programming (OOP) is a programming paradigm based on the 
concept of objects, which can contain data in the form of fields (attributes or properties), 
and code in the form of procedures (methods). OOP focuses on organizing software design 
around data and objects, rather than functions and logic."""
    
    user_answer_1 = """OOP is a paradigm that uses objects containing data (attributes) and 
code (methods) to structure programs. It emphasizes organizing code around objects instead 
of functions, making programs more modular and easier to maintain."""
    
    evaluate_and_display(
        analyzer, 
        reference_1, 
        user_answer_1, 
        "Excellent Answer - High Similarity"
    )
    
    # ========================================
    # SCENARIO 2: Good but Brief Answer
    # ========================================
    reference_2 = """Machine Learning is a subset of artificial intelligence that enables 
computers to learn from data without being explicitly programmed. It uses algorithms that 
can identify patterns in data and make predictions or decisions based on those patterns."""
    
    user_answer_2 = """Machine Learning allows computers to learn from data using algorithms 
that find patterns and make predictions."""
    
    evaluate_and_display(
        analyzer, 
        reference_2, 
        user_answer_2, 
        "Good but Brief Answer"
    )
    
    # ========================================
    # SCENARIO 3: Partially Relevant Answer
    # ========================================
    reference_3 = """The TCP/IP model is a conceptual framework for network protocols that 
consists of four layers: Application, Transport, Internet, and Network Access. Each layer 
has specific responsibilities in data transmission across networks."""
    
    user_answer_3 = """TCP/IP is a networking protocol that helps computers communicate 
over the internet by organizing data transmission."""
    
    evaluate_and_display(
        analyzer, 
        reference_3, 
        user_answer_3, 
        "Partially Relevant Answer"
    )
    
    # ========================================
    # SCENARIO 4: Off-Topic Answer
    # ========================================
    reference_4 = """A Binary Search Tree is a data structure where each node has at most 
two children, and for each node, all values in the left subtree are smaller and all values 
in the right subtree are larger."""
    
    user_answer_4 = """Python is a high-level programming language that is widely used for 
web development and data science applications."""
    
    evaluate_and_display(
        analyzer, 
        reference_4, 
        user_answer_4, 
        "Off-Topic Answer"
    )
    
    # ========================================
    # SCENARIO 5: Technical Interview Question
    # ========================================
    reference_5 = """RESTful APIs use HTTP methods (GET, POST, PUT, DELETE) to perform CRUD 
operations on resources. They are stateless, meaning each request contains all necessary 
information, and use standard HTTP status codes for responses."""
    
    user_answer_5 = """REST APIs use GET to retrieve data, POST to create, PUT to update, 
and DELETE to remove resources. They don't store session information between requests and 
use HTTP status codes like 200 for success."""
    
    evaluate_and_display(
        analyzer, 
        reference_5, 
        user_answer_5, 
        "Technical Interview - Strong Answer"
    )
    
    # ========================================
    # SCENARIO 6: Empty Answer
    # ========================================
    reference_6 = "What is polymorphism in OOP?"
    user_answer_6 = ""
    
    evaluate_and_display(
        analyzer, 
        reference_6, 
        user_answer_6, 
        "Empty Answer (Edge Case)"
    )
    
    print("✨ Demo completed!")
    print("\n📊 Summary:")
    print("• Excellent answers: Score ≥ 90%")
    print("• Good answers: Score 70-89%")
    print("• Satisfactory: Score 60-69%")
    print("• Needs improvement: Score < 60%")
    print_separator()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Demo interrupted by user.")
    except Exception as e:
        print(f"\n\n❌ Error occurred: {e}")
        print("\nMake sure you have installed all dependencies:")
        print("pip install sentence-transformers torch scikit-learn numpy")
