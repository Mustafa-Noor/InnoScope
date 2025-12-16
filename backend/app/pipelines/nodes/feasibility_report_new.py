"""
Feasibility report generation node for LangGraph pipeline.
Generates final report combining ML prediction, papers, and dimension scores.
"""

import logging
from datetime import datetime
from app.schemas.feasibility_new import FeasibilityAssessmentState

logger = logging.getLogger(__name__)


def generate_feasibility_report_node(state: FeasibilityAssessmentState) -> FeasibilityAssessmentState:
    """
    Stage 4: Generate Final Report
    Compile all assessment results into polished report with recommendations.
    """
    logger.info("[Report Generation] Generating final feasibility report...")
    
    # Collect scores
    scores = []
    explanations = []
    recommendations = []
    
    if state.technical_feasibility:
        scores.append(state.technical_feasibility.score)
        explanations.append(f"Technical: {state.technical_feasibility.explanation}")
        if state.technical_feasibility.recommendation:
            recommendations.append(f"Technical: {state.technical_feasibility.recommendation}")
    
    if state.resource_feasibility:
        scores.append(state.resource_feasibility.score)
        explanations.append(f"Resource: {state.resource_feasibility.explanation}")
        if state.resource_feasibility.recommendation:
            recommendations.append(f"Resource: {state.resource_feasibility.recommendation}")
    
    if state.skills_feasibility:
        scores.append(state.skills_feasibility.score)
        explanations.append(f"Skills: {state.skills_feasibility.explanation}")
        if state.skills_feasibility.recommendation:
            recommendations.append(f"Skills: {state.skills_feasibility.recommendation}")
    
    if state.scope_feasibility:
        scores.append(state.scope_feasibility.score)
        explanations.append(f"Scope: {state.scope_feasibility.explanation}")
        if state.scope_feasibility.recommendation:
            recommendations.append(f"Scope: {state.scope_feasibility.recommendation}")
    
    if state.risk_feasibility:
        scores.append(state.risk_feasibility.score)
        explanations.append(f"Risk: {state.risk_feasibility.explanation}")
        if state.risk_feasibility.recommendation:
            recommendations.append(f"Risk: {state.risk_feasibility.recommendation}")
    
    # Calculate average
    avg_score = int(sum(scores) / len(scores)) if scores else 50
    
    # Weight: 50% ML, 50% dimension average (ML represents data-driven assessment)
    if state.ml_prediction:
        final_score = int(0.5 * state.ml_prediction.ml_score + 0.5 * avg_score)
    else:
        final_score = avg_score
    
    state.final_score = final_score
    
    # Determine viability
    if final_score >= 80:
        state.viability_status = "Highly Feasible"
        summary = "This project demonstrates strong feasibility across all dimensions."
    elif final_score >= 60:
        state.viability_status = "Feasible"
        summary = "This project is feasible but may require attention to specific areas."
    elif final_score >= 40:
        state.viability_status = "Low Feasibility"
        summary = "This project has significant challenges that must be addressed."
    else:
        state.viability_status = "Not Feasible"
        summary = "This project faces substantial barriers to success."
    
    # Generate explanation
    state.explanation = f"{summary}\n\n" + "\n".join(explanations)
    
    # Set recommendations
    state.recommendations = recommendations or ["Continue with detailed planning", "Address identified risks"]
    
    # Extract key risks from ML prediction
    state.key_risks = state.ml_prediction.risk_indicators if state.ml_prediction else []
    
    # Generate detailed report
    state.detailed_report = _generate_detailed_report(state, final_score)
    
    logger.info(f"[Report Generation] Final score: {final_score}/100 ({state.viability_status})")
    
    return state


def _generate_detailed_report(state: FeasibilityAssessmentState, final_score: int) -> str:
    """Generate formatted detailed report."""
    
    input_data = state.input_data
    
    lines = [
        "=" * 80,
        "FEASIBILITY ASSESSMENT REPORT",
        "=" * 80,
        f"\nProject ID: {input_data.project_id}",
        f"Domain: {input_data.product_domain}",
        f"Application: {input_data.application_area}",
        f"Assessment Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "─" * 80,
        "OVERALL ASSESSMENT",
        "─" * 80,
        f"Viability Status: {state.viability_status}",
        f"Final Feasibility Score: {final_score}/100",
        f"ML Model Score: {state.ml_prediction.ml_score:.1f}/100 (Confidence: {state.ml_prediction.confidence:.0%})" if state.ml_prediction else "",
        "",
        f"Summary: {state.explanation}",
        "",
        "─" * 80,
        "DIMENSION SCORES",
        "─" * 80,
    ]
    
    if state.technical_feasibility:
        lines.append(f"Technical Feasibility: {state.technical_feasibility.score}/100")
        lines.append(f"  → {state.technical_feasibility.explanation}")
    
    if state.resource_feasibility:
        lines.append(f"Resource Feasibility: {state.resource_feasibility.score}/100")
        lines.append(f"  → {state.resource_feasibility.explanation}")
    
    if state.skills_feasibility:
        lines.append(f"Skills Feasibility: {state.skills_feasibility.score}/100")
        lines.append(f"  → {state.skills_feasibility.explanation}")
    
    if state.scope_feasibility:
        lines.append(f"Scope Feasibility: {state.scope_feasibility.score}/100")
        lines.append(f"  → {state.scope_feasibility.explanation}")
    
    if state.risk_feasibility:
        lines.append(f"Risk Feasibility: {state.risk_feasibility.score}/100")
        lines.append(f"  → {state.risk_feasibility.explanation}")
    
    lines.extend([
        "",
        "─" * 80,
        "PROJECT METRICS",
        "─" * 80,
        f"Technical Complexity: {input_data.technical_complexity_score}/5",
        f"Technology Maturity: {input_data.technology_maturity_score}/5",
        f"Data Availability: {input_data.data_availability_score}/5",
        f"Resource Availability: {input_data.resource_availability_score}/5",
        f"Time to Market: {input_data.time_to_market_months} months",
        f"R&D Cost: ${input_data.rd_cost_estimate:,.0f}",
        f"Startup Cost: ${input_data.startup_cost_estimate:,.0f}",
        f"Market Size: ${input_data.target_market_size:.1f}M",
        f"Expected ROI: {input_data.projected_roi*100:.1f}%",
        f"Competition Level: {input_data.competition_level}/5",
    ])
    
    if state.key_risks:
        lines.extend([
            "",
            "─" * 80,
            "IDENTIFIED RISKS",
            "─" * 80,
        ])
        for i, risk in enumerate(state.key_risks, 1):
            lines.append(f"{i}. {risk}")
    
    if state.recommendations:
        lines.extend([
            "",
            "─" * 80,
            "KEY RECOMMENDATIONS",
            "─" * 80,
        ])
        for i, rec in enumerate(state.recommendations, 1):
            lines.append(f"{i}. {rec}")
    
    if state.relevant_papers:
        lines.extend([
            "",
            "─" * 80,
            "RELEVANT RESEARCH PAPERS",
            "─" * 80,
        ])
        for i, paper in enumerate(state.relevant_papers[:5], 1):
            lines.append(f"\n{i}. {paper.title}")
            lines.append(f"   Relevance Score: {paper.relevance_score:.2f}")
            lines.append(f"   Link: {paper.link}")
    
    lines.append("\n" + "=" * 80)
    
    return "\n".join(lines)
