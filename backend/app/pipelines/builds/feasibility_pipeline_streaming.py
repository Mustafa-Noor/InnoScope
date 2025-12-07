from typing import Generator, Optional, List
from app.schemas.feasibility import FeasibilityAssessmentState
from app.pipelines.nodes.feasibility_assess import (
    assess_technical_feasibility_node,
    assess_resource_feasibility_node,
    assess_skills_feasibility_node,
    assess_scope_feasibility_node,
    assess_risk_feasibility_node,
)
from app.pipelines.nodes.feasibility_report import generate_feasibility_report_node
import json


def run_feasibility_assessment_streaming(
    refined_summary: str,
    problem_statement: Optional[str] = None,
    domain: Optional[str] = None,
    goals: Optional[List[str]] = None,
    prerequisites: Optional[List[str]] = None,
    key_topics: Optional[List[str]] = None,
) -> Generator[str, None, None]:
    """
    Execute feasibility assessment with streaming status updates.
    Yields SSE-formatted events for each assessment stage.
    """
    print("\n[Feasibility Streaming] Starting feasibility assessment...")
    
    state = FeasibilityAssessmentState(
        refined_summary=refined_summary,
        problem_statement=problem_statement,
        domain=domain,
        goals=goals or [],
        prerequisites=prerequisites or [],
        key_topics=key_topics or [],
    )
    
    total_stages = 6
    current_stage = 0
    
    try:
        # Stage 1: Technical Feasibility
        current_stage = 1
        print("[Feasibility Streaming] Assessing technical feasibility...")
        yield f"event: status\ndata: {json.dumps({'progress': int((current_stage / total_stages) * 100), 'message': 'Assessing technical feasibility...'})}\n\n"
        state = assess_technical_feasibility_node(state)
        if state.technical_feasibility:
            print(f"[Feasibility Streaming] Technical feasibility score: {state.technical_feasibility.score}")
        
        # Stage 2: Resource Feasibility
        current_stage = 2
        print("[Feasibility Streaming] Assessing resource feasibility...")
        yield f"event: status\ndata: {json.dumps({'progress': int((current_stage / total_stages) * 100), 'message': 'Assessing resource feasibility...'})}\n\n"
        state = assess_resource_feasibility_node(state)
        if state.resource_feasibility:
            print(f"[Feasibility Streaming] Resource feasibility score: {state.resource_feasibility.score}")
        
        # Stage 3: Skills Feasibility
        current_stage = 3
        print("[Feasibility Streaming] Assessing skills feasibility...")
        yield f"event: status\ndata: {json.dumps({'progress': int((current_stage / total_stages) * 100), 'message': 'Assessing skills feasibility...'})}\n\n"
        state = assess_skills_feasibility_node(state)
        if state.skills_feasibility:
            print(f"[Feasibility Streaming] Skills feasibility score: {state.skills_feasibility.score}")
        
        # Stage 4: Scope Feasibility
        current_stage = 4
        print("[Feasibility Streaming] Assessing scope feasibility...")
        yield f"event: status\ndata: {json.dumps({'progress': int((current_stage / total_stages) * 100), 'message': 'Assessing scope feasibility...'})}\n\n"
        state = assess_scope_feasibility_node(state)
        if state.scope_feasibility:
            print(f"[Feasibility Streaming] Scope feasibility score: {state.scope_feasibility.score}")
        
        # Stage 5: Risk Feasibility
        current_stage = 5
        print("[Feasibility Streaming] Assessing risk feasibility...")
        yield f"event: status\ndata: {json.dumps({'progress': int((current_stage / total_stages) * 100), 'message': 'Assessing risk feasibility...'})}\n\n"
        state = assess_risk_feasibility_node(state)
        if state.risk_feasibility:
            print(f"[Feasibility Streaming] Risk feasibility score: {state.risk_feasibility.score}")
        
        # Stage 6: Generate Report
        current_stage = 6
        print("[Feasibility Streaming] Generating final report...")
        yield f"event: status\ndata: {json.dumps({'progress': int((current_stage / total_stages) * 100), 'message': 'Generating final report...'})}\n\n"
        state = generate_feasibility_report_node(state)
        print("[Feasibility Streaming] Final report generated")
        
        # Collect sub-scores
        sub_scores = {}
        if state.technical_feasibility:
            sub_scores["technical"] = state.technical_feasibility.score
        if state.resource_feasibility:
            sub_scores["resources"] = state.resource_feasibility.score
        if state.skills_feasibility:
            sub_scores["skills"] = state.skills_feasibility.score
        if state.scope_feasibility:
            sub_scores["scope"] = state.scope_feasibility.score
        if state.risk_feasibility:
            sub_scores["risk"] = state.risk_feasibility.score
        
        # Collect recommendations
        recommendations = []
        if state.technical_feasibility and state.technical_feasibility.recommendation:
            recommendations.append(state.technical_feasibility.recommendation)
        if state.resource_feasibility and state.resource_feasibility.recommendation:
            recommendations.append(state.resource_feasibility.recommendation)
        if state.skills_feasibility and state.skills_feasibility.recommendation:
            recommendations.append(state.skills_feasibility.recommendation)
        if state.scope_feasibility and state.scope_feasibility.recommendation:
            recommendations.append(state.scope_feasibility.recommendation)
        if state.risk_feasibility and state.risk_feasibility.recommendation:
            recommendations.append(state.risk_feasibility.recommendation)
        
        # Final result with complete event
        result = {
            "final_score": state.final_score,
            "sub_scores": sub_scores,
            "explanation": state.overall_explanation,
            "recommendations": recommendations,
            "detailed_report": state.final_report,
        }
        print("[Feasibility Streaming] Sending final result...")
        yield f"event: complete\ndata: {json.dumps(result)}\n\n"
        
    except Exception as e:
        print(f"[Feasibility Streaming] Error: {str(e)}")
        yield f"data: {json.dumps({'stage': 'error', 'status': 'error', 'message': str(e)})}\n\n"


__all__ = ["run_feasibility_assessment_streaming"]
