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
    
    # Collect all recommendations only (minimize token usage)
    recommendations_text = ""
    if state.technical_feasibility and state.technical_feasibility.recommendation:
        recommendations_text += f"- Technical: {state.technical_feasibility.recommendation}\n"
    if state.resource_feasibility and state.resource_feasibility.recommendation:
        recommendations_text += f"- Resources: {state.resource_feasibility.recommendation}\n"
    if state.skills_feasibility and state.skills_feasibility.recommendation:
        recommendations_text += f"- Skills: {state.skills_feasibility.recommendation}\n"
    if state.scope_feasibility and state.scope_feasibility.recommendation:
        recommendations_text += f"- Scope: {state.scope_feasibility.recommendation}\n"
    if state.risk_feasibility and state.risk_feasibility.recommendation:
        recommendations_text += f"- Risk: {state.risk_feasibility.recommendation}\n"
    
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
    
    print(f"[Feasibility] Calculated avg_score: {avg_score}, scores_list: {scores_list}")
    
    # Determine viability status based on score
    if avg_score >= 80:
        viability = "Highly Feasible"
        summary = "This project demonstrates strong feasibility across all dimensions with minimal risk factors."
    elif avg_score >= 60:
        viability = "Feasible"
        summary = "This project is generally feasible but may require attention to specific areas."
    elif avg_score >= 40:
        viability = "Moderately Feasible"
        summary = "This project has potential but faces notable challenges in key dimensions."
    else:
        viability = "Low Feasibility"
        summary = "This project faces significant feasibility challenges and requires substantial rethinking."
    
    # Generate compact deterministic report without LLM call to save quota
    report = f"""FEASIBILITY ASSESSMENT REPORT
{'='*50}

OVERALL VIABILITY: {viability}
Overall Score: {avg_score}/100

EXECUTIVE SUMMARY:
{summary}

SUB-SCORES BREAKDOWN:
{scores_text}

KEY RECOMMENDATIONS:
{recommendations_text if recommendations_text else "- Review project scope and objectives\\n- Assess available resources and constraints\\n- Evaluate team capabilities and expertise"}

SCORE INTERPRETATION:
- 80-100: Highly feasible, proceed with confidence
- 60-79: Feasible with minor adjustments needed
- 40-59: Significant challenges to address
- 0-39: Major concerns require substantial changes

This feasibility assessment provides a comprehensive multi-dimensional analysis of your project.
For more detailed insights, refer to individual dimension assessments above.
"""
    
    state.final_report = report
    state.overall_explanation = f"Overall feasibility score: {avg_score}/100. Status: {viability}"
    
    print(f"[Feasibility] Report generated. Final score: {avg_score}/100")
    
    return state
