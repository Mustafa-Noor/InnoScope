from app.utils.llm import call_llm
import json
import re


def summarize_research(text):
    prompt = f"""
    Summarize the following research while keeping as much detail as possible.
    Organize the summary with headings like Abstract, Introduction, Methodology, Results, Conclusion.

    Text: {text[:5000]}
    """
    response = call_llm(prompt)
    return response


def summarize_and_extract_fields(text: str):
    """Combined LLM call to generate summary AND extract fields in one prompt.
    
    Returns tuple: (summary_text, fields_dict)
    """
    prompt = f"""You are an expert document analyst. Analyze the provided text and return ONLY valid JSON with this structure:

{{
    "summary": "A comprehensive summary with headings like Abstract, Introduction, Methodology, Results, Conclusion. Keep as much detail as possible.",
    "problem_statement": "The main problem or research question",
    "domain": "Field of study or industry",
    "goals": ["Goal 1", "Goal 2", "Goal 3"],
    "key_topics": ["Topic 1", "Topic 2", "Topic 3"],
    "prerequisites": ["Prerequisite 1", "Prerequisite 2"]
}}

Text to analyze:
{text[:5000]}

Return ONLY the JSON, no other text."""
    
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
    prompt = f"""
You have an existing research summary:

{previous_summary}

And the following structured extracted fields:

{state.model_dump()}

Create a new, improved, refined summary that:
- integrates the structured fields into one coherent summary
- is clearer, more complete, and academically correct
- removes redundancy
- fills gaps from the previous summary

Return plain text only.
"""
    return call_llm(prompt)


def refine_summary_research_style(previous_summary: str, state):
        """
        Produce a long-form refined summary in research style with clear headings
        (e.g., Abstract, Introduction, Background, Methodology/Approach, System Design,
        Implementation, Results/Expected Outcomes, Limitations, Future Work, Conclusion).
        Integrate structured fields from the state.
        """
        prompt = f"""
You are an expert technical writer. Rewrite the summary below into a comprehensive
research-style document with multiple headings.

Existing summary:
{previous_summary}

Structured fields:
{state.model_dump()}

Requirements:
- Use these headings (adapt if some are not applicable but keep structure):
    Abstract, Introduction, Background, Methodology/Approach, System Design,
    Implementation, Results/Expected Outcomes, Limitations, Future Work, Conclusion.
- Be detailed but concise per section (2–6 paragraphs total across the document).
- Integrate problem statement, domain, goals, prerequisites, and key topics throughout.
- Maintain clarity and academic tone.
- If some fields are missing or the user was unsure, make reasonable assumptions based on context; briefly note assumptions where relevant.
- Return plain text only with headings.
"""
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