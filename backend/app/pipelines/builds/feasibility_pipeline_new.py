"""
LangGraph-based feasibility assessment pipeline.
Combines ML prediction, semantic search, and unified assessment.

Pipeline:
1. ML Prediction → get feasibility score from trained model
2. Semantic Search → find relevant papers
3. Unified Assessment → score 5 dimensions using ML + papers + LLM
4. Report Generation → compile final report
"""

from langgraph.graph import StateGraph, END
from app.schemas.feasibility_new import (
    StructuredFeasibilityInput,
    FeasibilityAssessmentState,
    FeasibilityReport
)
from app.pipelines.nodes.feasibility_assess_new import (
    ml_prediction_node,
    semantic_search_node,
    unified_assessment_node
)
from app.pipelines.nodes.feasibility_report_new import generate_feasibility_report_node
import logging

logger = logging.getLogger(__name__)


def create_feasibility_graph():
    """Build the feasibility assessment pipeline as a LangGraph."""
    graph = StateGraph(FeasibilityAssessmentState)
    
    # Add nodes
    graph.add_node("ml_prediction", ml_prediction_node)
    graph.add_node("semantic_search", semantic_search_node)
    graph.add_node("unified_assessment", unified_assessment_node)
    graph.add_node("generate_report", generate_feasibility_report_node)
    
    # Set entry point
    graph.set_entry_point("ml_prediction")
    
    # Define edges (sequential flow)
    graph.add_edge("ml_prediction", "semantic_search")
    graph.add_edge("semantic_search", "unified_assessment")
    graph.add_edge("unified_assessment", "generate_report")
    graph.add_edge("generate_report", END)
    
    return graph.compile()


def run_feasibility_assessment(
    input_data: StructuredFeasibilityInput
) -> FeasibilityAssessmentState:
    """
    Execute the feasibility assessment pipeline.
    
    Args:
        input_data: Structured project fields
    
    Returns:
        Complete assessment state with all results
    """
    logger.info(f"[Pipeline] Starting feasibility assessment for {input_data.project_id}")
    
    graph = create_feasibility_graph()
    
    initial_state = FeasibilityAssessmentState(
        input_data=input_data
    )
    
    result_dict = graph.invoke(initial_state)
    
    # Convert dict result back to FeasibilityAssessmentState
    if isinstance(result_dict, dict):
        result = FeasibilityAssessmentState(**result_dict)
    else:
        result = result_dict
    
    logger.info(f"[Pipeline] Assessment complete. Final score: {result.final_score}")
    
    return result


def convert_state_to_report(state: FeasibilityAssessmentState) -> FeasibilityReport:
    """Convert assessment state to response report."""
    return FeasibilityReport(
        project_id=state.input_data.project_id,
        final_score=state.final_score or 50,
        viability_status=state.viability_status or "Unknown",
        ml_score=state.ml_prediction.ml_score if state.ml_prediction else 50.0,
        ml_confidence=state.ml_prediction.confidence if state.ml_prediction else 0.5,
        technical_score=state.technical_feasibility.score if state.technical_feasibility else 50,
        resource_score=state.resource_feasibility.score if state.resource_feasibility else 50,
        skills_score=state.skills_feasibility.score if state.skills_feasibility else 50,
        scope_score=state.scope_feasibility.score if state.scope_feasibility else 50,
        risk_score=state.risk_feasibility.score if state.risk_feasibility else 50,
        relevant_papers=state.relevant_papers,
        explanation=state.explanation or "Assessment complete",
        key_risks=state.key_risks,
        recommendations=state.recommendations,
        detailed_report=state.detailed_report or "Report generation in progress",
        assessment_timestamp=state.final_score and __import__('datetime').datetime.now().isoformat()
    )
