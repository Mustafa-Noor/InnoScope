"""Streaming feasibility assessment pipeline from document.

Flow:
 1. scoping       -> extracts summary and structured fields from document
 2. feasibility   -> assesses feasibility across 5 dimensions with streaming updates
 
Yields SSE events with progress updates.
"""

from typing import Generator, Optional
import json
from app.schemas.intermediate import IntermediateState
from app.schemas.feasibility import FeasibilityAssessmentState
from app.pipelines.builds.scoping import create_graph as create_scoping_graph
from app.pipelines.nodes.feasibility_assess import (
    assess_technical_feasibility_node,
    assess_resource_feasibility_node,
    assess_skills_feasibility_node,
    assess_scope_feasibility_node,
    assess_risk_feasibility_node,
)
from app.pipelines.nodes.feasibility_report import generate_feasibility_report_node


def run_feasibility_from_document_streaming(file_path: str) -> Generator[str, None, None]:
    """
    Assess feasibility from document with real-time streaming progress.
    
    Flow: scoping -> feasibility assessment (with streaming)
    
    Args:
        file_path: Path to the uploaded document (PDF or DOCX)
    
    Yields:
        SSE-formatted event strings with progress updates
    """
    try:
        # Stage 1: Scoping
        yield f"data: {json.dumps({'stage': 'scoping', 'message': 'Extracting and analyzing document...', 'progress': 0})}\n\n"
        
        scoping_graph = create_scoping_graph()
        scoping_state = scoping_graph.invoke(IntermediateState(file_path=file_path))
        
        if isinstance(scoping_state, dict):
            scoping_state = IntermediateState(**scoping_state)
        
        if not scoping_state.summary:
            yield f"data: {json.dumps({'stage': 'error', 'message': 'Failed to extract document summary'})}\n\n"
            return
        
        yield f"data: {json.dumps({'stage': 'scoping_complete', 'message': 'Document analysis complete', 'progress': 15})}\n\n"
        
        # Initialize feasibility state from scoped data
        state = FeasibilityAssessmentState(
            refined_summary=scoping_state.summary,
            problem_statement=scoping_state.problem_statement,
            domain=scoping_state.domain,
            goals=scoping_state.goals or [],
            prerequisites=scoping_state.prerequisites or [],
            key_topics=scoping_state.key_topics or [],
        )
        
        # Stage 2: Technical Feasibility
        yield f"data: {json.dumps({'stage': 'technical', 'message': 'Assessing technical feasibility...', 'progress': 25})}\n\n"
        state = assess_technical_feasibility_node(state)
        if state.technical_feasibility:
            yield f"data: {json.dumps({'stage': 'technical_complete', 'score': state.technical_feasibility.score, 'progress': 35})}\n\n"
        
        # Stage 3: Resource Feasibility
        yield f"data: {json.dumps({'stage': 'resource', 'message': 'Assessing resource feasibility...', 'progress': 40})}\n\n"
        state = assess_resource_feasibility_node(state)
        if state.resource_feasibility:
            yield f"data: {json.dumps({'stage': 'resource_complete', 'score': state.resource_feasibility.score, 'progress': 50})}\n\n"
        
        # Stage 4: Skills Feasibility
        yield f"data: {json.dumps({'stage': 'skills', 'message': 'Assessing skills feasibility...', 'progress': 55})}\n\n"
        state = assess_skills_feasibility_node(state)
        if state.skills_feasibility:
            yield f"data: {json.dumps({'stage': 'skills_complete', 'score': state.skills_feasibility.score, 'progress': 65})}\n\n"
        
        # Stage 5: Scope Feasibility
        yield f"data: {json.dumps({'stage': 'scope', 'message': 'Assessing scope feasibility...', 'progress': 70})}\n\n"
        state = assess_scope_feasibility_node(state)
        if state.scope_feasibility:
            yield f"data: {json.dumps({'stage': 'scope_complete', 'score': state.scope_feasibility.score, 'progress': 80})}\n\n"
        
        # Stage 6: Risk Feasibility
        yield f"data: {json.dumps({'stage': 'risk', 'message': 'Assessing risk feasibility...', 'progress': 85})}\n\n"
        state = assess_risk_feasibility_node(state)
        if state.risk_feasibility:
            yield f"data: {json.dumps({'stage': 'risk_complete', 'score': state.risk_feasibility.score, 'progress': 90})}\n\n"
        
        # Stage 7: Generate Report
        yield f"data: {json.dumps({'stage': 'report', 'message': 'Generating final report...', 'progress': 95})}\n\n"
        state = generate_feasibility_report_node(state)
        
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
        
        # Final result
        result = {
            "final_score": state.final_score,
            "sub_scores": sub_scores,
            "explanation": state.overall_explanation,
            "recommendations": recommendations,
            "detailed_report": state.final_report,
        }
        yield f"data: {json.dumps({'stage': 'complete', 'message': 'Assessment complete', 'progress': 100, 'result': result})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'stage': 'error', 'message': str(e)})}\n\n"


__all__ = ["run_feasibility_from_document_streaming"]
