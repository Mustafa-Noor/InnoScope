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
from app.utils.streaming import format_status, format_complete, format_error


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
        print(f"[Feasibility Stream] Starting with file: {file_path}")
        
        # Stage 1: Scoping
        print("[Feasibility Stream] Yielding scoping start event...")
        yield format_status("Extracting and analyzing document...", progress=0, stage="scoping")
        
        print("[Feasibility Stream] Creating scoping graph...")
        scoping_graph = create_scoping_graph()
        print("[Feasibility Stream] Invoking scoping graph...")
        scoping_state = scoping_graph.invoke(IntermediateState(file_path=file_path))
        
        if isinstance(scoping_state, dict):
            scoping_state = IntermediateState(**scoping_state)
        
        print(f"[Feasibility Stream] Scoping complete. Summary: {scoping_state.summary[:100] if scoping_state.summary else 'NONE'}")
        
        if not scoping_state.summary:
            print("[Feasibility Stream] No summary extracted, sending error...")
            yield format_error("Failed to extract document summary")
            return
        
        print("[Feasibility Stream] Yielding scoping_complete event...")
        yield format_status("Document analysis complete", progress=15, stage="scoping_complete")
        
        # Initialize feasibility state from scoped data
        print("[Feasibility Stream] Creating feasibility assessment state...")
        state = FeasibilityAssessmentState(
            refined_summary=scoping_state.summary,
            problem_statement=scoping_state.problem_statement,
            domain=scoping_state.domain,
            goals=scoping_state.goals or [],
            prerequisites=scoping_state.prerequisites or [],
            key_topics=scoping_state.key_topics or [],
        )
        
        # Stage 2: Technical Feasibility
        print("[Feasibility Stream] Starting technical feasibility assessment...")
        yield format_status("Assessing technical feasibility...", progress=25, stage="technical")
        state = assess_technical_feasibility_node(state)
        print(f"[Feasibility Stream] Technical feasibility done: {state.technical_feasibility}")
        if state.technical_feasibility:
            yield format_status(f"Technical: {state.technical_feasibility.score}/100", progress=35, stage="technical_complete")
        
        # Stage 3: Resource Feasibility
        yield format_status("Assessing resource feasibility...", progress=40, stage="resource")
        state = assess_resource_feasibility_node(state)
        if state.resource_feasibility:
            yield format_status(f"Resources: {state.resource_feasibility.score}/100", progress=50, stage="resource_complete")
        
        # Stage 4: Skills Feasibility
        yield format_status("Assessing skills feasibility...", progress=55, stage="skills")
        state = assess_skills_feasibility_node(state)
        if state.skills_feasibility:
            yield format_status(f"Skills: {state.skills_feasibility.score}/100", progress=65, stage="skills_complete")
        
        # Stage 5: Scope Feasibility
        yield format_status("Assessing scope feasibility...", progress=70, stage="scope")
        state = assess_scope_feasibility_node(state)
        if state.scope_feasibility:
            yield format_status(f"Scope: {state.scope_feasibility.score}/100", progress=80, stage="scope_complete")
        
        # Stage 6: Risk Feasibility
        yield format_status("Assessing risk feasibility...", progress=85, stage="risk")
        state = assess_risk_feasibility_node(state)
        if state.risk_feasibility:
            yield format_status(f"Risk: {state.risk_feasibility.score}/100", progress=90, stage="risk_complete")
        
        # Stage 7: Generate Report
        yield format_status("Generating final report...", progress=95, stage="report")
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
        print("[Feasibility Stream] Collecting final results...")
        result = {
            "final_score": int(state.final_score) if state.final_score else 0,
            "sub_scores": sub_scores if sub_scores else {},
            "explanation": str(state.overall_explanation) if state.overall_explanation else "Assessment complete",
            "recommendations": recommendations if recommendations else [],
            "detailed_report": str(state.final_report) if state.final_report else "No detailed report available",
        }
        print(f"[Feasibility Stream] Final result collected")
        print(f"[Feasibility Stream] - final_score: {result['final_score']}")
        print(f"[Feasibility Stream] - sub_scores: {result['sub_scores']}")
        
        print("[Feasibility Stream] Yielding complete event...")
        yield format_complete(result)
        print("[Feasibility Stream] Complete event yielded successfully")
        
    except Exception as e:
        print(f"[Feasibility Stream] ERROR: {str(e)}", exc_info=True)
        import traceback
        traceback.print_exc()
        yield format_error(str(e))


__all__ = ["run_feasibility_from_document_streaming"]
