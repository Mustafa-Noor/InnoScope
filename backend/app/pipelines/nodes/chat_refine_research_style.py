from app.schemas.intermediate import IntermediateState
from app.services.summarize_research import refine_summary_research_style


def chat_refine_research_style_node(state: IntermediateState) -> IntermediateState:
    # Use the current summary (baseline) and state fields to create a long-form research-style summary
    state.summary = refine_summary_research_style(state.summary or "", state)
    return state
