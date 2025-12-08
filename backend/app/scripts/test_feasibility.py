#!/usr/bin/env python3
"""
Test script for the feasibility assessment pipeline.
Run from backend directory: python -m app.scripts.test_feasibility
"""

from app.pipelines.builds.feasibility_pipeline import run_feasibility_assessment

def test_feasibility():
    """Test the feasibility assessment pipeline."""
    
    refined_summary = """
    Project: AI-Powered Customer Support Chatbot
    
    This project aims to develop an intelligent chatbot that can handle customer support queries
    using natural language processing and machine learning. The system will integrate with existing
    help desk software and provide real-time responses to common customer questions.
    
    Key Features:
    - Multi-language support (English, Spanish, French)
    - Integration with Zendesk and Salesforce
    - Real-time sentiment analysis
    - Escalation to human agents when needed
    - 24/7 availability
    
    Expected Outcomes:
    - Reduce support ticket resolution time by 40%
    - Improve customer satisfaction scores by 25%
    - Lower operational costs by automating routine queries
    """
    
    # Run assessment
    result = run_feasibility_assessment(
        refined_summary=refined_summary,
        problem_statement="Automate customer support to reduce costs and improve response times",
        domain="Customer Support / AI",
        goals=[
            "Reduce ticket resolution time by 40%",
            "Improve customer satisfaction by 25%",
            "Achieve 80% first-contact resolution rate",
        ],
        prerequisites=[
            "Historical customer support data (6+ months)",
            "API access to Zendesk/Salesforce",
            "NLP training data in multiple languages",
            "Cloud infrastructure budget",
        ],
        key_topics=[
            "Natural Language Processing",
            "Machine Learning",
            "Intent Classification",
            "Sentiment Analysis",
            "Chatbot Framework (Rasa/Dialogflow)",
        ],
    )
    
    # Print results
    print("\n" + "="*70)
    print("FEASIBILITY ASSESSMENT RESULTS")
    print("="*70)
    print(f"\nFinal Score: {result.final_score}/100")
    print(f"\nOverall Assessment: {result.overall_explanation}")
    
    print("\n--- Technical Feasibility ---")
    if result.technical_feasibility:
        print(f"Score: {result.technical_feasibility.score}/100")
        print(f"Explanation: {result.technical_feasibility.explanation}")
        print(f"Recommendation: {result.technical_feasibility.recommendation}")
    
    print("\n--- Resource Feasibility ---")
    if result.resource_feasibility:
        print(f"Score: {result.resource_feasibility.score}/100")
        print(f"Explanation: {result.resource_feasibility.explanation}")
        print(f"Recommendation: {result.resource_feasibility.recommendation}")
    
    print("\n--- Skills Feasibility ---")
    if result.skills_feasibility:
        print(f"Score: {result.skills_feasibility.score}/100")
        print(f"Explanation: {result.skills_feasibility.explanation}")
        print(f"Recommendation: {result.skills_feasibility.recommendation}")
    
    print("\n--- Scope Feasibility ---")
    if result.scope_feasibility:
        print(f"Score: {result.scope_feasibility.score}/100")
        print(f"Explanation: {result.scope_feasibility.explanation}")
        print(f"Recommendation: {result.scope_feasibility.recommendation}")
    
    print("\n--- Risk Feasibility ---")
    if result.risk_feasibility:
        print(f"Score: {result.risk_feasibility.score}/100")
        print(f"Explanation: {result.risk_feasibility.explanation}")
        print(f"Recommendation: {result.risk_feasibility.recommendation}")
    
    print("\n--- FINAL REPORT ---")
    print(result.final_report)
    
    print("\n" + "="*70)

if __name__ == "__main__":
    test_feasibility()
