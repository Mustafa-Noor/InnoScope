import re
from app.utils.llm import call_llm


def generate_feasibility_report_node(state):
    """Generate the final polished feasibility report."""
    print("[Feasibility] Generating final report...")
    
    # Collect all sub-scores
    scores_text = ""
    if state.technical_feasibility:
        scores_text += f"- Technical: {state.technical_feasibility.score}/100\n"
    if state.resource_feasibility:
        scores_text += f"- Resources: {state.resource_feasibility.score}/100\n"
    if state.skills_feasibility:
        scores_text += f"- Skills: {state.skills_feasibility.score}/100\n"
    if state.scope_feasibility:
        scores_text += f"- Scope: {state.scope_feasibility.score}/100\n"
    if state.risk_feasibility:
        scores_text += f"- Risk: {state.risk_feasibility.score}/100\n"
    
    # Collect all explanations and recommendations
    assessments_text = ""
    if state.technical_feasibility:
        assessments_text += f"Technical: {state.technical_feasibility.explanation}\nRecommendation: {state.technical_feasibility.recommendation}\n\n"
    if state.resource_feasibility:
        assessments_text += f"Resources: {state.resource_feasibility.explanation}\nRecommendation: {state.resource_feasibility.recommendation}\n\n"
    if state.skills_feasibility:
        assessments_text += f"Skills: {state.skills_feasibility.explanation}\nRecommendation: {state.skills_feasibility.recommendation}\n\n"
    if state.scope_feasibility:
        assessments_text += f"Scope: {state.scope_feasibility.explanation}\nRecommendation: {state.scope_feasibility.recommendation}\n\n"
    if state.risk_feasibility:
        assessments_text += f"Risk: {state.risk_feasibility.explanation}\nRecommendation: {state.risk_feasibility.recommendation}\n\n"
    
    # Calculate average score
    scores_list = []
    if state.technical_feasibility:
        scores_list.append(state.technical_feasibility.score)
    if state.resource_feasibility:
        scores_list.append(state.resource_feasibility.score)
    if state.skills_feasibility:
        scores_list.append(state.skills_feasibility.score)
    if state.scope_feasibility:
        scores_list.append(state.scope_feasibility.score)
    if state.risk_feasibility:
        scores_list.append(state.risk_feasibility.score)
    
    avg_score = int(sum(scores_list) / len(scores_list)) if scores_list else 50
    state.final_score = avg_score
    
    prompt = f"""You are an executive summary expert. Create a comprehensive feasibility report.

Project:
{state.refined_summary}

Sub-Scores:
{scores_text}

Detailed Assessments:
{assessments_text}

Average Score: {avg_score}/100

Create a professional report with:
1. Executive Summary (2-3 sentences on overall viability)
2. Detailed Findings (synthesize all assessment insights)
3. Key Recommendations (3-5 specific next steps)

Use clear sections and maintain professional tone.
"""
    
    report = call_llm(prompt) or ""
    report = report.strip()
    
    if not report:
        # Fallback deterministic report
        report = f"""FEASIBILITY ASSESSMENT REPORT
Overall Score: {avg_score}/100

Sub-Scores:
{scores_text}

Executive Summary:
Based on the multi-dimensional assessment, this project presents a feasibility score of {avg_score}/100.

Detailed Findings:
{assessments_text}

Recommendations:
- Review all recommendations from individual assessments above
- Address critical gaps identified in lower-scoring dimensions
- Proceed with caution if overall score is below 60
"""
    
    state.final_report = report
    state.overall_explanation = f"Overall feasibility score: {avg_score}/100. See detailed report for breakdown."
    
    print(f"[Feasibility] Report generated. Final score: {avg_score}/100")
    
    return state
