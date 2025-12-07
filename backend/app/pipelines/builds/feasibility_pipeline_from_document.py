"""Feasibility assessment pipeline from document.

Flow:
 1. scoping       -> extracts summary and structured fields from document
 2. feasibility   -> assesses feasibility across 5 dimensions
 
Returns a DocumentFeasibilityState with scoped fields and feasibility report.
"""

from typing import Optional
from langgraph.graph import StateGraph, END

from app.schemas.intermediate import IntermediateState
from app.schemas.feasibility import FeasibilityAssessmentState
from app.pipelines.builds.scoping import create_graph as create_scoping_graph
from app.pipelines.builds.feasibility_pipeline import create_feasibility_graph


class DocumentFeasibilityState(IntermediateState, FeasibilityAssessmentState):
    """Combine scoping output with feasibility assessment."""
    pass


def _scoping_node(state: DocumentFeasibilityState) -> DocumentFeasibilityState:
    """Run scoping to extract summary and structured fields from document."""
    print("[Feasibility From Document] >> scoping: starting (file_path=", state.file_path, ")")
    
    scoping_graph = create_scoping_graph()
    start = IntermediateState(file_path=state.file_path, raw_text=state.raw_text)
    result = scoping_graph.invoke(start)
    
    if isinstance(result, dict):
        result = IntermediateState(**result)
    
    # Copy scoped fields back to state
    for field in [
        "raw_text",
        "file_path",
        "problem_statement",
        "domain",
        "goals",
        "prerequisites",
        "key_topics",
        "initial_summary",
        "summary",
    ]:
        setattr(state, field, getattr(result, field))
    
    print(
        "[Feasibility From Document] << scoping: summary_len=", len(state.summary or ""),
        ", domain=", state.domain,
    )
    return state


def _feasibility_node(state: DocumentFeasibilityState) -> DocumentFeasibilityState:
    """Run feasibility assessment on scoped project information."""
    print("[Feasibility From Document] >> feasibility: starting assessment")
    
    # Prepare refined summary for feasibility (use scoped summary)
    state.refined_summary = state.summary
    
    feasibility_graph = create_feasibility_graph()
    
    # Create feasibility state from current state
    feasibility_state = FeasibilityAssessmentState(
        refined_summary=state.refined_summary,
        problem_statement=state.problem_statement,
        domain=state.domain,
        goals=state.goals,
        prerequisites=state.prerequisites,
        key_topics=state.key_topics,
    )
    
    result = feasibility_graph.invoke(feasibility_state)
    
    if isinstance(result, dict):
        result = FeasibilityAssessmentState(**result)
    
    # Copy feasibility results back to state
    for field in [
        "technical_feasibility",
        "resource_feasibility",
        "skills_feasibility",
        "scope_feasibility",
        "risk_feasibility",
        "final_score",
        "overall_explanation",
        "final_report",
    ]:
        setattr(state, field, getattr(result, field))
    
    print(
        "[Feasibility From Document] << feasibility: final_score=", state.final_score,
    )
    return state


def create_feasibility_from_document_graph():
    """Build the feasibility from document pipeline as a LangGraph."""
    graph = StateGraph(DocumentFeasibilityState)
    
    graph.add_node("scoping", _scoping_node)
    graph.add_node("feasibility", _feasibility_node)
    
    graph.set_entry_point("scoping")
    graph.add_edge("scoping", "feasibility")
    graph.add_edge("feasibility", END)
    
    return graph.compile()


def run_feasibility_from_document(file_path: str) -> DocumentFeasibilityState:
    """
    Assess feasibility from uploaded document.
    
    Args:
        file_path: Path to the uploaded document (PDF or DOCX)
    
    Returns:
        DocumentFeasibilityState with scoped fields and feasibility assessment
    """
    print("[Feasibility From Document] START pipeline")
    
    graph = create_feasibility_from_document_graph()
    
    initial = DocumentFeasibilityState(file_path=file_path)
    
    result = graph.invoke(initial)
    
    if isinstance(result, dict):
        result = DocumentFeasibilityState(**result)
    
    print(f"[Feasibility From Document] END pipeline final_score={result.final_score}")
    return result


__all__ = ["create_feasibility_from_document_graph", "run_feasibility_from_document", "DocumentFeasibilityState"]
