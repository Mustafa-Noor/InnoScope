from langgraph.graph import StateGraph, END
from typing import Optional, List

from app.schemas.feasibility import FeasibilityAssessmentState, FeasibilitySubScore
from app.pipelines.nodes.feasibility_assess import (
    assess_technical_feasibility_node,
    assess_resource_feasibility_node,
    assess_skills_feasibility_node,
    assess_scope_feasibility_node,
    assess_risk_feasibility_node,
)
from app.pipelines.nodes.feasibility_report import generate_feasibility_report_node


def create_feasibility_graph():
    """Build the feasibility assessment pipeline as a LangGraph."""
    graph = StateGraph(FeasibilityAssessmentState)
    
    # Add all assessment nodes
    graph.add_node("assess_technical", assess_technical_feasibility_node)
    graph.add_node("assess_resource", assess_resource_feasibility_node)
    graph.add_node("assess_skills", assess_skills_feasibility_node)
    graph.add_node("assess_scope", assess_scope_feasibility_node)
    graph.add_node("assess_risk", assess_risk_feasibility_node)
    graph.add_node("generate_report", generate_feasibility_report_node)
    
    # Set entry point
    graph.set_entry_point("assess_technical")
    
    # Chain all assessment nodes
    graph.add_edge("assess_technical", "assess_resource")
    graph.add_edge("assess_resource", "assess_skills")
    graph.add_edge("assess_skills", "assess_scope")
    graph.add_edge("assess_scope", "assess_risk")
    
    # Final report generation
    graph.add_edge("assess_risk", "generate_report")
    graph.add_edge("generate_report", END)
    
    return graph.compile()


def run_feasibility_assessment(
    refined_summary: str,
    problem_statement: Optional[str] = None,
    domain: Optional[str] = None,
    goals: Optional[List[str]] = None,
    prerequisites: Optional[List[str]] = None,
    key_topics: Optional[List[str]] = None,
) -> FeasibilityAssessmentState:
    """
    Execute the feasibility assessment pipeline.
    
    Args:
        refined_summary: The refined project summary
        problem_statement: Problem statement
        domain: Project domain
        goals: Project goals
        prerequisites: Prerequisites/dependencies
        key_topics: Key technologies/topics
    
    Returns:
        FeasibilityAssessmentState with all assessments and final report
    """
    print("\n[Feasibility Pipeline] Starting feasibility assessment...")
    
    graph = create_feasibility_graph()
    
    initial_state = FeasibilityAssessmentState(
        refined_summary=refined_summary,
        problem_statement=problem_statement,
        domain=domain,
        goals=goals or [],
        prerequisites=prerequisites or [],
        key_topics=key_topics or [],
    )
    
    result = graph.invoke(initial_state)
    
    if isinstance(result, dict):
        result = FeasibilityAssessmentState(**result)
    
    print(f"[Feasibility Pipeline] Assessment complete. Final score: {result.final_score}/100")
    
    return result


__all__ = ["create_feasibility_graph", "run_feasibility_assessment", "FeasibilityAssessmentState"]
