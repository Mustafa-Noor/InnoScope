from app.services.research_checks import check_if_research
from app.schemas.intermediate import IntermediateState


def check_research_node(state: IntermediateState):
    """Set flag `is_research_like` based on LLM check; do not raise.

    Graph can branch on this flag to stop or continue.
    """
    raw = getattr(state, "raw_text", None) or ""
    if not raw.strip():
           state.is_research_like = False
           return state

    result = (check_if_research(raw) or "").strip().lower()
    state.is_research_like = result.startswith("y")
    return state