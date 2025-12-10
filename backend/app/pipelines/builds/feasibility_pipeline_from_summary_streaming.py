"""Streaming feasibility assessment pipeline that accepts a text summary instead of a document.

Flow:
 1. extract_fields        -> extracts structured fields from summary text
 2. feasibility assessment -> assesses feasibility across 5 dimensions with streaming updates

Yields SSE events with progress updates.
"""

from typing import Generator, Optional

from app.schemas.intermediate import IntermediateState
from app.schemas.feasibility import FeasibilityAssessmentState
from app.pipelines.nodes.feasibility_assess import (
    assess_technical_feasibility_node,
    assess_resource_feasibility_node,
    assess_skills_feasibility_node,
    assess_scope_feasibility_node,
    assess_risk_feasibility_node,
)
from app.pipelines.nodes.feasibility_report import generate_feasibility_report_node
from app.services.extract_fields import extract_fields_from_summary
from app.utils.streaming import format_status, format_complete, format_error


def run_feasibility_from_summary_streaming(summary: str) -> Generator[str, None, None]:
    """Run feasibility assessment from text summary with streaming progress.
    
    Emits coarse-grained stage progress so the frontend bar moves steadily:
    - 0% start
    - 10% extract_fields begin, 20% extract_fields done
    - 30% technical begin, 40% technical done
    - 50% resource begin, 60% resource done
    - 70% skills begin, 80% skills done
    - 85% scope begin, 90% scope done
    - 95% risk begin, 100% complete
    
    Args:
        summary: Text summary of the project
    
    Yields:
        SSE-formatted event strings with progress updates
    """
    try:
        print(f"[Feasibility-Summary Stream] Starting with summary ({len(summary)} chars)")
        
        # Kickoff
        yield format_status("Starting feasibility assessment pipeline...", progress=0, stage="init")
        
        # Stage 1: Extract fields from summary
        print("[Feasibility-Summary Stream] Extracting fields from summary...")
        yield format_status("Extracting structured information from summary...", progress=10, stage="extract_fields")
        
        try:
            extracted = extract_fields_from_summary(summary)
        except Exception as e:
            print(f"[Feasibility-Summary Stream] !! extract_fields error: {str(e)}")
            extracted = {}
        
        yield format_status("Structured information extracted", progress=20, stage="extract_fields_complete")
        
        # Initialize feasibility state from extracted fields
        print("[Feasibility-Summary Stream] Creating feasibility assessment state...")
        state = FeasibilityAssessmentState(
            refined_summary=summary,
            problem_statement=extracted.get("problem_statement"),
            domain=extracted.get("domain"),
            goals=extracted.get("goals") or [],
            prerequisites=extracted.get("prerequisites") or [],
            key_topics=extracted.get("key_topics") or [],
        )
        
        # Stage 2: Technical Feasibility
        print("[Feasibility-Summary Stream] Starting technical feasibility assessment...")
        yield format_status("Assessing technical feasibility...", progress=30, stage="technical")
        state = assess_technical_feasibility_node(state)
        print(f"[Feasibility-Summary Stream] Technical feasibility done: {state.technical_feasibility}")
        if state.technical_feasibility:
            yield format_status(f"Technical: {state.technical_feasibility.score}/100", progress=40, stage="technical_complete")
        
        # Stage 3: Resource Feasibility
        yield format_status("Assessing resource feasibility...", progress=50, stage="resource")
        state = assess_resource_feasibility_node(state)
        if state.resource_feasibility:
            yield format_status(f"Resources: {state.resource_feasibility.score}/100", progress=60, stage="resource_complete")
        
        # Stage 4: Skills Feasibility
        yield format_status("Assessing skills feasibility...", progress=70, stage="skills")
        state = assess_skills_feasibility_node(state)
        if state.skills_feasibility:
            yield format_status(f"Skills: {state.skills_feasibility.score}/100", progress=80, stage="skills_complete")
        
        # Stage 5: Scope Feasibility
        yield format_status("Assessing scope feasibility...", progress=85, stage="scope")
        state = assess_scope_feasibility_node(state)
        if state.scope_feasibility:
            yield format_status(f"Scope: {state.scope_feasibility.score}/100", progress=90, stage="scope_complete")
        
        # Stage 6: Risk Feasibility
        yield format_status("Assessing risk feasibility...", progress=95, stage="risk")
        state = assess_risk_feasibility_node(state)
        if state.risk_feasibility:
            yield format_status(f"Risk: {state.risk_feasibility.score}/100", progress=100, stage="risk_complete")
        
        # Stage 7: Generate Report
        yield format_status("Generating final report...", progress=98, stage="report")
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
        print("[Feasibility-Summary Stream] Collecting final results...")
        result = {
            "final_score": int(state.final_score) if state.final_score else 0,
            "sub_scores": sub_scores if sub_scores else {},
            "explanation": str(state.overall_explanation) if state.overall_explanation else "Assessment complete",
            "recommendations": recommendations if recommendations else [],
            "detailed_report": str(state.final_report) if state.final_report else "No detailed report available",
        }
        print(f"[Feasibility-Summary Stream] Final result collected")
        print(f"[Feasibility-Summary Stream] - final_score: {result['final_score']}")
        print(f"[Feasibility-Summary Stream] - sub_scores: {result['sub_scores']}")
        
        print("[Feasibility-Summary Stream] Yielding complete event...")
        yield format_complete(result)
        print("[Feasibility-Summary Stream] Complete event yielded successfully")
        
    except Exception as e:
        print(f"[Feasibility-Summary Stream] ERROR: {str(e)}", exc_info=True)
        import traceback
        traceback.print_exc()
        yield format_error(str(e))
