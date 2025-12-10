from app.utils.llm import call_llm
import json
import re


def summarize_research(text):
    prompt = f"""Summarize concisely (200-300 words):

{text[:3500]}"""
    response = call_llm(prompt)
    return response


def summarize_and_extract_fields(text: str):
    """Combined LLM call to generate summary AND extract fields in one prompt.
    
    Returns tuple: (summary_text, fields_dict)
    """
    # Optimized prompt for token efficiency
    prompt = f"""Analyze the text and return JSON:
{{
    "summary": "Concise summary (150-200 words)",
    "problem_statement": "Main problem or research question",
    "domain": "Field of study",
    "goals": ["Goal 1", "Goal 2"],
    "key_topics": ["Topic 1", "Topic 2", "Topic 3"],
    "prerequisites": ["Prerequisite 1", "Prerequisite 2"]
}}

Text:
{text[:4000]}

JSON ONLY:"""
    
    response = call_llm(prompt)
    if not response:
        return "", {}
    
    # Clean markdown code blocks
    response = re.sub(r"^```(?:json)?\s*|\s*```$", "", response.strip(), flags=re.MULTILINE)
    
    # Extract JSON from response
    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response)
    if json_match:
        response = json_match.group(0)
    
    try:
        data = json.loads(response)
        summary = data.get("summary", "")
        
        # Convert summary to string if it's a dict (in case LLM returns formatted dict)
        if isinstance(summary, dict):
            summary = "\n".join([f"{k}: {v}" for k, v in summary.items()])
        elif not isinstance(summary, str):
            summary = str(summary)
        
        fields = {
            "problem_statement": data.get("problem_statement", ""),
            "domain": data.get("domain", ""),
            "goals": data.get("goals", []),
            "key_topics": data.get("key_topics", []),
            "prerequisites": data.get("prerequisites", []),
        }
        return summary, fields
    except json.JSONDecodeError:
        return "", {}


def refine_summary(previous_summary: str, state):
    prompt = f"""Improve summary with structured fields. Keep concise (300 words max):

Summary: {previous_summary[:1000]}

Problem: {state.problem_statement}
Domain: {state.domain}
Goals: {', '.join(state.goals or [])}
Topics: {', '.join(state.key_topics or [])}
Prerequisites: {', '.join(state.prerequisites or [])}

Return plain text only."""
    return call_llm(prompt)


def refine_summary_research_style(previous_summary: str, state):
    """
    Produce a refined summary in research style with clear headings.
    Optimized for token efficiency.
    """
    prompt = f"""Rewrite as research-style summary with headings: Abstract, Introduction, 
Methodology, Results, Limitations, Conclusion.

Summary: {previous_summary[:1500]}

Domain: {state.domain}
Problem: {state.problem_statement}
Goals: {', '.join(state.goals or [])}
Topics: {', '.join(state.key_topics or [])}

Keep concise (max 400 words). Plain text with headings only."""
    return call_llm(prompt)


# if __name__ == "__main__":
#     # Test with sample research text
#     sample_research_text = """
#     Abstract: This study investigates the effectiveness of machine learning algorithms in predicting stock market trends. 
#     We analyzed historical data from 500 companies over a 10-year period using various ML models including Random Forest, 
#     SVM, and Neural Networks. Our results show that ensemble methods achieve 78% accuracy in short-term predictions.
    
#     Introduction: Stock market prediction has been a challenging problem in financial analysis. Traditional methods rely 
#     on fundamental and technical analysis, but machine learning offers new possibilities for automated trading systems.
    
#     Methodology: We collected daily stock prices from 2013-2023 for S&P 500 companies. Features included price movements, 
#     trading volume, and technical indicators. We implemented three ML models: Random Forest with 100 trees, Support Vector 
#     Machine with RBF kernel, and a 3-layer Neural Network with 64 hidden units.
    
#     Results: Random Forest achieved 78% accuracy, SVM reached 72%, and Neural Networks obtained 75%. Ensemble methods 
#     combining all three models improved accuracy to 82%. Statistical significance was confirmed with p-value < 0.001.
    
#     Conclusion: Machine learning shows promise for stock prediction, with ensemble methods providing the best performance. 
#     Future work should explore deep learning architectures and real-time data processing capabilities.
    
#     References: [1] Smith, J. (2023). ML in Finance. [2] Brown, A. (2022). Stock Prediction Models.
#     """
    
#     print("Testing summarize_research function")
#     print("=" * 50)
#     print("\nInput text preview:")
#     print(sample_research_text[:200] + "...")
    
#     print("\nGenerating summary...")
#     summary = summarize_research(sample_research_text)
    
#     print("\nGenerated Summary:")
#     print("-" * 30)
#     print(summary)
    
#     # Basic validation
#     expected_sections = ['abstract', 'introduction', 'methodology', 'results', 'conclusion']
#     summary_lower = summary.lower()
    
#     print("\nValidation:")
#     print("-" * 30)
#     for section in expected_sections:
#         if section in summary_lower:
#             print(f"✅ {section.capitalize()} section found")
#         else:
#             print(f"❌ {section.capitalize()} section missing")
    
#     print(f"\nSummary length: {len(summary)} characters")
#     print("Test complete!")